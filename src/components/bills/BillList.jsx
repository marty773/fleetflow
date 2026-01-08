import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, Edit2, Trash2, Camera } from 'lucide-react';

export default function BillList({ bills, vehicles, items, onView, onEdit, onDelete, isDeleting }) {
  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const categoryColors = {
    fuel: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    repairs: 'bg-red-100 text-red-800',
    insurance: 'bg-purple-100 text-purple-800',
    registration: 'bg-green-100 text-green-800',
    tolls: 'bg-indigo-100 text-indigo-800',
    other: 'bg-slate-100 text-slate-800',
  };

  if (bills.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <p className="text-slate-600">No bills recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Invoice Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    {bill.bill_number || '-'}
                  </TableCell>
                  <TableCell>{bill.vendor}</TableCell>
                  <TableCell>{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={categoryColors[bill.category]}>
                      {bill.category?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${bill.total_amount?.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {bill.photo_url && (
                        <Camera className="w-4 h-4 text-amber-600 mr-1" title="Has photo" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(bill)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(bill)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this bill?')) {
                            onDelete(bill.id);
                          }
                        }}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}