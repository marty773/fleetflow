import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Save } from 'lucide-react';

const STORAGE_KEY = 'fleetflow_service_reminder_miles';

export function getServiceReminderMiles() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 1000;
}

export default function ServiceReminderSettings() {
  const [miles, setMiles] = useState(() => getServiceReminderMiles());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, String(miles));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Dispatch event so other components can react
    window.dispatchEvent(new Event('serviceReminderMilesChanged'));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" /> Service Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-slate-700 dark:text-slate-300">
            Upcoming service alert threshold (miles)
          </Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Services due within this many miles will show as "Upcoming" and count toward the badge on the Maintenance tab.
          </p>
          <div className="flex gap-2 items-center mt-2">
            <Input
              type="number"
              min={100}
              step={100}
              value={miles}
              onChange={e => setMiles(parseInt(e.target.value) || 1000)}
              className="w-32 dark:bg-slate-950 dark:border-slate-700"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">miles</span>
          </div>
        </div>
        <Button onClick={handleSave} style={{ backgroundColor: 'var(--color-primary)' }}>
          <Save className="w-4 h-4 mr-2" />
          {saved ? 'Saved!' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}