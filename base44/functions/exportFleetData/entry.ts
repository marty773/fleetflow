import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { entities: requestedEntities } = payload;

    const allEntities = {
      Vehicle: () => base44.entities.Vehicle.list(),
      MaintenanceRecord: () => base44.entities.MaintenanceRecord.list(),
      MaintenanceInterval: () => base44.entities.MaintenanceInterval.list(),
      Item: () => base44.entities.Item.list(),
      Bill: () => base44.entities.Bill.list(),
      Vendor: () => base44.entities.Vendor.list(),
      CalendarAppointment: () => base44.entities.CalendarAppointment.list(),
      ServiceType: () => base44.entities.ServiceType.list(),
    };

    const entitiesToExport = requestedEntities?.length
      ? requestedEntities.filter(e => allEntities[e])
      : Object.keys(allEntities);

    const result = {};
    await Promise.all(
      entitiesToExport.map(async (entityName) => {
        result[entityName] = await allEntities[entityName]();
      })
    );

    const summary = {};
    for (const [name, records] of Object.entries(result)) {
      summary[name] = records.length;
    }

    return Response.json({ data: result, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});