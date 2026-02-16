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

    // If it's a PDF, just upload directly without processing
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      const driveUploadResponse = await base44.functions.invoke('uploadToGoogleDrive', {
        fileUrl: fileUrl,
        fileName: fileName || 'document'
      });
      
      return Response.json({
        preview_url: driveUploadResponse.data.preview_url,
        file_type: 'pdf',
        message: 'PDF uploaded to Google Drive successfully'
      });
    }

    // For images: Use AI to crop background and fix orientation
    console.log('Processing image with AI...');
    const aiResult = await base44.integrations.Core.GenerateImage({
      prompt: `Clean up this receipt/document image by:
1. Rotating it to the correct upright orientation if needed
2. Cropping out any background, keeping only the document/receipt itself
3. Enhance contrast slightly for better readability
Keep all text and details intact. Output should be a clean, properly oriented document scan.`,
      existing_image_urls: [fileUrl]
    });

    console.log('AI processing complete, uploading to Drive...');
    
    // Upload the AI-processed image to Google Drive
    const driveUploadResponse = await base44.functions.invoke('uploadToGoogleDrive', {
      fileUrl: aiResult.url,
      fileName: fileName || 'receipt'
    });
    
    return Response.json({
      preview_url: driveUploadResponse.data.preview_url,
      file_type: 'image',
      message: 'Image processed and uploaded successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document' 
    }, { status: 500 });
  }
});