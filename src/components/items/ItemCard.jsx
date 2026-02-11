import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Package, DollarSign, Store } from 'lucide-react';

export default function ItemCard({ item, onView, onEdit, onDelete }) {
  return (
    <Card className="group overflow-hidden bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => onView(item)}>
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-100 dark:from-slate-700 to-slate-50 dark:to-slate-600 overflow-hidden">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-300" />
          </div>
        )}
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-11 w-11 rounded-full bg-white/90 hover:bg-white shadow-lg md:h-10 md:w-10"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
          >
            <Pencil className="h-4 w-4 text-slate-700" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-11 w-11 rounded-full bg-white/90 hover:bg-red-50 shadow-lg md:h-10 md:w-10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>

        {/* Price Badge */}
        {item.price && (
          <Badge 
            className="absolute top-3 right-3 text-white font-semibold px-3 py-1 shadow-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            ${item.price.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
        
        {item.item_number && (
           <p className="text-sm text-slate-500 dark:text-slate-300 font-mono">#{item.item_number}</p>
         )}

        {item.vendor && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Store className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span className="truncate">{item.vendor}</span>
          </div>
        )}

        {item.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
        )}
      </div>
    </Card>
  );
}