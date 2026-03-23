import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Image as ImageIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PullToRefresh from '../components/PullToRefresh';
import PageTransition from '../components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import BillList from '../components/bills/BillList';
import BillGallery from '../components/bills/BillGallery';
import BillDetailDialog from '../components/dialogs/BillDetailDialog';
import MaintenanceRecordDetailDialog from '../components/dialogs/MaintenanceRecordDetailDialog';
export default function Bills() {
  const navigate = useNavigate();
  const [viewingBill, setViewingBill] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [deletingBill, setDeletingBill] = useState(null);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const queryClient = useQueryClient();

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: allVendors = [] } = useQuery({
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
  
  const vehicles = allVehicles;
  const vendors = allVendors;
  const filteredItems = items;



  // Check for URL parameter to auto-open a specific bill for viewing
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId && bills && bills.length > 0) {
      const bill = bills.find(b => b.id === viewId);
      if (bill) {
        setViewingBill(bill);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [bills]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Find the bill being deleted
      const billToDelete = bills.find(b => b.id === id);
      
      if (billToDelete) {
        // Reverse inventory changes
        const itemQuantityMap = {};
        (billToDelete.line_items || [])
          .filter(item => item.item_id && item.item_quantity > 0 && !item.vehicle_id)
          .forEach(item => {
            if (!itemQuantityMap[item.item_id]) {
              itemQuantityMap[item.item_id] = 0;
            }
            itemQuantityMap[item.item_id] += item.item_quantity;
          });

        // Subtract quantities from inventory
        for (const [item_id, quantity_to_subtract] of Object.entries(itemQuantityMap)) {
          const currentItem = items.find(i => i.id === item_id);
          if (currentItem) {
            const newQty = Math.max(0, (currentItem.quantity_on_hand || 0) - quantity_to_subtract);
            await base44.entities.Item.update(item_id, { quantity_on_hand: newQty });
          }
        }
        
        if (Object.keys(itemQuantityMap).length > 0) {
          queryClient.invalidateQueries({ queryKey: ['items'] });
        }
      }
      
      return base44.entities.Bill.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  const uniqueVendors = [...new Set(bills.map(b => b.vendor).filter(Boolean))].sort();

  const filteredBills = bills.filter(b => {
    if (vendorFilter !== 'all' && b.vendor !== vendorFilter) return false;
    if (dateFrom && b.bill_date < dateFrom) return false;
    if (dateTo && b.bill_date > dateTo) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !b.vendor?.toLowerCase().includes(q) &&
        !b.bill_number?.toLowerCase().includes(q) &&
        !b.notes?.toLowerCase().includes(q) &&
        !b.category?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const billsWithPhotos = bills.filter(b => b.photo_url);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bills'] });
  };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
          <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Bills & Expenses</h1>
             <p className="text-slate-600 dark:text-slate-300 mt-2">Scan and track all your fleet expenses</p>
          </div>
          <Button
            onClick={() => navigate('/BillFormPage')}
            className="w-full sm:w-auto"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            <Plus className="w-4 h-4 mr-2" /> New Bill
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search vendor, invoice #, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {uniqueVendors.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
            title="From date"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full sm:w-40"
            title="To date"
            placeholder="To"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="bg-white dark:bg-slate-950 border-b dark:border-slate-800 rounded-none">
            <TabsTrigger value="list">All Bills</TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Bill Photos ({billsWithPhotos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <BillList
              bills={bills}
              vehicles={vehicles}
              items={filteredItems}
              records={maintenanceRecords}
              onView={setViewingBill}
              onEdit={(bill) => navigate(`/BillFormPage?edit=${bill.id}`)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            {billsWithPhotos.length > 0 ? (
              <BillGallery bills={billsWithPhotos} vehicles={vehicles} />
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No bill photos yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* View Bill Dialog */}
        <BillDetailDialog
          bill={viewingBill}
          vehicles={vehicles}
          records={maintenanceRecords}
          onClose={() => setViewingBill(null)}
          onEdit={(bill) => {
            setViewingBill(null);
            navigate(`/BillFormPage?edit=${bill.id}`);
          }}
          onDelete={(id) => {
            setDeletingBill(bills.find(b => b.id === id));
          }}
          onViewPhoto={() => setViewingBill(null)}
          onViewRecord={(record) => setViewingRecord(record)}
        />

        {/* View Maintenance Record Dialog */}
        <MaintenanceRecordDetailDialog
          record={viewingRecord}
          vehicles={vehicles}
          items={filteredItems}
          bills={bills}
          intervals={[]}
          onClose={() => setViewingRecord(null)}
          onEdit={(record) => {
            setViewingRecord(null);
            navigate(`/MaintenanceRecordFormPage?edit=${record.id}`);
          }}
          onViewBill={(bill) => { setViewingRecord(null); setViewingBill(bill); }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingBill} onOpenChange={() => setDeletingBill(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bill</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this bill? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate(deletingBill.id);
                  setDeletingBill(null);
                  setViewingBill(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}