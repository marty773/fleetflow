import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BillForm from '../components/bills/BillForm';
import BillList from '../components/bills/BillList';
import BillGallery from '../components/bills/BillGallery';

export default function Bills() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
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
      </div>
    </div>
  );
}