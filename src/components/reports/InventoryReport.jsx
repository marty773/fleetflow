import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';

export default function InventoryReport() {
  const [expandedItems, setExpandedItems] = useState({});
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const totalValue = items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity_on_hand || 0),
    0
  );

  const lowStockItems = items.filter((item) => {
    const qty = item.quantity_on_hand || 0;
    const threshold = item.low_stock_threshold || 2;
    return qty > 0 && qty <= threshold;
  });
  const outOfStockItems = items.filter((item) => (item.quantity_on_hand || 0) === 0);

  const sortedItems = [...items].sort((a, b) => {
    const valueA = (a.price || 0) * (a.quantity_on_hand || 0);
    const valueB = (b.price || 0) * (b.quantity_on_hand || 0);
    return valueB - valueA;
  });

  const getItemTransactions = (itemId) => {
    const transactions = [];

    // Find purchases from bills
    bills.forEach((bill) => {
      if (bill.line_items) {
        bill.line_items.forEach((lineItem) => {
          if (lineItem.item_id === itemId && lineItem.item_quantity > 0) {
            transactions.push({
              type: 'purchase',
              date: bill.bill_date,
              quantity: lineItem.item_quantity,
              vendor: bill.vendor,
              reference: `Bill #${bill.bill_number || 'N/A'}`,
              fullData: bill,
              transactionType: 'bill',
            });
          }
        });
      }
    });

    // Find usage from maintenance
    maintenanceRecords.forEach((record) => {
      if (record.parts_used) {
        record.parts_used.forEach((part) => {
          if (part.item_id === itemId) {
            transactions.push({
              type: 'usage',
              date: record.performed_date,
              quantity: part.quantity_used,
              vehicle: vehicleMap[record.vehicle_id]?.name || 'Unknown',
              reference: record.title,
              fullData: record,
              transactionType: 'maintenance',
            });
          }
        });
      }
    });

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Inventory Overview</h2>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          setFilterMode('value');
          const itemsToExpand = {};
          sortedItems.slice(0, 5).forEach(item => {
            itemsToExpand[item.id] = true;
          });
          setExpandedItems(itemsToExpand);
        }}>
          <CardHeader>
            <CardTitle className="text-lg">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-2">Tap to view top items</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          setFilterMode('low');
          const itemsToExpand = {};
          lowStockItems.forEach(item => {
            itemsToExpand[item.id] = true;
          });
          setExpandedItems(itemsToExpand);
        }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{lowStockItems.length}</p>
            <p className="text-xs text-slate-500 mt-2">Tap to view details</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          setFilterMode('out');
          const itemsToExpand = {};
          outOfStockItems.forEach(item => {
            itemsToExpand[item.id] = true;
          });
          setExpandedItems(itemsToExpand);
        }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{outOfStockItems.length}</p>
            <p className="text-xs text-slate-500 mt-2">Tap to view details</p>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600">No inventory items yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {filterMode === 'all' && 'All Inventory Items'}
              {filterMode === 'value' && 'Top 5 Items by Value'}
              {filterMode === 'low' && 'Low Stock Items'}
              {filterMode === 'out' && 'Out of Stock Items'}
            </CardTitle>
            {filterMode !== 'all' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setFilterMode('all');
                  setExpandedItems({});
                }}
              >
                Show All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty on Hand</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.filter((item) => {
                  if (filterMode === 'all') return true;
                  if (filterMode === 'value') return sortedItems.indexOf(item) < 5;
                  if (filterMode === 'low') return lowStockItems.includes(item);
                  if (filterMode === 'out') return outOfStockItems.includes(item);
                  return true;
                }).map((item) => {
                  const qty = item.quantity_on_hand || 0;
                  const value = (item.price || 0) * qty;
                  let status = 'in-stock';
                  let statusColor = 'bg-green-100 text-green-800';

                  if (qty === 0) {
                    status = 'out-of-stock';
                    statusColor = 'bg-red-100 text-red-800';
                  } else if (qty <= (item.low_stock_threshold || 2)) {
                    status = 'low-stock';
                    statusColor = 'bg-amber-100 text-amber-800';
                  }

                  const transactions = getItemTransactions(item.id);
                  const isExpanded = expandedItems[item.id];

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                        // On mobile, open first transaction directly
                        if (window.innerWidth < 768 && transactions.length > 0) {
                          setViewingTransaction(transactions[0]);
                        } else {
                          toggleExpanded(item.id);
                        }
                      }}>
                        <TableCell onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(item.id);
                        }}>
                          {transactions.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.item_number || '-'}
                        </TableCell>
                        <TableCell>{item.vendor || '-'}</TableCell>
                        <TableCell className="text-right">${item.price?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right font-semibold">{qty}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor}>
                            {status.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && transactions.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-slate-50 p-0">
                            <div className="p-4">
                              <h4 className="font-semibold text-sm mb-3">Transaction History</h4>
                              <div className="space-y-2">
                                {transactions.map((txn, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setViewingTransaction(txn)}
                                    className="flex items-center justify-between p-2 bg-white rounded border text-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      {txn.type === 'purchase' ? (
                                        <Plus className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Minus className="h-4 w-4 text-red-600" />
                                      )}
                                      <span className="font-medium">
                                        {format(new Date(txn.date), 'MMM dd, yyyy')}
                                      </span>
                                      <span className="text-slate-600">
                                        {txn.type === 'purchase'
                                          ? `Purchased from ${txn.vendor}`
                                          : `Used on ${txn.vehicle}`}
                                      </span>
                                      <span className="text-slate-500">• {txn.reference}</span>
                                    </div>
                                    <span
                                      className={`font-semibold ${
                                        txn.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                                      }`}
                                    >
                                      {txn.type === 'purchase' ? '+' : '-'}
                                      {txn.quantity}
                                    </span>
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
      )}

      {/* Transaction Detail Dialog */}
      {viewingTransaction && (
        <Dialog open={!!viewingTransaction} onOpenChange={() => setViewingTransaction(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingTransaction.transactionType === 'bill' ? 'Bill' : 'Maintenance'} Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingTransaction.transactionType === 'bill' ? (
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