import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, ArrowUpDown, Search } from 'lucide-react';
import VehicleCard from '../components/vehicles/VehicleCard';
import VehicleViewDialog from '../components/vehicles/VehicleViewDialog';
import FleetLivePreview from '../components/vehicles/FleetLivePreview';
import PullToRefresh from '../components/PullToRefresh';
import PageTransition from '../components/PageTransition';
export default function Vehicles() {
  const navigate = useNavigate();
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const filteredVehicles = vehicles
    .filter(v => filterType === 'all' || v.type === filterType)
    .filter(v => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.name?.toLowerCase().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.license_plate?.toLowerCase().includes(q) ||
        v.vin?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'type') {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return (a.name || '').localeCompare(b.name || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
          <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Fleet Vehicles</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your trucks and trailers</p>
          </div>
          <Button
            onClick={() => navigate('/VehicleForm')}
            className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, make, model, plate, VIN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {['all', 'truck', 'trailer'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  filterType === type
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {type === 'all' ? 'All' : type + 's'}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {[{ value: 'name', label: 'A–Z' }, { value: 'type', label: 'By Type' }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                  sortBy === opt.value
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <FleetLivePreview vehicles={vehicles} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredVehicles.length > 0 ? (
             filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onView={() => setViewingVehicle(vehicle)}
                onEdit={(v) => navigate(`/VehicleForm?edit=${v.id}`)}
                onDelete={() => deleteMutation.mutate(vehicle.id)}
                isDeleting={deleteMutation.isPending}
              />
            ))
          ) : (
            <div className="lg:col-span-3">
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <p className="text-slate-600 dark:text-slate-400">No vehicles added yet. Create one to get started.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <VehicleViewDialog
          vehicle={viewingVehicle}
          open={!!viewingVehicle}
          onOpenChange={(open) => !open && setViewingVehicle(null)}
          onEdit={(vehicle) => {
            setViewingVehicle(null);
            navigate(`/VehicleForm?edit=${vehicle.id}`);
          }}
        />
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}