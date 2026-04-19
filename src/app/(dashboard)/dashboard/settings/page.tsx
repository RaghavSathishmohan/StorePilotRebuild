import { getStores } from '@/app/actions/stores';
import { getStoreSettings } from '@/app/actions/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Store, Bell, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const stores = await getStores();

  // Get settings for first store as example
  const settings = stores.length > 0 ? await getStoreSettings(stores[0].id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and store settings
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </div>
            </div>
            <Badge>Coming soon</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Store Settings</CardTitle>
                <CardDescription>Configure store defaults</CardDescription>
              </div>
            </div>
            <Badge>Coming soon</Badge>
          </CardHeader>
          <CardContent>
            {settings && (
              <div className="space-y-4">
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
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure email and push notifications</CardDescription>
              </div>
            </div>
            <Badge>Coming soon</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Password and security settings</CardDescription>
              </div>
            </div>
            <Badge>Coming soon</Badge>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
