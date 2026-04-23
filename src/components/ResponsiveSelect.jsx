import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ResponsiveSelect({ value, onValueChange, placeholder, children, options, label, className }) {
  const [open, setOpen] = useState(false);

  // Support both `options` prop (array of {value, label}) and `children` (SelectItem elements)
  const items = options
    ? options.map(o => ({ value: o.value, label: o.label }))
    : React.Children.toArray(children).map(child => ({ value: child.props.value, label: child.props.children }));

  const selectedLabel = items.find(i => i.value === value)?.label || placeholder;

  return (
    <>
      {/* Mobile Drawer - visible only on sm and below */}
      <div className={`sm:hidden ${className || ''}`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start text-left font-normal select-text"
        >
          {selectedLabel}
        </Button>
      </div>

      {/* Desktop Select - hidden on sm */}
      <div className={`hidden sm:block ${className || ''}`}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="select-text">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options
              ? options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)
              : children}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{label || placeholder}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-2 p-4 pb-8">
              {items.map(item => (
                <Button
                  key={item.value}
                  variant={value === item.value ? 'default' : 'ghost'}
                  className="w-full justify-start select-text"
                  onClick={() => {
                    onValueChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}