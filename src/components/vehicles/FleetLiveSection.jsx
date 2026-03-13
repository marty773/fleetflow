import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Radio, MapPin, Gauge, Fuel, AlertTriangle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function VehicleRow({ motiveVehicle, localVehicle }) {
  const {
    speed, lat, lon, located_at, odometer, fuel_level,
    fault_codes = [], current_driver, status, number
  } = motiveVehicle;

  const name = localVehicle?.name || number || `Vehicle ${motiveVehicle.motive_id}`;
  const subtitle = localVehicle
    ? [localVehicle.year, localVehicle.make, localVehicle.model].filter(Boolean).join(' ')
    : null;

  const isActive = status === 'active';
  const hasLocation = lat && lon;
  const lastSeen = located_at ? new Date(located_at) : null;

  const formatLastSeen = (date) => {
    if (!date) return null;
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{name}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        {current_driver && (
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3" />
            {current_driver.first_name} {current_driver.last_name}
          </p>
        )}
      </div>

      {/* Speed */}
      <div className="hidden sm:flex flex-col items-center min-w-[56px]">
        <span className="text-base font-bold text-slate-900 dark:text-white">{speed != null ? speed : '—'}</span>
        <span className="text-xs text-slate-400">mph</span>
      </div>

      {/* Fuel */}
      <div className="hidden md:flex flex-col items-center min-w-[48px]">
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {fuel_level != null ? `${Math.round(fuel_level)}%` : '—'}
        </span>
        <span className="text-xs text-slate-400">fuel</span>
      </div>

      {/* Odometer */}
      <div className="hidden lg:flex flex-col items-center min-w-[72px]">
        <span className="text-base font-bold text-slate-900 dark:text-white">
          {odometer ? Math.round(odometer).toLocaleString() : '—'}
        </span>
        <span className="text-xs text-slate-400">miles</span>
      </div>

      {/* Fault codes badge */}
      <div className="flex-shrink-0 hidden sm:block">
        {fault_codes.length > 0 ? (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="w-3 h-3" />
            {fault_codes.length}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950">OK</Badge>
        )}
      </div>

      {/* Last seen */}
      <div className="flex-shrink-0 text-right min-w-[64px]">
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatLastSeen(lastSeen) || '—'}</p>
        {hasLocation && (
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-end gap-0.5 mt-0.5">
            <MapPin className="w-2.5 h-2.5" />
            {lat.toFixed(3)}, {lon.toFixed(3)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FleetLiveSection({ vehicles = [] }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['motive-vehicle-data'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchMotiveVehicleData', {});
      return res.data;
    },
    refetchInterval: 60000,
  });

  const motiveVehicles = data?.vehicles || [];

  // Sort by most recently active (located_at desc), then unlocated at end
  const sorted = [...motiveVehicles].sort((a, b) => {
    if (!a.located_at && !b.located_at) return 0;
    if (!a.located_at) return 1;
    if (!b.located_at) return -1;
    return new Date(b.located_at) - new Date(a.located_at);
  });

  // Match motive vehicle to local vehicle by VIN or license plate
  const matchLocal = (mv) =>
    vehicles.find(v =>
      (v.vin && mv.vin && v.vin === mv.vin) ||
      (v.license_plate && mv.license_plate && v.license_plate === mv.license_plate)
    ) || null;

  const activeCount = motiveVehicles.filter(v => v.status === 'active').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Fleet</h2>
          {!isLoading && motiveVehicles.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount} active · {motiveVehicles.length} total
            </span>
          )}
        </div>
        {/* Column headers + refresh */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 font-medium mr-2">
            <span className="w-[56px] text-center">Speed</span>
            <span className="hidden md:block w-[48px] text-center">Fuel</span>
            <span className="hidden lg:block w-[72px] text-center">Odometer</span>
            <span className="hidden sm:block w-[40px] text-center">Codes</span>
            <span className="w-[64px] text-right">Last Seen</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
          No vehicle data available
        </div>
      ) : (
        <div>
          {sorted.map(mv => (
            <VehicleRow key={mv.motive_id} motiveVehicle={mv} localVehicle={matchLocal(mv)} />
          ))}
        </div>
      )}
    </div>
  );
}