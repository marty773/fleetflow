import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Package, FileText, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

export default function MaintenanceRecordDetailDialog({ record, vehicles = [], items = [], bills = [], intervals = [], onClose, onEdit }) {
  if (!record) return null;

  const vehicle = vehicles.find(v => v.id === record.vehicle_id);

  return (
    <Dialog open={!!record} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Maintenance Record Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Vehicle</Label>
              <p className="font-medium">{vehicle?.name}</p>
            </div>
            <div>
              <Label className="text-slate-500">Type</Label>
              <p className="font-medium capitalize">{record.maintenance_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-slate-500">Title</Label>
              <p className="font-medium">{record.title}</p>
            </div>
            <div>
              <Label className="text-slate-500">Date</Label>
              <p className="font-medium">{new Date(record.performed_date).toLocaleDateString()}</p>
            </div>
            {record.vendor && (
              <div>
                <Label className="text-slate-500">Service Provider</Label>
                <p className="font-medium">{record.vendor}</p>
              </div>
            )}
            {record.odometer_reading && (
              <div>
                <Label className="text-slate-500">Odometer</Label>
                <p className="font-medium">{record.odometer_reading} miles</p>
              </div>
            )}
          </div>
          {record.work_items && record.work_items.length > 0 && (
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Work Performed</Label>
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-2 text-slate-900 dark:text-slate-100">Description</th>
                      <th className="text-center p-2 text-slate-900 dark:text-slate-100">Qty</th>
                      <th className="text-right p-2 text-slate-900 dark:text-slate-100">Price</th>
                      <th className="text-right p-2 text-slate-900 dark:text-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const partsUsedMap = {};
                      const itemNamesMap = {};

                      if (record.parts_used) {
                        record.parts_used.forEach(part => {
                          partsUsedMap[part.item_id] = part.quantity_used;
                          const matchedItem = items.find(i => i.id === part.item_id);
                          if (matchedItem) {
                            itemNamesMap[part.item_id] = matchedItem.name.toLowerCase();
                          }
                        });
                      }

                      return record.work_items.map((item, idx) => {
                        let itemId = item.item_id;

                        if (!itemId && record.parts_used) {
                          for (const [id, name] of Object.entries(itemNamesMap)) {
                            if (item.description.toLowerCase().includes(name) || name.includes(item.description.toLowerCase())) {
                              itemId = id;
                              break;
                            }
                          }

                          if (!itemId) {
                            const matchingIds = Object.entries(partsUsedMap)
                              .filter(([_, qty]) => qty === item.quantity)
                              .map(([id]) => id);
                            if (matchingIds.length === 1) {
                              itemId = matchingIds[0];
                            }
                          }
                        }

                        return (
                          <tr key={idx} className="border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <td className="p-2 text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-1">
                                {itemId && <Package className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                                <span>{item.description}</span>
                              </div>
                            </td>
                            <td className="text-center p-2 text-slate-900 dark:text-slate-100">{item.quantity}</td>
                            <td className="text-right p-2 text-slate-900 dark:text-slate-100">${item.unit_price?.toFixed(2)}</td>
                            <td className="text-right p-2 text-slate-900 dark:text-slate-100">${item.total?.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                    <tr className="border-t border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-semibold">
                      <td colSpan={3} className="p-2 text-right text-slate-900 dark:text-slate-100">Total:</td>
                      <td className="text-right p-2 text-slate-900 dark:text-slate-100">${record.total_cost?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {record.linked_bill_id && (() => {
            const linkedBill = bills.find(b => b.id === record.linked_bill_id);
            return linkedBill ? (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <Label className="text-blue-700 dark:text-blue-300">Linked Bill</Label>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {linkedBill.vendor} — {format(new Date(linkedBill.bill_date), 'MMM dd, yyyy')}
                    {linkedBill.total_amount ? ` ($${linkedBill.total_amount.toFixed(2)})` : ''}
                  </p>
                  {linkedBill.bill_number && <p className="text-xs text-blue-600 dark:text-blue-400">Invoice #{linkedBill.bill_number}</p>}
                </div>
              </div>
            ) : null;
          })()}

          {(() => {
            const linkedInterval = intervals.find(i => i.linked_record_id === record.id);
            return linkedInterval ? (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <CalendarClock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <Label className="text-green-700 dark:text-green-300">Completed Interval</Label>
                  <p className="font-medium text-green-900 dark:text-green-100">{linkedInterval.interval_name}</p>
                  {linkedInterval.next_due_date && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Next due: {format(new Date(linkedInterval.next_due_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {record.notes && (
            <div>
              <Label className="text-slate-500">Notes</Label>
              <p className="text-sm mt-1">{record.notes}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={() => onEdit?.(record)} className="w-full bg-amber-600 hover:bg-amber-700">
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}