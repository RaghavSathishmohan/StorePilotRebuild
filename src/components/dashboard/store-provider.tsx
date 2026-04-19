'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { Database } from '@/lib/database.types';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  setSelectedStore: (store: Store) => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
  stores: Store[];
}

export function StoreProvider({ children, stores }: StoreProviderProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(
    stores[0] || null
  );
  const [isLoading] = useState(false);

  const handleSetSelectedStore = useCallback((store: Store) => {
    setSelectedStore(store);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        setSelectedStore: handleSetSelectedStore,
        isLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
