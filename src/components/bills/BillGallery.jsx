import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function BillGallery({ bills, vehicles }) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bills.map((bill) => (
        <div key={bill.id} className="rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          <img
            src={bill.photo_url}
            alt={bill.vendor}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="font-semibold text-slate-900">{bill.vendor}</h3>
            <p className="text-sm text-slate-600">{vehicleMap[bill.vehicle_id]?.name}</p>
            <div className="flex items-center justify-between mt-2">
              <Badge className={categoryColors[bill.category]}>
                {bill.category?.replace('_', ' ')}
              </Badge>
              <p className="font-bold text-slate-900">
                ${bill.total_amount?.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}