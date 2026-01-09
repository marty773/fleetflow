import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function VendorReport() {
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  // Calculate vendor metrics
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
        })),
        ...vendorMaintenance.map(m => ({
          id: m.id,
          type: 'maintenance',
          date: m.performed_date,
          amount: m.total_cost,
          description: m.title,
          category: m.maintenance_type,
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">${totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{vendors.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalTransactions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor List */}
      <div className="space-y-3">
        {vendorMetrics.map((vendor) => (
          <Card key={vendor.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <button
              onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
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
                          onClick={() => setViewingTransaction(txn)}
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

      {/* Transaction View Dialog */}
      {viewingTransaction && (
        <Dialog open={!!viewingTransaction} onOpenChange={() => setViewingTransaction(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{viewingTransaction.type === 'bill' ? 'Bill' : 'Maintenance'} Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">Description</Label>
                <p className="font-medium">{viewingTransaction.description}</p>
              </div>
              <div>
                <Label className="text-slate-500">Date</Label>
                <p className="font-medium">{format(new Date(viewingTransaction.date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <Label className="text-slate-500">Amount</Label>
                <p className="font-medium text-lg">${viewingTransaction.amount.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-slate-500">Category</Label>
                <Badge className={categoryColors[viewingTransaction.category]} variant="outline">
                  {viewingTransaction.category?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setViewingTransaction(null)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}