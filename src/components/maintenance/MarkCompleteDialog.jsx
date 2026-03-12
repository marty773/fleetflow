import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

export default function MarkCompleteDialog({ interval, records, bills, onConfirm, onClose }) {
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [linkedRecordId, setLinkedRecordId] = useState('none');
  const [linkedBillId, setLinkedBillId] = useState('none');
  const [isLoading, setIsLoading] = useState(false);

  if (!interval) return null;

  // Filter records and bills for this vehicle
  const vehicleRecords = records.filter(r => r.vehicle_id === interval.vehicle_id);
  const vehicleBills = bills.filter(b => b.vendor); // all bills available

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm({
      performed_date: performedDate,
      odometer: odometer ? parseFloat(odometer) : null,
      linked_record_id: linkedRecordId === 'none' ? null : linkedRecordId,
      linked_bill_id: linkedBillId === 'none' ? null : linkedBillId,
    });
    setIsLoading(false);
  };

  // When a record is selected, auto-fill the date and odometer from it
  const handleRecordSelect = (recordId) => {
    setLinkedRecordId(recordId);
    if (recordId !== 'none') {
      const record = records.find(r => r.id === recordId);
      if (record) {
        setPerformedDate(record.performed_date);
        if (record.odometer_reading) setOdometer(record.odometer_reading);
      }
    }
  };

  return (
    <Dialog open={!!interval} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Mark as Completed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="font-semibold text-slate-900 dark:text-white">{interval.interval_name}</p>
          <p className="text-sm text-slate-500">{interval.maintenance_type?.replace('_', ' ')}</p>
        </div>

        <div className="space-y-4">
          {/* Link to existing maintenance record */}
          <div className="space-y-1">
            <Label>Link to Maintenance Record <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Select value={linkedRecordId} onValueChange={handleRecordSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a record..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No record</SelectItem>
                {vehicleRecords.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} — {format(new Date(r.performed_date), 'MMM dd, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to existing bill */}
          <div className="space-y-1">
            <Label>Link to Bill <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Select value={linkedBillId} onValueChange={setLinkedBillId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bill..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No bill</SelectItem>
                {vehicleBills.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.vendor} — {format(new Date(b.bill_date), 'MMM dd, yyyy')}
                    {b.total_amount ? ` ($${b.total_amount.toFixed(2)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Performed date */}
          <div className="space-y-1">
            <Label>Date Performed</Label>
            <Input
              type="date"
              value={performedDate}
              onChange={e => setPerformedDate(e.target.value)}
            />
          </div>

          {/* Odometer */}
          <div className="space-y-1">
            <Label>Odometer Reading <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input
              type="number"
              placeholder="e.g. 125000"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
            />
          </div>

          {interval.interval_months && (
            <p className="text-sm text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              Next due will be recalculated to{' '}
              <strong>
                {(() => {
                  const d = new Date(performedDate);
                  d.setMonth(d.getMonth() + parseInt(interval.interval_months));
                  return format(d, 'MMM dd, yyyy');
                })()}
              </strong>
              {interval.interval_miles && odometer
                ? ` / ${(parseFloat(odometer) + parseFloat(interval.interval_miles)).toLocaleString()} mi`
                : ''}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !performedDate}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Saving...' : 'Mark Complete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}