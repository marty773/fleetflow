import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Edit2, Clock, AlertCircle, Check, FileText, Receipt } from 'lucide-react';

export default function IntervalDetailDialog({ interval, vehicle, onClose, onEdit }) {
  if (!interval) return null;

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
  const StatusIcon = status.icon;

  const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;
  const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;

  const rows = [
    vehicle && { label: 'Vehicle', value: `${vehicle.name}${vehicle.year ? ` — ${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}` },
    { label: 'Status', value: <span className={`font-semibold flex items-center gap-1 ${status.color}`}><StatusIcon className="w-4 h-4" />{status.label}</span> },
    {
      label: 'Interval', value: hasMonths && hasMiles
        ? `Every ${interval.interval_months} month${interval.interval_months > 1 ? 's' : ''} / ${Number(interval.interval_miles).toLocaleString()} mi`
        : hasMiles ? `Every ${Number(interval.interval_miles).toLocaleString()} miles`
        : hasMonths ? `Every ${interval.interval_months} month${interval.interval_months > 1 ? 's' : ''}`
        : '—'
    },
    interval.last_performed_date && { label: 'Last Performed', value: format(new Date(interval.last_performed_date + 'T12:00:00'), 'MMM d, yyyy') },
    interval.last_performed_mileage && { label: 'Last Mileage', value: `${Number(interval.last_performed_mileage).toLocaleString()} mi` },
    interval.next_due_date && { label: 'Next Due Date', value: format(new Date(interval.next_due_date + 'T12:00:00'), 'MMM d, yyyy') },
    interval.next_due_mileage && { label: 'Next Due Mileage', value: `${Number(interval.next_due_mileage).toLocaleString()} mi` },
    interval.scheduled_date && { label: 'Shop Scheduled', value: format(new Date(interval.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') },
  ].filter(Boolean);

  return (
    <Dialog open={!!interval} onOpenChange={onClose}>
      <DialogContent className="max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white text-lg">{interval.interval_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-between items-start gap-4 text-sm border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{row.label}</span>
              <span className="font-medium text-slate-900 dark:text-white text-right">{row.value}</span>
            </div>
          ))}

          {interval.notes && (
            <div className="text-sm">
              <p className="text-slate-500 dark:text-slate-400 mb-1">Notes</p>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">{interval.notes}</p>
            </div>
          )}

          {(interval.linked_record_id || interval.linked_bill_id) && (
            <div className="flex gap-2 flex-wrap pt-1">
              {interval.linked_record_id && (
                <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300 bg-blue-50">
                  <FileText className="w-3 h-3" /> Maintenance Record Linked
                </Badge>
              )}
              {interval.linked_bill_id && (
                <Badge variant="outline" className="gap-1 text-purple-700 border-purple-300 bg-purple-50">
                  <Receipt className="w-3 h-3" /> Bill Linked
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
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