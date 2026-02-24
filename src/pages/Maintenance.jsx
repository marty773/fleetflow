import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Wrench, Download } from 'lucide-react';
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
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import MaintenanceList from '../components/maintenance/MaintenanceList';
import IntervalForm from '../components/maintenance/IntervalForm';
import IntervalList from '../components/maintenance/IntervalList';
import MaintenanceRecordDetailDialog from '../components/dialogs/MaintenanceRecordDetailDialog';
import { format } from 'date-fns';
import { useCompany } from '../components/CompanyContext';

export default function Maintenance() {
  const { selectedCompany } = useCompany();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showIntervalForm, setShowIntervalForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingInterval, setEditingInterval] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('records');

  const [deletingRecord, setDeletingRecord] = useState(null);
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

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const records = allRecords.filter(r => r.company_id === selectedCompany);
  const intervals = allIntervals.filter(i => i.company_id === selectedCompany);
  const filteredItems = items.filter(i => i.company_id === selectedCompany);

  // Check calendar connection status
  React.useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        const user = await base44.auth.me();
        const userAuths = await base44.entities.UserCalendarAuth.filter({ user_email: user.email });
        setCalendarConnected(userAuths.length > 0);
      } catch (error) {
        setCalendarConnected(false);
      }
    };
    checkCalendarConnection();
  }, []);

  // Check for URL parameter to auto-open a specific record or interval
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    const editId = urlParams.get('edit');
    const editIntervalId = urlParams.get('editInterval');
    const calendarConnectedParam = urlParams.get('calendar_connected');
    const newParam = urlParams.get('new');
    
    if (calendarConnectedParam === 'true') {
      setCalendarConnected(true);
      toast.success('Google Calendar connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (newParam === 'true') {
      setEditingRecord(null);
      setShowRecordForm(true);
      setActiveTab('records');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (editId && records.length > 0) {
      const record = records.find(r => r.id === editId);
      if (record) {
        setEditingRecord(record);
        setShowRecordForm(true);
        setActiveTab('records');
      }
    } else if (editIntervalId && intervals.length > 0) {
      const interval = intervals.find(i => i.id === editIntervalId);
      if (interval) {
        setEditingInterval(interval);
        setShowIntervalForm(true);
        setActiveTab('intervals');
      }
    } else if (viewId && records.length > 0) {
      const record = records.find(r => r.id === viewId);
      if (record) {
        setViewingRecord(record);
      }
    }
  }, [records, intervals]);

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create(data),
    onMutate: async (newRecord) => {
      await queryClient.cancelQueries({ queryKey: ['maintenanceRecords'] });
      const previousRecords = queryClient.getQueryData(['maintenanceRecords']);
      queryClient.setQueryData(['maintenanceRecords'], (old) => [
        ...(old || []),
        { ...newRecord, id: `temp-${Date.now()}`, created_date: new Date().toISOString() }
      ]);
      return { previousRecords };
    },
    onError: (err, newRecord, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(['maintenanceRecords'], context.previousRecords);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setShowRecordForm(false);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['maintenanceRecords'] });
      const previousRecords = queryClient.getQueryData(['maintenanceRecords']);
      queryClient.setQueryData(['maintenanceRecords'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, ...data } : r)) || []
      );
      return { previousRecords };
    },
    onError: (err, variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(['maintenanceRecords'], context.previousRecords);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setEditingRecord(null);
      setShowRecordForm(false);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    },
  });

  const createIntervalMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceInterval.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
    },
  });

  const updateIntervalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceInterval.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
      setEditingInterval(null);
      setShowIntervalForm(false);
    },
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

  const handleSubmitRecord = async (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    
    // Only deduct inventory when CREATING a new record, not when editing
    if (!editingRecord && dataWithCompany.parts_used && dataWithCompany.parts_used.length > 0) {
      // Group parts by item_id and sum quantities
      const partQuantityMap = {};
      data.parts_used.forEach(part => {
        if (!partQuantityMap[part.item_id]) {
          partQuantityMap[part.item_id] = 0;
        }
        partQuantityMap[part.item_id] += part.quantity_used;
      });

      // Deduct inventory using atomic operations
      for (const [item_id, quantity_used] of Object.entries(partQuantityMap)) {
        const currentItem = filteredItems.find(i => i.id === item_id);
        if (currentItem) {
          const newQty = (currentItem.quantity_on_hand || 0) - quantity_used;
          await base44.entities.Item.update(item_id, { quantity_on_hand: Math.max(0, newQty) });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }

    let createdRecord;
    if (editingRecord) {
      await updateRecordMutation.mutateAsync({ id: editingRecord.id, data: dataWithCompany });
    } else {
      createdRecord = await createRecordMutation.mutateAsync(dataWithCompany);
    }

    // Update related maintenance intervals
    const relatedIntervals = allIntervals.filter(
      interval => interval.vehicle_id === dataWithCompany.vehicle_id && interval.maintenance_type === dataWithCompany.maintenance_type
    );

    for (const interval of relatedIntervals) {
      const updateData = {
        last_performed_date: dataWithCompany.performed_date,
      };

      if (dataWithCompany.odometer_reading) {
        updateData.last_performed_mileage = parseFloat(dataWithCompany.odometer_reading);
        if (interval.interval_miles) {
          updateData.next_due_mileage = parseFloat(dataWithCompany.odometer_reading) + parseFloat(interval.interval_miles);
        }
      }

      if (interval.interval_months) {
        const nextDate = new Date(dataWithCompany.performed_date);
        nextDate.setMonth(nextDate.getMonth() + parseInt(interval.interval_months));
        updateData.next_due_date = nextDate.toISOString().split('T')[0];
      }

      await base44.entities.MaintenanceInterval.update(interval.id, updateData);
    }

    queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });

    // Send email notification if maintenance involves JEM Trailer or JEM 2022 RAM
    if (!editingRecord && createdRecord) {
      const vehicle = allVehicles.find(v => v.id === dataWithCompany.vehicle_id);
      if (vehicle && (vehicle.name === 'JEM Trailer' || vehicle.name === 'JEM 2022 RAM')) {
        const recordUrl = `${window.location.origin}${window.location.pathname}?view=${createdRecord.id}`;
        
        await base44.integrations.Core.SendEmail({
          to: 'manny@fishersbackyardstructures.com',
          subject: `New Maintenance Record for ${vehicle.name}`,
          body: `A new maintenance record has been logged for ${vehicle.name}.\n\nTitle: ${dataWithCompany.title}\nType: ${dataWithCompany.maintenance_type?.replace('_', ' ')}\nDate: ${format(new Date(dataWithCompany.performed_date), 'MMM dd, yyyy')}\nCost: $${dataWithCompany.total_cost?.toFixed(2) || '0.00'}\n\nView details: ${recordUrl}`
        });
      }
    }
  };

  const handleSubmitInterval = async (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    let createdInterval;
    if (editingInterval) {
      await updateIntervalMutation.mutateAsync({ id: editingInterval.id, data: dataWithCompany });
      setEditingInterval(null);
      setShowIntervalForm(false);
    } else {
      createdInterval = await createIntervalMutation.mutateAsync(dataWithCompany);
      setShowIntervalForm(false);
    }

    // Sync to Google Calendar if there's a next due date
    if (data.next_due_date && createdInterval) {
      try {
        await base44.functions.invoke('syncMaintenanceToCalendar', { interval_id: createdInterval.id });
        toast.success('Synced to Google Calendar');
      } catch (error) {
        toast.error('Failed to sync to calendar');
      }
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const result = await base44.functions.invoke('authorizeUserCalendar', {});
      window.location.href = result.data.authUrl;
    } catch (error) {
      toast.error('Failed to connect calendar');
    }
  };

  const handleSyncAll = async () => {
    if (!calendarConnected) {
      toast.error('Please connect your Google Calendar first');
      return;
    }
    
    try {
      toast.loading('Syncing to your Google Calendar...');
      const result = await base44.functions.invoke('syncUserMaintenanceToCalendar', {});
      toast.dismiss();
      toast.success(result.data.message);
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.error || 'Failed to sync to calendar');
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
                onClick={() => {
                  setEditingRecord(null);
                  setShowRecordForm(!showRecordForm);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Log Maintenance
              </Button>
            </div>

            {showRecordForm && (
              <MaintenanceForm
                record={editingRecord}
                vehicles={vehicles}
                items={filteredItems}
                vendors={vendors}
                onSubmit={handleSubmitRecord}
                onCancel={() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const returnTo = urlParams.get('returnTo');
                  if (returnTo) {
                    window.location.href = `/${returnTo}`;
                  } else {
                    setShowRecordForm(false);
                    setEditingRecord(null);
                  }
                }}
                isLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
              />
            )}

            <MaintenanceList
              records={records}
              vehicles={vehicles}
              items={filteredItems}
              onView={setViewingRecord}
              onEdit={(record) => {
                setEditingRecord(record);
                setShowRecordForm(true);
              }}
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
              {!calendarConnected ? (
                <Button
                  onClick={handleConnectCalendar}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" /> Connect Calendar
                </Button>
              ) : (
                <Button
                  onClick={handleSyncAll}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" /> Sync to My Calendar
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingInterval(null);
                  setShowIntervalForm(!showIntervalForm);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Interval
              </Button>
            </div>

            {showIntervalForm && (
              <IntervalForm
                interval={editingInterval}
                vehicles={vehicles}
                onSubmit={handleSubmitInterval}
                onCancel={() => {
                  setShowIntervalForm(false);
                  setEditingInterval(null);
                }}
                isLoading={createIntervalMutation.isPending || updateIntervalMutation.isPending}
              />
            )}

            <IntervalList
              intervals={intervals}
              vehicles={vehicles}
              onEdit={(interval) => {
                setEditingInterval(interval);
                setShowIntervalForm(true);
              }}
              onDelete={(id) => deleteIntervalMutation.mutate(id)}
              isDeleting={deleteIntervalMutation.isPending}
            />
          </TabsContent>
          </Tabs>

          {/* View Maintenance Record Dialog */}
          <MaintenanceRecordDetailDialog
            record={viewingRecord}
            vehicles={vehicles}
            items={filteredItems}
            onClose={() => setViewingRecord(null)}
            onEdit={(record) => {
              setEditingRecord(record);
              setViewingRecord(null);
              setShowRecordForm(true);
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