import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { SelectItem } from '@/components/ui/select';
import { X, Plus, Trash2, Edit, Package, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useServiceTypes } from '@/components/useServiceTypes';

export default function IntervalForm({ interval, vehicles, items = [], onSubmit, onCancel, isLoading }) {
  const serviceTypes = useServiceTypes(null, 'records');
  const [suggestedParts, setSuggestedParts] = useState(interval?.suggested_parts || []);
  const [newPart, setNewPart] = useState({ item_id: '', description: '', quantity: 1, unit_price: 0 });
  const [partSearchOpen, setPartSearchOpen] = useState(false);
  const [editingPartIdx, setEditingPartIdx] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_id: interval?.vehicle_id || '',
    interval_name: interval?.interval_name || '',
    maintenance_type: interval?.maintenance_type || 'oil_change',
    interval_months: interval?.interval_months || '',
    interval_miles: interval?.interval_miles || '',
    last_performed_date: interval?.last_performed_date || '',
    last_performed_mileage: interval?.last_performed_mileage || '',
    scheduled_date: interval?.scheduled_date || '',
    notes: interval?.notes || '',
  });

  useEffect(() => {
    if (interval) {
      setFormData({
        vehicle_id: interval.vehicle_id || '',
        interval_name: interval.interval_name || '',
        maintenance_type: interval.maintenance_type || 'oil_change',
        interval_months: interval.interval_months || '',
        interval_miles: interval.interval_miles || '',
        last_performed_date: interval.last_performed_date || '',
        last_performed_mileage: interval.last_performed_mileage || '',
        scheduled_date: interval.scheduled_date || '',
        notes: interval.notes || '',
      });
      setSuggestedParts(interval.suggested_parts || []);
    }
  }, [interval]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateNextDue = () => {
    const data = { ...formData };
    const hasMonths = data.interval_months && parseFloat(data.interval_months) > 0;
    const hasMiles = data.interval_miles && parseFloat(data.interval_miles) > 0;

    // If months is set, calculate next due date from date
    if (hasMonths && data.last_performed_date) {
      const lastDate = new Date(data.last_performed_date + 'T12:00:00');
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + parseInt(data.interval_months));
      data.next_due_date = nextDate.toISOString().split('T')[0];
    } else if (!hasMonths) {
      // Mileage-only: clear next_due_date so UI doesn't show stale date
      data.next_due_date = null;
    }

    // Calculate next due mileage
    if (hasMiles && data.last_performed_mileage) {
      data.next_due_mileage = parseFloat(data.last_performed_mileage) + parseFloat(data.interval_miles);
    }

    return data;
  };

  const handleAddPart = () => {
    if (!newPart.description) return;
    if (editingPartIdx !== null) {
      setSuggestedParts(prev => prev.map((p, i) => i === editingPartIdx ? { ...newPart } : p));
      setEditingPartIdx(null);
    } else {
      setSuggestedParts(prev => [...prev, { ...newPart }]);
    }
    setNewPart({ item_id: '', description: '', quantity: 1, unit_price: 0 });
  };

  const handleEditPart = (idx) => {
    setNewPart({ ...suggestedParts[idx] });
    setEditingPartIdx(idx);
  };

  const handleRemovePart = (idx) => {
    setSuggestedParts(prev => prev.filter((_, i) => i !== idx));
    if (editingPartIdx === idx) { setEditingPartIdx(null); setNewPart({ item_id: '', description: '', quantity: 1, unit_price: 0 }); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate at least one interval type is provided
    if (!formData.interval_months && !formData.interval_miles) {
      alert('Please enter either an interval in months or miles');
      return;
    }
    
    const submissionData = calculateNextDue();
    if (submissionData.interval_months === '') submissionData.interval_months = null;
    if (submissionData.interval_miles === '') submissionData.interval_miles = null;
    if (submissionData.last_performed_mileage === '') submissionData.last_performed_mileage = null;
    if (submissionData.next_due_mileage === '') submissionData.next_due_mileage = null;
    submissionData.suggested_parts = suggestedParts;
    onSubmit(submissionData);
  };

  return (
    <Card className="mb-6 border-0 shadow-sm">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle>{interval ? 'Edit Interval' : 'Create Maintenance Interval'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vehicle_id">Vehicle *</Label>
              <ResponsiveSelect
                value={formData.vehicle_id}
                onValueChange={(value) => handleChange('vehicle_id', value)}
                placeholder="Select vehicle"
                label="Select Vehicle"
              >
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}{v.license_plate ? ` (${v.license_plate})` : ''}
                  </SelectItem>
                ))}
              </ResponsiveSelect>
            </div>

            <div>
              <Label htmlFor="interval_name">Interval Name *</Label>
              <Input
                id="interval_name"
                placeholder="e.g., Oil Change Every 3 Months"
                value={formData.interval_name}
                onChange={(e) => handleChange('interval_name', e.target.value)}
                required
                className="mt-2 select-text"
              />
            </div>

            <div>
              <Label htmlFor="maintenance_type">Type *</Label>
              <ResponsiveSelect
                value={formData.maintenance_type}
                onValueChange={(value) => handleChange('maintenance_type', value)}
                placeholder="Select type"
                label="Select Type"
              >
                {serviceTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </ResponsiveSelect>
            </div>

            <div>
              <Label htmlFor="interval_months">Repeat Every (Months)</Label>
              <Input
                id="interval_months"
                type="number"
                min="1"
                placeholder="e.g., 3"
                value={formData.interval_months}
                onChange={(e) => handleChange('interval_months', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Leave empty if using mileage-based interval only</p>
            </div>

            <div>
              <Label htmlFor="interval_miles">Or Every (Miles)</Label>
              <Input
                id="interval_miles"
                type="number"
                min="1"
                placeholder="e.g., 3000"
                value={formData.interval_miles}
                onChange={(e) => handleChange('interval_miles', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Leave empty if using time-based interval only</p>
            </div>

            <div>
              <Label htmlFor="last_performed_date">Last Performed Date <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="last_performed_date"
                type="date"
                value={formData.last_performed_date}
                onChange={(e) => handleChange('last_performed_date', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">When was this maintenance last done?</p>
            </div>

            <div>
              <Label htmlFor="last_performed_mileage">Last Odometer Reading - Optional</Label>
              <Input
                id="last_performed_mileage"
                type="number"
                placeholder="Miles"
                value={formData.last_performed_mileage}
                onChange={(e) => handleChange('last_performed_mileage', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Odometer reading at last maintenance</p>
            </div>
          </div>

          {/* Scheduled Date Override */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Label htmlFor="scheduled_date" className="text-blue-800 dark:text-blue-300 font-semibold">
              Scheduled Shop Date <span className="font-normal text-blue-600 dark:text-blue-400">(Optional Override)</span>
            </Label>
            <Input
              id="scheduled_date"
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => handleChange('scheduled_date', e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Set this to pin this item to the exact day the vehicle is going to the shop. Overrides the auto-calculated due date on the calendar.
              {formData.scheduled_date && (
                <button
                  type="button"
                  onClick={() => handleChange('scheduled_date', '')}
                  className="ml-2 underline text-blue-700 dark:text-blue-300"
                >
                  Clear override
                </button>
              )}
            </p>
          </div>

          {/* Suggested Parts */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Suggested Parts <span className="text-slate-400 font-normal">(optional — auto-populated when completing this interval)</span></Label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
              {items.length > 0 && (
                <Popover open={partSearchOpen} onOpenChange={setPartSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between text-sm">
                      <span className="truncate flex items-center gap-1">
                        {newPart.item_id ? <><Package className="w-3 h-3" />{items.find(i => i.id === newPart.item_id)?.name}</> : 'Select stock item...'}
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
                          <CommandItem value="none" onSelect={() => { setNewPart(p => ({ ...p, item_id: '', description: '', unit_price: 0 })); setPartSearchOpen(false); }}>
                            <Check className={cn('mr-2 h-4 w-4', !newPart.item_id ? 'opacity-100' : 'opacity-0')} /> None
                          </CommandItem>
                          {items.map(item => (
                            <CommandItem key={item.id} value={`${item.name} ${item.item_number || ''}`}
                              onSelect={() => {
                                setNewPart(p => ({ ...p, item_id: item.id, description: item.name, unit_price: item.price || 0 }));
                                setPartSearchOpen(false);
                              }}>
                              <Check className={cn('mr-2 h-4 w-4', newPart.item_id === item.id ? 'opacity-100' : 'opacity-0')} />
                              {item.name} — ${item.price?.toFixed(2) || '0.00'}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <Input placeholder="Part description" value={newPart.description} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Qty" value={newPart.quantity} onChange={e => setNewPart(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))} />
                <Input type="number" placeholder="Unit Price" value={newPart.unit_price} onChange={e => setNewPart(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAddPart} disabled={!newPart.description}>
                <Plus className="w-4 h-4 mr-1" /> {editingPartIdx !== null ? 'Update Part' : 'Add Part'}
              </Button>
            </div>
            {suggestedParts.length > 0 && (
              <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800">
                      <TableHead>Part</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestedParts.map((part, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="flex items-center gap-1 text-sm">
                          {part.item_id && <Package className="w-3 h-3 text-slate-400 shrink-0" />}
                          {part.description}
                        </TableCell>
                        <TableCell className="text-sm">{part.quantity}</TableCell>
                        <TableCell className="text-sm">${(part.unit_price || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => handleEditPart(idx)} className="text-blue-600 hover:text-blue-700"><Edit className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleRemovePart(idx)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-2 select-text"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.vehicle_id || !formData.interval_name || (!formData.interval_months && !formData.interval_miles)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Interval'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}