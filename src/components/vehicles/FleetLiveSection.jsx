import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FleetMap from './FleetMap';
import MotiveLivePanel from './MotiveLivePanel';

export default function FleetLiveSection({ vehicles = [] }) {
  const [selectedMotiveId, setSelectedMotiveId] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['motive-vehicle-data'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchMotiveVehicleData', {});
      return res.data;
    },
    refetchInterval: 60000, // auto-refresh every 60s
  });

  const motiveVehicles = data?.vehicles || [];

  // Find selected motive vehicle
  const selectedMotiveVehicle = motiveVehicles.find(
    v => String(v.motive_id) === String(selectedMotiveId)
  );

  // Match motive vehicle to our fleet vehicle by VIN or license plate
  const matchedVehicle = selectedMotiveVehicle
    ? vehicles.find(v =>
        (v.vin && selectedMotiveVehicle.vin && v.vin === selectedMotiveVehicle.vin) ||
        (v.license_plate && selectedMotiveVehicle.license_plate &&
          v.license_plate === selectedMotiveVehicle.license_plate)
      )
    : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Fleet Tracking</h2>
          {motiveVehicles.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({motiveVehicles.filter(v => v.lat && v.lon).length} located)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FleetMap
              motiveVehicles={motiveVehicles}
              selectedMotiveId={selectedMotiveId}
              onSelectVehicle={(v) => setSelectedMotiveId(v.motive_id)}
              height="350px"
            />
          </div>
          <div>
            {selectedMotiveVehicle ? (
              <div>
                <div className="mb-3">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {matchedVehicle?.name || selectedMotiveVehicle.number || `Vehicle ${selectedMotiveVehicle.motive_id}`}
                  </p>
                  {matchedVehicle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {matchedVehicle.year} {matchedVehicle.make} {matchedVehicle.model}
                    </p>
                  )}
                </div>
                <MotiveLivePanel motiveVehicle={selectedMotiveVehicle} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-slate-400 text-sm text-center">
                <div>
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Click a vehicle on the map to see live data
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}