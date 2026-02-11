import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId } = await req.json();

    // Fetch maintenance record
    const allRecords = await base44.entities.MaintenanceRecord.list();
    const record = allRecords.find(r => r.id === recordId);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // Fetch vehicle details
    const allVehicles = await base44.entities.Vehicle.list();
    const vehicle = allVehicles.find(v => v.id === record.vehicle_id);

    // Fetch all items to get vendor and item numbers
    const allItems = await base44.entities.Item.list();
    const itemsMap = {};
    allItems.forEach(item => {
      itemsMap[item.id] = item;
    });

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Maintenance Record', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Record details
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    // Vehicle info
    doc.setFont(undefined, 'bold');
    doc.text('Vehicle:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(vehicle ? `${vehicle.name} (${vehicle.license_plate || 'N/A'})` : 'N/A', 60, yPos);
    yPos += 8;

    // Maintenance type
    doc.setFont(undefined, 'bold');
    doc.text('Type:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(record.maintenance_type?.replace('_', ' ') || 'N/A', 60, yPos);
    yPos += 8;

    // Title
    doc.setFont(undefined, 'bold');
    doc.text('Title:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(record.title || 'N/A', 60, yPos);
    yPos += 8;

    // Date
    doc.setFont(undefined, 'bold');
    doc.text('Date:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(record.performed_date || 'N/A', 60, yPos);
    yPos += 8;

    // Vendor
    doc.setFont(undefined, 'bold');
    doc.text('Service Provider:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(record.vendor || 'N/A', 60, yPos);
    yPos += 8;

    // Odometer
    doc.setFont(undefined, 'bold');
    doc.text('Odometer:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(record.odometer_reading ? `${record.odometer_reading} miles` : 'N/A', 60, yPos);
    yPos += 15;

    // Work items
    if (record.work_items && record.work_items.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(13);
      doc.text('Work Performed:', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      // Table headers
      doc.setFont(undefined, 'bold');
      doc.text('Description', 20, yPos);
      doc.text('Item Number', 80, yPos);
      doc.text('Qty', 135, yPos);
      doc.text('Price', 155, yPos);
      doc.text('Total', 180, yPos);
      yPos += 2;
      doc.line(20, yPos, 200, yPos);
      yPos += 6;

      // Build a map of item_id -> quantity from parts_used for matching
      const partsUsedMap = {};
      if (record.parts_used) {
        record.parts_used.forEach(part => {
          if (!partsUsedMap[part.item_id]) {
            partsUsedMap[part.item_id] = 0;
          }
          partsUsedMap[part.item_id] += part.quantity_used;
        });
      }

      // Table rows
      doc.setFont(undefined, 'normal');
      record.work_items.forEach(item => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Description
        const description = item.description || '';
        const splitDescription = doc.splitTextToSize(description, 55);
        doc.text(splitDescription, 20, yPos);

        // Item Number - check both item.item_id and match from parts_used
        let itemNumber = '-';
        let matchedItemId = item.item_id;
        
        // If no direct item_id, try to match from parts_used by quantity
        if (!matchedItemId) {
          for (const [itemId, qty] of Object.entries(partsUsedMap)) {
            if (qty === item.quantity) {
              matchedItemId = itemId;
              delete partsUsedMap[itemId]; // Remove to avoid double matching
              break;
            }
          }
        }
        
        if (matchedItemId && itemsMap[matchedItemId]) {
          const stockItem = itemsMap[matchedItemId];
          itemNumber = stockItem.item_number || '-';
        }
        
        const splitItemNumber = doc.splitTextToSize(itemNumber, 50);
        doc.text(splitItemNumber, 80, yPos);

        // Quantity, Price, Total
        doc.text(String(item.quantity || 0), 135, yPos);
        doc.text(`$${(item.unit_price || 0).toFixed(2)}`, 155, yPos);
        doc.text(`$${(item.total || 0).toFixed(2)}`, 180, yPos);

        const lineHeight = Math.max(splitDescription.length, splitItemNumber.length) * 5;
        yPos += lineHeight + 3;
      });

      // Total
      yPos += 5;
      doc.line(20, yPos, 200, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold');
      doc.text('Total Cost:', 160, yPos);
      doc.text(`$${(record.total_cost || 0).toFixed(2)}`, 180, yPos);
      yPos += 12;
    }

    // Notes
    if (record.notes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(record.notes, 170);
      doc.text(splitNotes, 20, yPos);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=maintenance_${record.title?.replace(/[^a-z0-9]/gi, '_')}_${record.performed_date}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});