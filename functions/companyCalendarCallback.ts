import { createServiceRoleClient } from 'npm:@base44/sdk@0.8.6';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const REDIRECT_URI = Deno.env.get("BASE_URL") + "/api/functions/companyCalendarCallback";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('Company callback received:', { code: code?.substring(0, 10), state });

    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 });
    }

    const { company_id, user_email } = JSON.parse(state);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('Token response:', tokens);
      throw new Error('Failed to get access token');
    }

    console.log('Tokens received successfully');

    // Initialize Base44 client with service role credentials
    const base44 = createServiceRoleClient({
      appId: Deno.env.get("BASE44_APP_ID"),
      appOwner: Deno.env.get("BASE44_APP_OWNER")
    });

    const existing = await base44.entities.CompanyCalendarAuth.filter({ company_id });
    
    const authData = {
      company_id,
      calendar_access_token: tokens.access_token,
      calendar_refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      calendar_id: 'primary',
    };

    if (existing.length > 0) {
      await base44.entities.CompanyCalendarAuth.update(existing[0].id, authData);
    } else {
      await base44.entities.CompanyCalendarAuth.create(authData);
    }

    return new Response(
      `<html><body><script>window.close(); window.opener.postMessage({type: 'calendar_connected'}, '*');</script><p>Calendar connected! You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Error in callback:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});