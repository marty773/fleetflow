import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, UserPlus, ShieldCheck, Loader2, Settings2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import PagePermissionsEditor, { PermissionBadge } from '@/components/usermanagement/PagePermissionsEditor';
import { DEFAULT_PERMISSIONS } from '@/hooks/usePagePermissions';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [invitePermissions, setInvitePermissions] = useState({ ...DEFAULT_PERMISSIONS });
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { user, permissions, permRecordId }
  const [savingPerms, setSavingPerms] = useState(false);
  const [editPerms, setEditPerms] = useState({ ...DEFAULT_PERMISSIONS });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['allPagePermissions'],
    queryFn: () => base44.entities.UserPagePermissions.list(),
  });

  const getPermissionsForUser = (email) => allPermissions.find(p => p.user_email === email);

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);

      // Create permissions record immediately (before user even logs in)
      const existing = allPermissions.find(p => p.user_email === inviteEmail);
      if (existing) {
        await base44.entities.UserPagePermissions.update(existing.id, {
          ...( inviteRole === 'admin' ? DEFAULT_PERMISSIONS : invitePermissions ),
        });
      } else {
        await base44.entities.UserPagePermissions.create({
          user_email: inviteEmail,
          ...( inviteRole === 'admin' ? DEFAULT_PERMISSIONS : invitePermissions ),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['allPagePermissions'] });
      setInviteEmail('');
      setInviteRole('user');
      setInvitePermissions({ ...DEFAULT_PERMISSIONS });
      alert('User invited successfully! Permissions have been applied.');
    } catch (error) {
      alert('Failed to invite user: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const openEditPermissions = (user) => {
    const rec = getPermissionsForUser(user.email);
    setEditPerms(rec ? { ...DEFAULT_PERMISSIONS, ...rec } : { ...DEFAULT_PERMISSIONS });
    setEditingUser({ user, permRecordId: rec?.id });
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSavingPerms(true);
    if (editingUser.permRecordId) {
      await base44.entities.UserPagePermissions.update(editingUser.permRecordId, { ...editPerms });
    } else {
      await base44.entities.UserPagePermissions.create({
        user_email: editingUser.user.email,
        ...editPerms,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['allPagePermissions'] });
    queryClient.invalidateQueries({ queryKey: ['pagePermissions', editingUser.user.email] });
    setSavingPerms(false);
    setEditingUser(null);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 pt-14 lg:pt-0">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage user access and page permissions</p>
          </div>

          {/* Invite New User */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <UserPlus className="w-5 h-5" />
                Invite New User
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-2 select-text"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-slate-700 dark:text-slate-300">Role</Label>
                  <ResponsiveSelect
                    value={inviteRole}
                    onValueChange={(val) => {
                      setInviteRole(val);
                      if (val === 'admin') setInvitePermissions({ ...DEFAULT_PERMISSIONS });
                    }}
                    placeholder="Select role"
                    options={[
                      { value: 'user', label: 'User' },
                      { value: 'admin', label: 'Admin' }
                    ]}
                    className="mt-2"
                  />
                </div>
              </div>

              {inviteRole === 'user' && (
                <div>
                  <Label className="text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                    <Settings2 className="w-4 h-4" />
                    Page Permissions
                  </Label>
                  <PagePermissionsEditor
                    permissions={invitePermissions}
                    onChange={setInvitePermissions}
                  />
                </div>
              )}

              {inviteRole === 'admin' && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">Admins have full access to all pages.</p>
                </div>
              )}

              <Button
                onClick={handleInviteUser}
                disabled={inviting}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {inviting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Users */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5" />
                Existing Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {users.map(user => {
                  const rec = getPermissionsForUser(user.email);
                  return (
                    <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          {user.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditPermissions(user)}
                              className="gap-1.5"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Permissions
                            </Button>
                          )}
                        </div>
                      </div>
                      {user.role !== 'admin' && rec && (
                        <div className="mt-2">
                          <PermissionBadge permissions={rec} />
                        </div>
                      )}
                      {user.role !== 'admin' && !rec && (
                        <p className="mt-1.5 text-xs text-slate-400 italic">No permissions set — full access by default</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions — {editingUser?.user?.full_name || editingUser?.user?.email}</DialogTitle>
          </DialogHeader>
          <PagePermissionsEditor permissions={editPerms} onChange={setEditPerms} />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={savingPerms} className="flex-1 bg-amber-500 hover:bg-amber-600">
              {savingPerms ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}