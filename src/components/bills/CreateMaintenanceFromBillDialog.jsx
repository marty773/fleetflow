import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, Loader2, CheckCircle2, Calendar, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { addMonths } from 'date-fns';

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_change', label: 'Filter Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

// Keywords used to match bill content against interval names/types
const TYPE_KEYWORDS = {
  oil_change: ['oil', 'lube', 'lubrication', 'motor oil'],
  filter_change: ['filter', 'air filter', 'fuel filter', 'cabin filter'],
  tire_rotation: ['tire', 'tyre', 'rotation', 'wheel'],
  inspection: ['inspect', 'inspection', 'dot', 'safety check', 'check'],
  repair: ['repair', 'fix', 'replace', 'replacement', 'rebuild'],
  cleaning: ['clean', 'wash', 'detail'],
};

function scoreIntervalMatch(interval, billKeywords) {
  const haystack = `${interval.interval_name} ${interval.maintenance_type || ''}`.toLowerCase();
  let score = 0;
  for (const kw of billKeywords) {
    if (haystack.includes(kw.toLowerCase())) score += 2;
  }
  // Bonus: type keyword match
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
    if (interval.maintenance_type === type) {
      for (const kw of kws) {
        if (billKeywords.some(bkw => bkw.toLowerCase().includes(kw))) score += 1;
      }
    }
  }
  return score;
}

function extractKeywords(bill) {
  const parts = [];
  if (bill.vendor) parts.push(bill.vendor);
  (bill.line_items || []).forEach(li => { if (li.description) parts.push(li.description); });
  // Flatten into individual words/phrases
  return parts.flatMap(p => p.split(/[\s,/]+/)).filter(w => w.length > 2);
}

