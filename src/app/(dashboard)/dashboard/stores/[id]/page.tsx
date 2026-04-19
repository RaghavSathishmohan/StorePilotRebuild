import { notFound } from 'next/navigation';
import { getStoreById, getLocations } from '@/app/actions/stores';
import { getStoreMembers } from '@/app/actions/members';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Users, Settings, Store, Plus } from 'lucide-react';
import Link from 'next/link';

interface StorePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StoreDetailPage({ params }: StorePageProps) {
  const { id } = await params;
  const store = await getStoreById(id);

  if (!store) {
    notFound();
  }

  const locations = await getLocations(id);
  const members = await getStoreMembers(id);

  const role = store.store_members?.[0]?.role || 'staff';
  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
            <Badge variant="secondary">{role}</Badge>
          </div>
          <p className="text-muted-foreground">
            /stores/{store.slug}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href={`/dashboard/stores/${id}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      {store.description && (
        <Card>
          <CardContent className="pt-6">
            <p>{store.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="locations">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Locations</h2>
            {isAdmin && (
              <Link href={`/dashboard/stores/${id}/locations/new`}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add location
                </Button>
              </Link>
            )}
          </div>

          {locations.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No locations</CardTitle>
                <CardDescription>
                  Add your first location to this store
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  <Link href={`/dashboard/stores/${id}/locations/new`}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add location
                    </Button>
                  </Link>
                ) : (
                  <p className="text-muted-foreground">
                    Ask an admin to add locations to this store.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((location) => (
                <Card key={location.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{location.name}</CardTitle>
                    </div>
                    <CardDescription>
                      Code: {location.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {location.address_line_1 && (
                      <p className="text-sm">{location.address_line_1}</p>
                    )}
                    {(location.city || location.state) && (
                      <p className="text-sm text-muted-foreground">
                        {[location.city, location.state, location.postal_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Team Members</h2>
            {isAdmin && (
              <Link href={`/dashboard/stores/${id}/members`}>
                <Button size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Manage team
                </Button>
              </Link>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4">
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
                          {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profiles?.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
