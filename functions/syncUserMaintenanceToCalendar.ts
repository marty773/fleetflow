import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interval_id, futureOnly = false, calendarId = 'primary' } = await req.json();

    // Use app connector to get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Fetch intervals to sync
    let intervals;
    if (interval_id) {
      const interval = await base44.entities.MaintenanceInterval.filter({ id: interval_id });
      intervals = interval;
    } else {
      intervals = await base44.entities.MaintenanceInterval.list();
    }

    // Fetch all vehicles to get names
    const vehicles = await base44.entities.Vehicle.list();
    const vehicleMap = {};
    vehicles.forEach(v => {
      vehicleMap[v.id] = v.name;
    });

    const results = [];

    for (const interval of intervals) {
      if (!interval.next_due_date) {
        results.push({
          interval_id: interval.id,
          success: false,
          error: 'No next due date set',
        });
        continue;
      }

      // Skip past dates if futureOnly is enabled
      if (futureOnly && new Date(interval.next_due_date) < new Date()) {
        results.push({
          interval_id: interval.id,
          success: false,
          error: 'Skipped (past date)',
        });
        continue;
      }

      const vehicleName = vehicleMap[interval.vehicle_id] || 'Unknown Vehicle';
      
      const event = {
        summary: `${vehicleName} - ${interval.interval_name}`,
        description: `Maintenance due for ${vehicleName}\n\nType: ${interval.maintenance_type}\nInterval: ${interval.interval_name}${interval.notes ? '\n\nNotes: ' + interval.notes : ''}`,
        start: {
          date: interval.next_due_date,
        },
        end: {
          date: interval.next_due_date,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 },
            { method: 'popup', minutes: 24 * 60 * 3 },
          ],
        },
      };

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
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
        const errorText = await response.text();
        console.error('Calendar API error:', errorText, 'Event:', JSON.stringify(event));
        results.push({
          interval_id: interval.id,
          success: false,
          error: errorText,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return Response.json({
      message: `Synced ${successCount} maintenance interval(s) to your calendar${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});