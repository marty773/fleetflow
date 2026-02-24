import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Syncs one or all maintenance intervals to the "Vehicle Maintenance" calendar
// using the app connector (marty@fisherbackyardstructures.com's Google account)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { interval_id } = body;

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Get or create the Vehicle Maintenance calendar
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const calData = await calRes.json();
    let calendar = (calData.items || []).find(c => c.summary === 'Vehicle Maintenance');

    if (!calendar) {
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'Vehicle Maintenance', description: 'Fleet vehicle maintenance schedule', timeZone: 'America/New_York' }),
      });
      calendar = await createRes.json();
    }

    const calendarId = calendar.id;

    // Fetch intervals
    let intervals;
    if (interval_id) {
      const all = await base44.asServiceRole.entities.MaintenanceInterval.list();
      intervals = all.filter(i => i.id === interval_id);
    } else {
      intervals = await base44.asServiceRole.entities.MaintenanceInterval.list();
    }

    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const results = [];

    for (const interval of intervals) {
      if (!interval.next_due_date) continue;

      const vehicle = vehicleMap[interval.vehicle_id];
      const vehicleName = vehicle?.name || 'Unknown Vehicle';
      const company = vehicle?.company_id || '';

      let dateStr = interval.next_due_date;
      if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];

      let description = `Company: ${company}\nVehicle: ${vehicleName}\nMaintenance: ${interval.interval_name}\nType: ${interval.maintenance_type?.replace(/_/g, ' ')}`;
      if (interval.next_due_mileage) description += `\nDue at: ${interval.next_due_mileage} miles`;
      if (interval.notes) description += `\n\nNotes: ${interval.notes}`;

      const eventBody = {
        summary: `${vehicleName} - ${interval.interval_name}`,
        description,
        start: { date: dateStr },
        end: { date: dateStr },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 },
            { method: 'popup', minutes: 24 * 60 * 3 },
          ],
        },
      };

      // Update existing event or create new
      if (interval.google_event_id) {
        const updateRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${interval.google_event_id}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(eventBody),
          }
        );
        if (updateRes.ok) {
          results.push({ interval_id: interval.id, success: true });
        } else {
          // If not found, create new
          const postRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(eventBody),
            }
          );
          if (postRes.ok) {
            const created = await postRes.json();
            await base44.asServiceRole.entities.MaintenanceInterval.update(interval.id, { google_event_id: created.id });
            results.push({ interval_id: interval.id, event_id: created.id, success: true });
          } else {
            results.push({ interval_id: interval.id, success: false });
          }
        }
      } else {
        const postRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(eventBody),
          }
        );
        if (postRes.ok) {
          const created = await postRes.json();
          await base44.asServiceRole.entities.MaintenanceInterval.update(interval.id, { google_event_id: created.id });
          results.push({ interval_id: interval.id, event_id: created.id, success: true });
        } else {
          const err = await postRes.text();
          results.push({ interval_id: interval.id, success: false, error: err });
        }
      }
    }

    const synced = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return Response.json({ success: true, synced, failed, results });
  } catch (error) {
    console.error('syncMaintenanceToCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});