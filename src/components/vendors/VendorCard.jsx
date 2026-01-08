import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Eye, Edit, Trash2 } from 'lucide-react';

export default function VendorCard({ vendor, onView, onEdit, onDelete, isDeleting }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{vendor.name}</CardTitle>
        {vendor.category && (
          <p className="text-xs text-slate-500 capitalize mt-1">{vendor.category}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {vendor.contact_person && (
          <p className="text-slate-600">Contact: {vendor.contact_person}</p>
        )}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
            <Mail className="w-4 h-4" /> {vendor.email}
          </a>
        )}
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
            <Phone className="w-4 h-4" /> {vendor.phone}
          </a>
        )}
        {(vendor.city || vendor.state) && (
          <p className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" /> {[vendor.city, vendor.state].filter(Boolean).join(', ')}
          </p>
        )}
      </CardContent>
      <div className="border-t p-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(vendor)}
          className="flex-1"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(vendor)}
          className="flex-1"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 hover:text-red-700"
          onClick={() => {
            if (confirm('Delete vendor?')) onDelete(vendor.id);
          }}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}