import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Plus } from 'lucide-react';
import DashboardStats from '../components/dashboard/DashboardStats';
import DashboardServiceList from '../components/dashboard/DashboardServiceList';
import FleetLiveSection from '../components/vehicles/FleetLiveSection';
import MarkCompleteDialog from '../components/maintenance/MarkCompleteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { differenceInCalendarMonths, addMonths, differenceInDays } from 'date-fns';
import { getServiceReminderMiles } from '../components/settings/ServiceReminderSettings';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [serviceListFilter, setServiceListFilter] = useState(null); // 'upcoming' | 'overdue'
  const [markCompleteInterval, setMarkCompleteInterval] = useState(null);
  const [motiveVehicles, setMotiveVehicles] = React.useState({});

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: maintenanceIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const reminderMiles = getServiceReminderMiles();

  // Fetch current vehicle mileage from Motive on mount
  React.useEffect(() => {
    const fetchMileage = async () => {
      try {
        const result = await base44.functions.invoke('fetchMotiveVehicleData', {});
        if (result.data?.success && result.data?.vehicles) {
          const map = {};
          result.data.vehicles.forEach(v => {
            // Match by VIN
            const vehicle = vehicles.find(av => av.vin && av.vin.toLowerCase() === (v.vin || '').toLowerCase());
            if (vehicle && v.odometer) {
              map[vehicle.id] = Number(v.odometer);
            }
          });
          setMotiveVehicles(map);
        }
      } catch (err) {
        // Silently fail on mileage fetch; app still works without it
        console.debug('Could not fetch Motive vehicle data');
      }
    };
    if (vehicles.length > 0) fetchMileage();
  }, [vehicles]);

  const isIntervalUpcoming = (interval) => {
    const hasMiles = interval.interval_miles && parseFloat(interval.interval_miles) > 0;
    const hasMonths = interval.interval_months && parseFloat(interval.interval_months) > 0;
    
    // Mileage-based: upcoming if miles left <= reminderMiles
    if (hasMiles) {
      const currentMiles = motiveVehicles[interval.vehicle_id];
      const lastPerformedMiles = Number(interval.last_performed_mileage);
      
      let milesLeft;
      if (currentMiles !== undefined && lastPerformedMiles !== undefined) {
        const intervalMiles = Number(interval.interval_miles);
        const milesSinceService = currentMiles - lastPerformedMiles;
        milesLeft = intervalMiles - milesSinceService;
      } else if (interval.next_due_mileage && currentMiles !== undefined) {
        milesLeft = Number(interval.next_due_mileage) - currentMiles;
      } else if (interval.next_due_mileage && lastPerformedMiles) {
        milesLeft = Number(interval.next_due_mileage) - lastPerformedMiles;
      }
      
      if (milesLeft !== undefined) {
        return milesLeft >= 0 && milesLeft <= reminderMiles;
      }
    }
    
    // Time-based: upcoming if due within reminderMiles-equivalent days (200mi/day assumption) or 30 days min
    if (hasMonths && interval.next_due_date) {
      const thresholdDays = Math.max(30, Math.round(reminderMiles / 200));
      const days = differenceInDays(new Date(interval.next_due_date), new Date());
      return days >= 0 && days <= thresholdDays;
    }
    return false;
  };

  const calculateStats = () => {
    const overdueIntervals = maintenanceIntervals.filter(
      interval => interval.next_due_date && new Date(interval.next_due_date) < new Date()
    ).length;

    return {
      totalVehicles: vehicles.length,
      overdueServices: overdueIntervals,
      upcomingMaintenance: maintenanceIntervals.filter(isIntervalUpcoming).length,
    };
  };

  const stats = calculateStats();

  const overdueIntervals = maintenanceIntervals.filter(
    i => i.next_due_date && new Date(i.next_due_date) < new Date()
  );
  const upcomingIntervals = maintenanceIntervals.filter(isIntervalUpcoming);

  const handleMarkComplete = async (data) => {
    const interval = markCompleteInterval;
    if (!interval) return;

    let recordId = data.linked_record_id;
    let billId = data.linked_bill_id;

    // Create new maintenance record if requested
    if (data.create_record) {
      const newRecord = await base44.entities.MaintenanceRecord.create({
        vehicle_id: interval.vehicle_id,
        title: data.new_record.title || interval.interval_name,
        maintenance_type: interval.maintenance_type || 'other',
        performed_date: data.performed_date,
        vendor: data.new_record.vendor || undefined,
        odometer_reading: data.odometer ? String(data.odometer) : undefined,
        total_cost: data.new_record.total_cost || undefined,
        notes: data.new_record.notes || undefined,
        company_id: interval.company_id,
        linked_bill_id: billId || undefined,
      });
      recordId = newRecord.id;
    }

    // Create new bill if requested
    if (data.attach_bill && data.new_bill) {
      const newBill = await base44.entities.Bill.create({
        ...data.new_bill,
        company_id: interval.company_id,
      });
      billId = newBill.id;
      // Update record with bill link if we just created a record
      if (recordId) {
        await base44.entities.MaintenanceRecord.update(recordId, { linked_bill_id: billId });
      }
    }

    // Calculate next due date / mileage
    const updatePayload = {
      last_performed_date: data.performed_date,
      last_performed_mileage: data.odometer || undefined,
      linked_record_id: recordId || undefined,
      linked_bill_id: billId || undefined,
    };

    if (interval.interval_months) {
      const nextDate = addMonths(new Date(data.performed_date), parseInt(interval.interval_months));
      updatePayload.next_due_date = nextDate.toISOString().split('T')[0];
    }
    if (interval.interval_miles && data.odometer) {
      updatePayload.next_due_mileage = parseFloat(data.odometer) + parseFloat(interval.interval_miles);
    }

    await base44.entities.MaintenanceInterval.update(interval.id, updatePayload);

    queryClient.invalidateQueries({ queryKey: ['maintenanceIntervals'] });
    queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
    queryClient.invalidateQueries({ queryKey: ['bills'] });

    setMarkCompleteInterval(null);
  };

  const handleOpenMarkComplete = (interval) => {
    setSelectedInterval(null);
    setMarkCompleteInterval(interval);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Fleet Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your truck and trailer fleet</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
        <Button
          onClick={() => navigate('/BillFormPage')}
          className="flex-1 sm:flex-none"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
        >
          <Plus className="w-4 h-4 mr-2" /> New Bill
        </Button>
        <Button
          onClick={() => navigate('/MaintenanceRecordFormPage')}
          className="flex-1 sm:flex-none"
          style={{ backgroundColor: 'var(--color-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
        >
          <Plus className="w-4 h-4 mr-2" /> New Maintenance
        </Button>
      </div>

      {/* Stats — clickable */}
      <DashboardStats
        stats={stats}
        onUpcomingClick={() => setServiceListFilter('upcoming')}
        onOverdueClick={() => setServiceListFilter('overdue')}
      />

      {/* Main Content */}
      <FleetLiveSection vehicles={vehicles} />

      {/* Service List Drilldown Modal */}
      {serviceListFilter && (
        <DashboardServiceList
          title={serviceListFilter === 'overdue' ? 'Overdue Services' : 'Upcoming Services'}
          intervals={serviceListFilter === 'overdue' ? overdueIntervals : upcomingIntervals}
          vehicles={vehicles}
          currentMileage={motiveVehicles}
          onClose={() => setServiceListFilter(null)}
          onSelectInterval={setSelectedInterval}
          onMarkComplete={handleOpenMarkComplete}
        />
      )}

      {/* Interval Detail Dialog */}
      {selectedInterval && (
        <Dialog open={!!selectedInterval} onOpenChange={() => setSelectedInterval(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInterval.interval_name}</DialogTitle>
              <DialogDescription>{vehicles.find(v => v.id === selectedInterval.vehicle_id)?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Last Done</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {selectedInterval.last_performed_date ? format(new Date(selectedInterval.last_performed_date + 'T12:00:00'), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Next Due</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {selectedInterval.next_due_date
                      ? format(new Date(selectedInterval.next_due_date + 'T12:00:00'), 'MMM dd, yyyy')
                      : selectedInterval.next_due_mileage
                        ? `${Number(selectedInterval.next_due_mileage).toLocaleString()} mi`
                        : 'Not calculated'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Time Interval</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {selectedInterval.interval_months ? `Every ${selectedInterval.interval_months} month${selectedInterval.interval_months > 1 ? 's' : ''}` : 'N/A'}
                  </p>
                </div>
                {selectedInterval.interval_miles && (
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Mileage Interval</p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-1">{Number(selectedInterval.interval_miles).toLocaleString()} mi</p>
                  </div>
                )}
              </div>

              {selectedInterval.last_performed_mileage && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Last Mileage</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">{Number(selectedInterval.last_performed_mileage).toLocaleString()} mi</p>
                </div>
              )}

              {selectedInterval.next_due_mileage && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Next Due Mileage</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">{Number(selectedInterval.next_due_mileage).toLocaleString()} mi</p>
                </div>
              )}

              {selectedInterval.scheduled_date && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Scheduled Shop Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">
                    {format(new Date(selectedInterval.scheduled_date + 'T12:00:00'), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}

              {selectedInterval.notes && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">Notes</p>
                  <p className="text-slate-900 dark:text-white mt-1 text-sm">{selectedInterval.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedInterval(null)}>Close</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={() => handleOpenMarkComplete(selectedInterval)}
              >
                ✓ Mark Complete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mark Complete Dialog */}
      <MarkCompleteDialog
        interval={markCompleteInterval}
        records={maintenanceRecords}
        bills={bills}
        vendors={vendors}
        onConfirm={handleMarkComplete}
        onClose={() => setMarkCompleteInterval(null)}
      />

      {/* Empty State */}
      {vehicles.length === 0 && (
        <Card className="mt-8 border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No vehicles yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Add your first truck or trailer to get started</p>
            <Button onClick={() => navigate('/VehicleForm')} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">Add Vehicle</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}