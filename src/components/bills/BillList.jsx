import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2, Trash2, FileText } from 'lucide-react';

export default function BillList({ bills, vehicles, onEdit, onDelete, isDeleting }) {
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
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">No bills yet</p>
        </CardContent>
      </Card>
    );
  }

  const sortedBills = [...bills].sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));

  return (
    <div className="space-y-4">
      {sortedBills.map((bill) => (
        <Card key={bill.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{bill.vendor}</h3>
                  <Badge className={categoryColors[bill.category]}>
                    {bill.category?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-slate-600">Vehicle</p>
                    <p className="font-semibold text-slate-900">
                      {vehicleMap[bill.vehicle_id]?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date</p>
                    <p className="font-semibold text-slate-900">
                      {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {bill.bill_number && (
                    <div>
                      <p className="text-slate-600">Bill #</p>
                      <p className="font-semibold text-slate-900">{bill.bill_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-600">Amount</p>
                    <p className="font-semibold text-slate-900">
                      ${bill.total_amount?.toFixed(2)}
                    </p>
                  </div>
                </div>
                {bill.notes && (
                  <p className="text-xs text-slate-500 mt-3">{bill.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}