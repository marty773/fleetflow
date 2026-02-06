import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Loader2 } from 'lucide-react';

export default function SyncDialog({ 
  open, 
  onOpenChange, 
  onSync, 
  isLoading,
  syncType, // 'user' or 'company'
  availableCalendars = []
}) {
  const [futureOnly, setFutureOnly] = useState(true);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');

  const handleSync = () => {
    onSync({
      futureOnly,
      calendarId: selectedCalendar
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {syncType === 'user' ? 'Sync to My Calendar' : 'Sync to Company Calendar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Future Only Checkbox */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="futureOnly"
              checked={futureOnly}
              onCheckedChange={setFutureOnly}
            />
            <div className="space-y-1">
              <Label htmlFor="futureOnly" className="font-medium cursor-pointer">
                Sync future appointments only
              </Label>
              <p className="text-sm text-slate-500">
                Only sync appointments scheduled for today or later
              </p>
            </div>
          </div>

          {/* Calendar Selection (for company sync only) */}
          {syncType === 'company' && availableCalendars.length > 0 && (
            <div className="space-y-2">
              <Label>Select Calendar</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCalendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Choose which Google Calendar to sync appointments to
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              {syncType === 'user' 
                ? 'This will create events in your personal Google Calendar'
                : 'This will create events in the selected company calendar'
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}