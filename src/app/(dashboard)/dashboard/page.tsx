import { getStores } from '@/app/actions/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, MapPin, Users, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const stores = await getStores();
  const storeCount = stores.length;
  const locationCount = stores.reduce((acc, store) => acc + (store.store_locations?.count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your stores.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeCount}</div>
            <p className="text-xs text-muted-foreground">
              Active stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locationCount}</div>
            <p className="text-xs text-muted-foreground">
              Across all stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Coming soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Analytics coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Stores</CardTitle>
            <CardDescription>
              Quick access to your stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <p className="text-muted-foreground">No stores yet.</p>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <a
                    key={store.id}
                    href={`/dashboard/stores/${store.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-sm text-muted-foreground">
                        /stores/{store.slug}
                      </p>
                    </div>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="/dashboard/stores/new"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <p className="font-medium">+ Create new store</p>
                <p className="text-sm text-muted-foreground">Add another store to your account</p>
              </a>
              <a
                href="/dashboard/locations"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <p className="font-medium">Manage locations</p>
                <p className="text-sm text-muted-foreground">Add or edit store locations</p>
              </a>
              <a
                href="/dashboard/team"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <p className="font-medium">Invite team members</p>
                <p className="text-sm text-muted-foreground">Add staff to your stores</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
