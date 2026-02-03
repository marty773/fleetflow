import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Verify webhook secret from query parameter or body (for testing)
    const url = new URL(req.url);
    const webhookSecret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('Motivewebhook');

    const payload = await req.json();
    const bodySecret = payload.secret;

    // Accept secret from either URL param (Motive) or body (testing)
    if ((!webhookSecret || webhookSecret !== expectedSecret) && 
        (!bodySecret || bodySecret !== expectedSecret)) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Log the webhook event (for debugging)
    console.log('Motive webhook received:', JSON.stringify(payload, null, 2));

    // Extract event data
    const { event_type, data } = payload;

    // Handle different event types
    if (event_type === 'maintenance.inspection.completed') {
      const base44 = createClientFromRequest(req);
      
      // Create maintenance record from inspection data
      const maintenanceRecord = {
        company_id: "Fisher's Enterprise", // You may need to determine this dynamically
        vehicle_id: data.vehicle_id || '',
        title: data.inspection_type || 'Inspection',
        performed_date: data.completed_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        maintenance_type: 'inspection',
        vendor: 'Motive',
        notes: data.notes || `Motive inspection ID: ${data.id}`
      };

      // Create the record
      await base44.entities.MaintenanceRecord.create(maintenanceRecord);
      
      return Response.json({ 
        success: true, 
        message: 'Maintenance record created from inspection' 
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Webhook received' 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});