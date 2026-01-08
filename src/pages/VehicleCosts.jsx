import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { subDays, subYears } from 'date-fns';
import VehicleCostChart from '@/components/reports/VehicleCostChart';
import { DollarSign } from 'lucide-react';

export default function VehicleCosts() {
  const [timeframe, setTimeframe] = useState('all_time');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const vehicleMap = useMemo(() => {
    return vehicles.reduce((acc, v) => {
      acc[v.id] = v;
      return acc;
    }, {});
  }, [vehicles]);

  const filteredCosts = useMemo(() => {
    const today = new Date();
    let startDate = new Date(0);

    switch (timeframe) {
      case '30_days':
        startDate = subDays(today, 30);
        break;
      case '90_days':
        startDate = subDays(today, 90);
        break;
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case '1_year':
        startDate = subYears(today, 1);
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        break;
    }

    const costsByVehicle = {};

    bills.forEach(bill => {
      const billDate = new Date(bill.bill_date);
      if (billDate >= startDate && bill.line_items) {
        bill.line_items.forEach(item => {
          if (item.vehicle_id && item.total) {
            costsByVehicle[item.vehicle_id] = (costsByVehicle[item.vehicle_id] || 0) + item.total;
          }
        });
      }
    });

    maintenanceRecords.forEach(record => {
      const recordDate = new Date(record.performed_date);
      if (recordDate >= startDate && record.vehicle_id && record.total_cost) {
        costsByVehicle[record.vehicle_id] = (costsByVehicle[record.vehicle_id] || 0) + record.total_cost;
      }
    });

    return Object.entries(costsByVehicle)
      .map(([vehicleId, totalCost]) => ({
        vehicle: vehicleMap[vehicleId] || { name: 'Unknown Vehicle' },
        totalCost: totalCost,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [bills, maintenanceRecords, vehicleMap, timeframe]);

  const totalAllVehiclesCost = filteredCosts.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Vehicle Costs Report</h1>
            <p className="text-slate-600 mt-2">Track expenses per vehicle over time</p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30_days">Last 30 Days</SelectItem>
              <SelectItem value="90_days">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="1_year">Last 1 Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-1 border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="text-4xl font-bold text-slate-900">${totalAllVehiclesCost.toFixed(2)}</div>
              <DollarSign className="w-10 h-10 text-slate-400" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Cost Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64">
                <VehicleCostChart data={filteredCosts} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCosts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Vehicle</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCosts.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.vehicle.name}</TableCell>
                      <TableCell>{data.vehicle.license_plate}</TableCell>
                      <TableCell>${data.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-slate-600">No cost data available for the selected timeframe.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}