import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_change', label: 'Filter Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

export default function CreateMaintenanceFromBillDialog({ bill, vehicles, companyId, onClose, onCreated }) {
  if (!bill) return null;

  // Distinct vehicles from bill line items
  const vehicleIds = [...new Set((bill.line_items || []).filter(i => i.vehicle_id).map(i => i.vehicle_id))];
  const billVehicles = vehicles.filter(v => vehicleIds.includes(v.id));

  const [selectedVehicleId, setSelectedVehicleId] = useState(billVehicles[0]?.id || '');
  const [title, setTitle] = useState(bill.vendor ? `Service at ${bill.vendor}` : 'Service Record');
  const [maintenanceType, setMaintenanceType] = useState('other');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Work items from the bill line items for the selected vehicle
  const workItems = (bill.line_items || [])
    .filter(i => !i.vehicle_id || i.vehicle_id === selectedVehicleId)
    .map(i => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total: i.total,
    }));

  const totalCost = workItems.reduce((sum, i) => sum + (i.total || 0), 0);

  const handleSave = async () => {
    if (!selectedVehicleId || !title) return;
    setSaving(true);
    try {
      await base44.entities.MaintenanceRecord.create({
        company_id: companyId,
        vehicle_id: selectedVehicleId,
        title,
        maintenance_type: maintenanceType,
        performed_date: bill.bill_date,
        vendor: bill.vendor,
        odometer_reading: odometer || undefined,
        work_items: workItems,
        total_cost: totalCost,
        notes: notes || undefined,
        linked_bill_id: bill.id,
      });
      toast.success('Maintenance record created');
      onCreated?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!bill} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Also create a Maintenance Record?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
          This bill is linked to a vehicle. Optionally record it as a maintenance event.
        </p>

        <div className="space-y-4 py-2">
          {billVehicles.length > 1 && (
            <div>
              <Label>Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {billVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {billVehicles.length === 1 && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Vehicle: <span className="font-medium text-slate-900 dark:text-white">{billVehicles[0].name}</span>
            </div>
          )}

          <div>
            <Label>Title *</Label>
            <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Odometer</Label>
              <Input className="mt-1" placeholder="Optional" value={odometer} onChange={e => setOdometer(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1 h-20" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400">
            {workItems.length} line item(s) will be copied from the bill &mdash; Total: <span className="font-semibold text-slate-900 dark:text-white">${totalCost.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedVehicleId || !title} className="bg-amber-500 hover:bg-amber-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wrench className="w-4 h-4 mr-2" />}
            Create Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}