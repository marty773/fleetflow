import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to get or create the "Vehicle Maintenance" calendar
// Returns the calendar ID
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // List all calendars
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = await listRes.json();
    const existing = (listData.items || []).find(c => c.summary === 'Vehicle Maintenance');

    if (existing) {
      return Response.json({ calendarId: existing.id });
    }

    // Create it
    const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Vehicle Maintenance',
        description: 'Scheduled maintenance intervals and appointments for all fleet vehicles.',
        timeZone: 'America/New_York',
      }),
    });

    const newCal = await createRes.json();
    return Response.json({ calendarId: newCal.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});