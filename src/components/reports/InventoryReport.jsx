import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function InventoryReport() {
  const [expandedItems, setExpandedItems] = useState({});

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

  const lowStockItems = items.filter((item) => (item.quantity_on_hand || 0) < 5);
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{lowStockItems.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{outOfStockItems.length}</p>
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
          <CardHeader>
            <CardTitle>All Inventory Items</CardTitle>
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
                {sortedItems.map((item) => {
                  const qty = item.quantity_on_hand || 0;
                  const value = (item.price || 0) * qty;
                  let status = 'in-stock';
                  let statusColor = 'bg-green-100 text-green-800';

                  if (qty === 0) {
                    status = 'out-of-stock';
                    statusColor = 'bg-red-100 text-red-800';
                  } else if (qty < 5) {
                    status = 'low-stock';
                    statusColor = 'bg-amber-100 text-amber-800';
                  }

                  const transactions = getItemTransactions(item.id);
                  const isExpanded = expandedItems[item.id];

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-slate-50">
                        <TableCell>
                          {transactions.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpanded(item.id)}
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
                                    className="flex items-center justify-between p-2 bg-white rounded border text-sm"
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
    </div>
  );
}