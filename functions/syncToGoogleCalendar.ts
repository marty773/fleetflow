import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, futureOnly = false } = await req.json();

    // Get the app connector OAuth token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    
    // Use the Vehicle Maintenance calendar
    const calendarId = 'c_10bb602c9c4c33dbbe38bebe8f98f2be393e13f7e1b183ce7f807347e799bc0d@group.calendar.google.com';

    // Fetch vehicles — filter by company_id if provided, otherwise get all
    const vehicleFilter = company_id ? { company_id } : {};
    const vehicles = await base44.asServiceRole.entities.Vehicle.filter(vehicleFilter);
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    // Fetch maintenance intervals and appointments — filter by company_id if provided
    const intervalFilter = company_id ? { company_id } : {};
    const appointmentFilter = company_id ? { company_id } : {};
    const intervals = await base44.asServiceRole.entities.MaintenanceInterval.filter(intervalFilter);
    const appointments = await base44.asServiceRole.entities.CalendarAppointment.filter(appointmentFilter);

    const today = new Date().toISOString().split('T')[0];
    let synced = 0;
    let skipped = 0;

    const createEvent = (eventData) =>
      fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }).then(async (res) => {
        if (!res.ok) console.error('Calendar API error:', await res.text());
      });

    // Build all event payloads first, then fire in parallel
    const eventPromises = [];

    for (const interval of intervals) {
      const calDate = interval.scheduled_date || interval.next_due_date;
      if (!calDate) { skipped++; continue; }
      if (futureOnly && calDate < today) { skipped++; continue; }
      const vehicle = vehicleMap[interval.vehicle_id];
      eventPromises.push(createEvent({
        summary: `${interval.interval_name} - ${vehicle?.name || 'Vehicle'}`,
        description: interval.notes || '',
        start: { date: calDate },
        end: { date: calDate },
      }));
      synced++;
    }

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
      eventPromises.push(createEvent(eventData));
      synced++;
    }

    await Promise.all(eventPromises);

    return Response.json({
      success: true,
      message: `Synced ${synced} events to Google Calendar${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});