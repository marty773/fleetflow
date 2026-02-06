import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, futureOnly = false, calendarId = 'primary' } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Use app connector to get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    const appointments = await base44.entities.CalendarAppointment.filter({ company_id });
    const vehicles = await base44.entities.Vehicle.filter({ company_id });
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    let synced = 0;
    let skipped = 0;
    
    for (const appointment of appointments) {
      // Skip past dates if futureOnly is enabled
      if (futureOnly && new Date(appointment.appointment_date) < new Date()) {
        skipped++;
        continue;
      }

      const vehicle = vehicleMap[appointment.vehicle_id];
      const eventData = {
        summary: `${appointment.title} - ${vehicle?.name || 'Vehicle'}`,
        description: appointment.description || '',
        location: appointment.location || '',
        start: {
          date: appointment.appointment_date,
        },
        end: {
          date: appointment.appointment_date,
        },
      };

      if (appointment.appointment_time) {
        const dateTime = `${appointment.appointment_date}T${appointment.appointment_time}:00`;
        eventData.start = { dateTime, timeZone: 'America/New_York' };
        eventData.end = { dateTime, timeZone: 'America/New_York' };
      }

      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      synced++;
    }

    return Response.json({ 
      success: true, 
      message: `Synced ${synced} appointments to company calendar${skipped > 0 ? ` (${skipped} past appointments skipped)` : ''}`
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});