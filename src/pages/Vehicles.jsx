import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleCard from '../components/vehicles/VehicleCard';
import VehicleViewDialog from '../components/vehicles/VehicleViewDialog';
import PullToRefresh from '../components/PullToRefresh';
import PageTransition from '../components/PageTransition';
import { useCompany } from '../components/CompanyContext';

export default function Vehicles() {
  const { selectedCompany } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditingVehicle(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const handleSubmit = (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: dataWithCompany });
    } else {
      createMutation.mutate(dataWithCompany);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  // Check for URL parameter to auto-open edit form
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === editId);
      if (vehicle) {
        setEditingVehicle(vehicle);
        setShowForm(true);
      }
    }
  }, [vehicles]);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
          <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Fleet Vehicles</h1>
            <p className="text-slate-600 mt-2">Manage your trucks and trailers</p>
          </div>
          <Button
            onClick={() => {
              setEditingVehicle(null);
              setShowForm(!showForm);
            }}
            className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>

        {showForm && (
          <div ref={formRef}>
            <VehicleForm
              vehicle={editingVehicle}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingVehicle(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onView={() => setViewingVehicle(vehicle)}
                onEdit={handleEdit}
                onDelete={() => deleteMutation.mutate(vehicle.id)}
                isDeleting={deleteMutation.isPending}
              />
            ))
          ) : !showForm ? (
            <div className="lg:col-span-3">
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <p className="text-slate-600">No vehicles added yet. Create one to get started.</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        <VehicleViewDialog
          vehicle={viewingVehicle}
          open={!!viewingVehicle}
          onOpenChange={(open) => !open && setViewingVehicle(null)}
          onEdit={(vehicle) => {
            setViewingVehicle(null);
            handleEdit(vehicle);
          }}
        />
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}