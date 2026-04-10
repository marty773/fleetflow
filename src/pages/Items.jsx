import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Package, Grid3X3, List, Loader2, RotateCw, ClipboardList, Archive, ChevronDown } from 'lucide-react';
import PartsNeededReport from '@/components/reports/PartsNeededReport';
import ItemCard from '@/components/items/ItemCard';
import ItemFormDialog from '@/components/items/ItemFormDialog';
import ItemDetailDialog from '@/components/dialogs/ItemDetailDialog';
import BillDetailDialog from '@/components/dialogs/BillDetailDialog';
import MaintenanceRecordDetailDialog from '@/components/dialogs/MaintenanceRecordDetailDialog';
import PageTransition from '@/components/PageTransition';
import PullToRefresh from '@/components/PullToRefresh';

export default function Items() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('itemsViewMode') || 'list';
  });
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price_asc', 'price_desc', 'stock'
  const [viewingMaintenanceRecord, setViewingMaintenanceRecord] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);
  const [showPartsReport, setShowPartsReport] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const queryClient = useQueryClient();

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list('-created_date'),
  });

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: allMaintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const items = allItems;
  const bills = allBills;
  const maintenanceRecords = allMaintenanceRecords;
  const vehicles = allVehicles;
  const vendors = allVendors;

  const vehicleMap = vehicles.reduce((acc, v) => {
    acc[v.id] = v;
    return acc;
  }, {});

  const getItemTransactions = (itemId) => {
    const transactions = [];

    bills.forEach((bill) => {
      if (bill.line_items) {
        bill.line_items.forEach((lineItem) => {
          if (lineItem.item_id === itemId && lineItem.item_quantity !== 0 && lineItem.item_quantity != null) {
            const qty = lineItem.item_quantity;
            if (qty < 0) {
              // Negative quantity = return/credit — decreases inventory
              transactions.push({
                type: 'return',
                date: bill.bill_date,
                quantity: qty,
                vendor: bill.vendor,
                reference: `Bill #${bill.bill_number || 'N/A'} (Return/Credit)`,
                billId: bill.id,
              });
            } else if (!lineItem.vehicle_id) {
              // Positive, no vehicle = stock purchase — adds to inventory
              transactions.push({
                type: 'purchase',
                date: bill.bill_date,
                quantity: qty,
                vendor: bill.vendor,
                reference: `Bill #${bill.bill_number || 'N/A'}`,
                billId: bill.id,
              });
            } else {
              // Positive, with vehicle = direct vehicle usage via bill
              transactions.push({
                type: 'usage',
                date: bill.bill_date,
                quantity: qty,
                vehicle: vehicleMap[lineItem.vehicle_id]?.name || 'Unknown',
                reference: `Bill #${bill.bill_number || 'N/A'}`,
                billId: bill.id,
              });
            }
          }
        });
      }
    });

    maintenanceRecords.forEach((record) => {
      // Check parts_used array (new format)
      if (record.parts_used) {
        record.parts_used.forEach((part) => {
          if (part.item_id === itemId) {
            transactions.push({
              type: 'usage',
              date: record.performed_date,
              quantity: part.quantity_used,
              vehicle: vehicleMap[record.vehicle_id]?.name || 'Unknown',
              reference: record.title,
              maintenanceId: record.id,
            });
          }
        });
      }
      
      // Also check work_items array for item_id (in case it's stored there)
      if (record.work_items) {
        record.work_items.forEach((workItem) => {
          if (workItem.item_id === itemId) {
            transactions.push({
              type: 'usage',
              date: record.performed_date,
              quantity: workItem.quantity,
              vehicle: vehicleMap[record.vehicle_id]?.name || 'Unknown',
              reference: record.title,
              maintenanceId: record.id,
            });
          }
        });
      }
    });

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setDeleteItem(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.update(id, { is_archived: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.update(id, { is_archived: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const filteredItems = items
    .filter(item => showArchived ? item.is_archived : !item.is_archived)
    .filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query) ||
        item.item_number?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'stock') return (b.quantity_on_hand || 0) - (a.quantity_on_hand || 0);
      return (a.name || '').localeCompare(b.name || ''); // default: name A-Z
    });

  const handleEdit = (item) => {
    navigate(`/ItemFormPage?edit=${item.id}`);
  };

  const handleAddNew = () => {
    navigate('/ItemFormPage');
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const recalculateInventory = async () => {
    if (!confirm('This will recalculate all inventory quantities based on bills and maintenance records. Continue?')) {
      return;
    }

    setRecalculating(true);
    try {
      // Step 1: Reset all item quantities to 0
      for (const item of items) {
        await base44.entities.Item.update(item.id, { quantity_on_hand: 0 });
      }

      // Build running totals in memory to avoid race conditions
      const totals = {};
      items.forEach(item => { totals[item.id] = 0; });

      // Step 2: Add/subtract quantities from bills
      for (const bill of bills) {
        if (bill.line_items) {
          for (const lineItem of bill.line_items) {
            if (lineItem.item_id && lineItem.item_quantity != null && lineItem.item_quantity !== 0 && totals[lineItem.item_id] !== undefined) {
              const qty = lineItem.item_quantity;
              if (qty < 0) {
                // Negative = return/credit — subtract from inventory (but don't go below 0)
                totals[lineItem.item_id] = Math.max(0, totals[lineItem.item_id] + qty);
              } else if (!lineItem.vehicle_id) {
                // Positive, no vehicle = stock purchase — add to inventory
                totals[lineItem.item_id] += qty;
              } else {
                // Positive, with vehicle = direct usage — subtract
                totals[lineItem.item_id] = Math.max(0, totals[lineItem.item_id] - qty);
              }
            }
          }
        }
      }

      // Step 3: Subtract quantities from maintenance records (parts_used)
      for (const record of maintenanceRecords) {
        if (record.parts_used) {
          for (const part of record.parts_used) {
            if (part.item_id && part.quantity_used > 0 && totals[part.item_id] !== undefined) {
              totals[part.item_id] = Math.max(0, totals[part.item_id] - part.quantity_used);
            }
          }
        }
      }

      // Step 4: Write all totals in one pass
      for (const item of items) {
        await base44.entities.Item.update(item.id, { quantity_on_hand: totals[item.id] });
      }

      // Refresh items
      queryClient.invalidateQueries({ queryKey: ['items'] });
      alert('Inventory recalculated successfully!');
    } catch (error) {
      alert('Error recalculating inventory: ' + error.message);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8 pb-24 lg:pb-0">
      {/* Header */}
      <div className="mb-8 pt-14 lg:pt-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Item Gallery</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage your inventory items for bills and maintenance records</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Main row */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent dark:border-slate-700 dark:bg-slate-950 text-slate-900 dark:text-white pl-10 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => { setViewMode('grid'); localStorage.setItem('itemsViewMode', 'grid'); }}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => { setViewMode('list'); localStorage.setItem('itemsViewMode', 'list'); }}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={recalculateInventory}
            disabled={recalculating}
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Recalculate Inventory"
            aria-label="Recalculate inventory"
          >
            {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          </Button>

          <Button
            onClick={handleAddNew}
            className="h-9 shadow-sm hidden sm:flex shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>

          <Button
            onClick={() => setShowMore(p => !p)}
            variant="outline"
            className="h-9 gap-1.5 hidden sm:flex shrink-0"
          >
            More
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Expanded "More" row */}
        {showMore && (
          <div className="flex flex-wrap items-center gap-2 px-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sort:</span>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {[
                  { value: 'name', label: 'A–Z' },
                  { value: 'price_asc', label: 'Price ↑' },
                  { value: 'price_desc', label: 'Price ↓' },
                  { value: 'stock', label: 'Stock' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortBy === opt.value
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <Button
              onClick={() => setShowArchived(p => !p)}
              variant={showArchived ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 gap-1.5"
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>

            <Button
              onClick={() => setShowPartsReport(true)}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Parts Report
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {searchQuery ? 'No items found' : showArchived ? 'No archived items' : 'No items yet'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : showArchived ? 'Archived items will appear here'
              : 'Add your first item to get started'}
          </p>
          {!searchQuery && !showArchived && (
            <Button 
              onClick={handleAddNew}
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onView={() => setViewingItem(item)}
              onEdit={handleEdit}
              onDelete={setDeleteItem}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
           {filteredItems.map(item => (
             <div
               key={item.id}
               className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
               onClick={() => setViewingItem(item)}
             >
               <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0">
               {item.photo_url ? (
                 <img
                   src={item.photo_url}
                   alt={item.name}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <Package className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                 </div>
               )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  {item.item_number && <span className="font-mono">#{item.item_number}</span>}
                  {item.vendor && <span>{item.vendor}</span>}
                </div>
              </div>
              {item.price && (
                <div className="font-semibold text-lg" style={{ color: 'var(--color-primary)' }}>
                  ${item.price.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PartsNeededReport open={showPartsReport} onClose={() => setShowPartsReport(false)} />

      {/* ItemFormDialog removed — now handled by ItemFormPage */}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Item Dialog */}
      <ItemDetailDialog
        item={viewingItem}
        transactions={viewingItem ? getItemTransactions(viewingItem.id) : []}
        onClose={() => setViewingItem(null)}
        onEdit={showArchived ? undefined : (item) => {
          setViewingItem(null);
          navigate(`/ItemFormPage?edit=${item.id}`);
        }}
        onArchive={showArchived ? undefined : (item) => {
          setViewingItem(null);
          archiveMutation.mutate(item.id);
        }}
        onRestore={showArchived ? (item) => {
          setViewingItem(null);
          restoreMutation.mutate(item.id);
        } : undefined}
        onDelete={(item) => {
          setViewingItem(null);
          setDeleteItem(item);
        }}
        onViewBill={(billId) => {
          const bill = bills.find(b => b.id === billId);
          if (bill) setViewingBill(bill);
        }}
        onViewMaintenance={(maintenanceId) => {
          const record = maintenanceRecords.find(r => r.id === maintenanceId);
          if (record) setViewingMaintenanceRecord(record);
        }}
      />

      {/* Photo Lightbox */}
      {photoLightbox && (
        <Dialog open={!!photoLightbox} onOpenChange={() => setPhotoLightbox(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden bg-black">
            <div className="relative flex items-center justify-center min-h-[50vh]">
              <img
                src={photoLightbox}
                alt="Item photo"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
            <div className="flex gap-2 p-4 bg-white dark:bg-slate-900">
              <Button 
                variant="outline"
                onClick={() => setPhotoLightbox(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = photoLightbox;
                  link.download = 'item-photo.jpg';
                  link.click();
                }}
                className="flex-1"
              >
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Maintenance Record Dialog */}
      <MaintenanceRecordDetailDialog
        record={viewingMaintenanceRecord}
        vehicles={vehicles}
        items={items}
        onClose={() => setViewingMaintenanceRecord(null)}
        onEdit={(record) => {
          navigate(`/MaintenanceRecordFormPage?edit=${record.id}`);
        }}
      />

      {/* View Bill Dialog */}
      <BillDetailDialog
        bill={viewingBill}
        vehicles={vehicles}
        onClose={() => setViewingBill(null)}
        onEdit={() => {
          navigate(`/BillFormPage?edit=${viewingBill.id}`);
        }}
        onViewPhoto={(url) => {
          setViewingBill(null);
          setPhotoLightbox(url);
        }}
      />
        </div>
      </PullToRefresh>

      {/* Mobile FAB */}
      <button
        onClick={handleAddNew}
        aria-label="Add Item"
        className="fixed bottom-24 right-6 sm:hidden z-50 w-14 h-14 flex items-center justify-center rounded-full text-white shadow-2xl transition-all active:scale-95 touch-manipulation"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </PageTransition>
  );
}