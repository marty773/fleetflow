import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Copy, Check, Database, FileCode, Package, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import ExportFileManifest from '@/components/moduleexport/ExportFileManifest';
import ExportMigrationGuide from '@/components/moduleexport/ExportMigrationGuide';

const FLEET_ENTITIES = [
  { name: 'Vehicle', description: 'Fleet vehicles and trailers' },
  { name: 'MaintenanceRecord', description: 'Service history records' },
  { name: 'MaintenanceInterval', description: 'Scheduled maintenance intervals' },
  { name: 'Item', description: 'Parts & inventory items' },
  { name: 'Bill', description: 'Vendor bills and invoices' },
  { name: 'Vendor', description: 'Vendor/supplier records' },
  { name: 'CalendarAppointment', description: 'Scheduled appointments' },
  { name: 'ServiceType', description: 'Custom service type definitions' },
];

export default function ModuleExport() {
  const [selectedEntities, setSelectedEntities] = useState(
    FLEET_ENTITIES.map(e => e.name)
  );
  const [exporting, setExporting] = useState(false);
  const [exportSummary, setExportSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'files' | 'guide'

  const toggleEntity = (name) => {
    setSelectedEntities(prev =>
      prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]
    );
  };

  const handleExport = async () => {
    setExporting(true);
    setExportSummary(null);
    try {
      const response = await base44.functions.invoke('exportFleetData', {
        entities: selectedEntities,
      });

      const { data, summary } = response.data;
      setExportSummary(summary);

      // Download each entity as a separate JSON file
      for (const [entityName, records] of Object.entries(data)) {
        if (!records || records.length === 0) continue;
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 150));
      }

      toast.success(`Exported ${selectedEntities.length} entities successfully`);
    } catch (err) {
      toast.error('Export failed: ' + (err.message || 'Unknown error'));
    }
    setExporting(false);
  };

  const tabs = [
    { id: 'data', label: 'Data Export', icon: Database },
    { id: 'files', label: 'File Manifest', icon: FileCode },
    { id: 'guide', label: 'Migration Guide', icon: Package },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fleet Module Export</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export data, file lists, and migration instructions for the Fleet module.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Data Export Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Entities to Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {FLEET_ENTITIES.map(entity => {
                const selected = selectedEntities.includes(entity.name);
                return (
                  <button
                    key={entity.name}
                    onClick={() => toggleEntity(entity.name)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    {selected
                      ? <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                      : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                    }
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{entity.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{entity.description}</div>
                    </div>
                    {exportSummary?.[entity.name] !== undefined && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {exportSummary[entity.name]} records
                      </Badge>
                    )}
                  </button>
                );
              })}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleExport}
                  disabled={exporting || selectedEntities.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {exporting
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Exporting...</>
                    : <><Download className="w-4 h-4 mr-2" />Export {selectedEntities.length} Entities</>
                  }
                </Button>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Downloads one JSON file per entity
                </span>
              </div>
            </CardContent>
          </Card>

          {exportSummary && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Export complete — files downloaded to your device
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(exportSummary).map(([name, count]) => (
                    <div key={name} className="text-xs text-green-600 dark:text-green-500">
                      {name}: <span className="font-semibold">{count} records</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* File Manifest Tab */}
      {activeTab === 'files' && <ExportFileManifest />}

      {/* Migration Guide Tab */}
      {activeTab === 'guide' && <ExportMigrationGuide />}
    </div>
  );
}