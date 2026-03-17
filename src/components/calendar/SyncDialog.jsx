import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, ExternalLink } from 'lucide-react';

const CALENDAR_NAME = 'Vehicle Maintenance';
const CALENDAR_LINK = 'https://calendar.google.com';

export default function SyncDialog({ 
  open, 
  onOpenChange, 
  onSync, 
  isLoading,
}) {
  const [futureOnly, setFutureOnly] = useState(true);

  const handleSync = () => {
    onSync({ futureOnly });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync to Google Calendar</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target calendar info */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Syncing to:</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold truncate">{CALENDAR_NAME}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Google Calendar</p>
            </div>
            <a
              href={CALENDAR_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-600 flex-shrink-0"
              title="Open Google Calendar"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Future Only Checkbox */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="futureOnly"
              checked={futureOnly}
              onCheckedChange={setFutureOnly}
            />
            <div className="space-y-1">
              <Label htmlFor="futureOnly" className="font-medium cursor-pointer">
                Sync future events only
              </Label>
              <p className="text-sm text-slate-500">
                Only sync maintenance intervals scheduled for today or later
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              This will create events in your <strong>{CALENDAR_NAME}</strong> Google Calendar for all maintenance intervals and appointments.
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