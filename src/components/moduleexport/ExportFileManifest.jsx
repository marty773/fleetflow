import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const FILE_GROUPS = [
  {
    label: 'Entity Schemas',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    files: [
      'entities/Vehicle.json',
      'entities/MaintenanceRecord.json',
      'entities/MaintenanceInterval.json',
      'entities/Item.json',
      'entities/Bill.json',
      'entities/Vendor.json',
      'entities/CalendarAppointment.json',
      'entities/ServiceType.json',
      'entities/UserCompanyAccess.json',
      'entities/CompanyNotificationSettings.json',
    ],
  },
  {
    label: 'Pages',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    files: [
      'pages/Vehicles.jsx',
      'pages/Bills.jsx',
      'pages/Maintenance.jsx',
      'pages/Items.jsx',
      'pages/Calendar.jsx',
      'pages/Reports.jsx',
      'pages/Vendors.jsx',
      'pages/VehicleForm.jsx',
      'pages/BillFormPage.jsx',
      'pages/ItemFormPage.jsx',
      'pages/VendorFormPage.jsx',
      'pages/MaintenanceRecordFormPage.jsx',
      'pages/MaintenanceIntervalFormPage.jsx',
      'pages/SystemUpdates.jsx',
    ],
  },
  {
    label: 'Components',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    files: [
      'components/vehicles/VehicleCard.jsx',
      'components/vehicles/VehicleForm.jsx',
      'components/vehicles/VehicleViewDialog.jsx',
      'components/vehicles/FleetMap.jsx',
      'components/vehicles/FleetLivePreview.jsx',
      'components/vehicles/FleetLiveSection.jsx',
      'components/vehicles/MotiveLivePanel.jsx',
      'components/bills/BillForm.jsx',
      'components/bills/BillList.jsx',
      'components/bills/BillGallery.jsx',
      'components/bills/CreateMaintenanceFromBillDialog.jsx',
      'components/maintenance/MaintenanceForm.jsx',
      'components/maintenance/MaintenanceList.jsx',
      'components/maintenance/IntervalForm.jsx',
      'components/maintenance/IntervalList.jsx',
      'components/maintenance/MarkCompleteDialog.jsx',
      'components/maintenance/AIIntervalGenerator.jsx',
      'components/items/ItemCard.jsx',
      'components/items/ItemForm.jsx',
      'components/items/ItemFormDialog.jsx',
      'components/vendors/VendorCard.jsx',
      'components/vendors/VendorForm.jsx',
      'components/calendar/AppointmentForm.jsx',
      'components/calendar/SyncDialog.jsx',
      'components/dashboard/DashboardStats.jsx',
      'components/dashboard/DashboardServiceList.jsx',
      'components/dashboard/RecentExpenses.jsx',
      'components/dashboard/UpcomingMaintenance.jsx',
      'components/reports/VehicleCostReport.jsx',
      'components/reports/VehicleCostChart.jsx',
      'components/reports/InventoryReport.jsx',
      'components/reports/VendorReport.jsx',
      'components/reports/PartsNeededReport.jsx',
      'components/dialogs/BillDetailDialog.jsx',
      'components/dialogs/ItemDetailDialog.jsx',
      'components/dialogs/IntervalDetailDialog.jsx',
      'components/dialogs/MaintenanceRecordDetailDialog.jsx',
      'components/settings/DataExport.jsx',
      'components/settings/ServiceReminderSettings.jsx',
      'components/settings/ServiceTypesEditor.jsx',
      'components/systemupdates/PendingChangesList.jsx',
      'components/systemupdates/VersionHistoryList.jsx',
      'components/mobile/BottomTabs.jsx',
      'components/GlobalSearch.jsx',
      'components/PageTransition.jsx',
      'components/PullToRefresh.jsx',
      'components/ResponsiveSelect.jsx',
      'components/useServiceTypes.jsx',
    ],
  },
  {
    label: 'Backend Functions',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    files: [
      'functions/exportFleetData.js',
      'functions/fetchMotiveVehicleData.js',
      'functions/fetchMotiveMaintenanceData.js',
      'functions/generateMaintenanceIntervals.js',
      'functions/syncToGoogleCalendar.js',
      'functions/uploadToGoogleDrive.js',
      'functions/downloadMaintenanceRecord.js',
      'functions/convertImageToPDF.js',
      'functions/fixInventoryFromBills.js',
      'functions/motiveWebhook.js',
      'functions/validateUserUpdate.js',
    ],
  },
  {
    label: 'Hooks & Utilities',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    files: [
      'hooks/usePagePermissions.jsx',
      'hooks/use-mobile.jsx',
      'lib/AuthContext.jsx',
      'lib/NavigationTracker.jsx',
      'lib/query-client.js',
      'lib/utils.js',
      'utils/index.ts',
    ],
  },
  {
    label: 'App Shell',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    files: [
      'Layout.jsx',
      'App.jsx',
      'index.css',
      'tailwind.config.js',
      'index.html',
    ],
  },
];

export default function ExportFileManifest() {
  const [copiedGroup, setCopiedGroup] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyGroup = (groupLabel, files) => {
    navigator.clipboard.writeText(files.join('\n'));
    setCopiedGroup(groupLabel);
    toast.success(`Copied ${files.length} file paths`);
    setTimeout(() => setCopiedGroup(null), 2000);
  };

  const copyAll = () => {
    const all = FILE_GROUPS.flatMap(g => g.files).join('\n');
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    toast.success(`Copied all ${FILE_GROUPS.flatMap(g => g.files).length} file paths`);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const totalFiles = FILE_GROUPS.flatMap(g => g.files).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Fleet Module — All Files ({totalFiles})</CardTitle>
          <Button size="sm" variant="outline" onClick={copyAll}
            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
            {copiedAll ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
            {copiedAll ? 'Copied!' : 'Copy All'}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 dark:text-slate-400">
          Copy file paths to paste into GitHub or share with your new app's developer. Each group can be copied individually.
        </CardContent>
      </Card>

      {FILE_GROUPS.map(group => (
        <Card key={group.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Badge className={group.color + ' text-xs font-semibold border-0'}>{group.label}</Badge>
              <span className="text-xs text-slate-400 dark:text-slate-500">{group.files.length} files</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copyGroup(group.label, group.files)}
              className="text-slate-500 dark:text-slate-400 h-7 px-2">
              {copiedGroup === group.label ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {group.files.map(file => (
                <div key={file} className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
                  {file}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}