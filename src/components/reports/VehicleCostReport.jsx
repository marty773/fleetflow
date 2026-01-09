import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import VehicleCostChart from './VehicleCostChart';

export default function VehicleCostReport() {
  const [timeframe, setTimeframe] = useState('30');
  const [expandedVehicles, setExpandedVehicles] = useState(new Set());
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setViewingTransaction(null);
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRecords'] });
      setViewingTransaction(null);
    },
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
            id: bill.id,
            date: bill.bill_date,
            description: `${bill.vendor} - ${bill.category}`,
            amount: bill.line_items
              .filter((item) => item.vehicle_id === vehicleId)
              .reduce((sum, item) => sum + (item.total || 0), 0),
            fullData: bill,
          })),
        ...filteredMaintenance
          .filter((m) => m.vehicle_id === vehicleId)
          .map((m) => ({
            type: 'maintenance',
            id: m.id,
            date: m.performed_date,
            description: m.title,
            amount: m.total_cost || 0,
            fullData: m,
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
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            if (costData.length > 0) {
              setExpandedVehicles(new Set(costData.map(d => d.vehicle.id)));
            }
          }}>
            <CardHeader>
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                ${totalExpenses.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-2">Click to expand all vehicles</p>
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
                                    <div
                                      key={idx}
                                      onClick={() => setViewingTransaction(transaction)}
                                      className="flex justify-between items-center py-2 px-3 bg-white rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                                    >
                                      <div className="flex-1">
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

      {/* Transaction Detail Dialog */}
      {viewingTransaction && (
        <Dialog open={!!viewingTransaction} onOpenChange={() => setViewingTransaction(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingTransaction.type === 'bill' ? 'Bill' : 'Maintenance'} Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingTransaction.type === 'bill' ? (
                <>
                  {viewingTransaction.fullData.photo_url && (
                    <div className="flex justify-center">
                      <img
                        src={viewingTransaction.fullData.photo_url}
                        alt="Bill"
                        className="max-h-64 rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">Vendor</Label>
                      <p className="font-medium">{viewingTransaction.fullData.vendor}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Date</Label>
                      <p className="font-medium">{format(new Date(viewingTransaction.fullData.bill_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Bill Number</Label>
                      <p className="font-medium">{viewingTransaction.fullData.bill_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Category</Label>
                      <p className="font-medium capitalize">{viewingTransaction.fullData.category?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {viewingTransaction.fullData.line_items && viewingTransaction.fullData.line_items.length > 0 && (
                    <div>
                      <Label className="text-slate-500 mb-2 block">Line Items</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2">Description</th>
                              <th className="text-center p-2">Qty</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingTransaction.fullData.line_items.map((item, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">
                                  {item.description}
                                  {item.vehicle_id && (
                                    <span className="text-xs text-slate-500 block">
                                      Vehicle: {vehicleMap[item.vehicle_id]?.name}
                                    </span>
                                  )}
                                </td>
                                <td className="text-center p-2">{item.quantity}</td>
                                <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                                <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="border-t bg-slate-50 font-semibold">
                              <td colSpan={3} className="p-2 text-right">Total:</td>
                              <td className="text-right p-2">${viewingTransaction.fullData.total_amount?.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {viewingTransaction.fullData.notes && (
                    <div>
                      <Label className="text-slate-500">Notes</Label>
                      <p className="text-sm mt-1">{viewingTransaction.fullData.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-500">Vehicle</Label>
                      <p className="font-medium">{vehicleMap[viewingTransaction.fullData.vehicle_id]?.name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Date</Label>
                      <p className="font-medium">{format(new Date(viewingTransaction.fullData.performed_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Type</Label>
                      <p className="font-medium capitalize">{viewingTransaction.fullData.maintenance_type?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Vendor</Label>
                      <p className="font-medium">{viewingTransaction.fullData.vendor || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Odometer</Label>
                      <p className="font-medium">{viewingTransaction.fullData.odometer_reading || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Total Cost</Label>
                      <p className="font-medium text-lg">${viewingTransaction.fullData.total_cost?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  {viewingTransaction.fullData.work_items && viewingTransaction.fullData.work_items.length > 0 && (
                    <div>
                      <Label className="text-slate-500 mb-2 block">Work Items</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2">Description</th>
                              <th className="text-center p-2">Qty</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingTransaction.fullData.work_items.map((item, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{item.description}</td>
                                <td className="text-center p-2">{item.quantity}</td>
                                <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                                <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {viewingTransaction.fullData.parts_used && viewingTransaction.fullData.parts_used.length > 0 && (
                    <div>
                      <Label className="text-slate-500 mb-2 block">Parts Used</Label>
                      <div className="space-y-2">
                        {viewingTransaction.fullData.parts_used.map((part, idx) => {
                          const item = items.find(i => i.id === part.item_id);
                          return (
                            <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                              <span className="text-sm">{item?.name || 'Unknown item'}</span>
                              <span className="text-sm font-medium">Qty: {part.quantity_used}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {viewingTransaction.fullData.notes && (
                    <div>
                      <Label className="text-slate-500">Notes</Label>
                      <p className="text-sm mt-1">{viewingTransaction.fullData.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setViewingTransaction(null)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}