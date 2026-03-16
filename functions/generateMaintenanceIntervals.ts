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

// Keywords that indicate a service is a one-time milestone rather than recurring
const MILESTONE_KEYWORDS = [
  'inspection', 'major', 'complete', 'overhaul', 'initial', 'first',
  'warranty', 'recall', 'campaign', 'modification'
];

// Common recurring service frequencies (used to detect anomalies)
const TYPICAL_FREQUENCIES = {
  oil_change: [3, 5, 7, 10, 15, 20, 30],
  filter_change: [10, 15, 20, 25, 30, 45, 60],
  tire_rotation: [5, 7, 10, 15, 20, 25],
  inspection: [6, 12, 24, 36],
  transmission: [30, 50, 60, 100],
};

function guessType(name) {
  const norm = normalizeName(name);
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => norm.includes(kw))) return type;
  }
  return null;
}

// Detect if a service is likely a one-time milestone (e.g., "100,000 mile inspection")
function isMilestoneService(name, intervalMiles, intervalMonths, maintenance_type) {
  const norm = normalizeName(name);
  
  // Check for milestone keywords
  const hasMilestoneKeyword = MILESTONE_KEYWORDS.some(kw => norm.includes(kw));
  
  // Check for unusually large mileage intervals
  const isUnusuallyLarge = intervalMiles && (() => {
    const typical = TYPICAL_FREQUENCIES[maintenance_type] || [30, 60, 100];
    const isAnomalous = intervalMiles > Math.max(...typical) * 2;
    return isAnomalous;
  })();
  
  // If it has both a huge mileage AND is marked as an inspection/major service, it's likely a milestone
  if (hasMilestoneKeyword && isUnusuallyLarge) {
    return true;
  }
  
  // Services with only a mileage interval (no time-based) that are very large
  // (e.g., "100,000 mile engine inspection" with no interval_months)
  if (!intervalMonths && isUnusuallyLarge && hasMilestoneKeyword) {
    return true;
  }
  
  return false;
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
  const engineNote = engine_type === 'diesel'
    ? 'DIESEL ENGINE: Use diesel-specific intervals — diesel oil changes typically occur at shorter mileage intervals under severe duty, diesel fuel filters require more frequent replacement, glow plugs instead of spark plugs. FOR DIESEL ENGINES, ALWAYS include DEF/SCR system service intervals if applicable (e.g. Powerstroke, Duramax, Cummins) — capture the specific instructions or requirements (e.g., "DEF fluid level check", "SCR filter cleaning") in the notes field. Do NOT include gasoline-specific items like spark plugs.'
    : engine_type === 'gas'
    ? 'GASOLINE ENGINE: Use gasoline-specific intervals. Include spark plugs, ignition components as applicable. Do NOT include diesel-specific items like fuel water separator, glow plugs, or DEF system.'
    : 'Engine type not specified — generate intervals appropriate for the most common engine option for this vehicle.';

  const severeNote = severe_service
    ? 'SEVERE DUTY schedule: Use the severe/heavy-duty service intervals. PRIORITIZE MILEAGE-BASED intervals over time-based — set interval_miles whenever possible, and only use interval_months as a secondary fallback for tasks that have no mileage trigger. Shorter mileage intervals are expected for severe service.'
    : 'NORMAL service schedule: Use standard manufacturer intervals. Include both interval_months and interval_miles where the manufacturer specifies both.';

  let prompt = `You are a fleet maintenance expert. Generate a complete manufacturer-recommended RECURRING maintenance schedule for a ${year} ${make} ${model}.

  ENGINE TYPE: ${engineNote}

  SERVICE SCHEDULE TYPE: ${severeNote}

  IMPORTANT: Generate ONLY recurring maintenance tasks — NOT one-time milestones like "100,000 mile major inspection" or "first 1,000 mile break-in service". Focus on tasks that repeat regularly (oil changes, filter replacements, tire rotations, periodic inspections, etc.).

  For EVERY distinct recurring maintenance task, return a JSON object with these fields:
  - interval_name: descriptive name like "Oil Change" or "Air Filter Replacement" or "Every 10,000 Miles"
  - maintenance_type: must be one of exactly: oil_change, filter_change, tire_rotation, inspection, repair, cleaning, other
  - interval_months: number (months between service) or null — for severe service, only populate this when there is no applicable mileage trigger
  - interval_miles: number (miles between service) or null — for severe service, ALWAYS populate this when a mileage interval exists
  - notes: IMPORTANT - This field should include:
  * Specific source citation (e.g. "Owner's Manual, Section 8-3, Severe Service, Page 47") or "Based on ${year} ${make} ${model} factory maintenance schedule"
  * For services with special instructions (DEF systems, transmission flush procedures, etc.), include those instructions. For example: "DEF fluid level check and top-up as needed" or "Use OEM-approved diesel exhaust fluid (DEF) only"
  * Keep notes concise but informative

  Do NOT include last_performed_date or last_performed_mileage in your output — those will be filled in separately from actual service history.

  Return a JSON array of recurring maintenance tasks. Be thorough — include oil changes, filters (air, cabin, fuel, oil), tire rotation, brake inspection, transmission service, coolant flush, belts, battery, wiper blades, differential service, DEF system service (if diesel), etc. as applicable for the specified engine type.`;

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