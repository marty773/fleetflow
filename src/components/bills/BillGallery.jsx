import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BillGallery({ bills, vehicles }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const billsWithPhotos = bills.filter(b => b.photo_url);

  const handlePrev = () => {
    setSelectedIdx((prev) => (prev - 1 + billsWithPhotos.length) % billsWithPhotos.length);
  };

  const handleNext = () => {
    setSelectedIdx((prev) => (prev + 1) % billsWithPhotos.length);
  };

  return (
    <div className="space-y-4">
      {/* Lightbox Modal */}
      {billsWithPhotos.length > 0 && (
        <Modal>
          <ModalContent className="max-w-4xl">
            <div className="relative">
              <img
                src={billsWithPhotos[selectedIdx].photo_url}
                alt="Bill"
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 rounded-b-lg">
                <p className="font-semibold">
                  {vehicleMap[billsWithPhotos[selectedIdx].vehicle_id]?.name}
                </p>
                <p className="text-sm opacity-90">
                  {billsWithPhotos[selectedIdx].vendor} •{' '}
                  {format(new Date(billsWithPhotos[selectedIdx].bill_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </ModalContent>
          <ModalTrigger asChild>
            <div></div>
          </ModalTrigger>
        </Modal>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {billsWithPhotos.map((bill, idx) => (
          <Card key={bill.id} className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
            <div className="relative aspect-square overflow-hidden bg-slate-100">
              <img
                src={bill.photo_url}
                alt="Bill"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                onClick={() => setSelectedIdx(idx)}
              />
            </div>
            <CardContent className="p-4">
              <p className="font-semibold text-sm text-slate-900 mb-1">
                {vehicleMap[bill.vehicle_id]?.name}
              </p>
              <p className="text-xs text-slate-600 mb-2">{bill.vendor}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                </span>
                <span className="font-semibold text-sm text-slate-900">
                  ${bill.total_amount?.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}