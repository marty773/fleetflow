import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all items
    const items = await base44.asServiceRole.entities.Item.list();
    const itemsWithPhotos = items.filter(i => i.photo_url);

    if (itemsWithPhotos.length === 0) {
      return Response.json({ error: 'No inventory photos found' }, { status: 404 });
    }

    const zip = new JSZip();

    const downloads = itemsWithPhotos.map(async (item) => {
      try {
        const response = await fetch(item.photo_url);
        if (!response.ok) return;

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('pdf')) ext = 'pdf';

        const name = (item.name || 'unknown-item').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40);
        const filename = `${name}_${item.id.slice(-6)}.${ext}`;

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
        'Content-Disposition': `attachment; filename="inventory-photos-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});