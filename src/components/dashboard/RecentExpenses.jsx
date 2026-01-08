import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Camera } from 'lucide-react';

export default function RecentExpenses({ bills, vehicles }) {
  const [viewingBill, setViewingBill] = useState(null);
  const recentBills = bills.slice(0, 5);

  const categoryColors = {
    fuel: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    repairs: 'bg-red-100 text-red-800',
    insurance: 'bg-purple-100 text-purple-800',
    registration: 'bg-green-100 text-green-800',
    tolls: 'bg-indigo-100 text-indigo-800',
    other: 'bg-slate-100 text-slate-800',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBills.length > 0 ? (
                recentBills.map((bill) => (
                  <TableRow key={bill.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setViewingBill(bill)}>
                    <TableCell className="font-medium">
                      {bill.bill_number || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">{bill.vendor}</TableCell>
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
                      {bill.photo_url && (
                        <Camera className="w-4 h-4 text-amber-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No expenses yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* View Bill Dialog */}
      {viewingBill && (
        <Dialog open={!!viewingBill} onOpenChange={() => setViewingBill(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bill Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingBill.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={viewingBill.photo_url}
                    alt="Bill"
                    className="max-h-64 rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Vendor</Label>
                  <p className="font-medium">{viewingBill.vendor}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date</Label>
                  <p className="font-medium">{format(new Date(viewingBill.bill_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Bill Number</Label>
                  <p className="font-medium">{viewingBill.bill_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Category</Label>
                  <p className="font-medium capitalize">{viewingBill.category?.replace('_', ' ')}</p>
                </div>
              </div>
              {viewingBill.line_items && viewingBill.line_items.length > 0 && (
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
                        {viewingBill.line_items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="text-center p-2">{item.quantity}</td>
                            <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                            <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-slate-50 font-semibold">
                          <td colSpan={3} className="p-2 text-right">Total:</td>
                          <td className="text-right p-2">${viewingBill.total_amount?.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {viewingBill.notes && (
                <div>
                  <Label className="text-slate-500">Notes</Label>
                  <p className="text-sm mt-1">{viewingBill.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setViewingBill(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}