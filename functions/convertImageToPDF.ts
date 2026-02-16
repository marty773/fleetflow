import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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

    // If the file is already a PDF, just upload it to Google Drive
    if (fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.includes('application/pdf')) {
      const driveUploadResponse = await base44.functions.invoke('uploadToGoogleDrive', {
        fileUrl: fileUrl,
        fileName: fileName || 'document.pdf'
      });
      return Response.json({
        preview_url: driveUploadResponse.data.preview_url,
        file_type: 'pdf',
        message: 'PDF uploaded to Google Drive successfully'
      });
    }

    // Fetch the image with proper headers
    const imageResponse = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Base44Bot/1.0)'
      }
    });
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Convert Blob to ArrayBuffer then to Base64 for jsPDF
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow on large images
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64String = btoa(binary);
    
    // Determine image type from blob or URL
    let imageType = imageBlob.type || 'image/jpeg';
    if (!imageType.startsWith('image/')) {
      imageType = 'image/jpeg';
    }
    
    const imageDataUrl = `data:${imageType};base64,${base64String}`;

    // Create a new PDF document
    const doc = new jsPDF();
    const imgProps = doc.getImageProperties(imageDataUrl);

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    // Calculate aspect ratio to fit image while maintaining proportions
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Add image to PDF, scaling to fit width and centering if needed
    if (imgHeight > pdfHeight) {
        // If image is taller than page, scale down to fit
        const scaledWidth = (imgProps.width * pdfHeight) / imgProps.height;
        doc.addImage(imageDataUrl, 'JPEG', (pdfWidth - scaledWidth) / 2, 0, scaledWidth, pdfHeight);
    } else {
        // If image is shorter than page, center it vertically
        doc.addImage(imageDataUrl, 'JPEG', 0, (pdfHeight - imgHeight) / 2, pdfWidth, imgHeight);
    }
    
    // Convert PDF to ArrayBuffer (Blob doesn't work directly with UploadFile)
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);
    
    // Create a File-like object from the PDF data
    const pdfFile = new File([pdfUint8Array], (fileName || 'document') + '.pdf', { 
      type: 'application/pdf' 
    });

    // Upload the PDF to base44 storage first
    const uploadedPdf = await base44.integrations.Core.UploadFile({ 
      file: pdfFile
    });

    // Upload the PDF from base44 storage to Google Drive
    const driveUploadResponse = await base44.functions.invoke('uploadToGoogleDrive', { 
        fileUrl: uploadedPdf.file_url,
        fileName: (fileName || 'document') + '.pdf'
    });
    
    return Response.json({ 
      preview_url: driveUploadResponse.data.preview_url,
      file_type: 'pdf',
      message: 'Document uploaded to Google Drive as PDF successfully'
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document' 
    }, { status: 500 });
  }
});