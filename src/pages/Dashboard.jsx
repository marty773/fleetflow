import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Plus } from 'lucide-react';
import DashboardStats from '../components/dashboard/DashboardStats';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import FleetLiveSection from '../components/vehicles/FleetLiveSection';
import { useCompany } from '../components/CompanyContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [selectedInterval, setSelectedInterval] = useState(null);
  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allMaintenanceIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const maintenanceIntervals = allMaintenanceIntervals.filter(m => m.company_id === selectedCompany);
  const maintenanceRecords = allMaintenanceRecords.filter(m => m.company_id === selectedCompany);

  const calculateStats = () => {
    const overdueIntervals = maintenanceIntervals.filter(
      interval => new Date(interval.next_due_date) < new Date()
    ).length;

    return {
      totalVehicles: vehicles.length,
      overdueServices: overdueIntervals,
      upcomingMaintenance: maintenanceIntervals.filter(
        interval => {
          const daysUntilDue = (new Date(interval.next_due_date) - new Date()) / (1000 * 60 * 60 * 24);
          return daysUntilDue >= 0 && daysUntilDue <= 30;
        }
      ).length,
    };
  };

  const stats = calculateStats();

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

      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* Main Content */}
      <FleetLiveSection vehicles={vehicles} />
      <div className="grid grid-cols-1 gap-6">
        <UpcomingMaintenance intervals={maintenanceIntervals} vehicles={vehicles} onSelectInterval={setSelectedInterval} />
      </div>

      {/* Interval Detail Dialog */}
      {selectedInterval && (
        <Dialog open={!!selectedInterval} onOpenChange={() => setSelectedInterval(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedInterval.interval_name}</DialogTitle>
              <DialogDescription>{vehicles.find(v => v.id === selectedInterval.vehicle_id)?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Last Done</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedInterval.last_performed_date ? format(new Date(selectedInterval.last_performed_date + 'T12:00:00'), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Next Due</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedInterval.next_due_date ? format(new Date(selectedInterval.next_due_date + 'T12:00:00'), 'MMM dd, yyyy') : 'Not calculated'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Interval</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedInterval.interval_months ? `Every ${selectedInterval.interval_months} month${selectedInterval.interval_months > 1 ? 's' : ''}` : 'N/A'}
                  </p>
                </div>
                {selectedInterval.interval_miles && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Mileage</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedInterval.interval_miles} mi</p>
                  </div>
                )}
              </div>
              {selectedInterval.notes && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Notes</p>
                  <p className="text-slate-900 dark:text-white">{selectedInterval.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedInterval(null)}>Close</Button>
              <Button onClick={() => { setSelectedInterval(null); navigate(`/Maintenance?view=${selectedInterval.id}`); }}>View Full Details</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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