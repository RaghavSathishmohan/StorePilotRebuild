'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Store,
  MapPin,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Upload,
  Package,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';

interface DashboardShellProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stores', href: '/dashboard/stores', icon: Store },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Data Import', href: '/dashboard/imports', icon: Upload },
  { name: 'Command Center', href: '/dashboard/os', icon: Terminal },
];

export function DashboardShell({ children }: DashboardShellProps) {
  const { stores, selectedStore, setSelectedStore } = useStore();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div
          className="fixed inset-0 bg-gray-900/80"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-white border-r">
          <div className="flex h-16 items-center px-6 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">StorePilot</span>
            </Link>
          </div>

          <div className="py-4 px-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-600"
              onClick={() => signOut()}
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">StorePilot</span>
          </Link>
        </div>

        <div className="flex-1 py-4 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-600"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-x-4">
            {/* Store selector */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border"
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
              >
                <Store className="h-4 w-4" />
                <span className="max-w-[150px] truncate">
                  {selectedStore?.name || 'Select store'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {storeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500">
                      Your stores
                    </p>
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm hover:bg-gray-100',
                          selectedStore?.id === store.id ? 'bg-gray-50' : ''
                        )}
                        onClick={() => {
                          setSelectedStore(store);
                          setStoreDropdownOpen(false);
                        }}
                      >
                        {store.name}
                      </button>
                    ))}
                    <div className="border-t my-1"></div>
                    <Link
                      href="/dashboard/stores/new"
                      className="block px-4 py-2 text-sm text-primary hover:bg-gray-100"
                      onClick={() => setStoreDropdownOpen(false)}
                    >
                      + Create new store
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
