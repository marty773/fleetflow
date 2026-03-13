import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Image as ImageIcon } from 'lucide-react';
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
export default function Bills() {
  const navigate = useNavigate();
  const [viewingBill, setViewingBill] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [deletingBill, setDeletingBill] = useState(null);
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
  
  const vehicles = allVehicles;
  const vendors = allVendors;
  const filteredItems = items;



  // Check for URL parameter to auto-open a specific bill for viewing
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId && bills.length > 0) {
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
      const billToDelete = allBills.find(b => b.id === id);
      
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
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
          onClose={() => setViewingBill(null)}
          onEdit={(bill) => {
            setViewingBill(null);
            navigate(`/BillFormPage?edit=${bill.id}`);
          }}
          onDelete={(id) => {
            setDeletingBill(allBills.find(b => b.id === id));
          }}
          onViewPhoto={() => setViewingBill(null)}
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