import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import BillForm from '../components/bills/BillForm';
import BillList from '../components/bills/BillList';
import BillGallery from '../components/bills/BillGallery';
import { format } from 'date-fns';

export default function Bills() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Bill.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setShowForm(false);
      setActiveTab('list');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setEditingBill(null);
      setShowForm(false);
      setActiveTab('list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Bill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  const handleSubmit = async (data) => {
    // Update item quantities from line items
    const itemUpdates = data.line_items
      .filter(item => item.item_id && item.item_quantity > 0)
      .map(item => ({
        item_id: item.item_id,
        quantity_to_add: item.item_quantity,
      }));

    // Update inventory
    for (const update of itemUpdates) {
      const currentItem = items.find(i => i.id === update.item_id);
      if (currentItem) {
        const newQty = (currentItem.quantity_on_hand || 0) + update.quantity_to_add;
        base44.entities.Item.update(update.item_id, { quantity_on_hand: newQty });
      }
    }

    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const billsWithPhotos = bills.filter(b => b.photo_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Bills & Expenses</h1>
            <p className="text-slate-600 mt-2">Scan and track all your fleet expenses</p>
          </div>
          <Button
            onClick={() => {
              setEditingBill(null);
              setShowForm(!showForm);
            }}
            className="bg-amber-500 hover:bg-amber-600 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> New Bill
          </Button>
        </div>

        {showForm && (
          <BillForm
            bill={editingBill}
            vehicles={vehicles}
            items={items}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBill(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="bg-white border-b rounded-none">
            <TabsTrigger value="list">All Bills</TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Bill Photos ({billsWithPhotos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <BillList
              bills={bills}
              vehicles={vehicles}
              items={items}
              onView={setViewingBill}
              onEdit={handleEdit}
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
                  <p className="text-slate-600">No bill photos yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* View Bill Dialog */}
        {viewingBill && (
          <Dialog open={!!viewingBill} onOpenChange={() => setViewingBill(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bill Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {viewingBill.photo_url && (
                  <div className="flex justify-center">
                    <img
                      src={viewingBill.photo_url}
                      alt="Bill"
                      className="max-h-64 rounded-lg object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Vendor</Label>
                    <p className="font-medium">{viewingBill.vendor}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Date</Label>
                    <p className="font-medium">{format(new Date(viewingBill.bill_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Bill Number</Label>
                    <p className="font-medium">{viewingBill.bill_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Category</Label>
                    <p className="font-medium capitalize">{viewingBill.category?.replace('_', ' ')}</p>
                  </div>
                </div>
                {viewingBill.line_items && viewingBill.line_items.length > 0 && (
                  <div>
                    <Label className="text-slate-500 mb-2 block">Line Items</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-2">Description</th>
                            <th className="text-center p-2">Qty</th>
                            <th className="text-right p-2">Price</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingBill.line_items.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{item.description}</td>
                              <td className="text-center p-2">{item.quantity}</td>
                              <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                              <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-slate-50 font-semibold">
                            <td colSpan={3} className="p-2 text-right">Total:</td>
                            <td className="text-right p-2">${viewingBill.total_amount?.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {viewingBill.notes && (
                  <div>
                    <Label className="text-slate-500">Notes</Label>
                    <p className="text-sm mt-1">{viewingBill.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setViewingBill(null)}>Close</Button>
                <Button onClick={() => {
                  setEditingBill(viewingBill);
                  setViewingBill(null);
                  setShowForm(true);
                }}>
                  Edit Bill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}