import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/CompanyContext';
import VendorForm from '@/components/vendors/VendorForm';
import PageTransition from '@/components/PageTransition';

export default function VendorFormPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
    enabled: !!editId,
  });

  const vendor = editId ? allVendors.find(v => v.id === editId) || null : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/Vendors');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/Vendors');
    },
  });

  const handleSubmit = async (data) => {
    const dataWithCompany = { ...data, company_id: selectedCompany };
    if (editId && vendor) {
      updateMutation.mutate({ id: vendor.id, data: dataWithCompany });
    } else {
      createMutation.mutate(dataWithCompany);
    }
  };

  if (editId && allVendors.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
        <div className="max-w-3xl mx-auto px-4 pt-14 lg:pt-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Vendor' : 'Add Vendor'}
          </h1>
          <VendorForm
            vendor={vendor}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/Vendors')}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </PageTransition>
  );
}