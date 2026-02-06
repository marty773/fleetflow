import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();

    // Skip if no next_due_date
    if (!data?.next_due_date && event.type !== 'delete') {
      return Response.json({ message: 'No next_due_date, skipping sync' });
    }

    // Get company from vehicle
    const vehicle = await base44.asServiceRole.entities.Vehicle.filter({ id: data?.vehicle_id || old_data?.vehicle_id });
    if (!vehicle || vehicle.length === 0) {
      return Response.json({ message: 'Vehicle not found' });
    }

    const companyId = vehicle[0].company_id;

    // Get company calendar auth
    const companyAuths = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ 
      company_id: companyId 
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

    // Handle create or update
    if (event.type === 'create' || event.type === 'update') {
      const eventData = {
        summary: `${vehicle[0].name} - ${data.interval_name}`,
        description: `Maintenance due for ${vehicle[0].name}\n\nType: ${data.maintenance_type}\nInterval: ${data.interval_name}${data.notes ? '\n\nNotes: ' + data.notes : ''}`,
        start: {
          date: data.next_due_date,
        },
        end: {
          date: data.next_due_date,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 },
            { method: 'popup', minutes: 24 * 60 * 3 },
          ],
        },
      };

      if (event.type === 'create') {
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
          await base44.asServiceRole.entities.MaintenanceInterval.update(event.entity_id, {
            google_event_id: createdEvent.id,
          });
        }
      } else if (event.type === 'update' && data.google_event_id) {
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