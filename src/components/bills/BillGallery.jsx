import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, X, FileText, Loader, Download } from 'lucide-react';
import { Document, Page } from 'react-pdf';

export default function BillGallery({ bills, vehicles }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState({});
  const [pdfLoading, setPdfLoading] = useState({});

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

  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf');

  const onPdfLoadSuccess = (idx, { numPages }) => {
    setPdfNumPages(prev => ({ ...prev, [idx]: numPages }));
    setPdfLoading(prev => ({ ...prev, [idx]: false }));
  };

  const onPdfLoadStart = (idx) => {
    setPdfLoading(prev => ({ ...prev, [idx]: true }));
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFileName = (bill) => {
    return `${bill.vendor}_${format(new Date(bill.bill_date), 'yyyy-MM-dd')}_${bill.bill_number || 'bill'}${isPdf(bill.photo_url) ? '.pdf' : '.jpg'}`;
  };

  return (
    <div className="space-y-4">
      {/* Lightbox Dialog */}
      {selectedIdx !== null && (
        <Dialog open={selectedIdx !== null} onOpenChange={() => setSelectedIdx(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <Button
              onClick={() => setSelectedIdx(null)}
              className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 h-10 w-10"
              variant="ghost"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="relative bg-black min-h-[50vh] flex items-center justify-center">
              {isPdf(billsWithPhotos[selectedIdx].photo_url) ? (
                <div className="bg-white rounded-lg p-4">
                  {pdfLoading[selectedIdx] && (
                    <div className="flex items-center justify-center h-96">
                      <Loader className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  )}
                  <Document
                    file={billsWithPhotos[selectedIdx].photo_url}
                    onLoadSuccess={(pdf) => onPdfLoadSuccess(selectedIdx, pdf)}
                    onLoadStart={() => onPdfLoadStart(selectedIdx)}
                    loading={<div className="flex items-center justify-center h-96"><Loader className="w-8 h-8 animate-spin text-slate-400" /></div>}
                  >
                    <Page pageNumber={1} width={400} />
                  </Document>
                </div>
              ) : (
                <img
                  src={billsWithPhotos[selectedIdx].photo_url}
                  alt="Bill"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 rounded-b-lg">
                <p className="font-semibold">
                  {vehicleMap[billsWithPhotos[selectedIdx].vehicle_id]?.name}
                </p>
                <p className="text-sm opacity-90">
                  {billsWithPhotos[selectedIdx].vendor} •{' '}
                  {format(new Date(billsWithPhotos[selectedIdx].bill_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 p-4 bg-white">
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(billsWithPhotos[selectedIdx].photo_url, getFileName(billsWithPhotos[selectedIdx]))}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {billsWithPhotos.map((bill, idx) => (
          <Card
            key={bill.id}
            className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedIdx(idx)}
          >
            <div className="relative aspect-square overflow-hidden bg-slate-100 flex items-center justify-center">
              {isPdf(bill.photo_url) ? (
                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                  <FileText className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-600 text-center px-2">PDF Document</p>
                </div>
              ) : (
                <img
                  src={bill.photo_url}
                  alt="Bill"
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              )}
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