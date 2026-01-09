import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { Label } from '@/components/ui/label';
import { Plus, Search, Package, Grid3X3, List, Loader2 } from 'lucide-react';
import ItemCard from '@/components/items/ItemCard';
import ItemFormDialog from '@/components/items/ItemFormDialog';

export default function Items() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [photoLightbox, setPhotoLightbox] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list('-created_date'),
  });

  // Check for URL parameter to auto-open edit form
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && items.length > 0) {
      const item = items.find(i => i.id === editId);
      if (item) {
        setEditingItem(item);
        setFormOpen(true);
      }
    }
  }, [items]);

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenanceRecords'],
    queryFn: () => base44.entities.MaintenanceRecord.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setDeleteItem(null);
    },
  });

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.vendor?.toLowerCase().includes(query) ||
      item.item_number?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
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

      // Step 2: Add quantities from bills
      for (const bill of bills) {
        if (bill.line_items && bill.line_items.length > 0) {
          for (const lineItem of bill.line_items) {
            if (lineItem.item_id && lineItem.item_quantity > 0) {
              const currentItem = items.find(i => i.id === lineItem.item_id);
              if (currentItem) {
                const newQty = lineItem.item_quantity;
                const existingQty = (await base44.entities.Item.list()).find(i => i.id === lineItem.item_id)?.quantity_on_hand || 0;
                await base44.entities.Item.update(lineItem.item_id, { quantity_on_hand: existingQty + newQty });
              }
            }
          }
        }
      }

      // Step 3: Subtract quantities from maintenance records
      for (const record of maintenanceRecords) {
        if (record.parts_used && record.parts_used.length > 0) {
          for (const part of record.parts_used) {
            if (part.item_id && part.quantity_used > 0) {
              const currentItem = items.find(i => i.id === part.item_id);
              if (currentItem) {
                const existingQty = (await base44.entities.Item.list()).find(i => i.id === part.item_id)?.quantity_on_hand || 0;
                await base44.entities.Item.update(part.item_id, { quantity_on_hand: Math.max(0, existingQty - part.quantity_used) });
              }
            }
          }
        }
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
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 pt-14 lg:pt-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Item Gallery</h1>
        <p className="text-slate-600">Manage your inventory items for bills and maintenance records</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={recalculateInventory}
            disabled={recalculating}
            variant="outline"
            className="h-11"
          >
            {recalculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              'Recalculate Inventory'
            )}
          </Button>

          <Button
            onClick={handleAddNew}
            className="h-11 bg-amber-600 hover:bg-amber-700 shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {searchQuery ? 'No items found' : 'No items yet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Add your first item to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddNew} className="bg-amber-600 hover:bg-amber-700">
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
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => handleEdit(item)}
            >
              <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  {item.item_number && <span className="font-mono">#{item.item_number}</span>}
                  {item.vendor && <span>{item.vendor}</span>}
                </div>
              </div>
              {item.price && (
                <div className="font-semibold text-amber-600 text-lg">
                  ${item.price.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSave={handleSave}
        vendors={vendors}
      />

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
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingItem?.photo_url && (
              <div className="flex justify-center">
                <img
                  src={viewingItem.photo_url}
                  alt={viewingItem.name}
                  className="max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPhotoLightbox(viewingItem.photo_url)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500">Name</Label>
                <p className="font-medium">{viewingItem?.name}</p>
              </div>
              <div>
                <Label className="text-slate-500">Price</Label>
                <p className="font-medium">${viewingItem?.price?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <Label className="text-slate-500">Item Number</Label>
                <p className="font-medium">{viewingItem?.item_number || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-500">Quantity on Hand</Label>
                <p className="font-medium">{viewingItem?.quantity_on_hand || 0}</p>
              </div>
              <div>
                <Label className="text-slate-500">Vendor</Label>
                <p className="font-medium">{viewingItem?.vendor || '-'}</p>
              </div>
            </div>
            {viewingItem?.description && (
              <div>
                <Label className="text-slate-500">Description</Label>
                <p className="text-sm mt-1">{viewingItem.description}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setViewingItem(null)}
              className="flex-1"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setEditingItem(viewingItem);
                setViewingItem(null);
                setFormOpen(true);
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Edit
            </Button>
            {viewingItem?.photo_url && (
              <Button 
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewingItem.photo_url;
                  link.download = `${viewingItem.name}.jpg`;
                  link.click();
                }}
                className="flex-1"
              >
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="flex gap-2 p-4 bg-white">
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
    </div>
  );
}