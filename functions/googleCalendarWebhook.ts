import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Google Calendar sends notifications via POST with specific headers
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const resourceId = req.headers.get('x-goog-resource-id');

    console.log('Calendar webhook received:', { channelId, resourceState, resourceId });

    // Acknowledge receipt immediately
    if (resourceState === 'sync') {
      return new Response('OK', { status: 200 });
    }

    // Only process if there are actual changes
    if (resourceState !== 'exists') {
      return new Response('OK', { status: 200 });
    }

    const base44 = createClientFromRequest(req);

    // Determine which calendar this is for (user or company)
    const isCompany = channelId?.startsWith('company-');
    
    if (isCompany) {
      const companyId = channelId.replace('company-', '').split('-')[0];
      
      // Fetch company calendar auth
      const companyAuths = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ company_id: companyId });
      if (!companyAuths || companyAuths.length === 0) {
        return new Response('OK', { status: 200 });
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

      // Fetch events from Google Calendar
      const calendarId = companyAuth.calendar_id || 'primary';
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${new Date().toISOString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const events = data.items || [];

        // Get existing appointments
        const existingAppointments = await base44.asServiceRole.entities.CalendarAppointment.filter({ company_id: companyId });
        const existingMap = new Map(existingAppointments.map(a => [a.google_event_id, a]));

        // Sync events to app
        for (const event of events) {
          const existing = existingMap.get(event.id);
          
          const appointmentData = {
            company_id: companyId,
            title: event.summary || 'Untitled',
            description: event.description || '',
            appointment_date: event.start?.date || event.start?.dateTime?.split('T')[0],
            appointment_time: event.start?.dateTime ? event.start.dateTime.split('T')[1].substring(0, 5) : null,
            location: event.location || '',
            google_event_id: event.id,
          };

          if (!existing) {
            // Create new appointment
            await base44.asServiceRole.entities.CalendarAppointment.create(appointmentData);
          } else if (event.status === 'cancelled') {
            // Delete if cancelled
            await base44.asServiceRole.entities.CalendarAppointment.delete(existing.id);
          } else {
            // Update existing
            await base44.asServiceRole.entities.CalendarAppointment.update(existing.id, appointmentData);
          }
        }
      }
    } else {
      // User calendar webhook - similar logic for maintenance intervals
      const userEmail = channelId?.replace('user-', '').split('-')[0];
      
      const userAuths = await base44.asServiceRole.entities.UserCalendarAuth.filter({ user_email: userEmail });
      if (!userAuths || userAuths.length === 0) {
        return new Response('OK', { status: 200 });
      }

      // Similar sync logic for maintenance intervals
      // (Implementation would be similar to above but for MaintenanceInterval entity)
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 }); // Always return 200 to avoid retries
  }
});