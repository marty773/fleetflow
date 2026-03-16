import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, UserPlus } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

export default function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

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
      setInviteEmail('');
      setInviteRole('user');
      alert('User invited successfully!');
    } catch (error) {
      alert('Failed to invite user: ' + error.message);
    } finally {
      setInviting(false);
    }
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
                    <ResponsiveSelect
                      value={inviteRole}
                      onValueChange={setInviteRole}
                      placeholder="Select role"
                      options={[
                        { value: 'user', label: 'User' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                      className="mt-2"
                    />
                  </div>
                </div>
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
                  <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{user.full_name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
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