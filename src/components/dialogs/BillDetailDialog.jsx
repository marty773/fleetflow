import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Package, Download, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function BillDetailDialog({ bill, vehicles = [], records = [], onClose, onEdit, onDelete, onViewPhoto, onViewRecord }) {
  if (!bill) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(bill.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bill_${bill.bill_number || bill.id}.${blob.type.includes('pdf') ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={!!bill} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bill Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1">
          {bill.photo_url && (
            <div>
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  {bill.photo_url.includes('drive.google.com') || bill.photo_url.includes('.pdf') ? 'Download PDF' : 'Download Photo'}
                </Button>
              </div>
              <div className="flex justify-center">
                {bill.photo_url.includes('drive.google.com') || bill.photo_url.includes('preview') ? (
                  <div className="w-full">
                    <iframe
                      src={bill.photo_url}
                      className="w-full h-96 rounded-lg border"
                      title="PDF Preview"
                    />
                  </div>
                ) : bill.photo_url.includes('.pdf') || bill.photo_url.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
                    <Package className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">PDF uploaded</p>
                  </div>
                ) : (
                  <img
                    src={bill.photo_url}
                    alt="Bill"
                    className="max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onViewPhoto?.(bill.photo_url)}
                  />
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Vendor</Label>
              <p className="font-medium">{bill.vendor}</p>
            </div>
            <div>
              <Label className="text-slate-500">Date</Label>
              <p className="font-medium">{format(new Date(bill.bill_date + 'T12:00:00'), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <Label className="text-slate-500">Bill Number</Label>
              <p className="font-medium">{bill.bill_number || '-'}</p>
            </div>
            <div>
              <Label className="text-slate-500">Category</Label>
              <p className="font-medium capitalize">{bill.category?.replace('_', ' ')}</p>
            </div>
          </div>
          {bill.line_items && bill.line_items.length > 0 && (
            <div>
              <Label className="text-slate-500 dark:text-slate-400 mb-2 block">Line Items</Label>
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-2 text-slate-900 dark:text-slate-100">Description</th>
                      <th className="text-left p-2 text-slate-900 dark:text-slate-100">Vehicle</th>
                      <th className="text-center p-2 text-slate-900 dark:text-slate-100">Qty</th>
                      <th className="text-right p-2 text-slate-900 dark:text-slate-100">Price</th>
                      <th className="text-right p-2 text-slate-900 dark:text-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.line_items.map((item, idx) => {
                      const vehicle = vehicles.find(v => v.id === item.vehicle_id);
                      return (
                        <tr key={idx} className="border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          <td className="p-2">
                            <div className="flex items-center gap-1 text-slate-900 dark:text-slate-100">
                              {item.item_id && <Package className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
                              <span>{item.description}</span>
                            </div>
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{vehicle ? vehicle.name : '-'}</td>
                          <td className="text-center p-2 text-slate-900 dark:text-slate-100">{item.quantity}</td>
                          <td className="text-right p-2 text-slate-900 dark:text-slate-100">${item.unit_price?.toFixed(2)}</td>
                          <td className="text-right p-2 text-slate-900 dark:text-slate-100">${item.total?.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-semibold">
                      <td colSpan={4} className="p-2 text-right text-slate-900 dark:text-slate-100">Total:</td>
                      <td className="text-right p-2 text-slate-900 dark:text-slate-100">${bill.total_amount?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {bill.notes && (
            <div>
              <Label className="text-slate-500">Notes</Label>
              <p className="text-sm mt-1">{bill.notes}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete?.(bill.id)}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
          <Button onClick={() => onEdit?.(bill)} className="flex-1" style={{ backgroundColor: 'var(--color-primary)' }}>
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}