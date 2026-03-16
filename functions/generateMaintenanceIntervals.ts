import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Normalize a string for fuzzy matching
function normalizeName(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Map common maintenance keywords to maintenance_type values
const TYPE_KEYWORDS = {
  oil_change: ['oil change', 'engine oil', 'oil & filter', 'oil/filter'],
  filter_change: ['air filter', 'cabin filter', 'fuel filter', 'cabin air', 'pollen filter', 'pcv', 'breather filter'],
  tire_rotation: ['tire rotation', 'tyre rotation', 'rotate tires', 'rotate tyres', 'wheel rotation'],
  inspection: ['inspect', 'inspection', 'check', 'lubrication', 'lube', 'chassis lube', 'multi-point'],
  repair: ['replace', 'flush', 'coolant', 'transmission', 'brake fluid', 'differential', 'transfer case', 'spark plug', 'timing belt', 'serpentine belt', 'belt', 'battery'],
  cleaning: ['clean', 'wash', 'detai'],
};

function guessType(name) {
  const norm = normalizeName(name);
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => norm.includes(kw))) return type;
  }
  return null;
}

// Score how well a maintenance record title matches an AI interval name
function matchScore(aiName, aiType, recordTitle, recordType) {
  const aiNorm = normalizeName(aiName);
  const recNorm = normalizeName(recordTitle || '');

  // Exact match
  if (aiNorm === recNorm) return 100;

  // One contains the other
  if (aiNorm.includes(recNorm) || recNorm.includes(aiNorm)) return 80;

  // Type match — both are the same maintenance_type
  const aiGuessed = aiType || guessType(aiName);
  const recGuessed = recordType || guessType(recordTitle);
  if (aiGuessed && recGuessed && aiGuessed === recGuessed) {
    // Boost if they also share at least one keyword
    const aiWords = new Set(aiNorm.split(' '));
    const recWords = recNorm.split(' ');
    const sharedWords = recWords.filter(w => w.length > 3 && aiWords.has(w));
    return sharedWords.length > 0 ? 60 : 40;
  }

  return 0;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { vehicle_id, make, model, year, severe_service, engine_type, file_url } = await req.json();

  if (!make || !model || !year) {
    return Response.json({ error: 'make, model, and year are required' }, { status: 400 });
  }

  const validTypes = ['oil_change', 'filter_change', 'tire_rotation', 'inspection', 'repair', 'cleaning', 'other'];

  // --- Step 1: Fetch existing maintenance records for this vehicle ---
  let existingRecords = [];
  if (vehicle_id) {
    existingRecords = await base44.asServiceRole.entities.MaintenanceRecord.filter({ vehicle_id });
    // Sort descending by performed_date so we always grab the most recent match
    existingRecords.sort((a, b) => {
      const da = a.performed_date ? new Date(a.performed_date) : new Date(0);
      const db = b.performed_date ? new Date(b.performed_date) : new Date(0);
      return db - da;
    });
  }

  // --- Step 2: Generate AI schedule ---
  let prompt = `You are a fleet maintenance expert. Generate a complete manufacturer-recommended maintenance schedule for a ${year} ${make} ${model}.

Schedule type requested: ${severe_service ? 'Severe Duty (frequent stop/start, towing, dusty conditions) — use the SEVERE SERVICE schedule intervals from the owner\'s manual where applicable' : 'Normal/Standard — use normal driving condition intervals'}.

For EVERY distinct maintenance task, return a JSON object with these fields:
- interval_name: descriptive name like "6-Month Oil Change" or "30k Mile Brake Inspection"
- maintenance_type: must be one of exactly: oil_change, filter_change, tire_rotation, inspection, repair, cleaning, other
- interval_months: number (months between service) or null if mileage-only
- interval_miles: number (miles between service) or null if time-only
- notes: cite the specific section, page, or chapter this comes from in the owner's manual (e.g. "Owner's Manual, Maintenance Schedule, Section 8-3, Severe Service"). If sourced from general knowledge, note "Based on ${year} ${make} ${model} factory maintenance schedule."

Do NOT include last_performed_date or last_performed_mileage in your output — those will be filled in separately from actual service history.

Return a JSON array of ALL maintenance tasks. Be thorough — include oil changes, filters (air, cabin, fuel, oil), tire rotation, brake inspection, transmission service, coolant flush, spark plugs, belts, battery, wiper blades, differential service, etc. as applicable.`;

  if (file_url) {
    prompt += `\n\nI am also providing the vehicle's owner's manual or maintenance guide as a file. Use it as the primary source and cite specific pages/sections in the notes field.`;
  }

  const llmParams = {
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        intervals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interval_name: { type: 'string' },
              maintenance_type: { type: 'string' },
              interval_months: { type: ['number', 'null'] },
              interval_miles: { type: ['number', 'null'] },
              notes: { type: 'string' },
            },
            required: ['interval_name', 'maintenance_type', 'notes'],
          },
        },
      },
      required: ['intervals'],
    },
  };

  if (file_url) {
    llmParams.file_urls = [file_url];
  }

  const result = await base44.integrations.Core.InvokeLLM(llmParams);

  // --- Step 3: For each AI interval, find the best matching maintenance record ---
  const intervals = (result.intervals || []).map(item => {
    const sanitized = {
      ...item,
      vehicle_id: vehicle_id || null,
      maintenance_type: validTypes.includes(item.maintenance_type) ? item.maintenance_type : 'other',
      interval_months: item.interval_months ? Number(item.interval_months) : null,
      interval_miles: item.interval_miles ? Number(item.interval_miles) : null,
      // Always start blank — will be filled only if a confident match is found
      last_performed_date: null,
      last_performed_mileage: null,
      _matched_record_id: null,
      _matched_record_title: null,
    };

    if (existingRecords.length > 0) {
      // Score every existing record against this AI interval
      let bestScore = 0;
      let bestRecord = null;

      for (const record of existingRecords) {
        const score = matchScore(
          sanitized.interval_name,
          sanitized.maintenance_type,
          record.title,
          record.maintenance_type
        );
        if (score > bestScore) {
          bestScore = score;
          bestRecord = record;
        }
      }

      // Only apply the match if confidence is high enough (score >= 40)
      if (bestScore >= 40 && bestRecord) {
        sanitized.last_performed_date = bestRecord.performed_date || null;
        sanitized.last_performed_mileage = bestRecord.odometer_reading
          ? Number(bestRecord.odometer_reading) || null
          : null;
        sanitized._matched_record_id = bestRecord.id;
        sanitized._matched_record_title = bestRecord.title;
        sanitized._match_score = bestScore;
      }
    }

    return sanitized;
  });

  return Response.json({ intervals });
});