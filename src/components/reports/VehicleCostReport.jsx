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
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import VehicleCostChart from './VehicleCostChart';

export default function VehicleCostReport() {
  const [timeframe, setTimeframe] = useState('30');
  const [expandedVehicles, setExpandedVehicles] = useState(new Set());

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
      transactions: [
        ...filteredBills
          .filter((bill) => bill.line_items?.some((item) => item.vehicle_id === vehicleId))
          .map((bill) => ({
            type: 'bill',
            date: bill.bill_date,
            description: `${bill.vendor} - ${bill.category}`,
            amount: bill.line_items
              .filter((item) => item.vehicle_id === vehicleId)
              .reduce((sum, item) => sum + (item.total || 0), 0),
          })),
        ...filteredMaintenance
          .filter((m) => m.vehicle_id === vehicleId)
          .map((m) => ({
            type: 'maintenance',
            date: m.performed_date,
            description: m.title,
            amount: m.total_cost || 0,
          })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)),
    }))
    .filter((item) => item.vehicle)
    .sort((a, b) => b.totalCost - a.totalCost);

  const totalExpenses = costData.reduce((sum, item) => sum + item.totalCost, 0);

  const toggleVehicle = (vehicleId) => {
    const newExpanded = new Set(expandedVehicles);
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId);
    } else {
      newExpanded.add(vehicleId);
    }
    setExpandedVehicles(newExpanded);
  };

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
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.map((item) => {
                    const isExpanded = expandedVehicles.has(item.vehicle.id);
                    return (
                      <React.Fragment key={item.vehicle.id}>
                        <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => toggleVehicle(item.vehicle.id)}>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
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
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50 p-0">
                              <div className="p-4">
                                <h4 className="font-semibold text-sm text-slate-700 mb-3">Transaction Details</h4>
                                <div className="space-y-2">
                                  {item.transactions.map((transaction, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border border-slate-200">
                                      <div>
                                        <p className="text-sm font-medium text-slate-900">{transaction.description}</p>
                                        <p className="text-xs text-slate-500">
                                          {format(new Date(transaction.date), 'MMM dd, yyyy')} • {transaction.type === 'bill' ? 'Bill' : 'Maintenance'}
                                        </p>
                                      </div>
                                      <p className="text-sm font-semibold text-slate-900">${transaction.amount.toFixed(2)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}