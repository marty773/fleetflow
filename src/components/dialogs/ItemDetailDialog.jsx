import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ItemDetailDialog({ item, transactions = [], onClose, onEdit, onViewBill, onViewMaintenance }) {
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
          {item.photo_url && (
            <div className="flex justify-center">
              <img src={item.photo_url} alt={item.name} className="max-h-64 rounded-lg object-cover" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Name</Label>
              <p className="font-medium">{item.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">Price</Label>
              <p className="font-medium">${item.price?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label className="text-slate-500">Item Number</Label>
              <p className="font-medium">{item.item_number || '-'}</p>
            </div>
            <div>
              <Label className="text-slate-500">Quantity on Hand</Label>
              <p className="font-medium">{item.quantity_on_hand || 0}</p>
            </div>
            <div>
              <Label className="text-slate-500">Vendor</Label>
              <p className="font-medium">{item.vendor || '-'}</p>
            </div>
          </div>
          {item.description && (
            <div>
              <Label className="text-slate-500">Description</Label>
              <p className="text-sm mt-1">{item.description}</p>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="border-t pt-4">
              <Label className="text-slate-500 block mb-3">Transaction History</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transactions.map((txn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        if (txn.billId) {
                          onViewBill?.(txn.billId);
                        } else if (txn.maintenanceId) {
                          onViewMaintenance?.(txn.maintenanceId);
                        }
                      }, 100);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {txn.type === 'purchase' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{new Date(txn.date).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500">
                          {txn.type === 'purchase' ? `Purchased from ${txn.vendor}` : `Used on ${txn.vehicle}`}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${txn.type === 'purchase' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.type === 'purchase' ? '+' : '-'}
                      {txn.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          </div>
          <div className="sticky bottom-0 flex gap-2 p-6 bg-white border-t border-slate-200 flex-wrap sm:flex-nowrap">
          <Button variant="outline" onClick={onClose} className="flex-1">
           Close
          </Button>
          <Button
           onClick={() => onEdit?.(item)}
           className="flex-1"
           style={{ backgroundColor: 'var(--color-primary)' }}
           onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
           onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
           Edit
          </Button>
          {item.photo_url && (
           <Button
             variant="outline"
             onClick={() => {
               const link = document.createElement('a');
               link.href = item.photo_url;
               link.download = `${item.name}.jpg`;
               link.click();
             }}
             className="flex-1"
           >
             Download
           </Button>
          )}
          </div>
          </DialogContent>
          </Dialog>
          );
          }