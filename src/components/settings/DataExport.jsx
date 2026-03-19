import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Database } from 'lucide-react';

const EXPORTABLE = [
  { key: 'Vehicle', label: 'Vehicles' },
  { key: 'MaintenanceRecord', label: 'Maintenance Records' },
  { key: 'MaintenanceInterval', label: 'Maintenance Intervals' },
  { key: 'Bill', label: 'Bills' },
  { key: 'Item', label: 'Inventory Items' },
  { key: 'Vendor', label: 'Vendors' },
  { key: 'CalendarAppointment', label: 'Calendar Appointments' },
];

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const header = keys.join(',');
  const body = rows.map(row => keys.map(k => escape(row[k])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExport() {
  const [selected, setSelected] = useState(EXPORTABLE.map(e => e.key));
  const [loading, setLoading] = useState(false);

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    for (const { key, label } of EXPORTABLE) {
      if (!selected.includes(key)) continue;
      const rows = await base44.entities[key].list();
      const csv = toCSV(rows);
      if (csv) downloadCSV(`${label.replace(/\s+/g, '_')}.csv`, csv);
    }
    setLoading(false);
  };

  const allSelected = selected.length === EXPORTABLE.length;
  const toggleAll = () => setSelected(allSelected ? [] : EXPORTABLE.map(e => e.key));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5" /> Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Download your FleetFlow data as CSV files. Each selected table will be saved as a separate file.
        </p>

        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={toggleAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            Select All
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXPORTABLE.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`export-${key}`}
                checked={selected.includes(key)}
                onCheckedChange={() => toggle(key)}
              />
              <label htmlFor={`export-${key}`} className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </div>

        <Button
          onClick={handleExport}
          disabled={loading || selected.length === 0}
          className="w-full"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? 'Exporting...' : `Export ${selected.length} Table${selected.length !== 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
}