import { getStores } from '@/app/actions/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Store, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function StoresPage() {
  const stores = await getStores();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground">
            Manage your convenience stores
          </p>
        </div>
        <Link href="/dashboard/stores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New store
          </Button>
        </Link>
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No stores yet</CardTitle>
            <CardDescription>
              Create your first store to get started with StorePilot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/stores/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create your first store
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Link key={store.id} href={`/dashboard/stores/${store.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{store.name}</CardTitle>
                        <CardDescription>/{store.slug}</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{store.store_locations?.count || 0} locations</span>
                  </div>
                  {store.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {store.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
