import React from 'react';
import PartsNeededReport from '@/components/reports/PartsNeededReport';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Trash2, Archive, ChevronDown, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ItemDetailDialog({ item, transactions = [], onClose, onEdit, onDelete, onArchive, onRestore, onViewBill, onViewMaintenance }) {
  const [showPartsReport, setShowPartsReport] = useState(false);
  if (!item) return null;

  return (<>
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
              <Label className="text-slate-500 dark:text-slate-400">Name</Label>
              <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
            </div>
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Price</Label>
              <p className="font-medium text-slate-900 dark:text-white">${item.price?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Item Number</Label>
              <p className="font-medium text-slate-900 dark:text-white">{item.item_number || '-'}</p>
            </div>
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Quantity on Hand</Label>
              <p className="font-medium text-slate-900 dark:text-white">{item.quantity_on_hand || 0}</p>
            </div>
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Vendor</Label>
              <p className="font-medium text-slate-900 dark:text-white">{item.vendor || '-'}</p>
            </div>
          </div>
          {item.item_url && (
            <div className="md:col-span-2">
              <Label className="text-slate-500 dark:text-slate-400">Vendor URL</Label>
              <a href={item.item_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1 break-all">
                {item.item_url}
              </a>
            </div>
          )}
          {item.description && (
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Description</Label>
              <p className="text-sm mt-1 text-slate-900 dark:text-white">{item.description}</p>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <Label className="text-slate-500 dark:text-slate-400 block mb-3">Transaction History</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transactions.map((txn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
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
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : txn.type === 'return' ? (
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{new Date(txn.date).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {txn.type === 'purchase'
                            ? `Purchased from ${txn.vendor}`
                            : txn.type === 'return'
                            ? `Return/Credit — ${txn.vendor}`
                            : `Used on ${txn.vehicle}`}
                        </p>
                        <p className="text-xs text-slate-400">{txn.reference}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${
                      txn.type === 'purchase' ? 'text-green-500'
                      : txn.type === 'return' ? 'text-orange-500'
                      : 'text-red-500'
                    }`}>
                      {txn.type === 'purchase' ? '+' : ''}{txn.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          </div>
          <div className="sticky bottom-0 flex gap-2 p-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700 flex-wrap sm:flex-nowrap">
          <Button variant="outline" onClick={() => setShowPartsReport(true)} className="flex-1">
            Parts Report
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
           Close
          </Button>
          <Button
           onClick={() => onEdit?.(item)}
           className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
           Edit
          </Button>
          {item.is_archived ? (
            <>
              {onRestore && (
                <Button variant="outline" onClick={() => onRestore?.(item)} className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
                  <RotateCcw className="w-4 h-4 mr-2" /> Restore
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" onClick={() => onDelete?.(item)} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              )}
            </>
          ) : (
            (onDelete || onArchive) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onArchive && (
                    <DropdownMenuItem onClick={() => onArchive?.(item)} className="gap-2 cursor-pointer">
                      <Archive className="w-4 h-4 text-amber-500" /> Archive
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete?.(item)} className="gap-2 text-red-600 cursor-pointer focus:text-red-600">
                      <Trash2 className="w-4 h-4" /> Delete Permanently
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
          </div>
          </DialogContent>
          </Dialog>
          <PartsNeededReport
            open={showPartsReport}
            onClose={() => setShowPartsReport(false)}
            preFilterItemId={item?.id}
          />
          </>);
          }