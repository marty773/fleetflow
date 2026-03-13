import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MaintenanceForm from '@/components/maintenance/MaintenanceForm';
import PageTransition from '@/components/PageTransition';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MaintenanceRecordFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const presetVehicleId = urlParams.get('vehicle');

  const { data: allVehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: allItems = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: allVendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: allBills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: allRecords = [] } = useQuery({ queryKey: ['maintenanceRecords'], queryFn: () => base44.entities.MaintenanceRecord.list(), enabled: !!editId });
  const { data: allIntervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list() });

  const vehicles = allVehicles;
  const vendors = allVendors;
  const filteredItems = allItems;
  const bills = allBills;
  const editingRecord = editId ? allRecords.find(r => r.id === editId) || null : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] }),
  });

  const handleSubmit = async (data) => {
    // Deduct inventory only when creating
    if (!editingRecord && data.parts_used?.length > 0) {
      const partMap = {};
      data.parts_used.forEach(part => { partMap[part.item_id] = (partMap[part.item_id] || 0) + part.quantity_used; });
      for (const [item_id, qty] of Object.entries(partMap)) {
        const cur = filteredItems.find(i => i.id === item_id);
        if (cur) await base44.entities.Item.update(item_id, { quantity_on_hand: Math.max(0, (cur.quantity_on_hand || 0) - qty) });
      }
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }

    let createdRecord;
    if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, data });
    } else {
      createdRecord = await createMutation.mutateAsync(data);
    }

    // Update related intervals
    const relatedIntervals = allIntervals.filter(
      i => i.vehicle_id === data.vehicle_id && i.maintenance_type === data.maintenance_type
    );
    for (const interval of relatedIntervals) {
      const updateData = { last_performed_date: data.performed_date };
      if (data.odometer_reading) {
        updateData.last_performed_mileage = parseFloat(data.odometer_reading);
        if (interval.interval_miles) updateData.next_due_mileage = parseFloat(data.odometer_reading) + parseFloat(interval.interval_miles);
      }
      if (interval.interval_months) {
        const nextDate = new Date(data.performed_date);
        nextDate.setMonth(nextDate.getMonth() + parseInt(interval.interval_months));
        updateData.next_due_date = nextDate.toISOString().split('T')[0];
      }
      await base44.entities.MaintenanceInterval.update(interval.id, updateData);
    }
    queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });

    navigate('/Maintenance');
  };

  if (editId && allRecords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4 pt-14 lg:pt-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Maintenance Record' : 'Log Maintenance'}
          </h1>
          <MaintenanceForm
            record={editingRecord || (presetVehicleId ? { vehicle_id: presetVehicleId } : null)}
            vehicles={vehicles}
            items={filteredItems}
            vendors={vendors}
            bills={bills}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/Maintenance')}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </PageTransition>
  );
}