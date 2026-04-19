import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Store, Users, BarChart3, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-xl">StorePilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Manage your convenience stores
            <br />
            <span className="text-primary">all in one place</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            StorePilot is a modern SaaS platform for convenience store owners.
            Track inventory, manage multiple locations, and grow your business.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start free trial</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to run your stores
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Store Management</h3>
              <p className="text-muted-foreground">
                Manage one store or many. Keep track of all your locations from a single dashboard.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Invite your team with role-based access. Owners, admins, managers, and staff.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
              <p className="text-muted-foreground">
                Track sales, inventory, and performance metrics across all your stores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-4">
                Enterprise-grade security
              </h2>
              <p className="text-muted-foreground mb-6">
                Your data is protected with industry-standard encryption and security practices.
                Row-level security ensures your store data stays isolated.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>End-to-end encryption</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Role-based access control</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Regular security audits</span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="w-80 h-60 bg-muted rounded-lg flex items-center justify-center">
                <Shield className="w-20 h-20 text-primary/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">StorePilot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 StorePilot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