export default function CreateMaintenanceFromBillDialog({ bill, vehicles, intervals = [], onClose, onCreated }) {
  if (!bill) return null;

  const vehicleIds = [...new Set((bill.line_items || []).filter(i => i.vehicle_id).map(i => i.vehicle_id))];
  const billVehicles = vehicles.filter(v => vehicleIds.includes(v.id));

  const [selectedVehicleId, setSelectedVehicleId] = useState(billVehicles[0]?.id || '');
  const [title, setTitle] = useState(bill.vendor ? `Service at ${bill.vendor}` : 'Service Record');
  const [maintenanceType, setMaintenanceType] = useState('other');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Interval completion mode: null = create new record, interval.id = complete that interval
  const [completeIntervalId, setCompleteIntervalId] = useState('new'); // 'new' | interval.id
  const [loadingOdometer, setLoadingOdometer] = useState(false);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [selectedLineItemIndexes, setSelectedLineItemIndexes] = useState([]);

  const fetchOdometerFromMotive = () => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle || vehicle.type !== 'truck') return;
    setLoadingOdometer(true);
    base44.functions.invoke('fetchMotiveVehicleData', {})
      .then(result => {
        if (result.data?.success && result.data?.vehicles) {
          const match = result.data.vehicles.find(
            mv => vehicle.vin && mv.vin && mv.vin.toLowerCase() === vehicle.vin.toLowerCase()
          );
          if (match?.odometer) setOdometer(String(Math.round(Number(match.odometer))));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOdometer(false));
  };

  const workItems = useMemo(() => (bill.line_items || [])
    .filter(i => !i.vehicle_id || i.vehicle_id === selectedVehicleId)
    .map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, total: i.total })),
    [bill.line_items, selectedVehicleId]);

  const totalCost = workItems.reduce((sum, i) => sum + (i.total || 0), 0);

  // Open intervals for selected vehicle
  const vehicleIntervals = useMemo(
    () => intervals.filter(iv => iv.vehicle_id === selectedVehicleId),
    [intervals, selectedVehicleId]
  );

  // Suggest best-matching intervals
  const billKeywords = useMemo(() => extractKeywords(bill), [bill]);
  const suggestedIntervals = useMemo(() => {
    const scored = vehicleIntervals.map(iv => ({ iv, score: scoreIntervalMatch(iv, billKeywords) }));
    scored.sort((a, b) => b.score - a.score);
    // Return top suggestions with score > 0, or all if none match
    const withScore = scored.filter(s => s.score > 0);
    return (withScore.length > 0 ? withScore : scored).slice(0, 5).map(s => s.iv);
  }, [vehicleIntervals, billKeywords]);

  // Auto-select best suggestion on mount / vehicle change
  useEffect(() => {
    if (suggestedIntervals.length > 0 && suggestedIntervals[0]) {
      setCompleteIntervalId(suggestedIntervals[0].id);
    } else {
      setCompleteIntervalId('new');
    }
  }, [selectedVehicleId, suggestedIntervals.length > 0 ? suggestedIntervals[0]?.id : null]);

  // Auto-fill odometer for trucks via Motive
  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle || vehicle.type !== 'truck') return;

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
  }, [selectedVehicleId]);

  const selectedInterval = completeIntervalId !== 'new'
    ? intervals.find(iv => iv.id === completeIntervalId)
    : null;

  const handleSave = async () => {
    if (!selectedVehicleId || !title) return;
    setSaving(true);
    try {
      // Create the maintenance record
      const record = await base44.entities.MaintenanceRecord.create({
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

      // If completing an interval, update it
      if (selectedInterval) {
        const updatePayload = {
          last_performed_date: bill.bill_date,
          last_performed_mileage: odometer ? parseFloat(odometer) : undefined,
          linked_record_id: record.id,
          linked_bill_id: bill.id,
        };
        if (selectedInterval.interval_months) {
          const nextDate = addMonths(new Date(bill.bill_date), parseInt(selectedInterval.interval_months));
          updatePayload.next_due_date = nextDate.toISOString().split('T')[0];
        }
        if (selectedInterval.interval_miles && odometer) {
          updatePayload.next_due_mileage = parseFloat(odometer) + parseFloat(selectedInterval.interval_miles);
        }
        await base44.entities.MaintenanceInterval.update(selectedInterval.id, updatePayload);
        toast.success('Maintenance record created & interval marked complete');
      } else {
        toast.success('Maintenance record created');
      }

      onCreated?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <Dialog open={!!bill} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          {/* Vehicle selector */}
          {billVehicles.length > 1 && (
            <div>
              <Label>Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
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

          {/* Interval completion */}
          {vehicleIntervals.length > 0 && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2 bg-blue-50 dark:bg-blue-950/30">
              <Label className="text-blue-800 dark:text-blue-300 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Complete an Open Maintenance Interval?
              </Label>
              <Select value={completeIntervalId} onValueChange={setCompleteIntervalId}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">— No, just create a record —</SelectItem>
                  {suggestedIntervals.map(iv => (
                    <SelectItem key={iv.id} value={iv.id}>
                      {iv.interval_name}
                      {iv.next_due_date ? ` (due ${iv.next_due_date})` : ''}
                    </SelectItem>
                  ))}
                  {/* Show remaining intervals not in suggestions */}
                  {vehicleIntervals
                    .filter(iv => !suggestedIntervals.find(s => s.id === iv.id))
                    .map(iv => (
                      <SelectItem key={iv.id} value={iv.id}>
                        {iv.interval_name}
                        {iv.next_due_date ? ` (due ${iv.next_due_date})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedInterval && (
                <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Will mark "<strong>{selectedInterval.interval_name}</strong>" as complete and recalculate next due date.
                </p>
              )}
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Odometer
                {loadingOdometer && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                {selectedVehicle?.type === 'truck' && !loadingOdometer && odometer && (
                  <span className="text-xs text-green-600 font-normal">from Motive</span>
                )}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={loadingOdometer ? 'Fetching...' : 'Optional'}
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  disabled={loadingOdometer}
                />
                {selectedVehicle?.type === 'truck' && (
                  <Button type="button" variant="outline" size="icon" onClick={fetchOdometerFromMotive} disabled={loadingOdometer} title="Fetch current odometer from Motive" className="shrink-0">
                    <RefreshCw className={`w-4 h-4 ${loadingOdometer ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
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
          <Button variant="outline" onClick={onClose} disabled={saving}>Skip</Button>
          <Button onClick={handleSave} disabled={saving || !selectedVehicleId || !title} className="bg-amber-500 hover:bg-amber-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wrench className="w-4 h-4 mr-2" />}
            {selectedInterval ? 'Create Record & Complete Interval' : 'Create Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}