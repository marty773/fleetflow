import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Verify webhook secret from query parameter or body (for testing)
    const url = new URL(req.url);
    const webhookSecret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('Motivewebhook');

    const payload = await req.json();
    const bodySecret = payload.secret;

    // Accept secret from either URL param (Motive) or body (testing)
    if ((!webhookSecret || webhookSecret !== expectedSecret) && 
        (!bodySecret || bodySecret !== expectedSecret)) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Log the webhook event (for debugging)
    console.log('Motive webhook received:', JSON.stringify(payload, null, 2));

    // Extract event type from action or event_type field
    const event_type = payload.action || payload.event_type;
    const base44 = createClientFromRequest(req);

    // Handle different event types
    if (event_type === 'vehicle_upserted') {
      // Handle vehicle created/updated event
      const vehicleData = {
        company_id: "Fisher's Enterprise",
        name: payload.number || '',
        make: payload.make || '',
        model: payload.model || '',
        year: payload.year ? Number(payload.year) : null,
        license_plate: payload.license_plate_number || '',
        vin: payload.vin || '',
        type: 'truck',
        is_active: payload.status === 'active',
      };

      if (!vehicleData.vin) {
        return Response.json({ error: 'Missing VIN' }, { status: 400 });
      }

      // Check if vehicle exists by VIN
      const existingVehicles = await base44.asServiceRole.entities.Vehicle.filter({ vin: vehicleData.vin });

      if (existingVehicles.length > 0) {
        // Update existing vehicle
        await base44.asServiceRole.entities.Vehicle.update(existingVehicles[0].id, vehicleData);
        return Response.json({
          success: true,
          message: `Vehicle ${payload.trigger}d: ${vehicleData.name}`
        });
      } else {
        // Create new vehicle
        await base44.asServiceRole.entities.Vehicle.create(vehicleData);
        return Response.json({
          success: true,
          message: `Vehicle created: ${vehicleData.name}`
        });
      }
    } else if (event_type === 'inspection_report_upserted') {
      // Handle inspection report created/updated
      const vehicleVin = payload.vehicle?.vin;
      
      if (!vehicleVin) {
        return Response.json({ error: 'Missing vehicle VIN in inspection report' }, { status: 400 });
      }

      // Find the vehicle by VIN
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ vin: vehicleVin });
      
      if (vehicles.length === 0) {
        return Response.json({ error: `Vehicle not found with VIN: ${vehicleVin}` }, { status: 404 });
      }

      const vehicle = vehicles[0];

      // Build notes with defects information
      let notes = `Motive Inspection Report ID: ${payload.id}\n`;
      notes += `Status: ${payload.status}\n`;
      notes += `Location: ${payload.location || 'N/A'}\n`;
      notes += `Driver: ${payload.driver?.first_name} ${payload.driver?.last_name}\n`;
      
      if (payload.mechanic) {
        notes += `Mechanic: ${payload.mechanic.first_name} ${payload.mechanic.last_name}\n`;
      }
      
      if (payload.defects && payload.defects.length > 0) {
        notes += `\nDefects Found:\n`;
        payload.defects.forEach(defect => {
          notes += `- ${defect.category} (${defect.area})${defect.notes ? ': ' + defect.notes : ''}\n`;
        });
      }

      const maintenanceRecord = {
        company_id: "Fisher's Enterprise",
        vehicle_id: vehicle.id,
        title: `${payload.status === 'satisfactory' ? 'Passed' : 'Failed'} Inspection`,
        performed_date: payload.date,
        maintenance_type: 'inspection',
        vendor: payload.carrier_name || 'Motive',
        odometer_reading: payload.odometer?.toString() || '',
        notes: notes.trim()
      };

      // Check if maintenance record already exists by Motive inspection ID
      const existingRecords = await base44.asServiceRole.entities.MaintenanceRecord.filter({
        vehicle_id: vehicle.id,
        notes: { $regex: `Motive Inspection Report ID: ${payload.id}` }
      });

      if (payload.trigger === 'deleted' && existingRecords.length > 0) {
        await base44.asServiceRole.entities.MaintenanceRecord.delete(existingRecords[0].id);
        return Response.json({
          success: true,
          message: 'Inspection report deleted'
        });
      } else if (existingRecords.length > 0) {
        await base44.asServiceRole.entities.MaintenanceRecord.update(existingRecords[0].id, maintenanceRecord);
        return Response.json({
          success: true,
          message: 'Inspection report updated'
        });
      } else {
        await base44.asServiceRole.entities.MaintenanceRecord.create(maintenanceRecord);
        return Response.json({
          success: true,
          message: 'Inspection report created'
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Webhook received' 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});