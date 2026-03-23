import React, { useEffect } from 'react';
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
  const returnTo = urlParams.get('returnTo') || '/Maintenance';

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

  // Scroll to linked-interval section if navigated with that hash
  useEffect(() => {
    if (window.location.hash === '#linked-interval') {
      setTimeout(() => {
        const el = document.getElementById('linked-interval');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [editingRecord?.id]);

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

    let savedRecordId;
    if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, data });
      savedRecordId = editingRecord.id;
    } else {
      const createdRecord = await createMutation.mutateAsync(data);
      savedRecordId = createdRecord.id;
    }

    // Create recurring interval if requested (new records only)
    if (!editingRecord && data.create_recurring_interval) {
      const vehicle = allVehicles.find(v => v.id === data.vehicle_id);
      const intervalData = {
        vehicle_id: data.vehicle_id,
        maintenance_type: data.maintenance_type,
        interval_name: data.title,
        interval_months: data.interval_months,
        interval_miles: data.interval_miles,
        last_performed_date: data.performed_date,
        last_performed_mileage: data.odometer_reading ? parseFloat(data.odometer_reading) : null,
        company_id: vehicle?.company_id || 'Fisher\'s Enterprise',
        linked_record_id: savedRecordId
      };
      if (data.interval_months) {
        const nextDate = new Date(data.performed_date);
        nextDate.setMonth(nextDate.getMonth() + parseInt(data.interval_months));
        intervalData.next_due_date = nextDate.toISOString().split('T')[0];
      }
      if (data.odometer_reading && data.interval_miles) {
        intervalData.next_due_mileage = parseFloat(data.odometer_reading) + parseFloat(data.interval_miles);
      }
      await base44.entities.MaintenanceInterval.create(intervalData);
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
    }

    // Only update interval data on NEW records, or if the linked interval changed during edit
    const originalLinkedIntervalId = editingRecord?.linked_interval_id || null;
    const intervalLinkChanged = data.linked_interval_id !== originalLinkedIntervalId;

    if (data.linked_interval_id) {
      const linkedInterval = allIntervals.find(i => i.id === data.linked_interval_id);
      if (linkedInterval && (!editingRecord || intervalLinkChanged)) {
        // Only update last_performed info when creating or when the linked interval was explicitly changed
        const updateData = {
          last_performed_date: data.performed_date,
          linked_record_id: savedRecordId,
        };
        if (data.odometer_reading) {
          updateData.last_performed_mileage = parseFloat(data.odometer_reading);
          if (linkedInterval.interval_miles) updateData.next_due_mileage = parseFloat(data.odometer_reading) + parseFloat(linkedInterval.interval_miles);
        }
        if (linkedInterval.interval_months) {
          const nextDate = new Date(data.performed_date);
          nextDate.setMonth(nextDate.getMonth() + parseInt(linkedInterval.interval_months));
          updateData.next_due_date = nextDate.toISOString().split('T')[0];
        }
        await base44.entities.MaintenanceInterval.update(linkedInterval.id, updateData);
        queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      }
      // Always keep linked_interval_id on the record in sync
      if (!editingRecord || intervalLinkChanged) {
        await base44.entities.MaintenanceRecord.update(savedRecordId, { linked_interval_id: data.linked_interval_id });
      }
    } else if (!editingRecord) {
      // Auto-link only on new records: match by exact interval name (same vehicle)
      const matchingInterval = allIntervals.find(
        i => i.vehicle_id === data.vehicle_id &&
             i.interval_name?.trim().toLowerCase() === data.title?.trim().toLowerCase()
      );
      if (matchingInterval) {
        const updateData = {
          last_performed_date: data.performed_date,
          linked_record_id: savedRecordId
        };
        if (data.odometer_reading) {
          updateData.last_performed_mileage = parseFloat(data.odometer_reading);
          if (matchingInterval.interval_miles) updateData.next_due_mileage = parseFloat(data.odometer_reading) + parseFloat(matchingInterval.interval_miles);
        }
        if (matchingInterval.interval_months) {
          const nextDate = new Date(data.performed_date);
          nextDate.setMonth(nextDate.getMonth() + parseInt(matchingInterval.interval_months));
          updateData.next_due_date = nextDate.toISOString().split('T')[0];
        }
        await base44.entities.MaintenanceInterval.update(matchingInterval.id, updateData);
        await base44.entities.MaintenanceRecord.update(savedRecordId, { linked_interval_id: matchingInterval.id });
        queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      }
    }

    navigate(returnTo);
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
            intervals={allIntervals}
            onSubmit={handleSubmit}
            onCancel={() => navigate(returnTo)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </PageTransition>
  );
}