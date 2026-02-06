import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, company_id } = await req.json(); // type: 'user' or 'company'

    const webhookUrl = `${Deno.env.get('BASE_URL')}/functions/googleCalendarWebhook`;

    if (type === 'company') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const companyAuths = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ company_id });
      if (!companyAuths || companyAuths.length === 0) {
        return Response.json({ error: 'Company calendar not connected' }, { status: 400 });
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
      const channelId = `company-${company_id}-${Date.now()}`;
      
      // Set up watch (expires in 1 week, max allowed by Google)
      const watchResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/watch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
          }),
        }
      );

      if (!watchResponse.ok) {
        const error = await watchResponse.text();
        return Response.json({ error: `Failed to set up watch: ${error}` }, { status: 500 });
      }

      const watchData = await watchResponse.json();

      return Response.json({
        message: 'Calendar watch set up successfully',
        channelId: watchData.id,
        resourceId: watchData.resourceId,
        expiration: new Date(parseInt(watchData.expiration)),
      });
    } else {
      // User calendar
      const userAuths = await base44.asServiceRole.entities.UserCalendarAuth.filter({ user_email: user.email });
      if (!userAuths || userAuths.length === 0) {
        return Response.json({ error: 'Calendar not connected' }, { status: 400 });
      }

      const userAuth = userAuths[0];
      let accessToken = userAuth.calendar_access_token;

      // Refresh token if expired
      if (new Date(userAuth.token_expires_at) <= new Date()) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
            refresh_token: userAuth.calendar_refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        await base44.asServiceRole.entities.UserCalendarAuth.update(userAuth.id, {
          calendar_access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        });
      }

      const channelId = `user-${user.email}-${Date.now()}`;

      const watchResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            expiration: Date.now() + (7 * 24 * 60 * 60 * 1000),
          }),
        }
      );

      if (!watchResponse.ok) {
        const error = await watchResponse.text();
        return Response.json({ error: `Failed to set up watch: ${error}` }, { status: 500 });
      }

      const watchData = await watchResponse.json();

      return Response.json({
        message: 'Calendar watch set up successfully',
        channelId: watchData.id,
        resourceId: watchData.resourceId,
        expiration: new Date(parseInt(watchData.expiration)),
      });
    }
  } catch (error) {
    console.error('Setup watch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});