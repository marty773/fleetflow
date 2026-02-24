import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Entity automation: fires on CalendarAppointment create/update/delete
// Syncs to the "Vehicle Maintenance" calendar via app connector (marty's account)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data, old_data } = await req.json();

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

    // Handle delete
    if (event.type === 'delete' && old_data?.google_event_id) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${old_data.google_event_id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return Response.json({ success: true, message: 'Event deleted from calendar' });
    }

    const eventData = data || {};
    const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ id: eventData.vehicle_id });
    const vehicleName = vehicles?.[0]?.name || 'Vehicle';

    const googleEvent = {
      summary: `${eventData.title} - ${vehicleName}`,
      description: eventData.description || '',
      location: eventData.location || '',
      start: { date: eventData.appointment_date },
      end: { date: eventData.appointment_date },
    };

    if (eventData.appointment_time) {
      const dateTime = `${eventData.appointment_date}T${eventData.appointment_time}:00`;
      googleEvent.start = { dateTime, timeZone: 'America/New_York' };
      googleEvent.end = { dateTime, timeZone: 'America/New_York' };
    }

    if (event.type === 'update' && eventData.google_event_id) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventData.google_event_id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(googleEvent),
        }
      );
    } else {
      const postRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(googleEvent),
        }
      );
      if (postRes.ok) {
        const created = await postRes.json();
        await base44.asServiceRole.entities.CalendarAppointment.update(event.entity_id, { google_event_id: created.id });
      } else {
        const err = await postRes.text();
        console.error('Create appointment event error:', err);
      }
    }

    return Response.json({ success: true, message: 'Synced to Vehicle Maintenance calendar' });
  } catch (error) {
    console.error('autoSyncAppointmentToCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});