import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('MOTIVE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing Motive API key' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { vehicle_id } = body;

    const headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };

    // Fetch vehicle locations and fault codes in parallel
    const [locRes, faultRes] = await Promise.all([
      fetch('https://api.gomotive.com/v1/vehicle_locations?per_page=100', { headers }),
      fetch('https://api.gomotive.com/v1/fault_codes?per_page=100', { headers }),
    ]);

    const locData = locRes.ok ? await locRes.json() : {};
    const faultData = faultRes.ok ? await faultRes.json() : {};

    // Build a map of vehicle_id -> fault codes
    // Motive wraps each item as { fault_code: { ... } }
    const faultMap = {};
    const rawFaults = faultData.fault_codes || [];
    rawFaults.forEach(entry => {
      const fc = entry.fault_code || entry;
      const vid = fc.vehicle?.id;
      if (!vid) return;
      if (!faultMap[vid]) faultMap[vid] = [];
      faultMap[vid].push({
        code: fc.code_label || fc.code || '',
        description: fc.code_description || fc.fmi_description || '',
        status: fc.status || '',
        first_observed_at: fc.first_observed_at,
        last_observed_at: fc.last_observed_at,
        network: fc.network || '',
      });
    });

    const rawList = locData.vehicles || locData.vehicle_locations || [];

    const vehicles = rawList.map(entry => {
      const v = entry.vehicle || entry;
      const loc = v.current_location || entry.current_location || {};
      const vid = v.id;
      return {
        motive_id: vid,
        number: v.number,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        license_plate: v.license_plate_number,
        status: v.status,
        current_driver: v.current_driver,
        lat: loc.lat,
        lon: loc.lon,
        located_at: loc.located_at,
        speed: loc.speed,
        bearing: loc.bearing,
        description: loc.description,
        location_type: loc.type,
        odometer: loc.odometer || loc.true_odometer,
        fuel_level: loc.fuel_primary_remaining_percentage,
        engine_hours: loc.engine_hours || loc.true_engine_hours,
        fault_codes: faultMap[vid] || [],
      };
    });

    if (vehicle_id) {
      const single = vehicles.find(v => String(v.motive_id) === String(vehicle_id));
      return Response.json({ success: true, vehicle: single || null });
    }

    return Response.json({ success: true, vehicles });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});