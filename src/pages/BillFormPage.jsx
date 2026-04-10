import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BillForm from '@/components/bills/BillForm';
import CreateMaintenanceFromBillDialog from '@/components/bills/CreateMaintenanceFromBillDialog';
import PageTransition from '@/components/PageTransition';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

export default function BillFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [maintenancePromptBill, setMaintenancePromptBill] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allVehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: allItems = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: allVendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: allBills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list(), enabled: !!editId });
  const { data: allIntervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list() });

  const vehicles = allVehicles;
  const vendors = allVendors;
  const filteredItems = allItems.filter(i => !i.is_archived);
  const editingBill = editId ? allBills.find(b => b.id === editId) || null : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Bill.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      navigate('/Bills');
    },
  });

  const handleSubmit = async (data) => {

    // Reverse old inventory if editing
    if (editingBill) {
      const oldMap = {};
      (editingBill.line_items || [])
        .filter(item => item.item_id && item.item_quantity > 0 && !item.vehicle_id)
        .forEach(item => { oldMap[item.item_id] = (oldMap[item.item_id] || 0) + item.item_quantity; });
      for (const [item_id, qty] of Object.entries(oldMap)) {
        const cur = filteredItems.find(i => i.id === item_id);
        if (cur) await base44.entities.Item.update(item_id, { quantity_on_hand: Math.max(0, (cur.quantity_on_hand || 0) - qty) });
      }
    }

    // Apply new inventory
    const newMap = {};
    data.line_items
      .filter(item => item.item_id && item.item_quantity > 0 && !item.vehicle_id)
      .forEach(item => { newMap[item.item_id] = (newMap[item.item_id] || 0) + item.item_quantity; });
    for (const [item_id, qty] of Object.entries(newMap)) {
      const cur = filteredItems.find(i => i.id === item_id);
      if (cur) await base44.entities.Item.update(item_id, { quantity_on_hand: (cur.quantity_on_hand || 0) + qty });
    }
    if (Object.keys(newMap).length > 0 || editingBill) queryClient.invalidateQueries({ queryKey: ['items'] });

    if (editingBill) {
      await updateMutation.mutateAsync({ id: editingBill.id, data });
    } else {
      const createdBill = await createMutation.mutateAsync(data);

      // Prompt maintenance record if vehicle-linked items
      if (createdBill) {
        const hasVehicleItems = (createdBill.line_items || data.line_items || []).some(i => i.vehicle_id);
        if (hasVehicleItems) {
          setMaintenancePromptBill({ ...data, id: createdBill.id });
          return;
        }
        navigate('/Bills');
      }
    }
  };

  if (editId && allBills.length === 0) {
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
            {editId ? 'Edit Bill' : 'New Bill'}
          </h1>
          <BillForm
            bill={editingBill}
            vehicles={vehicles}
            items={filteredItems}
            vendors={vendors}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/Bills')}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>

      <CreateMaintenanceFromBillDialog
         bill={maintenancePromptBill}
         vehicles={vehicles}
         intervals={allIntervals}
         onClose={() => { setMaintenancePromptBill(null); navigate('/Bills'); }}
         onCreated={() => { queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] }); queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] }); navigate('/Bills'); }}
       />
    </PageTransition>
  );
}