import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();

    // Get company calendar auth
    const companyAuths = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ 
      company_id: data.company_id 
    });

    if (!companyAuths || companyAuths.length === 0) {
      return Response.json({ message: 'Company calendar not connected, skipping sync' });
    }

    const companyAuth = companyAuths[0];
    let accessToken = companyAuth.calendar_access_token;

    // Refresh token if expired
    if (new Date(companyAuth.token_expires_at) <= new Date()) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
          refresh_token: companyAuth.calendar_refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      await base44.asServiceRole.entities.CompanyCalendarAuth.update(companyAuth.id, {
        calendar_access_token: accessToken,
        token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      });
    }

    const calendarId = companyAuth.calendar_id || 'primary';

    // Handle create
    if (event.type === 'create') {
      const vehicle = await base44.asServiceRole.entities.Vehicle.filter({ id: data.vehicle_id });
      const vehicleName = vehicle?.[0]?.name || 'Vehicle';

      const eventData = {
        summary: `${data.title} - ${vehicleName}`,
        description: data.description || '',
        location: data.location || '',
        start: {
          date: data.appointment_date,
        },
        end: {
          date: data.appointment_date,
        },
      };

      if (data.appointment_time) {
        const dateTime = `${data.appointment_date}T${data.appointment_time}:00`;
        eventData.start = { dateTime, timeZone: 'America/New_York' };
        eventData.end = { dateTime, timeZone: 'America/New_York' };
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (response.ok) {
        const createdEvent = await response.json();
        // Store Google event ID for future updates/deletes
        await base44.asServiceRole.entities.CalendarAppointment.update(event.entity_id, {
          google_event_id: createdEvent.id,
        });
      }
    }

    // Handle update
    if (event.type === 'update' && data.google_event_id) {
      const vehicle = await base44.asServiceRole.entities.Vehicle.filter({ id: data.vehicle_id });
      const vehicleName = vehicle?.[0]?.name || 'Vehicle';

      const eventData = {
        summary: `${data.title} - ${vehicleName}`,
        description: data.description || '',
        location: data.location || '',
        start: {
          date: data.appointment_date,
        },
        end: {
          date: data.appointment_date,
        },
      };

      if (data.appointment_time) {
        const dateTime = `${data.appointment_date}T${data.appointment_time}:00`;
        eventData.start = { dateTime, timeZone: 'America/New_York' };
        eventData.end = { dateTime, timeZone: 'America/New_York' };
      }

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${data.google_event_id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );
    }

    // Handle delete
    if (event.type === 'delete' && old_data?.google_event_id) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${old_data.google_event_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    }

    return Response.json({ success: true, message: 'Synced to Google Calendar' });
  } catch (error) {
    console.error('Auto sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});