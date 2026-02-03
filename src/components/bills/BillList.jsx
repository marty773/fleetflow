import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Camera, ChevronRight } from 'lucide-react';

export default function BillList({ bills, vehicles, items, onView, onEdit, onDelete, isDeleting }) {
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
                  <p className="font-semibold text-slate-900">
                    {bill.bill_number || 'No Invoice #'}
                  </p>
                  {bill.photo_url && (
                    <Camera className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">{bill.vendor}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">
                    {format(new Date(bill.bill_date + 'T12:00:00'), 'MMM dd, yyyy')}
                  </span>
                  <Badge className={categoryColors[bill.category]} variant="outline">
                    {bill.category?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-slate-900">
                  ${bill.total_amount?.toFixed(2)}
                </p>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}