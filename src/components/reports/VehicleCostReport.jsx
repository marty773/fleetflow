import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import VehicleCostChart from './VehicleCostChart';

export default function VehicleCostReport() {
  const [timeframe, setTimeframe] = useState('30');

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

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));

  const filteredBills = bills.filter(
    (b) => new Date(b.bill_date) >= cutoffDate
  );

  const filteredMaintenance = maintenanceRecords.filter(
    (m) => new Date(m.performed_date) >= cutoffDate
  );

  const vehicleCosts = {};

  filteredBills.forEach((bill) => {
    if (!bill.line_items) return;
    bill.line_items.forEach((item) => {
      if (item.vehicle_id) {
        vehicleCosts[item.vehicle_id] = (vehicleCosts[item.vehicle_id] || 0) + (item.total || 0);
      }
    });
  });

  filteredMaintenance.forEach((record) => {
    if (record.vehicle_id) {
      vehicleCosts[record.vehicle_id] =
        (vehicleCosts[record.vehicle_id] || 0) + (record.total_cost || 0);
    }
  });

  const costData = Object.keys(vehicleCosts)
    .map((vehicleId) => ({
      vehicle: vehicleMap[vehicleId],
      totalCost: vehicleCosts[vehicleId],
    }))
    .filter((item) => item.vehicle)
    .sort((a, b) => b.totalCost - a.totalCost);

  const totalExpenses = costData.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vehicle Costs by Timeframe</h2>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {costData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-600">No cost data for the selected timeframe</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  ${totalExpenses.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <VehicleCostChart data={costData} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.map((item) => (
                    <TableRow key={item.vehicle.id}>
                      <TableCell className="font-medium">{item.vehicle.name}</TableCell>
                      <TableCell className="capitalize">{item.vehicle.type}</TableCell>
                      <TableCell>{item.vehicle.license_plate || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${item.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {((item.totalCost / totalExpenses) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}