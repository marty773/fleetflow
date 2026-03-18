import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('MOTIVE_API_KEY');
    const accountId = Deno.env.get('MOTIVE_ACCOUNT_ID');

    if (!apiKey || !accountId) {
      return Response.json({ error: 'Missing API credentials' }, { status: 500 });
    }

    // Extract account ID from email if needed
    const cleanAccountId = accountId.includes('@') ? accountId.split('@')[0].replace(/\./g, '') : accountId;

    // Fetch maintenance inspections from Motive
    const response = await fetch(
      `https://api.gomotive.com/v1/inspection_reports`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json(
        { error: `Motive API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      success: true,
      inspections: data.inspection_reports || [],
      count: data.inspection_reports?.length || 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});