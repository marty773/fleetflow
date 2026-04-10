import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
    const { vehicle_id } = body; // optional: filter by motive vehicle ID

    const headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };

    // Fetch vehicle locations and fault codes in parallel
    const [locRes, faultRes] = await Promise.all([
      fetch('https://api.gomotive.com/v1/vehicle_locations?per_page=100', { headers }),
      fetch('https://api.gomotive.com/v1/fault_codes?per_page=100&status=active', { headers }),
    ]);

    const locData = locRes.ok ? await locRes.json() : { vehicles: [] };
    const faultData = faultRes.ok ? await faultRes.json() : {};

    // Build fault code map keyed by vehicle_id
    const faultCodesByVehicle = {};
    const rawFaultCodes = faultData.fault_codes || [];
    rawFaultCodes.forEach(fc => {
      const vid = fc.vehicle_id || fc.vehicle?.id;
      if (!vid) return;
      if (!faultCodesByVehicle[vid]) faultCodesByVehicle[vid] = [];
      faultCodesByVehicle[vid].push(fc);
    });

    const rawList = locData.vehicles || locData.vehicle_locations || [];

    const vehicles = rawList.map(entry => {
      const v = entry.vehicle || entry;
      const loc = v.current_location || entry.current_location || {};
      const dedicatedFaultCodes = faultCodesByVehicle[v.id] || [];
      // Prefer dedicated fault code endpoint; fall back to vehicle field
      const fault_codes = dedicatedFaultCodes.length > 0
        ? dedicatedFaultCodes
        : (v.active_fault_codes || []);
      return {
        motive_id: v.id,
        number: v.number,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        license_plate: v.license_plate_number,
        status: v.status,
        current_driver: v.current_driver,
        // Location
        lat: loc.lat,
        lon: loc.lon,
        located_at: loc.located_at,
        speed: loc.speed,
        bearing: loc.bearing,
        description: loc.description,
        location_type: loc.type,
        // Odometer / engine
        odometer: loc.odometer || loc.true_odometer,
        fuel_level: loc.fuel_primary_remaining_percentage,
        engine_hours: loc.engine_hours || loc.true_engine_hours,
        // Fault codes (from dedicated endpoint)
        fault_codes,
      };
    });

    // If specific motive vehicle id requested, filter
    if (vehicle_id) {
      const single = vehicles.find(v => String(v.motive_id) === String(vehicle_id));
      return Response.json({ success: true, vehicle: single || null });
    }

    return Response.json({ success: true, vehicles });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});