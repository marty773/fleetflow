import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileUrl } = await req.json();
    
    if (!fileUrl) {
      return Response.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    // Use AI to process the document image
    const { url: processedImageUrl } = await base44.integrations.Core.GenerateImage({
      prompt: "Professional document scan: detect if upside-down/sideways and auto-rotate to correct orientation, crop precisely to document edges only, remove all background completely, straighten if tilted, enhance text contrast for maximum readability. Output clean white-background scan like a professional scanner.",
      existing_image_urls: [fileUrl]
    });

    // Return the processed image URL
    // The frontend will handle converting to PDF if needed
    return Response.json({ 
      processedImageUrl,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document' 
    }, { status: 500 });
  }
});