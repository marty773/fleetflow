import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Phone, Mail, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import VendorCard from '../components/vendors/VendorCard';

export default function Vendors() {
  const navigate = useNavigate();
  const { canEdit } = usePagePermissions();
  const canEditVendors = canEdit('vendors');
  const [viewingVendor, setViewingVendor] = useState(null);
  const queryClient = useQueryClient();

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const vendors = allVendors;

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pt-14 lg:pt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Vendors</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage vendor information and contacts</p>
          </div>
          {canEditVendors && <Button
            onClick={() => navigate('/VendorFormPage')}
            className="bg-blue-600 hover:bg-blue-700 hidden sm:flex"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vendor
          </Button>}
        </div>

        {vendors.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-slate-600 dark:text-slate-400 mb-4">No vendors yet</p>
              <Button
                onClick={() => navigate('/VendorFormPage')}
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
                onEdit={canEditVendors ? (v) => navigate(`/VendorFormPage?edit=${v.id}`) : undefined}
                onDelete={canEditVendors ? (id) => deleteMutation.mutate(id) : undefined}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        {canEditVendors && <button
          onClick={() => navigate('/VendorFormPage')}
          aria-label="Add Vendor"
          className="fixed bottom-24 right-6 sm:hidden z-40 w-14 h-14 flex items-center justify-center rounded-full text-white shadow-2xl transition-all hover:scale-110 touch-manipulation bg-blue-600"
        >
          <Plus className="w-6 h-6" />
        </button>}

        {/* View Vendor Dialog */}
        {viewingVendor && (
          <Dialog open={!!viewingVendor} onOpenChange={() => setViewingVendor(null)}>
            <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">{viewingVendor.name}</DialogTitle>
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
              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  variant="outline" 
                  onClick={() => setViewingVendor(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                {canEditVendors && <Button 
                 onClick={() => {
                   const v = viewingVendor;
                   setViewingVendor(null);
                   navigate(`/VendorFormPage?edit=${v.id}`);
                 }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Edit
                </Button>}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}