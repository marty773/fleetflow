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
      prompt: `Transform this receipt/document photo into a clean scan:
- ROTATE the image so all text reads upright (0°, 90°, 180°, or 270°)
- CROP tightly to remove ALL background - only the document should remain
- Fill the entire frame with just the document
- Slightly enhance contrast for readability
- Preserve all text and details exactly as shown
The output must be a properly oriented, tightly cropped document with no background visible.`,
      existing_image_urls: [fileUrl]
    });

    console.log('AI processing complete. URL:', aiResult.url);
    
    // Return the AI-processed image URL directly (no Drive upload for images)
    return Response.json({
      preview_url: aiResult.url,
      file_type: 'image',
      message: 'Image processed successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document' 
    }, { status: 500 });
  }
});