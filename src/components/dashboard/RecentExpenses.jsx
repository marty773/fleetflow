import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Camera } from 'lucide-react';

export default function RecentExpenses({ bills, vehicles }) {
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
                  <Link key={bill.id} to={createPageUrl('Bills') + `?view=${bill.id}`}>
                    <TableRow className="cursor-pointer hover:bg-slate-50 transition-colors">
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
                  </Link>
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
    </Card>
  );
}