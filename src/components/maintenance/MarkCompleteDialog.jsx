import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

// recordMode: 'create' | 'link'
export default function MarkCompleteDialog({ interval, records, bills, vendors, onConfirm, onClose }) {
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [recordMode, setRecordMode] = useState('create'); // 'create' or 'link'
  const [linkedRecordId, setLinkedRecordId] = useState('none');
  const [linkedBillId, setLinkedBillId] = useState('none');
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordVendor, setNewRecordVendor] = useState('');
  const [newRecordNotes, setNewRecordNotes] = useState('');
  const [newRecordCost, setNewRecordCost] = useState('');
  const [attachBill, setAttachBill] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [billVendor, setBillVendor] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when interval changes
  useEffect(() => {
    if (interval) {
      setPerformedDate(new Date().toISOString().split('T')[0]);
      setOdometer('');
      setRecordMode('create');
      setLinkedRecordId('none');
      setLinkedBillId('none');
      setNewRecordTitle('');
      setNewRecordVendor('');
      setNewRecordNotes('');
      setNewRecordCost('');
      setAttachBill(false);
      setBillAmount('');
      setBillVendor('');
    }
  }, [interval?.id]);

  if (!interval) return null;

  const vehicleRecords = records.filter(r => r.vehicle_id === interval.vehicle_id);
  const vehicleBills = bills.filter(b => b.vendor);

  // When a linked record is selected, auto-fill date/odometer and populate new record fields if in create mode
  const handleRecordSelect = (recordId) => {
    setLinkedRecordId(recordId);
    if (recordId !== 'none') {
      const record = records.find(r => r.id === recordId);
      if (record) {
        setPerformedDate(record.performed_date || performedDate);
        if (record.odometer_reading) setOdometer(record.odometer_reading);
        if (recordMode === 'create') {
          setNewRecordTitle(record.title || '');
          setNewRecordVendor(record.vendor || '');
          setNewRecordNotes(record.notes || '');
          setNewRecordCost(record.total_cost ? String(record.total_cost) : '');
        }
      }
    }
  };

  // When a linked bill is selected, populate new record fields if in create mode
  const handleBillSelect = (billId) => {
    setLinkedBillId(billId);
    if (billId !== 'none' && recordMode === 'create') {
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        setPerformedDate(bill.bill_date || performedDate);
        if (!newRecordVendor) setNewRecordVendor(bill.vendor || '');
        if (!newRecordCost && bill.total_amount) setNewRecordCost(String(bill.total_amount));
        if (!newRecordNotes && bill.notes) setNewRecordNotes(bill.notes || '');
      }
    }
  };

  // When switching to 'create' mode, pre-populate from any already-selected linked record/bill
  const handleModeChange = (mode) => {
    setRecordMode(mode);
    if (mode === 'create') {
      // Try to pre-populate from linked record first, then bill
      if (linkedRecordId !== 'none') {
        const record = records.find(r => r.id === linkedRecordId);
        if (record) {
          setNewRecordTitle(record.title || '');
          setNewRecordVendor(record.vendor || '');
          setNewRecordNotes(record.notes || '');
          setNewRecordCost(record.total_cost ? String(record.total_cost) : '');
        }
      } else if (linkedBillId !== 'none') {
        const bill = bills.find(b => b.id === linkedBillId);
        if (bill) {
          setNewRecordVendor(bill.vendor || '');
          setNewRecordCost(bill.total_amount ? String(bill.total_amount) : '');
          setNewRecordNotes(bill.notes || '');
        }
      }
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm({
      performed_date: performedDate,
      odometer: odometer ? parseFloat(odometer) : null,
      linked_record_id: recordMode === 'link' ? (linkedRecordId === 'none' ? null : linkedRecordId) : null,
      linked_bill_id: linkedBillId === 'none' ? null : linkedBillId,
      create_record: recordMode === 'create',
      new_record: recordMode === 'create' ? {
        title: newRecordTitle || interval.interval_name,
        vendor: newRecordVendor && newRecordVendor !== 'none' ? newRecordVendor : undefined,
        notes: newRecordNotes,
        total_cost: newRecordCost ? parseFloat(newRecordCost) : null,
      } : null,
      attach_bill: attachBill,
      new_bill: attachBill ? {
        vendor: billVendor || newRecordVendor || 'Service Provider',
        bill_date: performedDate,
        total_amount: billAmount ? parseFloat(billAmount) : 0,
        category: 'maintenance',
        line_items: [{
          description: newRecordTitle || interval.interval_name,
          quantity: 1,
          unit_price: billAmount ? parseFloat(billAmount) : 0,
          total: billAmount ? parseFloat(billAmount) : 0,
          vehicle_id: interval.vehicle_id
        }]
      } : null,
    });
    setIsLoading(false);
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
          {/* Date & Odometer */}
          <div className="space-y-1">
            <Label>Date Performed</Label>
            <Input type="date" value={performedDate} onChange={e => setPerformedDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Odometer Reading <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input type="number" placeholder="e.g. 125000" value={odometer} onChange={e => setOdometer(e.target.value)} />
          </div>

          {interval.interval_months && (
            <p className="text-sm text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              Next due:{' '}
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

          {/* Maintenance Record — radio toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Maintenance Record</Label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleModeChange('create')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  recordMode === 'create'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Create New
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('link')}
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700 ${
                  recordMode === 'link'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Link Existing
              </button>
            </div>

            {/* Create New Record form */}
            {recordMode === 'create' && (
              <div className="space-y-3 border-l-2 border-green-200 dark:border-green-900 pl-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    placeholder={interval.interval_name}
                    value={newRecordTitle}
                    onChange={e => setNewRecordTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vendor <span className="text-slate-400 font-normal">(optional)</span></Label>
                  {vendors && vendors.length > 0 ? (
                    <Select value={newRecordVendor || 'none'} onValueChange={setNewRecordVendor}>
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
                    <Input placeholder="Vendor name" value={newRecordVendor} onChange={e => setNewRecordVendor(e.target.value)} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Total Cost <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input type="number" placeholder="0.00" value={newRecordCost} onChange={e => setNewRecordCost(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Textarea placeholder="Any notes..." value={newRecordNotes} onChange={e => setNewRecordNotes(e.target.value)} className="h-20" />
                </div>
              </div>
            )}

            {/* Link Existing Record */}
            {recordMode === 'link' && (
              <div className="space-y-1">
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
            )}
          </div>

          <hr className="dark:border-slate-700" />

          {/* Link to bill — always optional */}
          <div className="space-y-1">
            <Label>Link to Bill <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Select value={linkedBillId} onValueChange={handleBillSelect}>
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