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

export default function ResponsiveSelect({ value, onValueChange, placeholder, children, label }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer - visible only on sm and below */}
      <div className="sm:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start text-left font-normal select-text"
        >
          {React.Children.toArray(children).find(child => child?.props?.value === value)?.props?.children || placeholder}
        </Button>
      </div>

      {/* Desktop Select - hidden on sm */}
      <div className="hidden sm:block">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="select-text">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{label || placeholder}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="w-full">
            <div className="space-y-2 p-4">
              {React.Children.map(children, (child) => (
                <Button
                  key={child.props.value}
                  variant={value === child.props.value ? 'default' : 'ghost'}
                  className="w-full justify-start select-text"
                  onClick={() => {
                    onValueChange(child.props.value);
                    setOpen(false);
                  }}
                >
                  {child.props.children}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
}