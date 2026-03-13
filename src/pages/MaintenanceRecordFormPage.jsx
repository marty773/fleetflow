import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/CompanyContext';
import MaintenanceForm from '@/components/maintenance/MaintenanceForm';
import PageTransition from '@/components/PageTransition';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MaintenanceRecordFormPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allVehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: allItems = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: allVendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: allBills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: allRecords = [] } = useQuery({ queryKey: ['maintenanceRecords'], queryFn: () => base44.entities.MaintenanceRecord.list(), enabled: !!editId });
  const { data: allIntervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list() });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const filteredItems = allItems.filter(i => i.company_id === selectedCompany);
  const bills = allBills.filter(b => b.company_id === selectedCompany);
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
    const dataWithCompany = { ...data, company_id: selectedCompany };

    // Deduct inventory only when creating
    if (!editingRecord && dataWithCompany.parts_used?.length > 0) {
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
      await updateMutation.mutateAsync({ id: editingRecord.id, data: dataWithCompany });
    } else {
      createdRecord = await createMutation.mutateAsync(dataWithCompany);
    }

    // Update related intervals
    const relatedIntervals = allIntervals.filter(
      i => i.vehicle_id === dataWithCompany.vehicle_id && i.maintenance_type === dataWithCompany.maintenance_type
    );
    for (const interval of relatedIntervals) {
      const updateData = { last_performed_date: dataWithCompany.performed_date };
      if (dataWithCompany.odometer_reading) {
        updateData.last_performed_mileage = parseFloat(dataWithCompany.odometer_reading);
        if (interval.interval_miles) updateData.next_due_mileage = parseFloat(dataWithCompany.odometer_reading) + parseFloat(interval.interval_miles);
      }
      if (interval.interval_months) {
        const nextDate = new Date(dataWithCompany.performed_date);
        nextDate.setMonth(nextDate.getMonth() + parseInt(interval.interval_months));
        updateData.next_due_date = nextDate.toISOString().split('T')[0];
      }
      await base44.entities.MaintenanceInterval.update(interval.id, updateData);
    }
    queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });

    // Email notification for specific vehicles
    if (!editingRecord && createdRecord) {
      const vehicle = allVehicles.find(v => v.id === dataWithCompany.vehicle_id);
      if (vehicle && (vehicle.name === 'JEM Trailer' || vehicle.name === 'JEM 2022 RAM')) {
        await base44.integrations.Core.SendEmail({
          to: 'manny@fishersbackyardstructures.com',
          subject: `New Maintenance Record for ${vehicle.name}`,
          body: `A new maintenance record has been logged for ${vehicle.name}.\n\nTitle: ${dataWithCompany.title}\nType: ${dataWithCompany.maintenance_type?.replace('_', ' ')}\nDate: ${format(new Date(dataWithCompany.performed_date), 'MMM dd, yyyy')}\nCost: $${dataWithCompany.total_cost?.toFixed(2) || '0.00'}`
        });
      }
    }

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
            record={editingRecord}
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