'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { inviteMember, getStoreMembers, getPendingInvitations, cancelInvitation, removeMember, updateMemberRole } from '@/app/actions/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Mail, X, UserMinus, Shield, User, Clock, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  status: 'active' | 'pending';
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export default function StoreMembersPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Invite dialog state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [storeId]);

  async function loadData() {
    setLoading(true);
    const [membersData, invitationsData] = await Promise.all([
      getStoreMembers(storeId),
      getPendingInvitations(storeId),
    ]);

    // Find current user's role
    // Note: This assumes we have the current user's ID. In production, you'd pass this from the server
    const currentUser = membersData.find((m: Member) => m.user_id === 'current-user-id');
    if (currentUser) {
      setCurrentUserRole(currentUser.role);
    } else {
      // For now, assume admin if not found (in production, pass from server)
      setCurrentUserRole('admin');
    }

    setMembers(membersData);
    setInvitations(invitationsData);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsInviting(true);

    const result = await inviteMember(storeId, {
      email: inviteEmail,
      role: inviteRole as 'admin' | 'manager' | 'staff',
    });

    if (result.success) {
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success('Invitation sent successfully');
      }
      setInviteEmail('');
      setInviteDialogOpen(false);
      loadData();
    } else {
      toast.error(result.error);
    }

    setIsInviting(false);
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast.success('Invitation cancelled');
      loadData();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    const result = await removeMember(memberId);
    if (result.success) {
      toast.success('Member removed successfully');
      loadData();
    } else {
      toast.error(result.error);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    const result = await updateMemberRole(memberId, { role: newRole as 'admin' | 'manager' | 'staff' });
    if (result.success) {
      toast.success(`Role updated to ${newRole}`);
      loadData();
    } else {
      toast.error(result.error);
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'manager':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'manager':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canAssignAdmin = currentUserRole === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/stores/${storeId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to store
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage store access and permissions
          </p>
        </div>

        {canManageMembers && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to join your store
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {canAssignAdmin && (
                        <SelectItem value="admin">
                          Admin - Full access except ownership
                        </SelectItem>
                      )}
                      <SelectItem value="manager">
                        Manager - Can manage inventory and view reports
                      </SelectItem>
                      <SelectItem value="staff">
                        Staff - Can perform daily operations
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? 'Sending...' : 'Send invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-6">
        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {invitation.role}
                          </Badge>
                          <span>•</span>
                          <span>Expires {new Date(invitation.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {canManageMembers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Members */}
        <Card>
          <CardHeader>
            <CardTitle>Active Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} with store access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10">
                        {member.profiles?.full_name?.charAt(0) ||
                         member.profiles?.email?.charAt(0) ||
                         'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </div>

                    {/* Role Management Dropdown */}
                    {canManageMembers && member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canAssignAdmin && member.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'admin')}>
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'manager' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'manager')}>
                              Make Manager
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'staff' && (
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'staff')}>
                              Make Staff
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Definitions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Owner</span> - Full control including store deletion and owner transfer
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Admin</span> - Can manage settings, members (non-owner), and all data
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Manager</span> - Can manage inventory, products, and view reports
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium text-foreground">Staff</span> - Can perform daily operations like sales and check inventory
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
