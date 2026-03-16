import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles, Upload, X, Check, Loader2, ChevronDown, ChevronUp, FileText, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const TYPE_COLORS = {
  oil_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  filter_change: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  tire_rotation: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inspection: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  repair: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cleaning: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// Normalize a name for fuzzy comparison
function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Detect if an AI interval matches an existing one
function findDuplicate(aiInterval, existingIntervals, vehicleId) {
  const aiNorm = normalizeName(aiInterval.interval_name);
  return existingIntervals.find(ex => {
    if (vehicleId && ex.vehicle_id !== vehicleId) return false;
    const exNorm = normalizeName(ex.interval_name);
    // Match if names are identical or one contains the other
    return exNorm === aiNorm || exNorm.includes(aiNorm) || aiNorm.includes(exNorm);
  });
}

// Check if the AI interval has meaningfully different values from existing
function hasDiff(aiInterval, existing) {
  const fields = ['interval_months', 'interval_miles', 'maintenance_type'];
  return fields.some(f => {
    const aiVal = aiInterval[f] != null ? Number(aiInterval[f]) || aiInterval[f] : null;
    const exVal = existing[f] != null ? Number(existing[f]) || existing[f] : null;
    return aiVal != null && aiVal !== exVal;
  });
}

function diffSummary(aiInterval, existing) {
  const lines = [];
  if (aiInterval.interval_months != null && Number(aiInterval.interval_months) !== Number(existing.interval_months)) {
    lines.push(`Interval: ${existing.interval_months ?? '—'} mo → ${aiInterval.interval_months} mo`);
  }
  if (aiInterval.interval_miles != null && Number(aiInterval.interval_miles) !== Number(existing.interval_miles)) {
    lines.push(`Miles: ${existing.interval_miles?.toLocaleString() ?? '—'} → ${aiInterval.interval_miles?.toLocaleString()}`);
  }
  if (aiInterval.maintenance_type && aiInterval.maintenance_type !== existing.maintenance_type) {
    lines.push(`Type: ${existing.maintenance_type?.replace(/_/g, ' ')} → ${aiInterval.maintenance_type.replace(/_/g, ' ')}`);
  }
  return lines;
}

export default function AIIntervalGenerator({ vehicles, existingIntervals = [], open, onClose, onCreated }) {
  const [step, setStep] = useState('input');
  const [vehicleId, setVehicleId] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [vin, setVin] = useState('');
  const [vinLoading, setVinLoading] = useState(false);
  const [severeService, setSevereService] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [intervals, setIntervals] = useState([]); // enriched with { ...aiData, _status, _existing }
  const [selected, setSelected] = useState(new Set());
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Confirm-update queue
  const [updateQueue, setUpdateQueue] = useState([]); // list of enriched intervals to confirm
  const [currentConfirm, setCurrentConfirm] = useState(null); // item currently in confirm dialog
  const fileInputRef = useRef(null);

  const handleVehicleSelect = (id) => {
    setVehicleId(id);
    if (id) {
      const v = vehicles.find(v => v.id === id);
      if (v) {
        setMake(v.make || '');
        setModel(v.model || '');
        setYear(v.year ? String(v.year) : '');
        setVin(v.vin || '');
        // Default severe service ON for trucks
        setSevereService(v.type === 'truck' ? true : false);
      }
    } else {
      setSevereService(true);
    }
  };

  const handleVinLookup = async () => {
    const cleanVin = vin.trim().toUpperCase();
    if (cleanVin.length !== 17) {
      toast.error('VIN must be 17 characters');
      return;
    }
    setVinLoading(true);
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanVin}?format=json`);
    const data = await res.json();
    const r = data?.Results?.[0];
    if (r) {
      if (r.Make) setMake(r.Make);
      if (r.Model) setModel(r.Model);
      if (r.ModelYear) setYear(r.ModelYear);
      toast.success(`Found: ${r.ModelYear} ${r.Make} ${r.Model}`);
    } else {
      toast.error('No vehicle found for that VIN');
    }
    setVinLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedFile(file.name);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  const handleGenerate = async () => {
    if (!make || !model || !year) {
      toast.error('Please enter Make, Model, and Year');
      return;
    }
    setStep('loading');
    const result = await base44.functions.invoke('generateMaintenanceIntervals', {
      vehicle_id: vehicleId || null,
      make, model, year,
      file_url: fileUrl || null,
    });
    const generated = result.data?.intervals || [];

    // Enrich with duplicate detection
    const enriched = generated.map(ai => {
      const existing = findDuplicate(ai, existingIntervals, vehicleId || null);
      let _status = 'new';
      if (existing) {
        _status = hasDiff(ai, existing) ? 'update' : 'duplicate';
      }
      return { ...ai, _status, _existing: existing || null };
    });

    setIntervals(enriched);
    // Pre-select all "new" and "update" items; exclude exact duplicates
    setSelected(new Set(enriched.map((item, i) => item._status !== 'duplicate' ? i : null).filter(i => i !== null)));
    setStep('review');
  };

  const handleToggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleToggleNotes = (i) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // Build update queue, then kick off confirmation loop
  const handleSave = async () => {
    const toProcess = intervals.filter((_, i) => selected.has(i));
    if (toProcess.length === 0) {
      toast.error('No intervals selected');
      return;
    }

    const updatesNeeded = toProcess.filter(item => item._status === 'update');
    if (updatesNeeded.length > 0) {
      // Kick off confirmation queue
      setUpdateQueue(toProcess); // store full list for after confirmations
      setCurrentConfirm(updatesNeeded[0]);
    } else {
      await commitSave(toProcess, []);
    }
  };

  // Called each time user responds to a confirm dialog
  const handleConfirmResponse = async (approve) => {
    const item = currentConfirm;
    const confirmed = approve ? item : null;

    // Find next update in queue that still needs confirmation
    const remaining = updateQueue
      .filter(i => i._status === 'update' && i !== item);
    const nextUpdate = remaining[0] || null;

    if (nextUpdate) {
      // Store decision and move to next
      setCurrentConfirm(nextUpdate);
      // Accumulate approved updates by marking item
      setUpdateQueue(prev => prev.map(q =>
        q === item ? { ...q, _confirmed: approve } : q
      ));
    } else {
      // Last confirmation — finalize with all decisions
      const finalQueue = updateQueue.map(q =>
        q === item ? { ...q, _confirmed: approve } : q
      );
      setCurrentConfirm(null);
      await commitSave(finalQueue, []);
    }
  };

  const commitSave = async (toProcess, _unused) => {
    setSaving(true);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of toProcess) {
      const { _status, _existing, _confirmed, ...payload } = item;

      if (_status === 'new') {
        await base44.entities.MaintenanceInterval.create(payload);
        created++;
      } else if (_status === 'update') {
        if (_confirmed !== false) { // undefined = came from no-confirm path (all approved), false = skipped
          await base44.entities.MaintenanceInterval.update(_existing.id, {
            interval_months: payload.interval_months,
            interval_miles: payload.interval_miles,
            maintenance_type: payload.maintenance_type,
            notes: payload.notes,
          });
          updated++;
        } else {
          skipped++;
        }
      }
      // 'duplicate' status items are never in toProcess (deselected by default)
    }

    setSaving(false);
    const parts = [];
    if (created) parts.push(`${created} created`);
    if (updated) parts.push(`${updated} updated`);
    if (skipped) parts.push(`${skipped} skipped`);
    toast.success(`Done — ${parts.join(', ')}`);
    onCreated?.();
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setVehicleId('');
    setMake(''); setModel(''); setYear('');
    setUploadedFile(null); setFileUrl(null);
    setIntervals([]);
    setSelected(new Set());
    setExpandedNotes(new Set());
    setUpdateQueue([]);
    setCurrentConfirm(null);
    onClose();
  };

  const statusLabel = (status) => {
    if (status === 'duplicate') return <Badge className="text-xs bg-slate-100 text-slate-500 border border-slate-300">Already exists</Badge>;
    if (status === 'update') return <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-300"><RefreshCw className="w-3 h-3 mr-1 inline" />Will update</Badge>;
    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI Maintenance Schedule Generator
            </DialogTitle>
          </DialogHeader>

          {step === 'input' && (
            <div className="space-y-5 pt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter the vehicle details below and the AI will generate a full manufacturer maintenance schedule, ready to import as intervals.
              </p>

              {vehicles.length > 0 && (
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Link to Vehicle (optional)</Label>
                  <Select value={vehicleId} onValueChange={handleVehicleSelect}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a vehicle to pre-fill details" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None — enter manually</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} — {v.year} {v.make} {v.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Make *</Label>
                  <Input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Ford" className="mt-2 select-text" />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Model *</Label>
                  <Input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. F-250" className="mt-2 select-text" />
                </div>
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Year *</Label>
                  <Input value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2021" className="mt-2 select-text" />
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <Label className="text-slate-700 dark:text-slate-300 block mb-2">Upload Owner's Manual (optional but recommended)</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">PDF, image, or document. The AI will cite exact pages/sections in the notes.</p>
                {uploadedFile ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <FileText className="w-4 h-4" />
                    {uploadedFile}
                    <button onClick={() => { setUploadedFile(null); setFileUrl(null); }} className="ml-auto text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline" size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : 'Choose File'}
                  </Button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileUpload} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!make || !model || !year || uploading}
                  className="bg-amber-500 hover:bg-amber-600 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Schedule
                </Button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              <p className="text-slate-700 dark:text-slate-300 font-medium">Analyzing {year} {make} {model}...</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">The AI is generating a complete maintenance schedule based on manufacturer data. This may take 15–30 seconds.</p>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Found <span className="font-semibold text-slate-900 dark:text-white">{intervals.length}</span> tasks.{' '}
                  {intervals.filter(i => i._status === 'update').length > 0 && (
                    <span className="text-orange-600 font-medium">{intervals.filter(i => i._status === 'update').length} will update existing intervals.</span>
                  )}
                  {intervals.filter(i => i._status === 'duplicate').length > 0 && (
                    <span className="text-slate-400 ml-1">{intervals.filter(i => i._status === 'duplicate').length} already up-to-date.</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(intervals.map((item, i) => item._status !== 'duplicate' ? i : null).filter(i => i !== null)))} className="text-xs text-amber-600 hover:underline">All new/updates</button>
                  <span className="text-xs text-slate-400">|</span>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-amber-600 hover:underline">None</button>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {intervals.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => handleToggleSelect(i)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(i)
                        ? item._status === 'update'
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${selected.has(i) ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        {selected.has(i) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">{item.interval_name}</span>
                          <Badge className={`text-xs ${TYPE_COLORS[item.maintenance_type] || TYPE_COLORS.other}`}>
                            {item.maintenance_type.replace(/_/g, ' ')}
                          </Badge>
                          {statusLabel(item._status)}
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {item.interval_months && <span>Every {item.interval_months} mo</span>}
                          {item.interval_miles && <span>Every {item.interval_miles.toLocaleString()} mi</span>}
                        </div>
                        {/* Show diff details for update items */}
                        {item._status === 'update' && item._existing && (
                          <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 space-y-0.5">
                            {diffSummary(item, item._existing).map((line, li) => (
                              <div key={li}>↳ {line}</div>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div className="mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleNotes(i); }}
                              className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                            >
                              Source {expandedNotes.has(i) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {expandedNotes.has(i) && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{item.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t dark:border-slate-700">
                <Button variant="outline" onClick={() => setStep('input')}>← Back</Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || selected.size === 0}
                  className="bg-amber-500 hover:bg-amber-600 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : `Import ${selected.size} Interval${selected.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Per-item update confirmation dialog */}
      {currentConfirm && (
        <AlertDialog open={!!currentConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                Update Existing Interval?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">"{currentConfirm.interval_name}"</span> already exists.
                    The AI suggests these changes:
                  </p>
                  <ul className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 space-y-1">
                    {diffSummary(currentConfirm, currentConfirm._existing).map((line, i) => (
                      <li key={i} className="text-orange-700 dark:text-orange-300 font-medium">• {line}</li>
                    ))}
                  </ul>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Last performed date, mileage, and linked records will not be changed.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleConfirmResponse(false)}>
                Skip this update
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConfirmResponse(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Yes, update it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}