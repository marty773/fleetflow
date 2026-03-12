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

    // v1/vehicle_locations returns vehicles with current_location embedded — single call needed
    const locRes = await fetch('https://api.gomotive.com/v1/vehicle_locations?per_page=100', { headers });
    const locData = locRes.ok ? await locRes.json() : { vehicles: [] };

    // Each item: { id, number, vin, make, model, year, current_location: { lat, lon, speed, ... }, current_driver, ... }
    const vehicles = (locData.vehicles || []).map(v => {
      const loc = v.current_location || {};
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
        // Fault codes
        fault_codes: v.active_fault_codes || [],
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