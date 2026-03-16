import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Upload, X, Check, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ResponsiveSelect from '@/components/ResponsiveSelect';

const TYPE_COLORS = {
  oil_change: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  filter_change: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  tire_rotation: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inspection: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  repair: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cleaning: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function AIIntervalGenerator({ vehicles, open, onClose, onCreated }) {
  const [step, setStep] = useState('input'); // 'input' | 'loading' | 'review'
  const [vehicleId, setVehicleId] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [scheduleType, setScheduleType] = useState('normal');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [intervals, setIntervals] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-fill make/model/year from selected vehicle
  const handleVehicleSelect = (id) => {
    setVehicleId(id);
    if (id) {
      const v = vehicles.find(v => v.id === id);
      if (v) {
        setMake(v.make || '');
        setModel(v.model || '');
        setYear(v.year ? String(v.year) : '');
      }
    }
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
      make,
      model,
      year,
      schedule_type: scheduleType,
      file_url: fileUrl || null,
    });
    const generated = result.data?.intervals || [];
    setIntervals(generated);
    setSelected(new Set(generated.map((_, i) => i)));
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

  const handleSave = async () => {
    const toSave = intervals.filter((_, i) => selected.has(i));
    if (toSave.length === 0) {
      toast.error('No intervals selected');
      return;
    }
    setSaving(true);
    await base44.entities.MaintenanceInterval.bulkCreate(toSave);
    setSaving(false);
    toast.success(`Created ${toSave.length} maintenance interval${toSave.length > 1 ? 's' : ''}`);
    onCreated?.();
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setVehicleId('');
    setMake('');
    setModel('');
    setYear('');
    setScheduleType('normal');
    setUploadedFile(null);
    setFileUrl(null);
    setIntervals([]);
    setSelected(new Set());
    setExpandedNotes(new Set());
    onClose();
  };

  return (
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

            {/* Vehicle picker */}
            {vehicles.length > 0 && (
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Link to Vehicle (optional)</Label>
                <ResponsiveSelect
                  value={vehicleId}
                  onValueChange={handleVehicleSelect}
                  placeholder="Select a vehicle to pre-fill details"
                  options={[
                    { value: '', label: 'None — enter manually' },
                    ...vehicles.map(v => ({ value: v.id, label: `${v.name} — ${v.year} ${v.make} ${v.model}` }))
                  ]}
                  className="mt-2"
                />
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

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Schedule Type</Label>
              <ResponsiveSelect
                value={scheduleType}
                onValueChange={setScheduleType}
                options={[
                  { value: 'normal', label: 'Normal — Standard driving conditions' },
                  { value: 'severe', label: 'Severe — Towing, stop-and-go, dusty conditions' },
                ]}
                className="mt-2"
              />
            </div>

            {/* Manual upload */}
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
                  variant="outline"
                  size="sm"
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Found <span className="font-semibold text-slate-900 dark:text-white">{intervals.length}</span> maintenance tasks.
                Select the ones to import.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(intervals.map((_, i) => i)))} className="text-xs text-amber-600 hover:underline">All</button>
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
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
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
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {item.interval_months && <span>Every {item.interval_months} mo</span>}
                        {item.interval_miles && <span>Every {item.interval_miles.toLocaleString()} mi</span>}
                      </div>
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
  );
}