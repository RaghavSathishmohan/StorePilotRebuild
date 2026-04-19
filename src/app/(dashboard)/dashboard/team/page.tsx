import { getStores } from '@/app/actions/stores';
import { getStoreMembers, getPendingInvitations } from '@/app/actions/members';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Mail, Clock, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default async function TeamPage() {
  const stores = await getStores();

  // Get members and invitations for all stores
  const storesWithTeam = await Promise.all(
    stores.map(async (store) => {
      const members = await getStoreMembers(store.id);
      const invitations = await getPendingInvitations(store.id);
      const userRole = store.store_members?.[0]?.role || 'staff';
      return { ...store, members, invitations, userRole };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage team members across your stores
        </p>
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
          {storesWithTeam.map((store) => {
            const isAdmin = store.userRole === 'owner' || store.userRole === 'admin';

            return (
              <div key={store.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{store.name}</h2>
                  </div>

                  {isAdmin && (
                    <Link href={`/dashboard/stores/${store.id}/members`}>
                      <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite member
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Pending Invitations */}
                {store.invitations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Pending Invitations
                    </h3>
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {store.invitations.map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{invitation.email}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Invited as {invitation.role}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">Pending</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Team Members */}
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {store.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {(member.profiles?.full_name || member.profiles?.email || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.profiles?.full_name || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  {member.profiles?.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={member.role === 'owner' ? 'default' : 'secondary'}
                            >
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
