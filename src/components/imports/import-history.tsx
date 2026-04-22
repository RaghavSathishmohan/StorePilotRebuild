'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getImports, getImportDetails } from '@/app/actions/imports'
import { formatDistanceToNow } from 'date-fns'
import { FileUp, CheckCircle, AlertCircle, Clock, XCircle, Eye, Download } from 'lucide-react'

interface Import {
  id: string
  store_id: string
  import_type: string
  file_name: string
  file_size_bytes: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  mapping_accuracy: number
  created_at: string
  completed_at: string
  processing_time_ms: number
}

interface ImportRowDetail {
  row_number: number
  row_data: Record<string, unknown>
  status: string
  error_message: string
  error_field: string
}

export function ImportHistory({ storeId }: { storeId: string }) {
  const [imports, setImports] = useState<Import[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImport, setSelectedImport] = useState<Import | null>(null)
  const [importDetails, setImportDetails] = useState<{ import: Import; rowDetails: ImportRowDetail[] } | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    loadImports()
  }, [storeId])

  const loadImports = async () => {
    try {
      const data = await getImports(storeId)
      setImports(data)
    } catch (error) {
      console.error('Failed to load imports:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewDetails = async (importItem: Import) => {
    setSelectedImport(importItem)
    const details = await getImportDetails(importItem.id)
    if (details) {
      setImportDetails(details as { import: Import; rowDetails: ImportRowDetail[] })
      setShowDetailsDialog(true)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading import history...</p>
        </CardContent>
      </Card>
    )
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No imports yet</h3>
          <p className="text-muted-foreground">Import your first CSV file to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Mapping</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((importItem) => (
                <TableRow key={importItem.id}>
                  <TableCell>{getStatusIcon(importItem.status)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[150px]">{importItem.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(importItem.file_size_bytes || 0)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {importItem.import_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{importItem.successful_rows || 0}</span>
                      <span className="text-muted-foreground"> / {importItem.total_rows || 0}</span>
                      {importItem.failed_rows > 0 && (
                        <span className="text-red-600 ml-1">({importItem.failed_rows} failed)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {importItem.mapping_accuracy !== null && (
                      <Badge
                        variant={importItem.mapping_accuracy >= 80 ? 'default' : 'secondary'}
                        className={importItem.mapping_accuracy >= 80 ? 'bg-green-100 text-green-800' : ''}
                      >
                        {importItem.mapping_accuracy}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(importItem.processing_time_ms)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(importItem.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => viewDetails(importItem)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              {selectedImport?.file_name} - {getStatusBadge(selectedImport?.status || '')}
            </DialogDescription>
          </DialogHeader>

          {importDetails && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{importDetails.import.total_rows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{importDetails.import.successful_rows}</p>
                  <p className="text-xs text-green-700">Successful</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{importDetails.import.failed_rows}</p>
                  <p className="text-xs text-red-700">Failed</p>
                </div>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{formatDuration(importDetails.import.processing_time_ms)}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>

              {/* Errors */}
              {importDetails.rowDetails.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errors ({importDetails.rowDetails.length})
                  </h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importDetails.rowDetails.slice(0, 20).map((detail) => (
                          <TableRow key={detail.row_number}>
                            <TableCell>{detail.row_number}</TableCell>
                            <TableCell>{detail.error_field || 'general'}</TableCell>
                            <TableCell className="text-red-600 text-sm">{detail.error_message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importDetails.rowDetails.length > 20 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        ...and {importDetails.rowDetails.length - 20} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
