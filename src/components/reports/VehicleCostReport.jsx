import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import VehicleCostChart from './VehicleCostChart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import BillDetailDialog from '../dialogs/BillDetailDialog';
import MaintenanceRecordDetailDialog from '../dialogs/MaintenanceRecordDetailDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function VehicleCostReport() {
  const { selectedCompany } = useCompany();
  const [timeframe, setTimeframe] = useState('30');
  const [expandedVehicles, setExpandedVehicles] = useState(new Set());
  const [viewingBill, setViewingBill] = useState(null);
  const [viewingMaintenance, setViewingMaintenance] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const bills = allBills.filter(b => b.company_id === selectedCompany);
  const maintenanceRecords = allMaintenanceRecords.filter(m => m.company_id === selectedCompany);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeframe));

  const filteredBills = bills.filter(
    (b) => new Date(b.bill_date) >= cutoffDate
  );

  const filteredMaintenance = maintenanceRecords.filter(
    (m) => new Date(m.performed_date) >= cutoffDate
  );

  const vehicleCosts = {};

  filteredBills.forEach((bill) => {
    if (!bill.line_items) return;
    bill.line_items.forEach((item) => {
      if (item.vehicle_id) {
        vehicleCosts[item.vehicle_id] = (vehicleCosts[item.vehicle_id] || 0) + (item.total || 0);
      }
    });
  });

  filteredMaintenance.forEach((record) => {
    if (record.vehicle_id) {
      vehicleCosts[record.vehicle_id] =
        (vehicleCosts[record.vehicle_id] || 0) + (record.total_cost || 0);
    }
  });

  const costData = Object.keys(vehicleCosts)
    .map((vehicleId) => ({
      vehicle: vehicleMap[vehicleId],
      totalCost: vehicleCosts[vehicleId],
      transactions: [
        ...filteredBills
          .filter((bill) => bill.line_items?.some((item) => item.vehicle_id === vehicleId))
          .map((bill) => ({
            type: 'bill',
            id: bill.id,
            date: bill.bill_date,
            description: `${bill.vendor} - ${bill.category}`,
            amount: bill.line_items
              .filter((item) => item.vehicle_id === vehicleId)
              .reduce((sum, item) => sum + (item.total || 0), 0),
            fullData: bill,
          })),
        ...filteredMaintenance
          .filter((m) => m.vehicle_id === vehicleId)
          .map((m) => ({
            type: 'maintenance',
            id: m.id,
            date: m.performed_date,
            description: m.title,
            amount: m.total_cost || 0,
            fullData: m,
          })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)),
    }))
    .filter((item) => item.vehicle)
    .sort((a, b) => b.totalCost - a.totalCost);

  const totalExpenses = costData.reduce((sum, item) => sum + item.totalCost, 0);

  const toggleVehicle = (vehicleId) => {
    const newExpanded = new Set(expandedVehicles);
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId);
    } else {
      newExpanded.add(vehicleId);
    }
    setExpandedVehicles(newExpanded);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('vehicle-cost-report');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`vehicle_cost_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = () => {
    const headers = ['Vehicle Name', 'Vehicle Type', 'License Plate', 'Total Cost', '% of Total'];
    const csvRows = [];

    csvRows.push(headers.join(','));

    costData.forEach((item) => {
      const row = [
        item.vehicle.name,
        item.vehicle.type,
        item.vehicle.license_plate || '-',
        item.totalCost.toFixed(2),
        ((item.totalCost / totalExpenses) * 100).toFixed(1) + '%',
      ];
      csvRows.push(row.map((e) => `"${e}"`).join(','));
    });

    csvRows.push('');
    csvRows.push(`Total Expenses,"$${totalExpenses.toFixed(2)}"`);

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `vehicle_cost_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="vehicle-cost-report">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vehicle Costs by Timeframe</h2>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDownloadPdf}>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadCsv}>Download CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {costData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-600">No cost data for the selected timeframe</p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={(e) => {
            e.stopPropagation();
            if (costData.length > 0) {
              setFilterMode('top');
              setExpandedVehicles(new Set([costData[0].vehicle.id]));
            }
          }}>
            <CardContent className="p-4 md:p-6">
              <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
                <div className="flex-1 md:flex-none md:w-full">
                  <CardTitle className="text-base md:text-lg mb-1 md:mb-2">Total Expenses</CardTitle>
                  <p className="text-xs text-slate-500 md:mt-2">Tap to view top vehicle</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 shrink-0">
                  ${totalExpenses.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg mb-4">Cost Distribution</CardTitle>
              <div className="h-48 md:h-64">
                <VehicleCostChart data={costData} />
              </div>
            </CardContent>
          </Card>
        </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cost Breakdown by Vehicle</CardTitle>
              {filterMode !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setFilterMode('all');
                    setExpandedVehicles(new Set());
                  }}
                >
                  Show All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costData.filter((item) => {
                    if (filterMode === 'top') return item === costData[0];
                    return true;
                  }).map((item) => {
                    const isExpanded = expandedVehicles.has(item.vehicle.id);
                    return (
                      <React.Fragment key={item.vehicle.id}>
                        <TableRow className="cursor-pointer hover:bg-slate-50" onClick={(e) => {
                          if (window.innerWidth < 768 && item.transactions.length > 0) {
                            setViewingTransaction(item.transactions[0]);
                          } else {
                            toggleVehicle(item.vehicle.id);
                          }
                        }}>
                          <TableCell onClick={(e) => {
                            e.stopPropagation();
                            toggleVehicle(item.vehicle.id);
                          }}>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{item.vehicle.name}</TableCell>
                          <TableCell className="capitalize">{item.vehicle.type}</TableCell>
                          <TableCell>{item.vehicle.license_plate || '-'}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${item.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {((item.totalCost / totalExpenses) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50 p-0">
                              <div className="p-4">
                                <h4 className="font-semibold text-sm text-slate-700 mb-3">Transaction Details</h4>
                                <div className="space-y-2">
                                  {item.transactions.map((transaction, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        if (transaction.type === 'bill') {
                                          setViewingBill(transaction.fullData);
                                        } else {
                                          setViewingMaintenance(transaction.fullData);
                                        }
                                      }}
                                      className="flex justify-between items-center py-2 px-3 bg-white rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                                    >
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{transaction.description}</p>
                                        <p className="text-xs text-slate-500">
                                          {format(new Date(transaction.date), 'MMM dd, yyyy')} • {transaction.type === 'bill' ? 'Bill' : 'Maintenance'}
                                        </p>
                                      </div>
                                      <p className="text-sm font-semibold text-slate-900">${transaction.amount.toFixed(2)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bill Detail Dialog */}
      <BillDetailDialog
        bill={viewingBill}
        vehicles={vehicles}
        onClose={() => setViewingBill(null)}
        onEdit={() => setViewingBill(null)}
      />

      {/* Maintenance Detail Dialog */}
      <MaintenanceRecordDetailDialog
        record={viewingMaintenance}
        vehicles={vehicles}
        items={[]}
        onClose={() => setViewingMaintenance(null)}
        onEdit={() => setViewingMaintenance(null)}
      />
    </div>
  );
}