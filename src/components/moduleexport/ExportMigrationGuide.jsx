import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const SECRETS_NEEDED = [
  { key: 'MOTIVE_API_KEY', description: 'Motive fleet telematics API key' },
  { key: 'MOTIVE_ACCOUNT_ID', description: 'Motive account ID' },
  { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID (for Calendar sync)' },
  { key: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth client secret' },
  { key: 'BASE_URL', description: 'The public URL of the new app (used in backend functions)' },
  { key: 'BASE44_APP_OWNER', description: 'App owner identifier for Base44 SDK' },
];

const STEPS = [
  {
    number: 1,
    title: 'Copy Entity Schemas',
    tag: 'Entities',
    tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    description: 'In the new app, create each entity by copying the JSON schema files from the "File Manifest" tab.',
    details: [
      'Go to the new app\'s Base44 dashboard → Entities',
      'Create each entity and paste in the JSON schema from this app\'s entities/ folder',
      'The entities to create: Vehicle, MaintenanceRecord, MaintenanceInterval, Item, Bill, Vendor, CalendarAppointment, ServiceType, UserCompanyAccess, CompanyNotificationSettings',
      'Do NOT copy UserCalendarAuth or CompanyCalendarAuth — these will be re-authorized in the new app',
    ],
  },
  {
    number: 2,
    title: 'Import Entity Data',
    tag: 'Data',
    tagColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    description: 'Use the "Data Export" tab to download JSON files, then import them into the new app.',
    details: [
      'Download all entity JSON files from the Data Export tab',
      'In the new app\'s Base44 dashboard → Data, select each entity',
      'Use the "Import" feature and upload the corresponding JSON file',
      'Repeat for all entities — IDs will be preserved so relationships between records (e.g. vehicle_id on MaintenanceRecord) stay intact',
    ],
  },
  {
    number: 3,
    title: 'Copy Source Code via GitHub',
    tag: 'Code',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    description: 'Use GitHub Sync to transfer all Fleet module files to the new app\'s repository.',
    details: [
      'Both apps should be connected to GitHub (this app already is)',
      'Push this app\'s current code to its GitHub repo (Dashboard → GitHub Sync → Push)',
      'In the new app\'s GitHub Sync settings, point to the same repository or copy individual files',
      'Use the File Manifest tab to know exactly which files belong to the Fleet module',
      'After syncing, update the new app\'s App.jsx to include routes for all Fleet pages',
    ],
  },
  {
    number: 4,
    title: 'Configure Secrets & Environment Variables',
    tag: 'Config',
    tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    description: 'Set all required API keys and secrets in the new app\'s environment.',
    details: SECRETS_NEEDED.map(s => `${s.key} — ${s.description}`),
  },
  {
    number: 5,
    title: 'Re-authorize Integrations',
    tag: 'Integrations',
    tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    description: 'OAuth connections cannot be transferred — they must be re-authorized in the new app.',
    details: [
      'Google Calendar: Connect via the new app\'s Connectors dashboard → Google Calendar',
      'Google Drive: Connect via the new app\'s Connectors dashboard → Google Drive',
      'Motive webhooks: Update the webhook URL in your Motive account to point to the new app\'s motiveWebhook function endpoint',
    ],
  },
  {
    number: 6,
    title: 'Update App.jsx Routing',
    tag: 'Code',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    description: 'Add Fleet module routes into the new app\'s routing configuration.',
    details: [
      'Open App.jsx in the new app',
      'Import each Fleet page component at the top',
      'Add <Route> entries for: /Vehicles, /Bills, /Maintenance, /Items, /Calendar, /Reports, /Vendors, /Settings, /VehicleForm, /BillFormPage, /ItemFormPage, /VendorFormPage, /MaintenanceRecordFormPage, /MaintenanceIntervalFormPage, /SystemUpdates',
      'Wrap each route in the same LayoutWrapper used by the rest of the new app',
    ],
  },
  {
    number: 7,
    title: 'Verify & Test',
    tag: 'QA',
    tagColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    description: 'Walk through core functionality to confirm the migration was successful.',
    details: [
      'Check that all vehicles appear on the Vehicles page',
      'Confirm maintenance records are linked to the correct vehicles',
      'Test creating a new bill and verify inventory updates',
      'Open the Calendar and confirm appointments are visible',
      'Test Motive live data if applicable',
      'Check Google Calendar sync if authorized',
    ],
  },
];

function StepCard({ step }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyDetails = () => {
    navigator.clipboard.writeText(step.details.join('\n'));
    setCopied(true);
    toast.success('Copied step details');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{step.title}</span>
            <Badge className={step.tagColor + ' text-xs border-0'}>{step.tag}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{step.description}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-0">
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" onClick={copyDetails}
                className="text-xs text-slate-400 h-6 px-2">
                {copied ? <Check className="w-3 h-3 text-green-600 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <ul className="space-y-2">
              {step.details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ExportMigrationGuide() {
  return (
    <div className="space-y-3">
      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4 text-sm text-amber-800 dark:text-amber-300">
          Follow these steps in order to migrate the Fleet module into your new Base44 app. Click each step to expand the details.
        </CardContent>
      </Card>
      {STEPS.map(step => <StepCard key={step.number} step={step} />)}
    </div>
  );
}