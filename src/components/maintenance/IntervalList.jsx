import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays, addMonths } from 'date-fns';
import { Edit2, Trash2, AlertCircle, Check, Clock, CheckCircle2, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useServiceTypes } from '@/components/useServiceTypes';

export default function IntervalList({ intervals, vehicles, onEdit, onDelete, onMarkComplete, onView, isDeleting, reminderMiles = 1000, currentMileage = {} }) {
  const serviceTypes = useServiceTypes(null, 'records');

  // Only expand vehicles that have at least one interval due/overdue/urgent within the reminder threshold
  const getInitialExpanded = () => {
    const expanded = new Set();
    for (const interval of intervals) {
      const vid = interval.vehicle_id || '__none__';
      const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;
      const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;
      if (hasMiles && interval.next_due_mileage && interval.last_performed_mileage) {
        const milesLeft = Number(interval.next_due_mileage) - Number(interval.last_performed_mileage);
        if (milesLeft <= reminderMiles) expanded.add(vid);
      } else if (hasMonths && interval.next_due_date) {
        const thresholdDays = Math.max(30, Math.round(reminderMiles / 200));
        const days = Math.ceil((new Date(interval.next_due_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (days <= thresholdDays) expanded.add(vid);
      }
    }
    return expanded;
  };

  const [expandedVehicles, setExpandedVehicles] = useState(getInitialExpanded);

  const vehicleMap = vehicles.reduce((acc, v) => { acc[v.id] = v; return acc; }, {});

  const getTypeLabel = (value) => {
    const found = serviceTypes.find(t => t.value === value);
    return found ? found.label : (value?.replace(/_/g, ' ') || '');
  };

  const maintenanceColors = {
    oil_change: 'bg-blue-100 text-blue-800',
    filter_change: 'bg-yellow-100 text-yellow-800',
    tire_rotation: 'bg-purple-100 text-purple-800',
    inspection: 'bg-indigo-100 text-indigo-800',
    repair: 'bg-red-100 text-red-800',
    cleaning: 'bg-green-100 text-green-800',
    other: 'bg-slate-100 text-slate-800',
  };
  const getTypeColor = (value) => maintenanceColors[value] || 'bg-slate-100 text-slate-800';

  const getStatus = (interval) => {
    const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;
    const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;
    const isMileageOnly = hasMiles && !hasMonths;

    // Mileage-based status
    if (hasMiles && interval.next_due_mileage && interval.last_performed_mileage) {
      const milesLeft = Number(interval.next_due_mileage) - Number(interval.last_performed_mileage);
      if (milesLeft < 0) return { label: 'Overdue', icon: AlertCircle, color: 'text-red-600' };
      if (milesLeft <= reminderMiles * 0.25) return { label: 'Urgent', icon: AlertCircle, color: 'text-orange-600' };
      if (milesLeft <= reminderMiles) return { label: 'Due Soon', icon: Clock, color: 'text-yellow-600' };
      return { label: 'Scheduled', icon: Check, color: 'text-green-600' };
    }
    if (isMileageOnly) return { label: 'Scheduled', icon: Check, color: 'text-green-600' };

    // Time-based status
    if (!interval.next_due_date) return { label: 'Scheduled', icon: Clock, color: 'text-slate-500' };
    const days = differenceInDays(new Date(interval.next_due_date), new Date());
    const thresholdDays = Math.max(30, Math.round(reminderMiles / 200));
    if (days < 0) return { label: 'Overdue', icon: AlertCircle, color: 'text-red-600', days };
    if (days <= 7) return { label: 'Urgent', icon: AlertCircle, color: 'text-orange-600', days };
    if (days <= thresholdDays) return { label: 'Due Soon', icon: Clock, color: 'text-yellow-600', days };
    return { label: 'Scheduled', icon: Check, color: 'text-green-600', days };
  };

  // "X miles left" or "X days/months left" summary for the row
  const getRemainingLabel = (interval) => {
    const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;
    const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;

    // Prefer mileage display when available
    if (hasMiles && interval.next_due_mileage && interval.last_performed_mileage) {
      const milesLeft = Number(interval.next_due_mileage) - Number(interval.last_performed_mileage);
      if (milesLeft <= 0) return `${Number(Math.abs(milesLeft)).toLocaleString()} mi overdue`;
      return `${Number(milesLeft).toLocaleString()} mi left`;
    }
    if (hasMiles && interval.next_due_mileage) {
      return `Due at ${Number(interval.next_due_mileage).toLocaleString()} mi`;
    }

    if (hasMonths && interval.next_due_date) {
      const days = differenceInDays(new Date(interval.next_due_date), new Date());
      if (days < 0) return `${Math.abs(days)}d overdue`;
      if (days === 0) return 'Due today';
      if (days < 30) return `${days}d left`;
      const months = Math.round(days / 30);
      return `~${months} mo left`;
    }

    if (hasMiles) return `Every ${Number(interval.interval_miles).toLocaleString()} mi`;
    if (hasMonths) return `Every ${interval.interval_months} mo`;
    return null;
  };

  // Badge color for remaining label based on status
  const getRemainingColor = (interval) => {
    const status = getStatus(interval);
    if (status.label === 'Overdue') return 'bg-red-100 text-red-700 border-red-200';
    if (status.label === 'Urgent') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (status.label === 'Due Soon') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
  };

  // Group intervals by vehicle
  const grouped = {};
  for (const interval of intervals) {
    const vid = interval.vehicle_id || '__none__';
    if (!grouped[vid]) grouped[vid] = [];
    grouped[vid].push(interval);
  }

  // Sort each group by urgency
  const urgencyOrder = { Overdue: 0, Urgent: 1, 'Due Soon': 2, Scheduled: 3 };
  for (const vid of Object.keys(grouped)) {
    grouped[vid].sort((a, b) => {
      const sa = urgencyOrder[getStatus(a).label] ?? 4;
      const sb = urgencyOrder[getStatus(b).label] ?? 4;
      if (sa !== sb) return sa - sb;
      if (a.next_due_date && b.next_due_date) return new Date(a.next_due_date) - new Date(b.next_due_date);
      return 0;
    });
  }

  // Sort vehicle groups: vehicles with overdue/urgent first
  const sortedVehicleIds = Object.keys(grouped).sort((a, b) => {
    const aMin = Math.min(...grouped[a].map(i => urgencyOrder[getStatus(i).label] ?? 4));
    const bMin = Math.min(...grouped[b].map(i => urgencyOrder[getStatus(i).label] ?? 4));
    return aMin - bMin;
  });

  const toggleVehicle = (vid) => {
    setExpandedVehicles(prev => {
      const next = new Set(prev);
      next.has(vid) ? next.delete(vid) : next.add(vid);
      return next;
    });
  };

  if (intervals.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No maintenance intervals scheduled yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedVehicleIds.map(vid => {
        const vehicleIntervals = grouped[vid];
        const vehicle = vehicleMap[vid];
        const isExpanded = expandedVehicles.has(vid);

        // Summary counts for the header
        const overdue = vehicleIntervals.filter(i => getStatus(i).label === 'Overdue').length;
        const urgent = vehicleIntervals.filter(i => getStatus(i).label === 'Urgent').length;
        const dueSoon = vehicleIntervals.filter(i => getStatus(i).label === 'Due Soon').length;

        return (
          <div key={vid} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            {/* Vehicle Header */}
            <button
              onClick={() => toggleVehicle(vid)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
                  {vehicle ? `${vehicle.name}` : 'Unassigned'}
                </span>
                {vehicle && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {vehicleIntervals.length} interval{vehicleIntervals.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {overdue > 0 && <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">{overdue} overdue</Badge>}
                {urgent > 0 && <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-xs">{urgent} urgent</Badge>}
                {dueSoon > 0 && <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs">{dueSoon} due soon</Badge>}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {/* Interval Rows */}
            {isExpanded && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {vehicleIntervals.map((interval) => {
                  const status = getStatus(interval);
                  const StatusIcon = status.icon;
                  const remaining = getRemainingLabel(interval);
                  const isActionable = ['Overdue', 'Urgent', 'Due Soon'].includes(status.label);

                  return (
                    <div
                      key={interval.id}
                      className="px-4 py-3 bg-white dark:bg-slate-900 flex items-center gap-3 flex-wrap md:flex-nowrap cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => onView && onView(interval)}
                    >
                      {/* Name + type badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{interval.interval_name}</span>
                          <Badge className={`text-xs ${getTypeColor(interval.maintenance_type)}`}>
                            {getTypeLabel(interval.maintenance_type)}
                          </Badge>
                        </div>
                        {interval.last_performed_date && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Last done: {format(new Date(interval.last_performed_date + 'T12:00:00'), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      {/* Remaining pill */}
                      {remaining && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${getRemainingColor(interval)}`}>
                          {remaining}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0 ml-auto" onClick={e => e.stopPropagation()}>
                        {isActionable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMarkComplete(interval)}
                            className="border-green-400 text-green-700 hover:bg-green-50 gap-1 h-8 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onEdit(interval)} className="h-8 w-8 p-0">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { if (window.confirm('Delete this interval?')) onDelete(interval.id); }}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}