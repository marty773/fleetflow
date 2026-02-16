import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveSelect from '@/components/ResponsiveSelect';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, UserPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import PageTransition from '@/components/PageTransition';

export default function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [inviting, setInviting] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: userAccess = [] } = useQuery({
    queryKey: ['userAccess'],
    queryFn: () => base44.entities.UserCompanyAccess.list(),
  });

  const companies = ["Fisher's Enterprise", "Pencroft Structures"];

  const deleteAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.UserCompanyAccess.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess'] });
    },
  });

  const createAccessMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCompanyAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess'] });
    },
  });

  const handleInviteUser = async () => {
    if (!inviteEmail || selectedCompanies.length === 0) {
      alert('Please enter an email and select at least one company');
      return;
    }

    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      
      // Create access records for each selected company
      for (const company of selectedCompanies) {
        await createAccessMutation.mutateAsync({
          user_email: inviteEmail,
          company_id: company,
        });
      }

      setInviteEmail('');
      setInviteRole('user');
      setSelectedCompanies([]);
      alert('User invited successfully!');
    } catch (error) {
      alert('Failed to invite user: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleToggleCompany = (company) => {
    setSelectedCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const getUserCompanies = (email) => {
    return userAccess.filter(a => a.user_email === email).map(a => a.company_id);
  };

  const handleAddCompanyAccess = async (userEmail, companyId) => {
    await createAccessMutation.mutateAsync({
      user_email: userEmail,
      company_id: companyId,
    });
  };

  const handleRemoveCompanyAccess = async (userEmail, companyId) => {
    const accessRecord = userAccess.find(
      a => a.user_email === userEmail && a.company_id === companyId
    );
    if (accessRecord) {
      await deleteAccessMutation.mutateAsync(accessRecord.id);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
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

              <div>
                <Label className="mb-3 block text-slate-700 dark:text-slate-300">Company Access</Label>
                <div className="space-y-2">
                  {companies.map(company => (
                    <div key={company} className="flex items-center space-x-2">
                      <Checkbox
                        id={`invite-${company}`}
                        checked={selectedCompanies.includes(company)}
                        onCheckedChange={() => handleToggleCompany(company)}
                      />
                      <label
                        htmlFor={`invite-${company}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100"
                      >
                        {company}
                      </label>
                    </div>
                  ))}
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
              {users.map(user => {
                const userCompanies = getUserCompanies(user.email);
                return (
                  <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{user.full_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">Company Access:</Label>
                      <div className="flex flex-wrap gap-2">
                        {companies.map(company => {
                          const hasAccess = userCompanies.includes(company);
                          return (
                            <div key={company} className="flex items-center space-x-1">
                              <Checkbox
                                id={`${user.email}-${company}`}
                                checked={hasAccess}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleAddCompanyAccess(user.email, company);
                                  } else {
                                    handleRemoveCompanyAccess(user.email, company);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`${user.email}-${company}`}
                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100"
                              >
                                {company}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageTransition>
  );
}