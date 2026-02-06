import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use app connector to get access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

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