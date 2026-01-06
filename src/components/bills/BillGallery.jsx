import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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
        <div key={bill.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {bill.photo_url && (
            <img
              src={bill.photo_url}
              alt={`Bill from ${bill.vendor}`}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 mb-2">{bill.vendor}</h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={categoryColors[bill.category]}>
                {bill.category?.replace('_', ' ')}
              </Badge>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-semibold">Vehicle:</span> {vehicleMap[bill.vehicle_id]?.name}</p>
              <p><span className="font-semibold">Date:</span> {format(new Date(bill.bill_date), 'MMM dd, yyyy')}</p>
              <p><span className="font-semibold">Amount:</span> ${bill.total_amount?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}