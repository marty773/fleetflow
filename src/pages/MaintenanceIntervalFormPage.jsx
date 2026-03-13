import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/CompanyContext';
import IntervalForm from '@/components/maintenance/IntervalForm';
import PageTransition from '@/components/PageTransition';
import { toast } from 'sonner';

export default function MaintenanceIntervalFormPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allVehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: allIntervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list(), enabled: !!editId });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const editingInterval = editId ? allIntervals.find(i => i.id === editId) || null : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceInterval.create(data),
    onSuccess: async (createdInterval) => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      if (createdInterval?.next_due_date) {
        try {
          await base44.functions.invoke('syncMaintenanceToCalendar', { interval_id: createdInterval.id });
          toast.success('Synced to Google Calendar');
        } catch {
          toast.error('Failed to sync to calendar');
        }
      }
      navigate('/Maintenance?tab=intervals');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceInterval.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      navigate('/Maintenance?tab=intervals');
    },
  });

  const handleSubmit = async (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    if (editingInterval) {
      updateMutation.mutate({ id: editingInterval.id, data: dataWithCompany });
    } else {
      createMutation.mutate(dataWithCompany);
    }
  };

  if (editId && allIntervals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
        <div className="max-w-3xl mx-auto px-4 pt-14 lg:pt-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Interval' : 'Create Maintenance Interval'}
          </h1>
          <IntervalForm
            interval={editingInterval}
            vehicles={vehicles}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/Maintenance?tab=intervals')}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </PageTransition>
  );
}