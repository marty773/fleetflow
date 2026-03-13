import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, RefreshCw, Radio, MapPin, AlertTriangle, User,
  ChevronDown, ChevronRight, Gauge, Fuel, Navigation, Activity, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FleetMap from './FleetMap';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatLastSeen(located_at) {
  if (!located_at) return null;
  const diffMs = Date.now() - new Date(located_at).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return new Date(located_at).toLocaleDateString();
}

function VehicleRow({ motiveVehicle, localVehicle, isSelected, isExpanded, onClick }) {
  const {
    speed, lat, lon, located_at, odometer, fuel_level,
    fault_codes = [], current_driver, status, number, description,
    vin, license_plate, heading
  } = motiveVehicle;

  const name = localVehicle?.name || number || `Vehicle ${motiveVehicle.motive_id}`;
  const subtitle = localVehicle
    ? [localVehicle.year, localVehicle.make, localVehicle.model].filter(Boolean).join(' ')
    : description || null;

  const isActive = status === 'active';
  const hasLocation = lat && lon;

  const statusColor = isActive
    ? 'bg-green-500'
    : 'bg-slate-300 dark:bg-slate-600';

  return (
    <div
      className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-amber-50 dark:bg-amber-950/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
      onClick={onClick}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 py-3 px-4">
        {/* Status dot + expand arrow */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${isActive ? 'shadow-[0_0_0_3px_rgba(34,197,94,0.2)]' : ''}`} />
        </div>

        {/* Name / subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold text-sm truncate ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {name}
            </p>
            {isActive && (
              <span className="hidden sm:inline text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">Moving</span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
          {current_driver && (
            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" />
              {current_driver.first_name} {current_driver.last_name}
            </p>
          )}
        </div>

        {/* Speed */}
        <div className="hidden sm:flex flex-col items-center min-w-[52px]">
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

        {/* Fault codes */}
        <div className="hidden sm:block flex-shrink-0">
          {fault_codes.length > 0 ? (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="w-3 h-3" />
              {fault_codes.length}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950">OK</Badge>
          )}
        </div>

        {/* Last seen + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatLastSeen(located_at) || '—'}</p>
            {hasLocation && (
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-end gap-0.5 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {lat.toFixed(3)}, {lon.toFixed(3)}
              </p>
            )}
          </div>
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </div>
      </div>

      {/* Expanded details panel */}
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 bg-white dark:bg-slate-900/60">
          {/* Speed */}
          <DetailCard icon={<Gauge className="w-3.5 h-3.5" />} label="Speed" value={speed != null ? `${speed} mph` : '—'} />
          {/* Fuel */}
          <DetailCard icon={<Fuel className="w-3.5 h-3.5" />} label="Fuel Level" value={fuel_level != null ? `${Math.round(fuel_level)}%` : '—'} />
          {/* Odometer */}
          <DetailCard icon={<Activity className="w-3.5 h-3.5" />} label="Odometer" value={odometer ? `${Math.round(odometer).toLocaleString()} mi` : '—'} />
          {/* Heading */}
          <DetailCard icon={<Navigation className="w-3.5 h-3.5" />} label="Heading" value={heading != null ? `${heading}°` : '—'} />
          {/* Driver */}
          {current_driver && (
            <DetailCard icon={<User className="w-3.5 h-3.5" />} label="Driver" value={`${current_driver.first_name} ${current_driver.last_name}`} />
          )}
          {/* VIN */}
          {(vin || localVehicle?.vin) && (
            <DetailCard icon={<Hash className="w-3.5 h-3.5" />} label="VIN" value={vin || localVehicle?.vin} small />
          )}
          {/* License plate */}
          {(license_plate || localVehicle?.license_plate) && (
            <DetailCard icon={<Hash className="w-3.5 h-3.5" />} label="Plate" value={license_plate || localVehicle?.license_plate} />
          )}
          {/* Last seen full timestamp */}
          {located_at && (
            <DetailCard icon={<MapPin className="w-3.5 h-3.5" />} label="Last Seen" value={new Date(located_at).toLocaleString()} small />
          )}
          {/* Fault codes */}
          {fault_codes.length > 0 && (
            <div className="col-span-2 sm:col-span-3 md:col-span-4 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Fault Codes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fault_codes.map((fc, i) => (
                  <span key={i} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-mono">
                    {typeof fc === 'object' ? (fc.code || JSON.stringify(fc)) : fc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailCard({ icon, label, value, small = false }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`font-semibold text-slate-900 dark:text-white ${small ? 'text-xs break-all' : 'text-sm'}`}>{value}</p>
    </div>
  );
}

export default function FleetLiveSection({ vehicles = [] }) {
  const [selectedMotiveId, setSelectedMotiveId] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['motive-vehicle-data'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchMotiveVehicleData', {});
      return res.data;
    },
    refetchInterval: 60000,
  });

  const motiveVehicles = data?.vehicles || [];

  const filtered = motiveVehicles
    .filter(v => v.located_at && (Date.now() - new Date(v.located_at).getTime()) <= ONE_WEEK_MS)
    .sort((a, b) => new Date(b.located_at) - new Date(a.located_at));

  const matchLocal = (mv) =>
    vehicles.find(v =>
      (v.vin && mv.vin && v.vin === mv.vin) ||
      (v.license_plate && mv.license_plate && v.license_plate === mv.license_plate)
    ) || null;

  const activeCount = filtered.filter(v => v.status === 'active').length;

  const handleRowClick = (motiveId) => {
    setSelectedMotiveId(prev => String(prev) === String(motiveId) ? null : motiveId);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Fleet</h2>
          {!isLoading && filtered.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount} active · {filtered.length} in last 7 days
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Map */}
          <FleetMap
            motiveVehicles={filtered}
            selectedMotiveId={selectedMotiveId}
            onSelectVehicle={(v) => handleRowClick(v.motive_id)}
            height="320px"
          />

          {/* Vehicle list */}
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
              No vehicles active in the last 7 days
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-medium">
                <div className="w-2.5 flex-shrink-0" />
                <div className="flex-1">Vehicle</div>
                <div className="hidden sm:block text-center" style={{minWidth:'52px'}}>Speed</div>
                <div className="hidden md:block text-center" style={{minWidth:'48px'}}>Fuel</div>
                <div className="hidden sm:block text-center flex-shrink-0" style={{width:'40px'}}>Codes</div>
                <div className="flex-shrink-0 text-right" style={{width:'80px'}}>Last Seen</div>
              </div>
              {filtered.map(mv => (
                <VehicleRow
                  key={mv.motive_id}
                  motiveVehicle={mv}
                  localVehicle={matchLocal(mv)}
                  isSelected={String(selectedMotiveId) === String(mv.motive_id)}
                  isExpanded={String(selectedMotiveId) === String(mv.motive_id)}
                  onClick={() => handleRowClick(mv.motive_id)}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}