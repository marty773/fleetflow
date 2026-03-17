import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { CheckCircle2, Plus, Trash2, Edit, Package, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServiceTypes } from '@/components/useServiceTypes';

export default function MarkCompleteDialog({ interval, records, bills, vendors, items = [], vehicles = [], onConfirm, onClose }) {
  const serviceTypes = useServiceTypes(null, 'records');

  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [recordMode, setRecordMode] = useState('create');
  const [linkedRecordId, setLinkedRecordId] = useState('none');
  const [linkedBillId, setLinkedBillId] = useState('none');

  // New record fields
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordType, setNewRecordType] = useState('other');
  const [newRecordVendor, setNewRecordVendor] = useState('');
  const [newRecordNotes, setNewRecordNotes] = useState('');
  const [workItems, setWorkItems] = useState([]);
  const [newWorkItem, setNewWorkItem] = useState({ description: '', quantity: 1, unit_price: 0, item_id: '' });
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);

  // Bill fields
  const [attachBill, setAttachBill] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [billVendor, setBillVendor] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingOdometer, setLoadingOdometer] = useState(false);

  useEffect(() => {
    if (interval) {
      setPerformedDate(new Date().toISOString().split('T')[0]);
      setOdometer('');
      setRecordMode('create');
      setLinkedRecordId('none');
      setLinkedBillId('none');
      setNewRecordTitle('');
      setNewRecordType(interval.maintenance_type || 'other');
      setNewRecordVendor('');
      setNewRecordNotes('');
      setWorkItems([]);
      setNewWorkItem({ description: '', quantity: 1, unit_price: 0, item_id: '' });
      setAttachBill(false);
      setBillAmount('');
      setBillVendor('');

      // Auto-fill odometer from Motive for trucks
      const vehicle = vehicles.find(v => v.id === interval.vehicle_id);
      if (vehicle?.type === 'truck') {
        setLoadingOdometer(true);
        base44.functions.invoke('fetchMotiveVehicleData', {})
          .then(result => {
            if (result.data?.success && result.data?.vehicles) {
              const match = result.data.vehicles.find(
                mv => vehicle.vin && mv.vin && mv.vin.toLowerCase() === vehicle.vin.toLowerCase()
              );
              if (match?.odometer) {
                setOdometer(String(Math.round(Number(match.odometer))));
              }
            }
          })
          .catch(() => {})
          .finally(() => setLoadingOdometer(false));
      }
    }
  }, [interval?.id]);

  if (!interval) return null;

  const vehicleRecords = records.filter(r => r.vehicle_id === interval.vehicle_id);
  const vehicleBills = bills.filter(b => b.vendor);

  const calculateTotal = () => workItems.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleAddWorkItem = () => {
    if (!newWorkItem.description) return;
    const total = newWorkItem.quantity * newWorkItem.unit_price;
    setWorkItems(prev => [...prev, { ...newWorkItem, total }]);
    setNewWorkItem({ description: '', quantity: 1, unit_price: 0, item_id: '' });
  };

  const handleRemoveWorkItem = (idx) => setWorkItems(prev => prev.filter((_, i) => i !== idx));

  const handleEditWorkItem = (idx) => {
    setNewWorkItem({ ...workItems[idx] });
    handleRemoveWorkItem(idx);
  };

  const handleRecordSelect = (recordId) => {
    setLinkedRecordId(recordId);
    if (recordId !== 'none') {
      const record = records.find(r => r.id === recordId);
      if (record) {
        setPerformedDate(record.performed_date || performedDate);
        if (record.odometer_reading) setOdometer(record.odometer_reading);
      }
    }
  };

  const handleBillSelect = (billId) => {
    setLinkedBillId(billId);
    if (billId !== 'none' && recordMode === 'create') {
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        setPerformedDate(bill.bill_date || performedDate);
        if (!newRecordVendor) setNewRecordVendor(bill.vendor || '');
      }
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    const total = calculateTotal();
    const partsUsed = workItems
      .filter(i => i.item_id && i.quantity > 0)
      .map(i => ({ item_id: i.item_id, quantity_used: i.quantity }));

    await onConfirm({
      performed_date: performedDate,
      odometer: odometer ? parseFloat(odometer) : null,
      linked_record_id: recordMode === 'link' ? (linkedRecordId === 'none' ? null : linkedRecordId) : null,
      linked_bill_id: linkedBillId === 'none' ? null : linkedBillId,
      create_record: recordMode === 'create',
      new_record: recordMode === 'create' ? {
        title: newRecordTitle || interval.interval_name,
        maintenance_type: newRecordType,
        vendor: newRecordVendor && newRecordVendor !== 'none' ? newRecordVendor : undefined,
        notes: newRecordNotes,
        total_cost: total || null,
        work_items: workItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.total,
          ...(i.item_id && { item_id: i.item_id }),
        })),
        parts_used: partsUsed,
      } : null,
      attach_bill: attachBill,
      new_bill: attachBill ? {
        vendor: billVendor || newRecordVendor || 'Service Provider',
        bill_date: performedDate,
        total_amount: billAmount ? parseFloat(billAmount) : (total || 0),
        category: 'maintenance',
        line_items: [{
          description: newRecordTitle || interval.interval_name,
          quantity: 1,
          unit_price: billAmount ? parseFloat(billAmount) : (total || 0),
          total: billAmount ? parseFloat(billAmount) : (total || 0),
          vehicle_id: interval.vehicle_id
        }]
      } : null,
    });
    setIsLoading(false);
  };

  return (
    <Dialog open={!!interval} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Mark as Completed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="font-semibold text-slate-900 dark:text-white">{interval.interval_name}</p>
          <p className="text-sm text-slate-500">{interval.maintenance_type?.replace(/_/g, ' ')}</p>
        </div>

        <div className="space-y-4">
          {/* Date & Odometer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date Performed</Label>
              <Input type="date" value={performedDate} onChange={e => setPerformedDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Odometer <span className="text-slate-400 font-normal">(optional)</span>
                {loadingOdometer && <span className="text-xs text-slate-400 animate-pulse">fetching...</span>}
                {!loadingOdometer && odometer && vehicles.find(v => v.id === interval.vehicle_id)?.type === 'truck' && (
                  <span className="text-xs text-green-600">from Motive</span>
                )}
              </Label>
              <Input type="number" placeholder={loadingOdometer ? 'Fetching...' : 'e.g. 125000'} value={odometer} onChange={e => setOdometer(e.target.value)} disabled={loadingOdometer} />
            </div>
          </div>

          {interval.interval_months && (
            <p className="text-sm text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              Next due: <strong>
                {(() => {
                  const d = new Date(performedDate);
                  d.setMonth(d.getMonth() + parseInt(interval.interval_months));
                  return format(d, 'MMM dd, yyyy');
                })()}
              </strong>
              {interval.interval_miles && odometer ? ` / ${(parseFloat(odometer) + parseFloat(interval.interval_miles)).toLocaleString()} mi` : ''}
            </p>
          )}

          <hr className="dark:border-slate-700" />

          {/* Maintenance Record toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Maintenance Record</Label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setRecordMode('create')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${recordMode === 'create' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                Create New
              </button>
              <button type="button" onClick={() => setRecordMode('link')}
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700 ${recordMode === 'link' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                Link Existing
              </button>
            </div>

            {/* Create New Record */}
            {recordMode === 'create' && (
              <div className="space-y-3 border-l-2 border-green-200 dark:border-green-900 pl-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input placeholder={interval.interval_name} value={newRecordTitle} onChange={e => setNewRecordTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={newRecordType} onValueChange={setNewRecordType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Vendor */}
                <div className="space-y-1">
                  <Label>Service Provider <span className="text-slate-400 font-normal">(optional)</span></Label>
                  {vendors && vendors.length > 0 ? (
                    <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                          <span className="truncate">{newRecordVendor || 'Select vendor'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0">
                        <Command>
                          <CommandInput placeholder="Search vendors..." />
                          <CommandList>
                            <CommandEmpty>No vendor found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="none" onSelect={() => { setNewRecordVendor(''); setVendorSearchOpen(false); }}>
                                <Check className={cn('mr-2 h-4 w-4', !newRecordVendor ? 'opacity-100' : 'opacity-0')} /> None
                              </CommandItem>
                              {vendors.map(v => (
                                <CommandItem key={v.id} value={v.name} onSelect={() => { setNewRecordVendor(v.name); setVendorSearchOpen(false); }}>
                                  <Check className={cn('mr-2 h-4 w-4', newRecordVendor === v.name ? 'opacity-100' : 'opacity-0')} />
                                  {v.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input placeholder="Vendor name" value={newRecordVendor} onChange={e => setNewRecordVendor(e.target.value)} />
                  )}
                </div>

                {/* Work Items */}
                <div className="space-y-2">
                  <Label>Work Performed <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                    <Input placeholder="Work description" value={newWorkItem.description}
                      onChange={e => setNewWorkItem(p => ({ ...p, description: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Qty" value={newWorkItem.quantity}
                        onChange={e => setNewWorkItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
                      <Input type="number" placeholder="Unit Price" value={newWorkItem.unit_price}
                        onChange={e => setNewWorkItem(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    {items.length > 0 && (
                      <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" role="combobox" className="w-full justify-between text-sm">
                            <span className="truncate">
                              {newWorkItem.item_id ? items.find(i => i.id === newWorkItem.item_id)?.name : 'Stock Item (optional)'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0">
                          <Command>
                            <CommandInput placeholder="Search items..." />
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem value="none" onSelect={() => { setNewWorkItem(p => ({ ...p, item_id: '' })); setItemSearchOpen(false); }}>
                                  <Check className={cn('mr-2 h-4 w-4', !newWorkItem.item_id ? 'opacity-100' : 'opacity-0')} /> None
                                </CommandItem>
                                {items.map(item => (
                                  <CommandItem key={item.id} value={`${item.name} ${item.item_number || ''}`}
                                    onSelect={() => {
                                      setNewWorkItem(p => ({ ...p, item_id: item.id, description: item.name, unit_price: item.price || 0 }));
                                      setItemSearchOpen(false);
                                    }}>
                                    <Check className={cn('mr-2 h-4 w-4', newWorkItem.item_id === item.id ? 'opacity-100' : 'opacity-0')} />
                                    {item.name} — ${item.price?.toFixed(2) || '0.00'}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAddWorkItem}>
                      <Plus className="w-4 h-4 mr-1" /> Add Item
                    </Button>
                  </div>

                  {workItems.length > 0 && (
                    <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800">
                            <TableHead>Description</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="w-16"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {item.item_id && <Package className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                                  <span className="text-sm">{item.description}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-sm">${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-sm">${item.total.toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => handleEditWorkItem(idx)} className="text-blue-600 hover:text-blue-700"><Edit className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => handleRemoveWorkItem(idx)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 dark:bg-slate-800 font-semibold">
                            <TableCell colSpan={3} className="text-sm">Total:</TableCell>
                            <TableCell className="text-sm">${calculateTotal().toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Textarea placeholder="Any notes..." value={newRecordNotes} onChange={e => setNewRecordNotes(e.target.value)} className="h-16" />
                </div>
              </div>
            )}

            {/* Link Existing Record */}
            {recordMode === 'link' && (
              <div className="space-y-1">
                <Select value={linkedRecordId} onValueChange={handleRecordSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a record..." /></SelectTrigger>
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

          {/* Billing */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Billing</Label>
            <div className="space-y-1">
              <Label className="text-xs">Link to Existing Bill <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select value={linkedBillId} onValueChange={handleBillSelect}>
                <SelectTrigger><SelectValue placeholder="Select a bill..." /></SelectTrigger>
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

            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <Checkbox id="attach_bill" checked={attachBill} onCheckedChange={setAttachBill} />
              <Label htmlFor="attach_bill" className="text-xs cursor-pointer mb-0">Create new bill for this completion</Label>
            </div>

            {attachBill && (
              <div className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 pl-3">
                <div className="space-y-1">
                  <Label className="text-xs">Vendor</Label>
                  <Input placeholder={newRecordVendor || 'Service provider'} value={billVendor} onChange={e => setBillVendor(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount {calculateTotal() > 0 && <span className="text-slate-400 font-normal">(defaults to work items total: ${calculateTotal().toFixed(2)})</span>}</Label>
                  <Input type="number" placeholder={calculateTotal() > 0 ? calculateTotal().toFixed(2) : '0.00'} value={billAmount} onChange={e => setBillAmount(e.target.value)} className="text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isLoading || !performedDate} className="bg-green-600 hover:bg-green-700 text-white">
            {isLoading ? 'Saving...' : 'Mark Complete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}