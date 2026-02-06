import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build redirect URI from the current request URL
    const requestUrl = new URL(req.url);
    const REDIRECT_URI = `${requestUrl.protocol}//${requestUrl.host}/api/functions/calendarCallback`;

    // Generate authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', user.email);

    return Response.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});