import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, futureOnly = false } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const calendarId = 'c_10bb602c9c4c33dbbe38bebe8f98f2be393e13f7e1b183ce7f807347e799bc0d@group.calendar.google.com';

    const vehicleFilter = company_id ? { company_id } : {};
    const vehicles = await base44.asServiceRole.entities.Vehicle.filter(vehicleFilter);
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const intervalFilter = company_id ? { company_id } : {};
    const appointmentFilter = company_id ? { company_id } : {};
    const intervals = await base44.asServiceRole.entities.MaintenanceInterval.filter(intervalFilter);
    const appointments = await base44.asServiceRole.entities.CalendarAppointment.filter(appointmentFilter);

    const today = new Date().toISOString().split('T')[0];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const gcalHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    const calBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    // Fetch an existing event from Google Calendar
    const fetchEvent = async (eventId) => {
      const res = await fetch(`${calBase}/${eventId}`, { headers: gcalHeaders });
      if (res.status === 404 || res.status === 410) return null; // deleted/not found
      if (!res.ok) return null;
      return res.json();
    };

    // Check if event data has meaningfully changed
    const hasChanged = (existing, newData) => {
      const eStart = existing.start?.date || existing.start?.dateTime?.split('T')[0];
      const nStart = newData.start?.date || newData.start?.dateTime?.split('T')[0];
      return (
        existing.summary !== newData.summary ||
        (existing.description || '') !== (newData.description || '') ||
        (existing.location || '') !== (newData.location || '') ||
        eStart !== nStart
      );
    };

    const createEvent = async (eventData) => {
      const res = await fetch(calBase, {
        method: 'POST',
        headers: gcalHeaders,
        body: JSON.stringify(eventData),
      });
      if (!res.ok) { console.error('Create error:', await res.text()); return null; }
      return res.json();
    };

    const updateEvent = async (eventId, eventData) => {
      const res = await fetch(`${calBase}/${eventId}`, {
        method: 'PUT',
        headers: gcalHeaders,
        body: JSON.stringify(eventData),
      });
      if (!res.ok) console.error('Update error:', await res.text());
    };

    // Process intervals
    for (const interval of intervals) {
      const calDate = interval.scheduled_date || interval.next_due_date;
      if (!calDate) { skipped++; continue; }
      if (futureOnly && calDate < today) { skipped++; continue; }

      const vehicle = vehicleMap[interval.vehicle_id];
      const eventData = {
        summary: `${interval.interval_name} - ${vehicle?.name || 'Vehicle'}`,
        description: interval.notes || '',
        start: { date: calDate },
        end: { date: calDate },
      };

      if (interval.google_event_id) {
        const existing = await fetchEvent(interval.google_event_id);
        if (existing) {
          if (hasChanged(existing, eventData)) {
            await updateEvent(interval.google_event_id, eventData);
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        // Event was deleted in Google — fall through to create
      }

      // Create new event and store the ID
      const created_event = await createEvent(eventData);
      if (created_event?.id) {
        await base44.asServiceRole.entities.MaintenanceInterval.update(interval.id, {
          google_event_id: created_event.id,
        });
      }
      created++;
    }

    // Process appointments
    for (const appointment of appointments) {
      const calDate = appointment.appointment_date;
      if (!calDate) { skipped++; continue; }
      if (futureOnly && calDate < today) { skipped++; continue; }

      const vehicle = vehicleMap[appointment.vehicle_id];
      const eventData = {
        summary: `${appointment.title} - ${vehicle?.name || 'Vehicle'}`,
        description: appointment.description || '',
        location: appointment.location || '',
        start: { date: calDate },
        end: { date: calDate },
      };

      if (appointment.appointment_time) {
        const dateTime = `${calDate}T${appointment.appointment_time}:00`;
        eventData.start = { dateTime, timeZone: 'America/New_York' };
        eventData.end = { dateTime, timeZone: 'America/New_York' };
      }

      if (appointment.google_event_id) {
        const existing = await fetchEvent(appointment.google_event_id);
        if (existing) {
          if (hasChanged(existing, eventData)) {
            await updateEvent(appointment.google_event_id, eventData);
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
      }

      const created_event = await createEvent(eventData);
      if (created_event?.id) {
        await base44.asServiceRole.entities.CalendarAppointment.update(appointment.id, {
          google_event_id: created_event.id,
        });
      }
      created++;
    }

    const parts = [];
    if (created > 0) parts.push(`${created} created`);
    if (updated > 0) parts.push(`${updated} updated`);
    if (skipped > 0) parts.push(`${skipped} skipped`);

    return Response.json({
      success: true,
      message: `Calendar sync complete: ${parts.join(', ')}`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});