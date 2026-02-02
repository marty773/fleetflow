import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { interval_id } = await req.json();

    // Get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch intervals - either one specific or all
    let intervals;
    if (interval_id) {
      const interval = await base44.asServiceRole.entities.MaintenanceInterval.list();
      intervals = interval.filter(i => i.id === interval_id);
    } else {
      intervals = await base44.asServiceRole.entities.MaintenanceInterval.list();
    }

    // Fetch vehicles for vehicle names
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const results = [];

    for (const interval of intervals) {
      if (!interval.next_due_date) continue;

      const vehicle = vehicleMap[interval.vehicle_id];
      const vehicleName = vehicle?.name || 'Unknown Vehicle';
      
      // Create event description
      let description = `Maintenance: ${interval.interval_name}\n`;
      description += `Vehicle: ${vehicleName}\n`;
      description += `Type: ${interval.maintenance_type?.replace('_', ' ')}\n`;
      if (interval.next_due_mileage) {
        description += `Due at: ${interval.next_due_mileage} miles\n`;
      }
      if (interval.notes) {
        description += `\nNotes: ${interval.notes}`;
      }

      // Create calendar event
      const event = {
        summary: `${vehicleName} - ${interval.interval_name}`,
        description: description,
        start: {
          date: interval.next_due_date,
        },
        end: {
          date: interval.next_due_date,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 7 * 24 * 60 }, // 7 days before
            { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
          ],
        },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const createdEvent = await response.json();
        results.push({
          interval_id: interval.id,
          event_id: createdEvent.id,
          event_link: createdEvent.htmlLink,
          success: true,
        });
      } else {
        const error = await response.text();
        results.push({
          interval_id: interval.id,
          success: false,
          error: error,
        });
      }
    }

    return Response.json({
      success: true,
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});