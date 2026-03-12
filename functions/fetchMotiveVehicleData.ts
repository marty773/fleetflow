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

    // Fetch all vehicles with current locations from Motive
    const [vehiclesRes, locationsRes] = await Promise.all([
      fetch('https://api.gomotive.com/v1/vehicles?per_page=100', { headers }),
      fetch('https://api.gomotive.com/v1/vehicle_locations?per_page=100', { headers })
    ]);

    const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : { vehicles: [] };
    const locationsData = locationsRes.ok ? await locationsRes.json() : { vehicle_locations: [] };

    // Build location map keyed by vehicle id
    const locationMap = {};
    for (const loc of (locationsData.vehicle_locations || [])) {
      const vid = loc.id || loc.vehicle?.id;
      if (vid) locationMap[vid] = loc;
    }

    // Merge vehicle info with location data
    const vehicles = (vehiclesData.vehicles || []).map(v => {
      const vData = v.vehicle || v;
      const loc = locationMap[vData.id] || {};
      const locData = loc.location || loc;
      return {
        motive_id: vData.id,
        number: vData.number,
        make: vData.make,
        model: vData.model,
        year: vData.year,
        vin: vData.vin,
        license_plate: vData.license_plate_number,
        status: vData.status,
        current_driver: vData.current_driver,
        // Location
        lat: locData.lat,
        lon: locData.lon,
        located_at: locData.located_at,
        speed: locData.speed,
        bearing: locData.bearing,
        // Odometer / engine
        odometer: vData.odometer,
        fuel_level: vData.fuel_level_percent,
        engine_hours: vData.engine_hours,
        // Engine fault codes
        fault_codes: vData.active_fault_codes || [],
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