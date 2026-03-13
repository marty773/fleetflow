import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Maximize2, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FleetMap from './FleetMap';
import FleetLiveSection from './FleetLiveSection';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function FleetLivePreview({ vehicles = [] }) {
  const [modalOpen, setModalOpen] = useState(false);

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

  const activeCount = filtered.filter(v => v.status === 'active').length;

  return (
    <>
      {/* Mini preview card */}
      <div
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden cursor-pointer group"
        onClick={() => setModalOpen(true)}
      >
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors hidden sm:block">
              Click to expand
            </span>
            <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </div>
        </div>

        {/* Mini map */}
        <div className="relative pointer-events-none" style={{ isolation: 'isolate' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-36 bg-slate-50 dark:bg-slate-800">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <FleetMap
              motiveVehicles={filtered}
              selectedMotiveId={null}
              onSelectVehicle={() => {}}
              height="150px"
            />
          )}
          {/* Overlay hint */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 shadow-lg text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Maximize2 className="w-4 h-4" /> View Live Data
            </div>
          </div>
        </div>
      </div>

      {/* Full modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ zIndex: 1000 }}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 1000 }}
            onClick={() => setModalOpen(false)}
          />
          {/* Modal content */}
          <div className="relative z-10 w-full max-w-4xl">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-green-500" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Fleet</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {/* Reuse the full FleetLiveSection but without its own outer wrapper */}
              <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:mb-0">
                <FleetLiveSection vehicles={vehicles} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}