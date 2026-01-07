import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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

  return (
    <div className="space-y-4">
      {bills.length > 0 ? (
        bills.map((bill) => (
          <Card key={bill.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{bill.vendor}</CardTitle>
                    <Badge className={categoryColors[bill.category]}>
                      {bill.category?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {vehicleMap[bill.vehicle_id]?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    ${bill.total_amount?.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bill.bill_number && (
                <p className="text-sm text-slate-600">Bill #: {bill.bill_number}</p>
              )}
              {bill.notes && (
                <p className="text-sm text-slate-600">{bill.notes}</p>
              )}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(bill)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
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
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-slate-600">No bills yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}