import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl, fileName } = await req.json();
    
    if (!fileUrl) {
      return Response.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    // Simple approach: just upload the file directly to Google Drive
    // No AI processing, no complex transformations
    const driveUploadResponse = await base44.functions.invoke('uploadToGoogleDrive', {
      fileUrl: fileUrl,
      fileName: fileName || 'document'
    });
    
    return Response.json({
      preview_url: driveUploadResponse.data.preview_url,
      file_type: fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
      message: 'Document uploaded to Google Drive successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document' 
    }, { status: 500 });
  }
});