import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings, LogOut, Trash2, Bell, Save, Copy, Check } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import ServiceTypesEditor from '@/components/settings/ServiceTypesEditor';
import ServiceReminderSettings from '@/components/settings/ServiceReminderSettings';
import DataExport from '@/components/settings/DataExport';

export default function SettingsPage() {
  const [user, setUser] = React.useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const appId = window.location.pathname.match(/apps\/([^/?#]+)/)?.[1] || window.location.hostname.split('.')[0];
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifSettings, setNotifSettings] = useState(null);
  const [notifSettingsId, setNotifSettingsId] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    base44.entities.CompanyNotificationSettings.filter({}).then(results => {
      if (results.length > 0) {
        setNotifSettings(results[0]);
        setNotifSettingsId(results[0].id);
      } else {
        setNotifSettings({ bill_notification_enabled: false, bill_notification_email: '' });
        setNotifSettingsId(null);
      }
    });
  }, []);

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    if (notifSettingsId) {
      await base44.entities.CompanyNotificationSettings.update(notifSettingsId, notifSettings);
    } else {
      const created = await base44.entities.CompanyNotificationSettings.create(notifSettings);
      setNotifSettingsId(created.id);
    }
    setNotifSaving(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user data and logout
      await base44.auth.logout();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 pb-32 lg:pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>

        {user && (
           <Card className="mb-6">
             <CardHeader>
               <CardTitle className="text-lg text-slate-900 dark:text-white">Account Information</CardTitle>
             </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
                <p className="font-medium text-slate-900 dark:text-white">{user.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Role</p>
                <p className="font-medium capitalize text-slate-900 dark:text-white">{user.role}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
           <CardHeader>
             <CardTitle className="text-lg text-slate-900 dark:text-white">Preferences</CardTitle>
           </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Use system preference or toggle manually</p>
              </div>
              <button
                onClick={() => {
                  const newValue = localStorage.getItem('darkMode') === 'true' ? 'false' : 'true';
                  localStorage.setItem('darkMode', newValue);
                  if (newValue === 'true') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }}
                className="w-12 h-6 rounded-full bg-slate-300 dark:bg-slate-600 relative transition-colors"
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${localStorage.getItem('darkMode') === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {notifSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">New Bill Notifications</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Send an email when a new bill is created</p>
                </div>
                <button
                  onClick={() => setNotifSettings(s => ({ ...s, bill_notification_enabled: !s.bill_notification_enabled }))}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notifSettings.bill_notification_enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${notifSettings.bill_notification_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {notifSettings.bill_notification_enabled && (
                <div className="space-y-1">
                  <Label className="text-slate-700 dark:text-slate-300">Notification Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={notifSettings.bill_notification_email || ''}
                    onChange={e => setNotifSettings(s => ({ ...s, bill_notification_email: e.target.value }))}
                    className="dark:bg-slate-950 dark:border-slate-700"
                  />
                </div>
              )}
              <Button onClick={handleSaveNotifications} disabled={notifSaving} className="w-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                <Save className="w-4 h-4 mr-2" />
                {notifSaved ? 'Saved!' : notifSaving ? 'Saving...' : 'Save Notifications'}
              </Button>
            </CardContent>
          </Card>
        )}

        <ServiceReminderSettings />

        <ServiceTypesEditor />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">App ID</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Use this ID when connecting external agents or integrations.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                {appId}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(appId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full justify-start gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This action cannot be undone. All your data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageTransition>
  );
}