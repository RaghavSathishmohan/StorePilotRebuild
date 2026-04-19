import { notFound } from 'next/navigation';
import { getStoreById, getStoreSettings } from '@/app/actions/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Store } from 'lucide-react';
import Link from 'next/link';

interface StoreSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StoreSettingsPage({ params }: StoreSettingsPageProps) {
  const { id } = await params;
  const store = await getStoreById(id);

  if (!store) {
    notFound();
  }

  const settings = await getStoreSettings(id);
  const role = store.store_members?.[0]?.role || 'staff';
  const isAdmin = role === 'owner' || role === 'admin';

  if (!isAdmin) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only owners and admins can access store settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/stores/${id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to store
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
            <Badge variant="secondary">{role}</Badge>
          </div>
          <p className="text-muted-foreground">
            Manage {store.name} settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Basic store information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Store Name</p>
                <p className="text-sm text-muted-foreground">{store.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Store Slug</p>
                <p className="text-sm text-muted-foreground">/{store.slug}</p>
              </div>
            </div>

            {store.description && (
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{store.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {settings && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Configuration</CardTitle>
              </div>
              <CardDescription>
                Store configuration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Currency</p>
                  <p className="text-sm text-muted-foreground">{settings.currency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">{settings.timezone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Date Format</p>
                  <p className="text-sm text-muted-foreground">{settings.date_format}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Low Stock Threshold</p>
                  <p className="text-sm text-muted-foreground">{settings.low_stock_threshold} items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Destructive actions for this store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Store deletion and other destructive actions would appear here.
              Only the store owner can delete a store.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
