import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';

export default function InventoryReport() {
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

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

                  return (
                    <TableRow key={item.id}>
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