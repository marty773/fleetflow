import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  return tokens.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id, futureOnly = false, calendarId } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    const companyAuth = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ company_id });

    if (companyAuth.length === 0) {
      return Response.json({ error: 'Company calendar not connected' }, { status: 400 });
    }

    const auth = companyAuth[0];
    let accessToken = auth.calendar_access_token;

    if (new Date(auth.token_expires_at) < new Date()) {
      accessToken = await refreshAccessToken(auth.calendar_refresh_token);
      await base44.asServiceRole.entities.CompanyCalendarAuth.update(auth.id, {
        calendar_access_token: accessToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    }

    const appointments = await base44.entities.CalendarAppointment.filter({ company_id });
    const vehicles = await base44.entities.Vehicle.filter({ company_id });
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    let synced = 0;
    let skipped = 0;
    
    // Use provided calendarId or fall back to stored calendar_id or 'primary'
    const targetCalendarId = calendarId || auth.calendar_id || 'primary';
    
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

      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCalendarId}/events`, {
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