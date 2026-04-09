import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Edit2, Clock, AlertCircle, Check, CalendarDays, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function IntervalDetailDialog({ interval, vehicle, onClose, onEdit, onMarkComplete, currentMileage = {}, onViewRecord, onIntervalUpdated }) {
  const [scheduledDate, setScheduledDate] = useState(interval?.scheduled_date || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setScheduledDate(interval?.scheduled_date || '');
    setEditing(false);
  }, [interval?.id, interval?.scheduled_date]);

  if (!interval) return null;

  const handleSaveScheduledDate = async () => {
    setSaving(true);
    await base44.entities.MaintenanceInterval.update(interval.id, { scheduled_date: scheduledDate || null });
    setSaving(false);
    setEditing(false);
    if (onIntervalUpdated) onIntervalUpdated({ ...interval, scheduled_date: scheduledDate || null });
  };

  const handleCancelEdit = () => {
    setScheduledDate(interval?.scheduled_date || '');
    setEditing(false);
  };

  const getStatus = () => {
    const isMileageOnly = (!interval.interval_months || parseFloat(interval.interval_months) === 0) && interval.interval_miles;
    if (isMileageOnly) return { label: 'Scheduled', icon: Check, color: 'text-green-600' };
    if (!interval.next_due_date) return { label: 'Scheduled', icon: Clock, color: 'text-slate-500' };
    const days = differenceInDays(new Date(interval.next_due_date), new Date());
    if (days < 0) return { label: 'Overdue', icon: AlertCircle, color: 'text-red-600' };
    if (days <= 7) return { label: 'Urgent', icon: AlertCircle, color: 'text-orange-600' };
    if (days <= 30) return { label: 'Due Soon', icon: Clock, color: 'text-yellow-600' };
    return { label: 'Scheduled', icon: Check, color: 'text-green-600' };
  };

  const status = getStatus();

  const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;
  const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;

  const currentMiles = currentMileage[interval.vehicle_id];
  const lastPerformedMiles = interval.last_performed_mileage ? Number(interval.last_performed_mileage) : undefined;

  let milesRemaining;
  if (hasMiles && currentMiles !== undefined && lastPerformedMiles !== undefined) {
    const milesSinceService = currentMiles - lastPerformedMiles;
    milesRemaining = Math.round(Number(interval.interval_miles) - milesSinceService);
  } else if (hasMiles && currentMiles !== undefined && interval.next_due_mileage) {
    milesRemaining = Math.round(Number(interval.next_due_mileage) - currentMiles);
  }

  const intervalLabel = hasMonths && hasMiles
    ? `Every ${interval.interval_months} month${interval.interval_months > 1 ? 's' : ''} / ${Number(interval.interval_miles).toLocaleString()} mi`
    : hasMiles ? `Every ${Number(interval.interval_miles).toLocaleString()} miles`
    : hasMonths ? `Every ${interval.interval_months} month${interval.interval_months > 1 ? 's' : ''}`
    : '—';

  const Row = ({ label, children }) => (
    <div className="flex justify-between items-center gap-4 text-sm border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white text-right">{children}</span>
    </div>
  );

  const canClickLastPerformed = !!interval.linked_record_id && !!onViewRecord;

  return (
    <Dialog open={!!interval} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-lg">{interval.interval_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {vehicle && (
            <Row label="Vehicle">
              {vehicle.name}{vehicle.year ? ` — ${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
            </Row>
          )}

          <Row label="Interval">{intervalLabel}</Row>

          {hasMiles && currentMiles !== undefined && (
            <Row label="Current Mileage">{Math.round(currentMiles).toLocaleString()} mi</Row>
          )}

          {(interval.last_performed_date || lastPerformedMiles !== undefined) && (
            <div className="flex justify-between items-center gap-4 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Last Performed</span>
              <button
                disabled={!canClickLastPerformed}
                onClick={() => {
                  if (canClickLastPerformed) {
                    onClose();
                    onViewRecord(interval.linked_record_id);
                  }
                }}
                className={`font-medium text-right ${canClickLastPerformed ? 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer' : 'text-slate-900 dark:text-white cursor-default'}`}
              >
                {interval.last_performed_date ? format(new Date(interval.last_performed_date + 'T12:00:00'), 'MMM d, yyyy') : ''}
                {interval.last_performed_date && lastPerformedMiles !== undefined ? ' · ' : ''}
                {lastPerformedMiles !== undefined ? (
                  <span>{lastPerformedMiles.toLocaleString()} mi</span>
                ) : null}
              </button>
            </div>
          )}

          {milesRemaining !== undefined && (
            <Row label="Miles Remaining">
              <span className={milesRemaining <= 0 ? 'text-red-600 font-semibold' : ''}>
                {Math.abs(milesRemaining).toLocaleString()} mi {milesRemaining <= 0 ? 'overdue' : 'left'}
              </span>
            </Row>
          )}

          {/* Shop Date row */}
          <div className="flex justify-between items-center gap-4 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> Shop Date
            </span>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <Button size="sm" onClick={handleSaveScheduledDate} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white h-7 px-2 text-xs">
                  {saving ? '...' : 'Save'}
                </Button>
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : interval.scheduled_date ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {format(new Date(interval.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')}
                </span>
                <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-600" title="Edit date">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 px-2 text-xs border-amber-400 text-amber-600 hover:bg-amber-50">
                Schedule
              </Button>
            )}
          </div>

          {interval.next_due_date && (
            <Row label="Next Due Date">{format(new Date(interval.next_due_date + 'T12:00:00'), 'MMM d, yyyy')}</Row>
          )}

          {interval.notes && (
            <div className="text-sm">
              <p className="text-slate-500 dark:text-slate-400 mb-1">Notes</p>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{interval.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {onMarkComplete && (
            <Button
              onClick={() => { onClose(); onMarkComplete(interval); }}
              className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white mr-auto"
            >
              <Check className="w-4 h-4" /> Complete Now
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">Close</Button>
          {onEdit && (
            <Button onClick={() => { onClose(); onEdit(interval); }} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}