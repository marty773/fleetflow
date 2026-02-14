import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertCircle, Wrench, DollarSign, Calendar, Plus } from 'lucide-react';
import DashboardStats from '../components/dashboard/DashboardStats';
import UpcomingMaintenance from '../components/dashboard/UpcomingMaintenance';
import RecentExpenses from '../components/dashboard/RecentExpenses';
import { useCompany } from '../components/CompanyContext';

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
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
  const bills = allBills.filter(b => b.company_id === selectedCompany);
  const maintenanceIntervals = allMaintenanceIntervals.filter(m => m.company_id === selectedCompany);
  const maintenanceRecords = allMaintenanceRecords.filter(m => m.company_id === selectedCompany);

  const calculateStats = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBills = bills.filter(b => new Date(b.bill_date) >= thirtyDaysAgo);
    const totalExpenses = recentBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const overdueIntervals = maintenanceIntervals.filter(
      interval => new Date(interval.next_due_date) < new Date()
    ).length;

    return {
      totalVehicles: vehicles.length,
      totalExpenses,
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
    <>
        <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Fleet Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage your truck and trailer fleet</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
            <Link to={createPageUrl('Bills')} className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto" style={{ backgroundColor: 'var(--color-primary)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}>
                <Plus className="w-4 h-4 mr-2" /> New Bill
              </Button>
            </Link>
            <Link to={createPageUrl('Maintenance')} className="flex-1 sm:flex-none">
              <Button 
                className="w-full sm:w-auto"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
              >
                <Plus className="w-4 h-4 mr-2" /> New Maintenance
              </Button>
            </Link>
        </div>

        {/* Stats */}
        <DashboardStats stats={stats} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentExpenses bills={bills} vehicles={vehicles} />
          </div>
          <div>
            <UpcomingMaintenance intervals={maintenanceIntervals} vehicles={vehicles} />
          </div>
        </div>

        {/* Empty State */}
        {vehicles.length === 0 && (
          <Card className="mt-8 border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No vehicles yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Add your first truck or trailer to get started</p>
              <Link to={createPageUrl('Vehicles')}>
                <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">Add Vehicle</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}