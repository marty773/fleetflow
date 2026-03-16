import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { vehicle_id, make, model, year, schedule_type, file_url } = await req.json();

  if (!make || !model || !year) {
    return Response.json({ error: 'make, model, and year are required' }, { status: 400 });
  }

  const validTypes = ['oil_change', 'filter_change', 'tire_rotation', 'inspection', 'repair', 'cleaning', 'other'];

  let prompt = `You are a fleet maintenance expert. Generate a complete manufacturer-recommended maintenance schedule for a ${year} ${make} ${model}.

Schedule type requested: ${schedule_type === 'severe' ? 'Severe Duty (frequent stop/start, towing, dusty conditions)' : 'Normal/Standard'}.

For EVERY distinct maintenance task, return a JSON object with these fields:
- interval_name: descriptive name like "6-Month Oil Change" or "30k Mile Brake Inspection"
- maintenance_type: must be one of exactly: oil_change, filter_change, tire_rotation, inspection, repair, cleaning, other
- interval_months: number (months between service) or null if mileage-only
- interval_miles: number (miles between service) or null if time-only
- notes: cite the specific section, page, or chapter this comes from in the owner's manual (e.g. "Owner's Manual, Maintenance Schedule, Section 8-3, Severe Service"). If sourced from general knowledge, note "Based on ${year} ${make} ${model} factory maintenance schedule."

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

  // Validate and sanitize types
  const intervals = (result.intervals || []).map(item => ({
    ...item,
    vehicle_id: vehicle_id || null,
    maintenance_type: validTypes.includes(item.maintenance_type) ? item.maintenance_type : 'other',
    interval_months: item.interval_months ? Number(item.interval_months) : null,
    interval_miles: item.interval_miles ? Number(item.interval_miles) : null,
  }));

  return Response.json({ intervals });
});