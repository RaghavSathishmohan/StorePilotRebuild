'use client'

import { useState } from 'react'
import { UnifiedImport } from '@/components/imports/unified-import'
import { ImportHistory } from '@/components/imports/import-history'
import { useStore } from '@/components/dashboard/store-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, History } from 'lucide-react'

export default function ImportsPage() {
  const { selectedStore } = useStore()
  const [activeTab, setActiveTab] = useState('import')

  if (!selectedStore) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
        <p className="text-muted-foreground mt-2">Please select a store first.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
        <p className="text-muted-foreground">
          Import your store data using the unified CSV format.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-6">
          <UnifiedImport storeId={selectedStore.id} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ImportHistory storeId={selectedStore.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
