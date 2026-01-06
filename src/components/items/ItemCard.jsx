import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Package } from 'lucide-react';

export default function ItemCard({ item, onEdit, onDelete, isDeleting }) {
  const categoryColors = {
    fuel: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    repairs: 'bg-red-100 text-red-800',
    parts: 'bg-purple-100 text-purple-800',
    labor: 'bg-green-100 text-green-800',
    other: 'bg-slate-100 text-slate-800',
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Package className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <Badge className={categoryColors[item.category]} variant="secondary" className="mt-1">
                {item.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-slate-900">
          ${item.price.toFixed(2)}
        </div>
        {item.description && (
          <p className="text-sm text-slate-600">{item.description}</p>
        )}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            className="flex-1"
          >
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Delete this item?')) {
                onDelete();
              }
            }}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}