import { getStores } from '@/app/actions/stores';
import { getStoreMembers, getPendingInvitations } from '@/app/actions/members';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, Clock, UserPlus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const stores = await getStores();

  // Get members and invitations for all stores
  const storesWithTeam = await Promise.all(
    stores.map(async (store: any) => {
      const members = await getStoreMembers(store.id);
      const invitations = await getPendingInvitations(store.id);
      const userRole = store.store_members?.[0]?.role || 'staff';
      return { ...store, members, invitations, userRole };
    })
  );

  // Calculate totals
  const totalMembers = storesWithTeam.reduce((acc, store) => acc + store.members.length, 0);
  const totalInvitations = storesWithTeam.reduce((acc, store) => acc + store.invitations.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members across all your stores
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            <Users className="mr-1 h-3 w-3" />
            {totalMembers} members
          </Badge>
          {totalInvitations > 0 && (
            <Badge variant="outline" className="text-sm">
              <Clock className="mr-1 h-3 w-3" />
              {totalInvitations} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInvitations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stores with Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{storesWithTeam.length}</div>
          </CardContent>
        </Card>
      </div>

      {storesWithTeam.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No stores</CardTitle>
            <CardDescription>
              Create a store first to add team members
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {storesWithTeam.map((store: any) => {
            const isAdmin = store.userRole === 'owner' || store.userRole === 'admin';
            const owner = store.members.find((m: any) => m.role === 'owner');

            return (
              <Card key={store.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle>{store.name}</CardTitle>
                    </div>
                    <Badge variant={store.userRole === 'owner' ? 'default' : 'secondary'}>
                      Your role: {store.userRole}
                    </Badge>
                  </div>
                  <CardDescription>
                    {store.members.length} members • {store.invitations.length} pending invitations
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Owner Info */}
                  {owner && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-yellow-200 text-yellow-800">
                          {owner.profiles?.full_name?.charAt(0) ||
                           owner.profiles?.email?.charAt(0) || 'O'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {owner.profiles?.full_name || owner.profiles?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">Store Owner</p>
                      </div>
                      <Badge variant="default" className="ml-auto">Owner</Badge>
                    </div>
                  )}

                  {/* Quick Member List */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Team Members</h3>
                    <div className="flex flex-wrap gap-2">
                      {store.members
                        .filter((m: any) => m.role !== 'owner')
                        .slice(0, 5)
                        .map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {member.profiles?.full_name?.charAt(0) ||
                               member.profiles?.email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.profiles?.full_name || member.profiles?.email}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                      {store.members.filter((m: any) => m.role !== 'owner').length > 5 && (
                        <div className="flex items-center px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground">
                          +{store.members.filter((m: any) => m.role !== 'owner').length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pending Invitations Preview */}
                  {store.invitations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Pending Invitations
                      </h3>
                      <div className="space-y-2">
                        {store.invitations.slice(0, 3).map((invitation: any) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-2 bg-yellow-50/50 rounded border border-yellow-100"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{invitation.email}</span>
                              <Badge variant="outline" className="text-xs">
                                {invitation.role}
                              </Badge>
                            </div>
                            <Clock className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/stores/${store.id}/members`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Manage Members
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link href={`/dashboard/stores/${store.id}/members`} className="flex-1">
                        <Button className="w-full">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invite Member
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
