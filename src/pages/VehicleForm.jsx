import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import VehicleForm from '@/components/vehicles/VehicleForm';
import PageTransition from '@/components/PageTransition';
import { toast } from 'sonner';

export default function VehicleFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: !!editId,
  });

  const vehicle = editId ? allVehicles.find(v => v.id === editId) || null : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/Vehicles');
    },
    onError: (err) => {
      toast.error('Failed to save vehicle: ' + (err?.message || 'Unknown error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/Vehicles');
    },
  });

  const handleSubmit = (data) => {
    if (editId && vehicle) {
      updateMutation.mutate({ id: vehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Wait for vehicle data if editing
  if (editId && allVehicles.length === 0) {
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
            {editId ? 'Edit Vehicle' : 'Add Vehicle'}
          </h1>
          <VehicleForm
            vehicle={vehicle}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/Vehicles')}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </PageTransition>
  );
}