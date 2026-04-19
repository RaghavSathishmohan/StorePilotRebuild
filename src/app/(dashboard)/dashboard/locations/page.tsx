import { getStores } from '@/app/actions/stores';
import { getLocations } from '@/app/actions/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Store, Phone, Mail } from 'lucide-react';

export default async function LocationsPage() {
  const stores = await getStores();

  // Get locations for all stores
  const storesWithLocations = await Promise.all(
    stores.map(async (store) => {
      const locations = await getLocations(store.id);
      return { ...store, locations };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground">
          Manage locations across all your stores
        </p>
      </div>

      {storesWithLocations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No stores</CardTitle>
            <CardDescription>
              Create a store first to add locations
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {storesWithLocations.map((store) => (
            <div key={store.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{store.name}</h2>
                <Badge variant="secondary">{store.locations.length} locations</Badge>
              </div>

              {store.locations.length === 0 ? (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-muted-foreground text-center">
                      No locations for this store
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {store.locations.map((location) => (
                    <Card key={location.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">{location.name}</CardTitle>
                        </div>
                        <CardDescription>
                          Code: {location.code}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {location.address_line_1 && (
                          <div>
                            <p className="text-sm">{location.address_line_1}</p>
                            {location.address_line_2 && (
                              <p className="text-sm">{location.address_line_2}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {[location.city, location.state, location.postal_code]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        )}

                        {location.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{location.phone}</span>
                          </div>
                        )}

                        {location.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{location.email}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
