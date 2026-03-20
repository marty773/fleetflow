import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings, LogOut, Trash2, Bell, Save, Copy, Check, Lock, KeyRound } from 'lucide-react';
import { appParams } from '@/lib/app-params';
import PageTransition from '@/components/PageTransition';
import ServiceTypesEditor from '@/components/settings/ServiceTypesEditor';
import ServiceReminderSettings from '@/components/settings/ServiceReminderSettings';
import DataExport from '@/components/settings/DataExport';

export default function SettingsPage() {
  const [user, setUser] = React.useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState({});
  const appId = appParams.appId;
  const apiBaseUrl = appParams.appBaseUrl || `https://api.base44.com/api/apps/${appId}`;
  const apiKey = appParams.appId;
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifSettings, setNotifSettings] = useState(null);
  const [notifSettingsId, setNotifSettingsId] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null); // { type: 'success'|'error', text }
  const navigate = useNavigate();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      console.log('[Settings] user object:', JSON.stringify(u));
      setUser(u);
    });
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

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMessage(null);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwMessage({ type: 'success', text: 'Password updated successfully!' });
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (e) {
      setPwMessage({ type: 'error', text: e.message || 'Incorrect current password.' });
    }
    setPwSaving(false);
  };

  const handleSetPasswordEmail = async () => {
    setPwSaving(true);
    setPwMessage(null);
    try {
      await base44.auth.resetPasswordRequest({ email: user.email });
      setPwMessage({ type: 'success', text: `Password setup email sent to ${user.email}. Check your inbox!` });
    } catch (e) {
      setPwMessage({ type: 'error', text: e.message || 'Failed to send email.' });
    }
    setPwSaving(false);
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

        {user && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                {user.has_password === false ? 'Set a Password' : 'Change Password'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.has_password === false ? (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your account uses Google sign-in and doesn't have a password yet. Click below to receive an email that lets you set one.
                  </p>
                  {pwMessage && (
                    <p className={`text-sm ${pwMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{pwMessage.text}</p>
                  )}
                  <Button onClick={handleSetPasswordEmail} disabled={pwSaving} className="w-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    {pwSaving ? 'Sending...' : 'Send Password Setup Email'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-slate-700 dark:text-slate-300">Current Password</Label>
                    <Input type="password" placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} className="dark:bg-slate-950 dark:border-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 dark:text-slate-300">New Password</Label>
                    <Input type="password" placeholder="••••••••" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} className="dark:bg-slate-950 dark:border-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <Input type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} className="dark:bg-slate-950 dark:border-slate-700" />
                  </div>
                  {pwMessage && (
                    <p className={`text-sm ${pwMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{pwMessage.text}</p>
                  )}
                  <Button onClick={handleChangePassword} disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm} className="w-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    {pwSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </>
              )}
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

        <DataExport />

        {user?.role === 'admin' && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                API Integration Credentials
                <span className="ml-auto text-xs font-normal bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">Admin Only</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Use these credentials in App 1 to connect to FleetFlow's API.</p>

              {[
                { label: 'FLEETFLOW_API_BASE_URL', value: apiBaseUrl, key: 'url' },
                { label: 'FLEETFLOW_APP_ID (API Key)', value: appId, key: 'key' },
              ].map(({ label, value, key }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 font-mono">{label}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded text-sm font-mono break-all">
                      {value}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(value);
                        setCopied(c => ({ ...c, [key]: true }));
                        setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
                      }}
                    >
                      {copied[key] ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">How to use in App 1:</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Set <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">FLEETFLOW_API_BASE_URL</code> and <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">FLEETFLOW_APP_ID</code> as secrets in App 1's dashboard. The App ID acts as the API key for identifying requests from App 1.</p>
              </div>
            </CardContent>
          </Card>
        )}

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