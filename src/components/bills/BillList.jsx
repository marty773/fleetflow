import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Camera, ChevronRight, Link2 } from 'lucide-react';

export default function BillList({ bills, vehicles, items, records = [], onView, onEdit, onDelete, isDeleting }) {
  const categoryColors = {
     fuel: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
     maintenance: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
     repairs: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
     insurance: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
     registration: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
     tolls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
     other: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300',
   };

  if (bills.length === 0) {
     return (
       <Card className="border-2 border-dashed dark:border-slate-700">
         <CardContent className="p-12 text-center">
           <p className="text-slate-600 dark:text-slate-400">No bills recorded yet</p>
         </CardContent>
       </Card>
     );
   }

  return (
    <div className="space-y-3">
      {bills.map((bill) => (
        <Card 
          key={bill.id} 
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onView(bill)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <p className="font-semibold text-slate-900 dark:text-white">
                     {bill.bill_number || 'No Invoice #'}
                   </p>
                   {bill.photo_url && (
                     <Camera className="w-4 h-4 text-amber-600" />
                   )}
                 </div>
                 <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{bill.vendor}</p>
                 <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(bill.bill_date + 'T12:00:00'), 'MMM dd, yyyy')}
                    </span>
                  <Badge className={categoryColors[bill.category]} variant="outline">
                    {bill.category?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${bill.total_amount?.toFixed(2)}
                </p>
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}