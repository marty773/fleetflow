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
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
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

    // Fetch the image
    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
    }
    const imageBlob = await imageResponse.blob();
    
    // Convert Blob to ArrayBuffer then to Base64 for jsPDF
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageDataUrl = `data:${imageBlob.type};base64,${base64String}`;

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
    
    // Convert PDF to Blob
    const pdfBlob = doc.output('blob');

    // Upload the PDF blob to base44 storage first
    const uploadedPdf = await base44.integrations.Core.UploadFile({ 
      file: pdfBlob
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