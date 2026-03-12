import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Plus, Trash2, Save } from 'lucide-react';

// Built-in defaults that are always available (shown greyed out, not deletable)
const BUILT_IN_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_change', label: 'Filter Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'tolls', label: 'Tolls' },
  { value: 'other', label: 'Other' },
];

export default function ServiceTypesEditor({ selectedCompany }) {
  const [customTypes, setCustomTypes] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAppliesTo, setNewAppliesTo] = useState('both');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedCompany) return;
    base44.entities.ServiceType.filter({ company_id: selectedCompany }).then(setCustomTypes);
  }, [selectedCompany]);

  const generateValue = (label) =>
    label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const value = generateValue(newLabel);
    // Prevent duplicates with built-ins
    if (BUILT_IN_TYPES.some(t => t.value === value)) return;
    setSaving(true);
    const created = await base44.entities.ServiceType.create({
      company_id: selectedCompany,
      label: newLabel.trim(),
      value,
      applies_to: newAppliesTo,
    });
    setCustomTypes(prev => [...prev, created]);
    setNewLabel('');
    setNewAppliesTo('both');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id) => {
    await base44.entities.ServiceType.delete(id);
    setCustomTypes(prev => prev.filter(t => t.id !== id));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Wrench className="w-5 h-5" /> Service Types
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage the service categories available for bills and maintenance records.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Built-in types */}
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Built-in Types</Label>
          <div className="flex flex-wrap gap-2">
            {BUILT_IN_TYPES.map(t => (
              <span
                key={t.value}
                className="px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Custom types */}
        {customTypes.length > 0 && (
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Custom Types — {selectedCompany}</Label>
            <div className="space-y-2">
              {customTypes.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{t.label}</span>
                    <span className="ml-2 text-xs text-slate-400">({t.applies_to})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new type */}
        <div className="border-t dark:border-slate-700 pt-4 space-y-3">
          <Label className="text-xs text-slate-500 uppercase tracking-wide block">Add Custom Type</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Brake Service"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Select value={newAppliesTo} onValueChange={setNewAppliesTo}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="bills">Bills only</SelectItem>
                <SelectItem value="records">Records only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              style={{ backgroundColor: 'var(--color-primary)' }}
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
              {saved ? 'Added!' : 'Add'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}