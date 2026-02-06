import { createServiceRoleClient } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const REDIRECT_URI = `${Deno.env.get("BASE_URL")}/api/functions/calendarCallback`;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const userEmail = url.searchParams.get('state');

    console.log('Callback received:', { code: code?.substring(0, 10), userEmail });

    if (!code || !userEmail) {
      return new Response('Missing authorization code or user email', { status: 400 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return new Response('Failed to authorize', { status: 500 });
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');
    
    // Initialize Base44 client with service role credentials
    const base44 = createServiceRoleClient();
    
    // Calculate token expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Check if user already has a calendar auth record
    const existingAuths = await base44.entities.UserCalendarAuth.filter({ user_email: userEmail });
    
    if (existingAuths.length > 0) {
      // Update existing
      await base44.entities.UserCalendarAuth.update(existingAuths[0].id, {
        calendar_access_token: tokens.access_token,
        calendar_refresh_token: tokens.refresh_token || existingAuths[0].calendar_refresh_token,
        token_expires_at: expiresAt,
      });
    } else {
      // Create new
      await base44.entities.UserCalendarAuth.create({
        user_email: userEmail,
        calendar_access_token: tokens.access_token,
        calendar_refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
      });
    }

    // Redirect to calendar page with success message
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/Calendar?calendar_connected=true' },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response('Authorization failed', { status: 500 });
  }
});