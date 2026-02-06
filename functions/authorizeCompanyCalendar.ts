import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const REDIRECT_URI = Deno.env.get("BASE_URL") + "/api/functions/companyCalendarCallback";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { company_id } = await req.json();

    if (!company_id) {
      return Response.json({ error: 'company_id is required' }, { status: 400 });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events')}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(JSON.stringify({ company_id, user_email: user.email }))}`;

    return Response.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});