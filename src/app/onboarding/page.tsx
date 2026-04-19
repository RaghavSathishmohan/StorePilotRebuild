'use client';

import { useState } from 'react';
import { createStore } from '@/app/actions/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, ArrowRight, Building2, CheckCircle } from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState<'welcome' | 'store' | 'success'>('welcome');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setStoreName(name);
    if (!storeSlug || storeSlug === generateSlug(storeName)) {
      setStoreSlug(generateSlug(name));
    }
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createStore({
      name: storeName,
      slug: storeSlug,
      description: storeDescription || undefined,
    });

    if (result.success) {
      setStep('success');
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Store className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to StorePilot!</CardTitle>
              <CardDescription className="text-base mt-2">
                Let's set up your first store to get started.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Create your store</p>
                  <p className="text-sm text-muted-foreground">
                    Set up your store name and basic information
                  </p>
                </div>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => setStep('store')}>
              Get started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">You're all set!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your store "{storeName}" has been created successfully.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your first store</CardTitle>
          <CardDescription>
            This will be your primary store. You can add more stores later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStore} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Store name</Label>
              <Input
                id="name"
                placeholder="My Convenience Store"
                value={storeName}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Store slug (URL identifier)</Label>
              <Input
                id="slug"
                placeholder="my-store"
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
              <p className="text-xs text-gray-500">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of your store"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating store...' : 'Create store'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
