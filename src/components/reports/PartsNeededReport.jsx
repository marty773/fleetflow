import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { ExternalLink, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getServiceReminderMiles } from '@/components/settings/ServiceReminderSettings';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Upcoming' },
  { value: 'overdue', label: 'Overdue Only' },
  { value: 'due_soon', label: 'Due Soon' },
];

const GROUP_OPTIONS = [
  { value: 'vehicle', label: 'By Vehicle' },
  { value: 'item', label: 'By Item/Part' },
  { value: 'urgency', label: 'By Urgency' },
];

function getIntervalStatus(interval, reminderMiles) {
  const today = new Date();
  if (interval.next_due_date) {
    const days = differenceInDays(new Date(interval.next_due_date), today);
    if (days < 0) return 'overdue';
    const thresholdDays = Math.max(30, Math.round(reminderMiles / 200));
    if (days <= thresholdDays) return 'due_soon';
  }
  return 'upcoming';
}

export default function PartsNeededReport({ open, onClose, preFilterVehicleId = null, preFilterItemId = null }) {
  const reminderMiles = getServiceReminderMiles();
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState(preFilterVehicleId ? 'vehicle' : preFilterItemId ? 'item' : 'vehicle');
  const [vehicleFilter, setVehicleFilter] = useState(preFilterVehicleId || 'all');

  const { data: intervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list(), enabled: open });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list(), enabled: open });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list(), enabled: open });

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);

  // Build rows: one per (interval, suggested_part)
  const rows = useMemo(() => {
    return intervals.flatMap(interval => {
      if (!interval.suggested_parts?.length) return [];

      // Vehicle filter
      if (vehicleFilter !== 'all' && interval.vehicle_id !== vehicleFilter) return [];
      if (preFilterVehicleId && interval.vehicle_id !== preFilterVehicleId) return [];

      const status = getIntervalStatus(interval, reminderMiles);
      if (statusFilter === 'overdue' && status !== 'overdue') return [];
      if (statusFilter === 'due_soon' && status !== 'due_soon') return [];
      if (statusFilter === 'all' && status === 'upcoming') {
        // still include upcoming when "all" is selected — exclude only if future with no due date
      }

      return interval.suggested_parts
        .filter(sp => !preFilterItemId || sp.item_id === preFilterItemId)
        .map(sp => {
          const item = itemMap[sp.item_id];
          const inStock = item?.quantity_on_hand || 0;
          const needed = sp.quantity || 1;
          const shortage = Math.max(0, needed - inStock);
          return {
            intervalId: interval.id,
            intervalName: interval.interval_name,
            vehicleId: interval.vehicle_id,
            vehicleName: vehicleMap[interval.vehicle_id]?.name || 'Unknown',
            nextDueDate: interval.next_due_date,
            status,
            itemId: sp.item_id,
            itemName: item?.name || sp.description || 'Unknown Part',
            itemNumber: item?.item_number,
            itemUrl: item?.item_url,
            needed,
            inStock,
            shortage,
            unitPrice: item?.price || sp.unit_price,
          };
        });
    });
  }, [intervals, vehicleFilter, preFilterVehicleId, preFilterItemId, statusFilter, itemMap, vehicleMap, reminderMiles]);

  // Group rows
  const grouped = useMemo(() => {
    if (groupBy === 'vehicle') {
      const map = {};
      rows.forEach(r => {
        if (!map[r.vehicleId]) map[r.vehicleId] = { label: r.vehicleName, rows: [] };
        map[r.vehicleId].rows.push(r);
      });
      return Object.values(map);
    }
    if (groupBy === 'item') {
      const map = {};
      rows.forEach(r => {
        const key = r.itemId || r.itemName;
        if (!map[key]) map[key] = { label: r.itemName, itemUrl: r.itemUrl, rows: [] };
        map[key].rows.push(r);
      });
      return Object.values(map);
    }
    // urgency
    const order = ['overdue', 'due_soon', 'upcoming'];
    const labels = { overdue: '🔴 Overdue', due_soon: '🟡 Due Soon', upcoming: '🟢 Upcoming' };
    const map = {};
    rows.forEach(r => {
      if (!map[r.status]) map[r.status] = { label: labels[r.status], rows: [] };
      map[r.status].rows.push(r);
    });
    return order.filter(s => map[s]).map(s => map[s]);
  }, [rows, groupBy]);

  const statusBadge = (status) => {
    if (status === 'overdue') return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>;
    if (status === 'due_soon') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Due Soon</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200">Upcoming</Badge>;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Parts Needed Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Filter: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}`, 14, 30);

    let y = 38;
    grouped.forEach(group => {
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text(group.label, 14, y);
      y += 6;

      const tableData = group.rows.map(r => [
        groupBy === 'item' ? `${r.vehicleName} — ${r.intervalName}` : r.itemName,
        r.itemNumber || '-',
        r.needed,
        r.inStock,
        r.shortage > 0 ? r.shortage : '✓',
        r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : '-',
        r.unitPrice ? `$${r.unitPrice.toFixed(2)}` : '-',
        r.itemUrl ? r.itemUrl : '',
      ]);

      doc.autoTable({
        startY: y,
        head: [['Part / Interval', 'Item #', 'Needed', 'In Stock', 'Shortage', 'Due Date', 'Unit $', 'URL']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: { 7: { cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    });

    doc.save('parts-needed-report.pdf');
  };

  const totalShortage = rows.reduce((sum, r) => sum + r.shortage, 0);
  const totalNeeded = rows.reduce((sum, r) => sum + r.needed, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl">Parts Needed Report</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            {/* Status filter */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === opt.value ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Group by */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {GROUP_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setGroupBy(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${groupBy === opt.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Vehicle filter (only when not pre-filtered) */}
            {!preFilterVehicleId && (
              <select
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}

            <Button onClick={exportPDF} variant="outline" size="sm" className="ml-auto gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </Button>
          </div>

          {/* Summary */}
          <div className="flex gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
            <span><strong className="text-slate-900 dark:text-white">{rows.length}</strong> parts across <strong className="text-slate-900 dark:text-white">{grouped.length}</strong> groups</span>
            {totalShortage > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <strong>{totalShortage}</strong> units short
              </span>
            )}
          </div>
        </div>

        {/* Report Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {grouped.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium">No parts found for this filter</p>
              <p className="text-sm mt-1">Try changing the status or vehicle filter</p>
            </div>
          ) : grouped.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">{group.label}</h3>
                {group.itemUrl && (
                  <a href={group.itemUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View on site
                  </a>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-600 dark:text-slate-300">
                        {groupBy === 'item' ? 'Vehicle / Interval' : 'Part'}
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Needed</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">In Stock</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Shortage</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Due Date</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.rows.map((row, ri) => (
                      <tr key={ri} className={row.shortage > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-white dark:bg-slate-900'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {groupBy === 'item' ? `${row.vehicleName} — ${row.intervalName}` : row.itemName}
                          </div>
                          {groupBy !== 'item' && row.itemNumber && (
                            <div className="text-xs text-slate-500 font-mono">#{row.itemNumber}</div>
                          )}
                          {groupBy === 'item' && (
                            <div className="text-xs text-slate-500">{row.intervalName}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-slate-900 dark:text-white">{row.needed}</td>
                        <td className="px-3 py-3 text-center font-medium text-slate-900 dark:text-white">{row.inStock}</td>
                        <td className="px-3 py-3 text-center">
                          {row.shortage > 0
                            ? <span className="font-bold text-red-600">−{row.shortage}</span>
                            : <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          }
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs">
                          {row.nextDueDate ? new Date(row.nextDueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3">{statusBadge(row.status)}</td>
                        <td className="px-3 py-3">
                          {row.itemUrl && (
                            <a href={row.itemUrl} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs whitespace-nowrap">
                              <ExternalLink className="w-3 h-3" /> Buy
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}