'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { inviteMember, getStoreMembers, getPendingInvitations, cancelInvitation, removeMember, updateMemberRole } from '@/app/actions/members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Mail, X, UserMinus, Shield } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// In a real app, this would use useEffect to fetch data
// For now, we'll use props passed from server component

export default function StoreMembersPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsInviting(true);

    const result = await inviteMember(storeId, {
      email: inviteEmail,
      role: inviteRole as 'admin' | 'manager' | 'staff',
    });

    if (result.success) {
      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteDialogOpen(false);
    } else {
      toast.error(result.error);
    }

    setIsInviting(false);
  }

  return (
    <div className="max-w-4xl">
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
            Manage members and invitations
          </p>
        </div>

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
                Send an invitation to join your store
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
                    <SelectItem value="admin">Admin - Can manage store settings and members</SelectItem>
                    <SelectItem value="manager">Manager - Can manage inventory and view reports</SelectItem>
                    <SelectItem value="staff">Staff - Can perform daily operations</SelectItem>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Management</CardTitle>
          <CardDescription>
            View and manage store members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            In the full implementation, this page would display current members,
            pending invitations, and allow role management and member removal.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">Full access to store settings and members</p>
              </div>
              <Badge>Owner</Badge>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <span className="font-medium">A</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Can manage settings and non-owner members</p>
              </div>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
