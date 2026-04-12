import React, { useState } from 'react';
import { SelectItem } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, UserPlus, Settings2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import UserPermissionsEditor from '@/components/UserPermissionsEditor';
import { defaultPermissions } from '@/hooks/usePagePermissions.jsx';

export default function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitePermissions, setInvitePermissions] = useState(defaultPermissions());
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      if (inviteRole === 'user') {
        const existing = await base44.entities.UserPermissions.filter({ user_email: inviteEmail });
        if (existing.length > 0) {
          await base44.entities.UserPermissions.update(existing[0].id, { page_permissions: invitePermissions });
        } else {
          await base44.entities.UserPermissions.create({ user_email: inviteEmail, page_permissions: invitePermissions });
        }
      }
      setInviteEmail('');
      setInviteRole('user');
      setInvitePermissions(defaultPermissions());
      alert('User invited successfully!');
    } catch (error) {
      alert('Failed to invite user: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleEditPermissions = async (user) => {
    if (editingUserId?.startsWith(user.id)) {
      setEditingUserId(null);
      setEditingPermissions(null);
      return;
    }
    const records = await base44.entities.UserPermissions.filter({ user_email: user.email });
    setEditingPermissions(records.length > 0 ? (records[0].page_permissions || defaultPermissions()) : defaultPermissions());
    setEditingUserId(user.id + '|' + user.email);
  };

  const handleSavePermissions = async () => {
    const [, userEmail] = editingUserId.split('|');
    setSavingPermissions(true);
    const existing = await base44.entities.UserPermissions.filter({ user_email: userEmail });
    if (existing.length > 0) {
      await base44.entities.UserPermissions.update(existing[0].id, { page_permissions: editingPermissions });
    } else {
      await base44.entities.UserPermissions.create({ user_email: userEmail, page_permissions: editingPermissions });
    }
    setSavingPermissions(false);
    setEditingUserId(null);
    setEditingPermissions(null);
    alert('Permissions saved!');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 pt-14 lg:pt-0">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage user access and permissions</p>
          </div>

          {/* Invite New User */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <UserPlus className="w-5 h-5" />
                Invite New User
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
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
                    <div className="mt-2">
                    <ResponsiveSelect
                      value={inviteRole}
                      onValueChange={(v) => {
                        setInviteRole(v);
                        if (v !== 'user') setInvitePermissions(defaultPermissions());
                      }}
                      placeholder="Select role"
                    >
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </ResponsiveSelect>
                    </div>
                  </div>
                </div>

                {inviteRole === 'user' && (
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 block mb-2">Page Permissions</Label>
                    <UserPermissionsEditor permissions={invitePermissions} onChange={setInvitePermissions} />
                  </div>
                )}

                <Button
                  onClick={handleInviteUser}
                  disabled={inviting}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </Button>
              </div>
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
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{user.full_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                        {user.role === 'user' && (
                          <button
                            onClick={() => handleEditPermissions(user)}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                            title="Edit permissions"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {editingUserId?.startsWith(user.id) && editingPermissions && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Page Permissions for {user.full_name}</p>
                        <UserPermissionsEditor permissions={editingPermissions} onChange={setEditingPermissions} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSavePermissions} disabled={savingPermissions} className="bg-amber-500 hover:bg-amber-600">
                            {savingPermissions ? 'Saving...' : 'Save Permissions'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingUserId(null); setEditingPermissions(null); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}