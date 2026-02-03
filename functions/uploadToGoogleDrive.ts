import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Upload to Google Drive
    const metadata = {
      name: fileName || file.name,
      mimeType: file.type,
    };

    const formDataUpload = new FormData();
    formDataUpload.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formDataUpload.append('file', file);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formDataUpload,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: `Drive upload failed: ${error}` }, { status: 500 });
    }

    const driveFile = await uploadResponse.json();

    // Make file accessible via link
    await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    return Response.json({
      file_id: driveFile.id,
      file_url: `https://drive.google.com/file/d/${driveFile.id}/view`,
      preview_url: `https://drive.google.com/file/d/${driveFile.id}/preview`,
      download_url: driveFile.webContentLink,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});