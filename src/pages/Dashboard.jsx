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

export default function Dashboard() {
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceIntervals = [] } = useQuery({
    queryKey: ['maintenanceIntervals'],
    queryFn: () => base44.entities.MaintenanceInterval.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Fleet Dashboard</h1>
            <p className="text-slate-600">Manage your truck and trailer fleet</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('Bills')}>
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" /> New Bill
              </Button>
            </Link>
            <Link to={createPageUrl('Maintenance')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> New Maintenance
              </Button>
            </Link>
          </div>
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
              <Wrench className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No vehicles yet</h3>
              <p className="text-slate-600 mb-6">Add your first truck or trailer to get started</p>
              <Link to={createPageUrl('Vehicles')}>
                <Button className="bg-slate-900 hover:bg-slate-800">Add Vehicle</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}