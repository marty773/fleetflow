import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Fetch company calendar auth
    const companyAuths = await base44.asServiceRole.entities.CompanyCalendarAuth.filter({ company_id });
    
    if (!companyAuths || companyAuths.length === 0) {
      return Response.json({ error: 'Company calendar not connected' }, { status: 400 });
    }

    const companyAuth = companyAuths[0];
    let accessToken = companyAuth.calendar_access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = companyAuth.token_expires_at ? new Date(companyAuth.token_expires_at) : null;
    if (!expiresAt || isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
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
      
      if (!refreshData.access_token) {
        return Response.json({ error: 'Failed to refresh token' }, { status: 500 });
      }
      
      accessToken = refreshData.access_token;

      // Update token in database
      const newExpiry = refreshData.expires_in ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();
      await base44.asServiceRole.entities.CompanyCalendarAuth.update(companyAuth.id, {
        calendar_access_token: accessToken,
        token_expires_at: newExpiry,
      });
    }

    // Fetch list of calendars
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to fetch calendars' }, { status: 500 });
    }

    const data = await response.json();
    const calendars = data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole
    })).filter(cal => cal.accessRole === 'owner' || cal.accessRole === 'writer');

    return Response.json({ calendars });
  } catch (error) {
    console.error('Error listing calendars:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});