import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '../CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
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

export default function VendorReport() {
  const { selectedCompany } = useCompany();
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);
  const [viewingMaintenance, setViewingMaintenance] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const bills = allBills.filter(b => b.company_id === selectedCompany);
  const maintenanceRecords = allMaintenanceRecords.filter(m => m.company_id === selectedCompany);
  const items = allItems.filter(i => i.company_id === selectedCompany);
  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const vendorMetrics = vendors.map(vendor => {
    const vendorBills = bills.filter(b => b.vendor === vendor.name);
    const vendorMaintenance = maintenanceRecords.filter(m => m.vendor === vendor.name);
    
    const billTotal = vendorBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const maintenanceTotal = vendorMaintenance.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const total = billTotal + maintenanceTotal;

    return {
      ...vendor,
      billCount: vendorBills.length,
      maintenanceCount: vendorMaintenance.length,
      billTotal,
      maintenanceTotal,
      total,
      transactions: [
        ...vendorBills.map(b => ({
          id: b.id,
          type: 'bill',
          date: b.bill_date,
          amount: b.total_amount,
          description: `Bill #${b.bill_number || 'N/A'}`,
          category: b.category,
          fullData: b,
        })),
        ...vendorMaintenance.map(m => ({
          id: m.id,
          type: 'maintenance',
          date: m.performed_date,
          amount: m.total_cost,
          description: m.title,
          category: m.maintenance_type,
          fullData: m,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  }).sort((a, b) => b.total - a.total);

  const totalSpent = vendorMetrics.reduce((sum, v) => sum + v.total, 0);
  const topVendor = vendorMetrics[0];
  const totalTransactions = vendorMetrics.reduce((sum, v) => sum + v.billCount + v.maintenanceCount, 0);

  const categoryColors = {
    fuel: 'bg-orange-100 text-orange-800',
    maintenance: 'bg-blue-100 text-blue-800',
    repairs: 'bg-red-100 text-red-800',
    insurance: 'bg-purple-100 text-purple-800',
    parts: 'bg-green-100 text-green-800',
    labor: 'bg-amber-100 text-amber-800',
    other: 'bg-slate-100 text-slate-800',
    oil_change: 'bg-orange-100 text-orange-800',
    filter_change: 'bg-blue-100 text-blue-800',
    tire_rotation: 'bg-yellow-100 text-yellow-800',
    inspection: 'bg-indigo-100 text-indigo-800',
    repair: 'bg-red-100 text-red-800',
    cleaning: 'bg-green-100 text-green-800',
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('vendor-report');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`vendor_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = () => {
    const headers = ['Vendor Name', 'Category', 'Bill Count', 'Maintenance Count', 'Total Bills', 'Total Maintenance', 'Total Spent'];
    const csvRows = [];

    csvRows.push(headers.join(','));

    vendorMetrics.forEach((vendor) => {
      const row = [
        vendor.name,
        vendor.category || '-',
        vendor.billCount,
        vendor.maintenanceCount,
        vendor.billTotal.toFixed(2),
        vendor.maintenanceTotal.toFixed(2),
        vendor.total.toFixed(2),
      ];
      csvRows.push(row.map((e) => `"${e}"`).join(','));
    });

    csvRows.push('');
    csvRows.push(`Total Spent,"$${totalSpent.toFixed(2)}"`);
    csvRows.push(`Active Vendors,${vendors.length}`);
    csvRows.push(`Total Transactions,${totalTransactions}`);

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `vendor_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="vendor-report">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vendor Report</h2>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          if (vendorMetrics.length > 0) {
            setFilterMode('top');
            setExpandedVendor(vendorMetrics[0].id);
          }
        }}>
          <CardContent className="p-4 md:p-6">
            <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
              <div className="flex-1 md:flex-none md:w-full">
                <CardTitle className="text-sm font-medium text-slate-600 mb-1 md:mb-2">Total Spent</CardTitle>
                <p className="text-xs text-slate-500 md:mt-2">Tap to view top vendor</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 shrink-0">${totalSpent.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
              <CardTitle className="text-sm font-medium text-slate-600 flex-1 md:flex-none md:w-full">Active Vendors</CardTitle>
              <p className="text-xl md:text-2xl font-bold text-slate-900 shrink-0">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
              <CardTitle className="text-sm font-medium text-slate-600 flex-1 md:flex-none md:w-full">Total Transactions</CardTitle>
              <p className="text-xl md:text-2xl font-bold text-slate-900 shrink-0">{totalTransactions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor List */}
      <div className="space-y-3">
        {filterMode !== 'all' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setFilterMode('all');
              setExpandedVendor(null);
            }}
            className="mb-4"
          >
            Show All Vendors
          </Button>
        )}
        {vendorMetrics.filter((vendor) => {
          if (filterMode === 'top') return vendor === vendorMetrics[0];
          return true;
        }).map((vendor) => (
          <Card key={vendor.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <button
              onClick={() => {
                if (window.innerWidth < 768 && vendor.transactions.length > 0) {
                  setViewingTransaction(vendor.transactions[0]);
                } else {
                  setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id);
                }
              }}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {vendor.billCount > 0 && (
                    <span className="text-xs text-slate-600">{vendor.billCount} bills</span>
                  )}
                  {vendor.maintenanceCount > 0 && (
                    <span className="text-xs text-slate-600">{vendor.maintenanceCount} maintenance</span>
                  )}
                  {vendor.category && (
                    <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
                  )}
                </div>
              </div>
              <div className="text-right mr-4">
                <p className="font-semibold text-slate-900">${vendor.total.toFixed(2)}</p>
              </div>
              {expandedVendor === vendor.id ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedVendor === vendor.id && (
              <div className="border-t p-4 bg-slate-50">
                <div className="space-y-2 mb-4">
                  {vendor.email && (
                    <p className="text-sm"><span className="text-slate-600">Email:</span> <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">{vendor.email}</a></p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm"><span className="text-slate-600">Phone:</span> <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">{vendor.phone}</a></p>
                  )}
                  {vendor.contact_person && (
                    <p className="text-sm"><span className="text-slate-600">Contact:</span> {vendor.contact_person}</p>
                  )}
                </div>

                {vendor.transactions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Recent Transactions</p>
                    <div className="space-y-2">
                      {vendor.transactions.slice(0, 5).map((txn, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (txn.type === 'bill') {
                              setViewingBill(txn.fullData);
                            } else {
                              setViewingMaintenance(txn.fullData);
                            }
                          }}
                          className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                        >
                          <div>
                            <Badge className={categoryColors[txn.category]} variant="outline">{txn.type === 'bill' ? 'Bill' : 'Maintenance'}</Badge>
                            <p className="text-sm font-medium mt-1">{txn.description}</p>
                            <p className="text-xs text-slate-500">{format(new Date(txn.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <p className="font-semibold text-slate-900">${txn.amount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

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
        items={items}
        onClose={() => setViewingMaintenance(null)}
        onEdit={() => setViewingMaintenance(null)}
      />
    </div>
  );
}