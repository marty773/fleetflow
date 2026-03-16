import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function DashboardServiceList({ title, intervals, vehicles, currentMileage = {}, onClose, onSelectInterval, onMarkComplete }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getRemainingBadge = (interval) => {
    const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;
    const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;

    // Mileage remaining
    if (hasMiles) {
      const currentMiles = currentMileage[interval.vehicle_id];
      const lastPerformedMiles = Number(interval.last_performed_mileage);
      
      let left;
      if (currentMiles !== undefined && lastPerformedMiles !== undefined) {
        const intervalMiles = Number(interval.interval_miles);
        const milesSinceService = currentMiles - lastPerformedMiles;
        left = Math.round(intervalMiles - milesSinceService);
      } else if (interval.next_due_mileage && currentMiles !== undefined) {
        left = Math.round(Number(interval.next_due_mileage) - currentMiles);
      } else if (interval.next_due_mileage && lastPerformedMiles) {
        left = Math.round(Number(interval.next_due_mileage) - lastPerformedMiles);
      }
      
      if (left !== undefined) {
        if (left <= 0) return { label: `${Math.abs(left).toLocaleString()} mi overdue`, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
        return { label: `${left.toLocaleString()} mi left`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
      }
      
      return { label: `Every ${Number(interval.interval_miles).toLocaleString()} mi`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
    }

    // Time remaining
    if (hasMonths && interval.next_due_date) {
      const days = differenceInDays(new Date(interval.next_due_date), new Date());
      if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
      if (days === 0) return { label: 'Due today', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
      if (days <= 7) return { label: `${days}d left`, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
      if (days < 30) return { label: `${days}d left`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
      const months = Math.round(days / 30);
      return { label: `~${months} mo left`, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
    }

    return { label: 'Scheduled', color: 'bg-slate-100 text-slate-800' };
  };

  const sorted = [...intervals].sort((a, b) => {
    if (!a.next_due_date) return 1;
    if (!b.next_due_date) return -1;
    return new Date(a.next_due_date) - new Date(b.next_due_date);
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {sorted.length === 0 && (
            <p className="text-center text-slate-500 py-8">No services to show</p>
          )}
          {sorted.map((interval) => {
            const remaining = getRemainingBadge(interval);
            const vehicle = vehicleMap[interval.vehicle_id];
            const isMileageOnly = (!interval.interval_months || parseFloat(interval.interval_months) === 0) && interval.interval_miles;
            return (
              <div
                key={interval.id}
                className="flex items-start justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => { onClose(); onSelectInterval(interval); }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{interval.interval_name}</p>
                    <Badge className={`ml-2 shrink-0 ${remaining.color}`}>{remaining.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle?.name}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isMileageOnly ? (
                      <span>Next due: {Number(interval.next_due_mileage).toLocaleString()} mi</span>
                    ) : interval.next_due_date ? (
                      <>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(interval.next_due_date + 'T12:00:00'), 'MMM dd, yyyy')}
                      </>
                    ) : null}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 shrink-0 border-green-400 text-green-700 hover:bg-green-50 gap-1"
                  onClick={() => { onClose(); onMarkComplete(interval); }}
                >
                  <CheckCircle2 className="w-3 h-3" /> Complete
                </Button>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}