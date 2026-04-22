'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { FileUp, X, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File, content: string) => void
  accept?: string
  maxSize?: number // in MB
}

export function FileUpload({ onFileSelect, accept = '.csv', maxSize = 100 }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return 'Please upload a CSV file'
    }

    // Check file size
    const sizeInMB = file.size / (1024 * 1024)
    if (sizeInMB > maxSize) {
      return `File size exceeds ${maxSize}MB limit`
    }

    return null
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setUploadProgress(0)
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setIsProcessing(false)
      return
    }

    try {
      // Simulate progress for large files
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
      setSelectedFile(file)

      // Small delay to show completion
      setTimeout(() => {
        onFileSelect(file, content)
      }, 300)
    } catch (err) {
      setError('Failed to read file')
      setUploadProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      processFile(files[0])
    }
  }, [onFileSelect])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setError(null)
  }

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-colors',
        dragActive && 'border-primary bg-primary/5',
        selectedFile && 'border-green-300 bg-green-50',
        error && 'border-red-300 bg-red-50'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent className="p-8 text-center">
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearFile}>
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-red-600">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Try Again
            </Button>
          </div>
        ) : isProcessing ? (
          <div className="space-y-4">
            <Upload className="h-8 w-8 text-primary mx-auto animate-bounce" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Processing file...</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FileUp className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">Drag & drop your CSV file</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Maximum file size: {maxSize}MB</p>
            </div>
            <Input
              type="file"
              accept={accept}
              onChange={handleFileInput}
              className="hidden"
              id="csv-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="csv-upload">Select File</label>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
