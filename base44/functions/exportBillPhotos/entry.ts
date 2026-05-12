import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all bills
    const bills = await base44.asServiceRole.entities.Bill.list();
    const billsWithPhotos = bills.filter(b => b.photo_url);

    if (billsWithPhotos.length === 0) {
      return Response.json({ error: 'No bill photos found' }, { status: 404 });
    }

    const zip = new JSZip();

    // Download each photo and add to zip
    const downloads = billsWithPhotos.map(async (bill) => {
      try {
        const response = await fetch(bill.photo_url);
        if (!response.ok) return;

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Determine extension
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('pdf')) ext = 'pdf';

        // Build filename: date_vendor_id
        const date = bill.bill_date || 'unknown-date';
        const vendor = (bill.vendor || 'unknown-vendor').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);
        const filename = `${date}_${vendor}_${bill.id.slice(-6)}.${ext}`;

        zip.file(filename, buffer);
      } catch {
        // Skip failed downloads silently
      }
    });

    await Promise.all(downloads);

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="bill-photos-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});