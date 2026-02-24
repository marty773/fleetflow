import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Entity automation: fires on MaintenanceInterval create/update/delete
// Syncs to the "Vehicle Maintenance" calendar via app connector (marty's account)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data, old_data } = await req.json();

    if (!data?.next_due_date && event.type !== 'delete') {
      return Response.json({ message: 'No next_due_date, skipping sync' });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Get or create Vehicle Maintenance calendar
    const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const calListData = await calListRes.json();
    let calendar = (calListData.items || []).find(c => c.summary === 'Vehicle Maintenance');

    if (!calendar) {
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'Vehicle Maintenance', description: 'Fleet vehicle maintenance schedule', timeZone: 'America/New_York' }),
      });
      calendar = await createRes.json();
    }

    const calendarId = calendar.id;

    // Get vehicle info
    const vehicleId = data?.vehicle_id || old_data?.vehicle_id;
    const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ id: vehicleId });
    const vehicle = vehicles?.[0];
    const vehicleName = vehicle?.name || 'Unknown Vehicle';
    const company = vehicle?.company_id || '';

    // Handle delete
    if (event.type === 'delete' && old_data?.google_event_id) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${old_data.google_event_id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return Response.json({ success: true, message: 'Event deleted from calendar' });
    }

    // Build event
    let dateStr = data.next_due_date;
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];

    let description = `Company: ${company}\nVehicle: ${vehicleName}\nMaintenance: ${data.interval_name}\nType: ${data.maintenance_type?.replace(/_/g, ' ')}`;
    if (data.next_due_mileage) description += `\nDue at: ${data.next_due_mileage} miles`;
    if (data.notes) description += `\n\nNotes: ${data.notes}`;

    const eventBody = {
      summary: `${vehicleName} - ${data.interval_name}`,
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

    if (event.type === 'update' && data.google_event_id) {
      const updateRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${data.google_event_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        console.error('Update event error:', err);
      }
    } else {
      // Create new event
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
        await base44.asServiceRole.entities.MaintenanceInterval.update(event.entity_id, { google_event_id: created.id });
      } else {
        const err = await postRes.text();
        console.error('Create event error:', err);
      }
    }

    return Response.json({ success: true, message: 'Synced to Vehicle Maintenance calendar' });
  } catch (error) {
    console.error('autoSyncIntervalToCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});