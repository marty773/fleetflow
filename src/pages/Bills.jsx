import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Image as ImageIcon, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import BillForm from '../components/bills/BillForm';
import BillList from '../components/bills/BillList';
import BillGallery from '../components/bills/BillGallery';
import { format, parseISO } from 'date-fns';
import { useCompany } from '../components/CompanyContext';

export default function Bills() {
  const { selectedCompany } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
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

  const { data: allBills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const vehicles = allVehicles.filter(v => v.company_id === selectedCompany);
  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const bills = allBills.filter(b => b.company_id === selectedCompany);
  const filteredItems = items.filter(i => i.company_id === selectedCompany);

  // Check for URL parameter to auto-open a specific bill
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    const editId = urlParams.get('edit');
    
    if (editId && bills.length > 0) {
      const bill = bills.find(b => b.id === editId);
      if (bill) {
        setEditingBill(bill);
        setShowForm(true);
        // Clean up URL to prevent conflicts
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (viewId && bills.length > 0) {
      const bill = bills.find(b => b.id === viewId);
      if (bill) {
        setViewingBill(bill);
        // Clean up URL to prevent conflicts
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [bills]);

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
    const dataWithCompany = { ...data, company_id: selectedCompany };
    
    // Group line items by item_id and sum quantities (only for items NOT assigned to vehicles)
    const itemQuantityMap = {};
    dataWithCompany.line_items
      .filter(item => item.item_id && item.item_quantity > 0 && !item.vehicle_id)
      .forEach(item => {
        if (!itemQuantityMap[item.item_id]) {
          itemQuantityMap[item.item_id] = 0;
        }
        itemQuantityMap[item.item_id] += item.item_quantity;
      });

    // Update inventory using atomic operations
    for (const [item_id, quantity_to_add] of Object.entries(itemQuantityMap)) {
      const currentItem = filteredItems.find(i => i.id === item_id);
      if (currentItem) {
        const newQty = (currentItem.quantity_on_hand || 0) + quantity_to_add;
        await base44.entities.Item.update(item_id, { quantity_on_hand: newQty });
      }
    }
    
    if (Object.keys(itemQuantityMap).length > 0) {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }

    let createdBill;
    if (editingBill) {
      await updateMutation.mutateAsync({ id: editingBill.id, data: dataWithCompany });
    } else {
      createdBill = await createMutation.mutateAsync(dataWithCompany);
    }

    // Send email notification for Fisher's Enterprise bills only
    if (!editingBill && createdBill && selectedCompany === "Fisher's Enterprise") {
      const billUrl = `${window.location.origin}${window.location.pathname}?view=${createdBill.id}`;
      
      await base44.integrations.Core.SendEmail({
        to: 'manny@fishersbackyardstructures.com',
        subject: `New Bill from ${dataWithCompany.vendor}`,
        body: `A new bill has been recorded.\n\nCompany: ${selectedCompany}\nVendor: ${dataWithCompany.vendor}\nDate: ${format(parseISO(dataWithCompany.bill_date + 'T00:00:00'), 'MMM dd, yyyy')}\nCategory: ${dataWithCompany.category?.replace('_', ' ')}\nTotal: $${dataWithCompany.total_amount?.toFixed(2)}\n\nView details: ${billUrl}`
      });
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
            className="w-full sm:w-auto"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
          >
            <Plus className="w-4 h-4 mr-2" /> New Bill
          </Button>
        </div>

        {showForm && (
          <BillForm
            bill={editingBill}
            vehicles={vehicles}
            items={filteredItems}
            vendors={vendors}
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
              items={filteredItems}
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
                  <div>
                    <div className="flex justify-end mb-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(viewingBill.photo_url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `bill_${viewingBill.bill_number || viewingBill.id}.${blob.type.includes('pdf') ? 'pdf' : 'jpg'}`;
                            document.body.appendChild(link);
                            link.click();
                            window.URL.revokeObjectURL(url);
                            link.remove();
                          } catch (error) {
                            console.error('Download failed:', error);
                          }
                        }}
                      >
                        {viewingBill.photo_url.includes('drive.google.com') || viewingBill.photo_url.includes('.pdf') ? 'Download PDF' : 'Download Photo'}
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      {viewingBill.photo_url.includes('drive.google.com') ? (
                        <div className="w-full">
                          <iframe
                            src={`${viewingBill.photo_url}#toolbar=0&navpanes=0&view=FitH`}
                            className="w-full h-96 rounded-lg border pointer-events-none"
                            title="PDF Preview"
                          />
                        </div>
                      ) : viewingBill.photo_url.includes('.pdf') || viewingBill.photo_url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full border rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center gap-3">
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                          <p className="text-sm text-slate-600">PDF uploaded</p>
                        </div>
                      ) : (
                        <img
                          src={viewingBill.photo_url}
                          alt="Bill"
                          className="max-h-64 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Vendor</Label>
                    <p className="font-medium">{viewingBill.vendor}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Date</Label>
                    <p className="font-medium">{format(parseISO(viewingBill.bill_date + 'T00:00:00'), 'MMM dd, yyyy')}</p>
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
                            <th className="text-left p-2">Vehicle</th>
                            <th className="text-center p-2">Qty</th>
                            <th className="text-right p-2">Price</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingBill.line_items.map((item, idx) => {
                            const vehicle = vehicles.find(v => v.id === item.vehicle_id);
                            return (
                              <tr key={idx} className="border-t">
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    {item.item_id && (
                                      <Package className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>{item.description}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-slate-600">
                                  {vehicle ? vehicle.name : '-'}
                                </td>
                                <td className="text-center p-2">{item.quantity}</td>
                                <td className="text-right p-2">${item.unit_price?.toFixed(2)}</td>
                                <td className="text-right p-2">${item.total?.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          <tr className="border-t bg-slate-50 font-semibold">
                            <td colSpan={4} className="p-2 text-right">Total:</td>
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
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setViewingBill(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDeletingBill(viewingBill);
                  }}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
                <Button 
                  onClick={() => {
                    setEditingBill(viewingBill);
                    setViewingBill(null);
                    setShowForm(true);
                  }}
                  className="flex-1"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  Edit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
  );
}