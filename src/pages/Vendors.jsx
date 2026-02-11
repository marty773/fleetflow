import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../components/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Phone, Mail, MapPin, Trash2, Edit, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import VendorForm from '../components/vendors/VendorForm';
import VendorCard from '../components/vendors/VendorCard';

export default function Vendors() {
  const { selectedCompany } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const queryClient = useQueryClient();

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const vendors = allVendors.filter(v => v.company_id === selectedCompany);

  // Check for URL parameter to auto-open edit form
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === editId);
      if (vendor) {
        setEditingVendor(vendor);
        setShowForm(true);
      }
    }
  }, [vendors]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setEditingVendor(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleSubmit = async (data) => {
    if (editingVendor) {
      await updateMutation.mutateAsync({ id: editingVendor.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Vendors</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage vendor information and contacts</p>
          </div>
          <Button
            onClick={() => {
              setEditingVendor(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vendor
          </Button>
        </div>

        {showForm && (
          <VendorForm
            vendor={editingVendor}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingVendor(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {vendors.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">No vendors yet</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> Create First Vendor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onView={setViewingVendor}
                onEdit={(v) => {
                  setEditingVendor(v);
                  setShowForm(true);
                }}
                onDelete={(id) => deleteMutation.mutate(id)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* View Vendor Dialog */}
        {viewingVendor && (
          <Dialog open={!!viewingVendor} onOpenChange={() => setViewingVendor(null)}>
            <DialogContent className="max-w-md dark:bg-slate-800 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{viewingVendor.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {viewingVendor.contact_person && (
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">Contact Person</Label>
                    <p className="font-medium dark:text-white">{viewingVendor.contact_person}</p>
                    </div>
                    )}
                    {viewingVendor.email && (
                    <div>
                     <Label className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Mail className="w-4 h-4" /> Email
                     </Label>
                     <a href={`mailto:${viewingVendor.email}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                       {viewingVendor.email}
                     </a>
                    </div>
                    )}
                    {viewingVendor.phone && (
                    <div>
                     <Label className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Phone className="w-4 h-4" /> Phone
                     </Label>
                     <a href={`tel:${viewingVendor.phone}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                       {viewingVendor.phone}
                     </a>
                    </div>
                    )}
                    {(viewingVendor.address || viewingVendor.city || viewingVendor.state || viewingVendor.zip) && (
                    <div>
                     <Label className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <MapPin className="w-4 h-4" /> Address
                     </Label>
                     <p className="font-medium dark:text-white">
                       {[viewingVendor.address, viewingVendor.city, viewingVendor.state, viewingVendor.zip]
                         .filter(Boolean)
                         .join(', ')}
                     </p>
                    </div>
                    )}
                    {viewingVendor.category && (
                    <div>
                     <Label className="text-slate-500 dark:text-slate-400">Category</Label>
                     <p className="font-medium dark:text-white capitalize">{viewingVendor.category}</p>
                    </div>
                    )}
                    {viewingVendor.notes && (
                    <div>
                     <Label className="text-slate-500 dark:text-slate-400">Notes</Label>
                    <p className="text-sm mt-1">{viewingVendor.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6 pt-4 border-t dark:border-slate-700">
                <Button 
                  variant="outline" 
                  onClick={() => setViewingVendor(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setEditingVendor(viewingVendor);
                    setViewingVendor(null);
                    setShowForm(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Edit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}