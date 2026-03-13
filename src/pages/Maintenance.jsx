import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import MaintenanceList from '../components/maintenance/MaintenanceList';
import IntervalList from '../components/maintenance/IntervalList';
import MaintenanceRecordDetailDialog from '../components/dialogs/MaintenanceRecordDetailDialog';
import MarkCompleteDialog from '../components/maintenance/MarkCompleteDialog';
import { format } from 'date-fns';
import { useCompany } from '../components/CompanyContext';

export default function Maintenance() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [viewingRecord, setViewingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('records');

  const [deletingRecord, setDeletingRecord] = useState(null);
  const [completingInterval, setCompletingInterval] = useState(null);
  const queryClient = useQueryClient();

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: allRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: allIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const records = allRecords.filter(r => r.company_id === selectedCompany);
  const intervals = allIntervals.filter(i => i.company_id === selectedCompany);
  const filteredItems = items.filter(i => i.company_id === selectedCompany);
  const bills = allBills.filter(b => b.company_id === selectedCompany);

  // Check for URL parameter to view a record or switch tabs
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    const tab = urlParams.get('tab');

    if (tab === 'intervals') {
      setActiveTab('intervals');
    }
    if (viewId && records.length > 0) {
      const record = records.find(r => r.id === viewId);
      if (record) setViewingRecord(record);
    }
  }, [records]);

  const deleteRecordMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    },
  });

  const updateIntervalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceInterval.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] }),
  });

  const deleteIntervalMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.MaintenanceInterval.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      queryClient.refetchQueries({ queryKey: ['maintenanceIntervals'] });
    },
  });

  const handleMarkComplete = async ({ performed_date, odometer, linked_record_id, linked_bill_id, create_record, new_record }) => {
    const interval = completingInterval;

    let resolvedRecordId = linked_record_id || null;

    // Create a new maintenance record if requested
    if (create_record && new_record) {
      const createdRecord = await base44.entities.MaintenanceRecord.create({
        company_id: selectedCompany,
        vehicle_id: interval.vehicle_id,
        maintenance_type: interval.maintenance_type || 'other',
        title: new_record.title || interval.interval_name,
        performed_date,
        vendor: new_record.vendor && new_record.vendor !== 'none' ? new_record.vendor : undefined,
        odometer_reading: odometer ? String(odometer) : undefined,
        total_cost: new_record.total_cost || undefined,
        notes: new_record.notes || undefined,
      });
      resolvedRecordId = createdRecord.id;
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    }

    const updateData = {
      last_performed_date: performed_date,
      linked_record_id: resolvedRecordId,
      linked_bill_id: linked_bill_id || null,
    };

    if (odometer) {
      updateData.last_performed_mileage = odometer;
      if (interval.interval_miles) {
        updateData.next_due_mileage = odometer + parseFloat(interval.interval_miles);
      }
    }

    if (interval.interval_months) {
      const nextDate = new Date(performed_date);
      nextDate.setMonth(nextDate.getMonth() + parseInt(interval.interval_months));
      updateData.next_due_date = nextDate.toISOString().split('T')[0];
    }

    await updateIntervalMutation.mutateAsync({ id: interval.id, data: updateData });
    setCompletingInterval(null);
    toast.success('Interval marked as complete');
  };

  const handleSyncAll = async () => {
    try {
      toast.loading('Syncing to Google Calendar...');
      const result = await base44.functions.invoke('syncToGoogleCalendar', {
        company_id: selectedCompany,
        futureOnly: false,
      });
      toast.dismiss();
      toast.success(result.data.message);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to sync to calendar');
    }
  };

  const handleFetchMotiveData = async () => {
    try {
      toast.loading('Fetching Motive maintenance data...');
      const result = await base44.functions.invoke('fetchMotiveMaintenanceData', {});
      toast.dismiss();
      if (result.data.success) {
        toast.success(`Loaded ${result.data.count} inspections from Motive`);
      } else {
        toast.error('Failed to fetch Motive data');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error connecting to Motive API');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Maintenance</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Track maintenance records and scheduled intervals</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 rounded-none">
            <TabsTrigger value="records">Maintenance Records</TabsTrigger>
            <TabsTrigger value="intervals">Scheduled Intervals</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-6">
            <div className="mb-6">
              <Button
                onClick={() => navigate('/MaintenanceRecordFormPage')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Log Maintenance
              </Button>
            </div>

            <MaintenanceList
              records={records}
              vehicles={vehicles}
              items={filteredItems}
              onView={setViewingRecord}
              onEdit={(record) => navigate(`/MaintenanceRecordFormPage?edit=${record.id}`)}
              onDelete={(id) => deleteRecordMutation.mutate(id)}
              isDeleting={deleteRecordMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="intervals" className="mt-6">
            <div className="flex flex-col lg:flex-row justify-end gap-2 mb-6">
              {selectedCompany === "Fisher's Enterprise" && (
                <Button
                  onClick={handleFetchMotiveData}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" /> Import from Motive
                </Button>
              )}
              <Button
                onClick={handleSyncAll}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Sync All to Google Calendar
              </Button>
              <Button
                onClick={() => navigate('/MaintenanceIntervalFormPage')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Interval
              </Button>
            </div>

            <IntervalList
              intervals={intervals}
              vehicles={vehicles}
              onEdit={(interval) => navigate(`/MaintenanceIntervalFormPage?edit=${interval.id}`)}
              onDelete={(id) => deleteIntervalMutation.mutate(id)}
              onMarkComplete={setCompletingInterval}
              isDeleting={deleteIntervalMutation.isPending}
            />
          </TabsContent>
          </Tabs>

          {/* Mark Complete Dialog */}
          <MarkCompleteDialog
            interval={completingInterval}
            records={records}
            bills={bills}
            vendors={vendors}
            onConfirm={handleMarkComplete}
            onClose={() => setCompletingInterval(null)}
          />

          {/* View Maintenance Record Dialog */}
          <MaintenanceRecordDetailDialog
            record={viewingRecord}
            vehicles={vehicles}
            items={filteredItems}
            bills={bills}
            intervals={intervals}
            onClose={() => setViewingRecord(null)}
            onEdit={(record) => {
              setViewingRecord(null);
              navigate(`/MaintenanceRecordFormPage?edit=${record.id}`);
            }}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Maintenance Record</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this maintenance record? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteRecordMutation.mutate(deletingRecord.id);
                    setDeletingRecord(null);
                    setViewingRecord(null);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
          </div>
          );
          }