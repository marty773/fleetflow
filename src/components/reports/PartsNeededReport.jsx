import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays } from 'date-fns';
import { ExternalLink, Download, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { getServiceReminderMiles } from '@/components/settings/ServiceReminderSettings';
import jsPDF from 'jspdf';
import IntervalDetailDialog from '@/components/dialogs/IntervalDetailDialog';

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
  const [viewingInterval, setViewingInterval] = useState(null);
  // Multi-vehicle: set of selected vehicle IDs, or empty = all
  const [selectedVehicles, setSelectedVehicles] = useState(() => preFilterVehicleId ? new Set([preFilterVehicleId]) : new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortByShortage, setSortByShortage] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [orderSummaryCollapsed, setOrderSummaryCollapsed] = useState(false);

  const { data: intervals = [] } = useQuery({ queryKey: ['maintenanceIntervals'], queryFn: () => base44.entities.MaintenanceInterval.list(), enabled: open });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list(), enabled: open });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list(), enabled: open });

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items]);

  const toggleVehicle = (id) => {
    setSelectedVehicles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Build rows: one per (interval, suggested_part)
  const rows = useMemo(() => {
    return intervals.flatMap(interval => {
      if (!interval.suggested_parts?.length) return [];

      // Vehicle filter
      if (preFilterVehicleId && interval.vehicle_id !== preFilterVehicleId) return [];
      if (selectedVehicles.size > 0 && !selectedVehicles.has(interval.vehicle_id)) return [];

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
          const isMileageBased = (!interval.interval_months || parseFloat(interval.interval_months) === 0) && interval.interval_miles;
          return {
            interval,
            intervalId: interval.id,
            intervalName: interval.interval_name,
            vehicleId: interval.vehicle_id,
            vehicleName: vehicleMap[interval.vehicle_id]?.name || 'Unknown',
            vehicle: vehicleMap[interval.vehicle_id],
            nextDueDate: interval.next_due_date,
            nextDueMileage: interval.next_due_mileage,
            isMileageBased,
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
  }, [intervals, selectedVehicles, preFilterVehicleId, preFilterItemId, statusFilter, itemMap, vehicleMap, reminderMiles]);

  const toggleGroup = (gi) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gi)) next.delete(gi); else next.add(gi);
      return next;
    });
  };

  const sortRows = (rows) => sortByShortage
    ? [...rows].sort((a, b) => b.shortage - a.shortage)
    : rows;

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

  // Apply sort to each group's rows
  const sortedGrouped = useMemo(() =>
    grouped.map(g => ({ ...g, rows: sortRows(g.rows) })),
  [grouped, sortByShortage]);

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

    let y = 42;
    sortedGrouped.forEach(group => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text(group.label, 14, y);
      y += 6;

      // Header
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const headers = ['Part / Interval', 'Item #', 'Needed', 'In Stock', 'Shortage', 'Due Date', 'Unit $'];
      const colX = [14, 80, 105, 120, 137, 155, 175];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, 196, y);
      y += 4;

      doc.setTextColor(30, 30, 30);
      let groupNeeded = 0, groupShortage = 0;
      group.rows.forEach(r => {
        if (y > 270) { doc.addPage(); y = 20; }
        const label = groupBy === 'item' ? `${r.vehicleName} — ${r.intervalName}` : r.itemName;
        doc.text(doc.splitTextToSize(label, 62)[0], colX[0], y);
        doc.text(r.itemNumber || '-', colX[1], y);
        doc.text(String(r.needed), colX[2], y);
        doc.text(String(r.inStock), colX[3], y);
        doc.text(r.shortage > 0 ? `-${r.shortage}` : '✓', colX[4], y);
        const dueText = r.isMileageBased && r.nextDueMileage
          ? `${Number(r.nextDueMileage).toLocaleString()} mi`
          : r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : '-';
        doc.text(dueText, colX[5], y);
        doc.text(r.unitPrice ? `$${r.unitPrice.toFixed(2)}` : '-', colX[6], y);
        y += 7;
        groupNeeded += r.needed;
        groupShortage += r.shortage;
      });
      // Group total row
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, 196, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('Total', colX[0], y);
      doc.text(String(groupNeeded), colX[2], y);
      doc.text(groupShortage > 0 ? `-${groupShortage}` : '✓', colX[4], y);
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      y += 8;
    });

    doc.save('parts-needed-report.pdf');
  };

  const totalShortage = rows.reduce((sum, r) => sum + r.shortage, 0);
  const totalNeeded = rows.reduce((sum, r) => sum + r.needed, 0);

  const orderSummary = useMemo(() => {
    const orderMap = {};
    rows.forEach(r => {
      const key = r.itemId || r.itemName;
      if (!orderMap[key]) orderMap[key] = { name: r.itemName, itemNumber: r.itemNumber, itemUrl: r.itemUrl, unitPrice: r.unitPrice, totalNeeded: 0, totalInStock: r.inStock, totalShortage: 0 };
      orderMap[key].totalNeeded += r.needed;
      orderMap[key].totalShortage = Math.max(0, orderMap[key].totalNeeded - orderMap[key].totalInStock);
    });
    return Object.values(orderMap).filter(o => o.totalShortage > 0);
  }, [rows]);

  const grandTotal = orderSummary.reduce((s, o) => s + (o.totalShortage * (o.unitPrice || 0)), 0);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <DialogTitle className="text-lg font-semibold">Parts Needed Report</DialogTitle>
            <Button onClick={exportPDF} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </Button>
          </div>

          {/* Filters toggle */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button
              onClick={() => setFiltersOpen(p => !p)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>{filtersOpen ? '▲' : '▼'}</span> {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span><strong className="text-slate-900 dark:text-white">{rows.length}</strong> parts · <strong className="text-slate-900 dark:text-white">{totalNeeded}</strong> needed</span>
              {totalShortage > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /><strong>{totalShortage}</strong> short
                </span>
              )}
            </div>
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSortByShortage(p => !p)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${sortByShortage ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowUpDown className="w-3 h-3" /> Sort by Shortage
          </button>

          {/* Collapsible Filters */}
          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
              {/* Status filter */}
              <div>
                <div className="text-xs text-slate-500 mb-1 font-medium">Status</div>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                      className={`px-2.5 py-1.5 font-medium transition-colors ${statusFilter === opt.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group by */}
              <div>
                <div className="text-xs text-slate-500 mb-1 font-medium">Group By</div>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                  {GROUP_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setGroupBy(opt.value)}
                      className={`px-2.5 py-1.5 font-medium transition-colors ${groupBy === opt.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle multi-select */}
              {!preFilterVehicleId && vehicles.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Vehicles <span className="font-normal">(all if none selected)</span></div>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicles.map(v => (
                      <button key={v.id} onClick={() => toggleVehicle(v.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selectedVehicles.has(v.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                        }`}>
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Report Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {grouped.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium">No parts found for this filter</p>
              <p className="text-sm mt-1">Try changing the status or vehicle filter</p>
            </div>
          ) : sortedGrouped.map((group, gi) => {
            const isCollapsed = collapsedGroups.has(gi);
            const groupShortage = group.rows.reduce((s, r) => s + r.shortage, 0);
            return (
            <div key={gi}>
              <button
                onClick={() => toggleGroup(gi)}
                className="flex items-center gap-2 mb-2 w-full text-left hover:opacity-80 transition-opacity"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">{group.label}</h3>
                <span className="text-xs text-slate-500">({group.rows.length} part{group.rows.length !== 1 ? 's' : ''})</span>
                {groupShortage > 0 && (
                  <span className="text-xs font-bold text-red-600 ml-1">−{groupShortage} short</span>
                )}
                {group.itemUrl && (
                  <a href={group.itemUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto">
                    <ExternalLink className="w-3 h-3" /> View on site
                  </a>
                )}
              </button>
              {!isCollapsed && (
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
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Due</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        onClick={() => setViewingInterval(row.interval)}
                        className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${row.shortage > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-white dark:bg-slate-900'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-blue-700 dark:text-blue-400 hover:underline">
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
                          {row.isMileageBased && row.nextDueMileage
                            ? <span className="font-medium text-slate-800 dark:text-slate-200">{Number(row.nextDueMileage).toLocaleString()} mi</span>
                            : row.nextDueDate ? new Date(row.nextDueDate).toLocaleDateString() : '—'
                          }
                        </td>
                        <td className="px-3 py-3">{statusBadge(row.status)}</td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
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
              )}
            </div>
            );
          })}
        </div>

        {/* Order Summary Footer */}
        {orderSummary.length > 0 && (
          <div className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 shrink-0">
            <button
              onClick={() => setOrderSummaryCollapsed(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {orderSummaryCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">📋 Order Summary — Items to Purchase</h4>
              <span className="text-xs text-slate-500 ml-1">({orderSummary.length} item{orderSummary.length !== 1 ? 's' : ''})</span>
              {grandTotal > 0 && <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-white">${grandTotal.toFixed(2)}</span>}
            </button>
            {!orderSummaryCollapsed && (
            <div className="px-4 pb-4 space-y-1">
              {orderSummary.map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-slate-800 dark:text-slate-200">{o.name}{o.itemNumber && <span className="text-slate-400 font-mono ml-1">#{o.itemNumber}</span>}</span>
                  <span className="font-bold text-red-600">Qty: {o.totalShortage}</span>
                  {o.unitPrice && <span className="text-slate-500">(${(o.totalShortage * o.unitPrice).toFixed(2)})</span>}
                  {o.itemUrl && <a href={o.itemUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-0.5"><ExternalLink className="w-3 h-3" />Buy</a>}
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>

    {viewingInterval && (
      <IntervalDetailDialog
        interval={viewingInterval}
        vehicle={vehicleMap[viewingInterval.vehicle_id]}
        items={items}
        onClose={() => setViewingInterval(null)}
      />
    )}
    </>
  );
}