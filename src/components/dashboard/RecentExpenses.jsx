import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Camera } from 'lucide-react';
import BillDetailDialog from '../dialogs/BillDetailDialog';

export default function RecentExpenses({ bills, vehicles }) {
  const [viewingBill, setViewingBill] = useState(null);
  const recentBills = bills.slice(0, 5);

  const categoryColors = {
     fuel: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
     maintenance: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
     repairs: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
     insurance: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
     registration: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
     tolls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
     other: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300',
   };

  return (
    <Card className="border-0 shadow-sm">
       <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-slate-900 dark:text-white">Recent Expenses</CardTitle>
       </CardHeader>
       <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="text-slate-700 dark:text-slate-300">Invoice #</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300">Vendor</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300">Category</TableHead>
                  <TableHead className="text-right text-slate-700 dark:text-slate-300">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
             <TableBody>
               {recentBills.length > 0 ? (
                 recentBills.map((bill) => (
                     <TableRow key={bill.id} className="border-t border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => setViewingBill(bill)}>
                       <TableCell className="font-medium text-slate-900 dark:text-white">
                         {bill.bill_number || '-'}
                       </TableCell>
                       <TableCell className="text-slate-600 dark:text-slate-400">{bill.vendor}</TableCell>
                     <TableCell className="text-slate-900 dark:text-slate-100">{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</TableCell>
                     <TableCell>
                       <Badge className={categoryColors[bill.category]}>
                         {bill.category?.replace('_', ' ')}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
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
                   <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                     No expenses yet
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </div>
       </CardContent>

      <BillDetailDialog
        bill={viewingBill}
        vehicles={vehicles}
        onClose={() => setViewingBill(null)}
        onEdit={() => setViewingBill(null)}
      />
    </Card>
  );
}