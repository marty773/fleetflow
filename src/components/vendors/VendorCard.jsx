import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Eye, Edit, Trash2 } from 'lucide-react';

export default function VendorCard({ vendor, onView, onEdit, onDelete, isDeleting }) {
  return (
    <Card 
      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
      onClick={() => onView(vendor)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{vendor.name}</CardTitle>
            {vendor.category && (
              <p className="text-xs text-slate-500 capitalize mt-1">{vendor.category}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(vendor);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete vendor "${vendor.name}"?`)) {
                  onDelete(vendor.id);
                }
              }}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {vendor.contact_person && (
          <p className="text-slate-600">Contact: {vendor.contact_person}</p>
        )}
        {vendor.email && (
          <a 
            href={`mailto:${vendor.email}`} 
            className="flex items-center gap-2 text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-4 h-4" /> {vendor.email}
          </a>
        )}
        {vendor.phone && (
          <a 
            href={`tel:${vendor.phone}`} 
            className="flex items-center gap-2 text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-4 h-4" /> {vendor.phone}
          </a>
        )}
        {(vendor.city || vendor.state) && (
          <p className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" /> {[vendor.city, vendor.state].filter(Boolean).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}