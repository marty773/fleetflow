import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/CompanyContext';
import ItemFormDialog from '@/components/items/ItemFormDialog';
import PageTransition from '@/components/PageTransition';

// Renders ItemFormDialog in "always open" mode as a full page
export default function ItemFormPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { data: allItems = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list(),
    enabled: !!editId,
  });

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const vendors = allVendors.filter(v => v.company_id === selectedCompany);
  const item = editId ? allItems.find(i => i.id === editId) || null : null;

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    navigate('/Items');
  };

  if (editId && allItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8">
        <div className="max-w-2xl mx-auto px-4 pt-14 lg:pt-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Item' : 'Add Item'}
          </h1>
          {/* Re-use ItemFormDialog content inline by rendering it as full-page */}
          <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <ItemFormDialog
              open={true}
              onOpenChange={(open) => { if (!open) navigate('/Items'); }}
              item={item}
              onSave={handleSave}
              vendors={vendors}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}