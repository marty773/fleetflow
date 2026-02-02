import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, userData } = await req.json();

    // If role is admin, company is not required
    if (userData.role === 'admin') {
      return Response.json({ valid: true });
    }

    // If role is not admin, company is required
    if (!userData.Company || userData.Company.length === 0) {
      return Response.json(
        { valid: false, error: 'Company is required for non-admin users' },
        { status: 400 }
      );
    }

    return Response.json({ valid: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});