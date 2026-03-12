import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { CheckCircle2, Plus, Link } from 'lucide-react';

export default function MarkCompleteDialog({ interval, records, bills, vendors, onConfirm, onClose }) {
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [linkedRecordId, setLinkedRecordId] = useState('none');
  const [linkedBillId, setLinkedBillId] = useState('none');
  const [createRecord, setCreateRecord] = useState(false);
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordVendor, setNewRecordVendor] = useState('');
  const [newRecordNotes, setNewRecordNotes] = useState('');
  const [newRecordCost, setNewRecordCost] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!interval) return null;

  // Pre-fill title from interval name
  const defaultTitle = interval.interval_name;

  // Filter records for this vehicle
  const vehicleRecords = records.filter(r => r.vehicle_id === interval.vehicle_id);
  const vehicleBills = bills.filter(b => b.vendor);

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm({
      performed_date: performedDate,
      odometer: odometer ? parseFloat(odometer) : null,
      linked_record_id: linkedRecordId === 'none' ? null : linkedRecordId,
      linked_bill_id: linkedBillId === 'none' ? null : linkedBillId,
      create_record: createRecord,
      new_record: createRecord ? {
        title: newRecordTitle || defaultTitle,
        vendor: newRecordVendor,
        notes: newRecordNotes,
        total_cost: newRecordCost ? parseFloat(newRecordCost) : null,
      } : null,
    });
    setIsLoading(false);
  };

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          <hr className="dark:border-slate-700" />

          {/* Create new maintenance record toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Create Maintenance Record</Label>
              <button
                type="button"
                onClick={() => setCreateRecord(!createRecord)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  createRecord ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  createRecord ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {createRecord && (
              <div className="space-y-3 pl-0 border-l-2 border-green-200 dark:border-green-900 pl-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    placeholder={defaultTitle}
                    value={newRecordTitle}
                    onChange={e => setNewRecordTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vendor <span className="text-slate-400 font-normal">(optional)</span></Label>
                  {vendors && vendors.length > 0 ? (
                    <Select value={newRecordVendor} onValueChange={setNewRecordVendor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No vendor</SelectItem>
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Vendor name"
                      value={newRecordVendor}
                      onChange={e => setNewRecordVendor(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Total Cost <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newRecordCost}
                    onChange={e => setNewRecordCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Any notes..."
                    value={newRecordNotes}
                    onChange={e => setNewRecordNotes(e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="dark:border-slate-700" />

          {/* Link to existing maintenance record */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              <Link className="w-3 h-3" />
              Link to Existing Record <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
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
            <Label className="flex items-center gap-1">
              <Link className="w-3 h-3" />
              Link to Bill <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
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