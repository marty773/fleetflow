import React from 'react';
import { Gauge, Fuel, Wrench, MapPin, Clock, User, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function StatCard({ icon: Icon, label, value, unit, color = 'slate' }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
        <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {value != null ? `${value}${unit ? ' ' + unit : ''}` : '—'}
        </p>
      </div>
    </div>
  );
}

export default function MotiveLivePanel({ motiveVehicle }) {
  if (!motiveVehicle) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        No live data matched for this vehicle
      </div>
    );
  }

  const {
    speed, lat, lon, located_at, odometer, fuel_level,
    engine_hours, fault_codes = [], current_driver, status
  } = motiveVehicle;

  return (
    <div className="space-y-4">
      {/* Status + Driver */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {status || 'unknown'}
        </Badge>
        {current_driver && (
          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <User className="w-3 h-3" />
            {current_driver.first_name} {current_driver.last_name}
          </div>
        )}
        {located_at && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {new Date(located_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Gauge} label="Speed" value={speed} unit="mph" color="blue" />
        <StatCard icon={MapPin} label="Location" value={lat && lon ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : null} color="green" />
        <StatCard icon={Gauge} label="Odometer" value={odometer ? Math.round(odometer).toLocaleString() : null} unit="mi" color="purple" />
        <StatCard icon={Fuel} label="Fuel Level" value={fuel_level != null ? Math.round(fuel_level) : null} unit="%" color="amber" />
        <StatCard icon={Wrench} label="Engine Hours" value={engine_hours != null ? Math.round(engine_hours).toLocaleString() : null} unit="hrs" color="slate" />
      </div>

      {/* Fault Codes */}
      {fault_codes.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              Active Fault Codes ({fault_codes.length})
            </span>
          </div>
          <div className="space-y-1">
            {fault_codes.map((code, i) => (
              <div key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 rounded px-2 py-1">
                {typeof code === 'object' ? `${code.spn || code.code || ''} — ${code.description || code.fmi || ''}` : code}
              </div>
            ))}
          </div>
        </div>
      )}

      {fault_codes.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 rounded-lg p-3">
          <Wrench className="w-4 h-4" />
          No active fault codes
        </div>
      )}
    </div>
  );
}