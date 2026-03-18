import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all bills and items
    const bills = await base44.entities.Bill.list();
    const items = await base44.entities.Item.list();

    const itemMap = {};
    items.forEach(item => {
      itemMap[item.id] = item;
    });

    const corrections = [];
    const itemAdjustments = {};

    // Find all line items where an item was assigned to a vehicle (meaning it was used, not added to inventory)
    bills.forEach(bill => {
      if (bill.line_items && Array.isArray(bill.line_items)) {
        bill.line_items.forEach(lineItem => {
          if (lineItem.item_id && lineItem.vehicle_id && lineItem.item_quantity > 0) {
            // This item was incorrectly added to inventory, need to subtract it
            if (!itemAdjustments[lineItem.item_id]) {
              itemAdjustments[lineItem.item_id] = 0;
            }
            itemAdjustments[lineItem.item_id] -= lineItem.item_quantity;
            
            corrections.push({
              bill_id: bill.id,
              bill_vendor: bill.vendor,
              bill_date: bill.bill_date,
              item_id: lineItem.item_id,
              item_name: itemMap[lineItem.item_id]?.name || 'Unknown',
              quantity_to_subtract: lineItem.item_quantity,
              description: lineItem.description
            });
          }
        });
      }
    });

    // Apply corrections to inventory
    const updates = [];
    for (const [item_id, adjustment] of Object.entries(itemAdjustments)) {
      const item = itemMap[item_id];
      if (item) {
        const newQuantity = (item.quantity_on_hand || 0) + adjustment;
        await base44.entities.Item.update(item_id, { 
          quantity_on_hand: Math.max(0, newQuantity) // Don't go below 0
        });
        updates.push({
          item_id,
          item_name: item.name,
          old_quantity: item.quantity_on_hand || 0,
          adjustment,
          new_quantity: Math.max(0, newQuantity)
        });
      }
    }

    return Response.json({
      success: true,
      message: `Fixed inventory for ${Object.keys(itemAdjustments).length} items`,
      corrections_found: corrections.length,
      corrections,
      updates
    });
  } catch (error) {
    console.error('Error fixing inventory:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});