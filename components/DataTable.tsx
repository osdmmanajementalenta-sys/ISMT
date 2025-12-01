import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  ColumnOrderState,
} from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import Toast from './Toast'
import { getStoredUser } from '../lib/auth'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    type?: string
    isVisible?: boolean
    isEditable?: boolean
    isSticky?: boolean
    headerIndex?: number
    hasSubheader?: boolean
    originalHeader?: string
    isPrioritas?: boolean
  }
}

type MergeInfo = {
  startColumnIndex: number
  endColumnIndex: number
  startRowIndex: number
  endRowIndex: number
}

type Props = {
  headers: string[]
  subheaders?: string[]
  headerMerges?: MergeInfo[]
  rows: string[][]
  sheetName?: string
}

type RowData = Record<string, any>

type ColumnSetting = {
  col: string
  type: string
  show: string
  edit: string
  upload?: string
}

type DropdownOption = {
  [header: string]: string[]
}

export default function DataTable({ headers, subheaders, headerMerges, rows, sheetName }: Props) {
  const [data, setData] = useState<RowData[]>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [colSettings, setColSettings] = useState<ColumnSetting[]>([])
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption>({})
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null)
  const [filterPopup, setFilterPopup] = useState<{ columnId: string; position: { x: number; y: number } } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const filterPopupRef = useRef<HTMLDivElement>(null)
  const [uploadModal, setUploadModal] = useState<{ rowIndex: number; columnId: string; cellValue: string } | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [activeTab, setActiveTab] = useState<'upload' | 'files'>('files')
  const [filesList, setFilesList] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [previewModal, setPreviewModal] = useState<{ file: any; isLoading: boolean } | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // Get current user permissions - use state to avoid hydration mismatch
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null)
  const [canUploadFiles, setCanUploadFiles] = useState(false)
  const [canDeleteFiles, setCanDeleteFiles] = useState(false)

  useEffect(() => {
    const user = getStoredUser()
    setCurrentUser(user)
    setCanUploadFiles(user?.allowUploadFiles?.toLowerCase() === 'yes' || user?.allowUploadFiles?.toLowerCase() === 'y')
    setCanDeleteFiles(user?.allowDeleteFiles?.toLowerCase() === 'yes' || user?.allowDeleteFiles?.toLowerCase() === 'y')
  }, [])

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
//
  function formatDateDDMMMYYYY(dateStr: string): string {
    if (!dateStr) return ''
    try {
      let date: Date | null = null
      
      const ddmmmyyyyMatch = dateStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/)
      if (ddmmmyyyyMatch) return dateStr
      
      const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      
      if (!date) {
        const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (isoMatch) {
          const [, year, month, day] = isoMatch
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
      }
      
      if (!date) date = new Date(dateStr)
      if (!date || isNaN(date.getTime())) return dateStr
      
      const day = String(date.getDate()).padStart(2, '0')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      
      return `${day}-${month}-${year}`
    } catch (e) {
      return dateStr
    }
  }

  useEffect(() => {
    async function fetchSettings() {
      try {
        if (sheetName) {
          // Fetch colom_setting
          const resp = await fetch(`/api/sheet?sheet=colom_setting`)
          if (resp.ok) {
            const j = await resp.json()
            const cs: ColumnSetting[] = []
            const rrows = j.rows || []
            for (const r of rrows) {
              const col = (r[0] || '').toString().trim()
              const type = (r[1] || 'text').toString().trim().toLowerCase()
              const show = (r[2] || 'yes').toString().trim().toLowerCase()
              const edit = (r[3] || 'yes').toString().trim().toLowerCase()
              const upload = (r[4] || '').toString().trim().toLowerCase()
              if (col) cs.push({ col, type, show, edit, upload })
            }
            setColSettings(cs)
          }

          // Fetch list_dropdown
          const dropdownResp = await fetch(`/api/sheet?sheet=list_dropdown`)
          if (dropdownResp.ok) {
            const dropdownData = await dropdownResp.json()
            const dropdownHeaders = dropdownData.headers || []
            const dropdownRows = dropdownData.rows || []
            
            // Build dropdown options object
            const options: DropdownOption = {}
            dropdownHeaders.forEach((header: string, colIndex: number) => {
              const headerName = header.toString().trim()
              if (headerName) {
                // Collect all non-empty values from this column
                const values = dropdownRows
                  .map((row: string[]) => (row[colIndex] || '').toString().trim())
                  .filter((val: string) => val !== '')
                options[headerName] = values
              }
            })
            
            setDropdownOptions(options)
            console.log('Dropdown options loaded:', options)
          }
        }
      } catch (e) {
        console.warn('Failed to fetch settings', e)
      }
    }
    fetchSettings()
  }, [sheetName])

  useEffect(() => {
    const noColumnIndex = headers.findIndex(h => h.toString().trim().toUpperCase() === 'NO')
    
    const processedData = rows.map((r, idx) => {
      const obj: RowData = {}
      
      if (noColumnIndex !== -1 && r[noColumnIndex]) {
        obj.id = r[noColumnIndex]
      } else {
        obj.id = idx
      }
      obj._rowIndex = idx
      
      headers.forEach((h, i) => {
        obj[`col_${i}`] = r[i] ?? ''
      })
      
      return obj
    })
    
    setData(processedData)
  }, [headers, rows])

  const handleCellUpdate = async (rowIndex: number, columnId: string, value: string) => {
    const match = columnId.match(/^col_(\d+)$/)
    if (!match) return
    
    const colIndex = Number(match[1])
    const row = data.find(r => r._rowIndex === rowIndex)
    if (!row) return

    const oldValue = row[columnId]

    try {
      const resp = await fetch('/api/sheetUpdate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, rowIndex, colIndex, value }),
      })
      
      if (!resp.ok) {
        const j = await resp.json()
        alert(j.error || 'Update failed')
        return false
      }
      
      // Update local state
      setData(prev => prev.map(r => 
        r._rowIndex === rowIndex ? { ...r, [columnId]: value } : r
      ))

      // Check if this column has upload attribute
      const header = headers[colIndex]
      const setting = colSettings.find(c => c.col.toLowerCase() === header.toString().trim().toLowerCase())
      const hasUpload = setting && (setting.upload?.toLowerCase() === 'yes' || setting.upload?.toLowerCase() === 'y' || setting.upload?.toLowerCase() === 'true')
      
      // If column has upload and value changed, rename the folder
      if (hasUpload && oldValue && value && oldValue !== value) {
        console.log('Attempting to rename folder:', { oldValue, value, hasUpload })
        try {
          const renameResp = await fetch('/api/folderRename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              oldFolderName: oldValue, 
              newFolderName: value 
            }),
          })
          
          console.log('Rename response status:', renameResp.status)
          const renameResult = await renameResp.json()
          console.log('Rename result:', renameResult)
          
          if (renameResp.ok && renameResult.success) {
            setToast({ 
              message: `Cell updated and folder renamed from "${oldValue}" to "${value}"`, 
              type: 'success' 
            })
          } else {
            // Still show success for cell update but warn about folder rename
            console.error('Folder rename failed:', renameResult)
            setToast({ 
              message: `Cell updated successfully, but folder rename failed: ${renameResult.error || 'Unknown error'}`, 
              type: 'warning' 
            })
          }
        } catch (renameError) {
          console.error('Error renaming folder:', renameError)
          setToast({ 
            message: `Cell updated successfully, but folder rename failed`, 
            type: 'warning' 
          })
        }
      } else {
        console.log('Skipping folder rename:', { hasUpload, oldValue, value, valueChanged: oldValue !== value })
      }
      
      return true
    } catch (e: any) {
      alert(String(e))
      return false
    }
  }

  const getUniqueColumnValues = (columnId: string) => {
    const values = data.map(row => row[columnId]).filter(v => v !== null && v !== undefined && v !== '')
    return Array.from(new Set(values)).sort()
  }

  // File Management Functions
  const loadFiles = async (folderName: string) => {
    setLoadingFiles(true)
    try {
      const response = await fetch(`/api/fileList?folderName=${encodeURIComponent(folderName)}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setFilesList(result.data.files || [])
      } else {
        setFilesList([])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
      setFilesList([])
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0 || !uploadModal) return

    // Check upload permission
    if (!canUploadFiles) {
      setToast({ message: 'You do not have permission to upload files', type: 'error' })
      return
    }
    
    setUploading(true)
    const progressMap: { [key: string]: number } = {}
    uploadFiles.forEach(file => {
      progressMap[file.name] = 0
    })
    setUploadProgress(progressMap)

    let successCount = 0
    let errorCount = 0
    
    for (const file of uploadFiles) {
      try {
        // Update progress: converting to base64
        setUploadProgress(prev => ({ ...prev, [file.name]: 20 }))
        
        // Convert file to base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        
        const fileDataBase64 = await base64Promise
        
        // Update progress: uploading
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }))
        
        // Upload to API
        const response = await fetch('/api/fileUpload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderName: uploadModal.cellValue,
            fileName: file.name,
            fileData: fileDataBase64,
            mimeType: file.type
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
          successCount++
        } else {
          setUploadProgress(prev => ({ ...prev, [file.name]: -1 }))
          errorCount++
        }
      } catch (error: any) {
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }))
        errorCount++
      }
    }
    
    // Show summary toast
    if (errorCount === 0) {
      setToast({ 
        message: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`, 
        type: 'success' 
      })
    } else if (successCount === 0) {
      setToast({ 
        message: `All ${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`, 
        type: 'error' 
      })
    } else {
      setToast({ 
        message: `${successCount} succeeded, ${errorCount} failed`, 
        type: 'warning' 
      })
    }
    
    // Clear and reload after delay to show final progress
    setTimeout(() => {
      setUploadFiles([])
      setUploadProgress({})
      setActiveTab('files')
      loadFiles(uploadModal.cellValue)
    }, 1500)
    
    setUploading(false)
  }

  const handleFileDelete = async (fileId: string, fileName: string) => {
    // Check delete permission
    if (!canDeleteFiles) {
      setToast({ message: 'You do not have permission to delete files', type: 'error' })
      return
    }

    if (!confirm(`Delete file "${fileName}"?`)) return
    
    setDeletingFileId(fileId)
    try {
      const response = await fetch('/api/fileDelete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setToast({ message: 'File deleted successfully', type: 'success' })
        // Reload files list
        if (uploadModal) {
          await loadFiles(uploadModal.cellValue)
        }
      } else {
        setToast({ message: `Delete failed: ${result.message}`, type: 'error' })
      }
    } catch (error: any) {
      setToast({ message: `Delete error: ${error.message}`, type: 'error' })
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleFilePreview = (file: any) => {
    setPreviewModal({ file, isLoading: true })
    // Simulate loading time for iframe
    setTimeout(() => {
      setPreviewModal(prev => prev ? { ...prev, isLoading: false } : null)
    }, 500)
  }

  const getPreviewUrl = (file: any) => {
    // For Google Drive files, we can use the file ID to create an embed URL
    if (file.url && file.url.includes('drive.google.com')) {
      const fileId = file.url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
      if (fileId) {
        // Different URLs based on file type
        const mimeType = file.mimeType || ''
        if (mimeType.includes('image/')) {
          return `https://drive.google.com/uc?id=${fileId}`
        } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
          return `https://drive.google.com/file/d/${fileId}/preview`
        }
      }
    }
    return file.downloadUrl || file.url
  }

  // Load files when modal opens and tab is 'files'
  useEffect(() => {
    if (uploadModal && activeTab === 'files') {
      loadFiles(uploadModal.cellValue)
    }
  }, [uploadModal, activeTab])

  const handleFilterClick = (columnId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setFilterPopup({
      columnId,
      position: { x: rect.left, y: rect.bottom + 5 }
    })
    setSearchTerm('')
    setDateRangeStart('')
    setDateRangeEnd('')
  }

  const applyFilter = (columnId: string, filterType: 'empty' | 'notEmpty' | 'clear') => {
    if (filterType === 'clear') {
      setColumnFilters(prev => prev.filter(f => f.id !== columnId))
    } else if (filterType === 'empty') {
      setColumnFilters(prev => {
        const others = prev.filter(f => f.id !== columnId)
        return [...others, { id: columnId, value: '__EMPTY__' }]
      })
    } else if (filterType === 'notEmpty') {
      setColumnFilters(prev => {
        const others = prev.filter(f => f.id !== columnId)
        return [...others, { id: columnId, value: '__NOT_EMPTY__' }]
      })
    }
    setFilterPopup(null)
    setSearchTerm('')
  }

  const applyValueFilter = (columnId: string, values: string[]) => {
    if (values.length === 0) {
      setColumnFilters(prev => prev.filter(f => f.id !== columnId))
    } else {
      setColumnFilters(prev => {
        const others = prev.filter(f => f.id !== columnId)
        return [...others, { id: columnId, value: values }]
      })
    }
    setFilterPopup(null)
    setSearchTerm('')
  }

  const applyDateFilter = (columnId: string, filterType: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    let filterValue: any = null
    
    switch (filterType) {
      case 'today':
        filterValue = { type: 'date-range', start: now, end: now }
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        filterValue = { type: 'date-range', start: yesterday, end: yesterday }
        break
      case 'thisweek':
        const thisWeekStart = new Date(now)
        thisWeekStart.setDate(now.getDate() - now.getDay())
        const thisWeekEnd = new Date(thisWeekStart)
        thisWeekEnd.setDate(thisWeekStart.getDate() + 6)
        filterValue = { type: 'date-range', start: thisWeekStart, end: thisWeekEnd }
        break
      case 'lastweek':
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
        filterValue = { type: 'date-range', start: lastWeekStart, end: lastWeekEnd }
        break
      case 'thismonth':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        filterValue = { type: 'date-range', start: thisMonthStart, end: thisMonthEnd }
        break
      case 'lastmonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        filterValue = { type: 'date-range', start: lastMonthStart, end: lastMonthEnd }
        break
      case 'thisyear':
        const thisYearStart = new Date(now.getFullYear(), 0, 1)
        const thisYearEnd = new Date(now.getFullYear(), 11, 31)
        filterValue = { type: 'date-range', start: thisYearStart, end: thisYearEnd }
        break
      case 'lastyear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
        filterValue = { type: 'date-range', start: lastYearStart, end: lastYearEnd }
        break
    }
    
    if (filterValue) {
      setColumnFilters(prev => {
        const others = prev.filter(f => f.id !== columnId)
        return [...others, { id: columnId, value: filterValue }]
      })
      setFilterPopup(null)
    }
  }

  const applyDateRangeFilter = (columnId: string, startDate: string, endDate: string) => {
    if (!startDate || !endDate) return
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    setColumnFilters(prev => {
      const others = prev.filter(f => f.id !== columnId)
      return [...others, { id: columnId, value: { type: 'date-range', start, end } }]
    })
    setFilterPopup(null)
  }

  const customFilterFn = (row: any, columnId: string, filterValue: any) => {
    const cellValue = row.getValue(columnId)
    
    if (filterValue === '__EMPTY__') {
      return cellValue === null || cellValue === undefined || cellValue === ''
    }
    
    if (filterValue === '__NOT_EMPTY__') {
      return cellValue !== null && cellValue !== undefined && cellValue !== ''
    }
    
    // Date range filter
    if (filterValue && typeof filterValue === 'object' && filterValue.type === 'date-range') {
      if (!cellValue) return false
      
      try {
        // Parse cell value to date
        let cellDate: Date | null = null
        
        // Try DD-MMM-YYYY format
        const ddmmmyyyyMatch = String(cellValue).match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/)
        if (ddmmmyyyyMatch) {
          const [, day, monthStr, year] = ddmmmyyyyMatch
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
          const monthIndex = months.indexOf(monthStr.toLowerCase())
          if (monthIndex !== -1) {
            cellDate = new Date(parseInt(year), monthIndex, parseInt(day))
          }
        }
        
        // Try MM/DD/YYYY format
        if (!cellDate) {
          const mmddyyyyMatch = String(cellValue).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
          if (mmddyyyyMatch) {
            const [, month, day, year] = mmddyyyyMatch
            cellDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
        }
        
        // Try ISO format
        if (!cellDate) {
          cellDate = new Date(cellValue)
        }
        
        if (!cellDate || isNaN(cellDate.getTime())) return false
        
        cellDate.setHours(0, 0, 0, 0)
        const start = new Date(filterValue.start)
        const end = new Date(filterValue.end)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        
        return cellDate >= start && cellDate <= end
      } catch (e) {
        return false
      }
    }
    
    if (Array.isArray(filterValue)) {
      return filterValue.includes(cellValue)
    }
    
    return true
  }

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    return headers.map((h, i) => {
      // Check if this column has a subheader (not empty string)
      const subheaderText = subheaders && subheaders[i] ? subheaders[i].trim() : ''
      const hasSubheader = subheaderText !== ''
      
      // For columns with subheader, try to find setting by subheader name
      // For columns without subheader, use the original header name
      const columnNameForSetting = hasSubheader ? subheaderText : h.toString().trim()
      
      const setting = colSettings.find(c => c.col.toLowerCase() === columnNameForSetting.toLowerCase())
      
      const type = setting?.type || 'text'
      const show = (setting?.show ?? 'yes').toLowerCase()
      const edit = (setting?.edit ?? 'yes').toLowerCase()
      const upload = (setting?.upload ?? '').toLowerCase()
      const isVisible = show === 'yes' || show === 'y' || show === 'true' || show === 'sticky'
      const isSticky = show === 'sticky'
      const isEditable = (edit === 'yes' || edit === 'y' || edit === 'true') && type !== 'uuid'
      const hasUpload = upload === 'yes' || upload === 'y' || upload === 'true'
      
      // Check if this is PRIORITAS column (checkbox type)
      const isPrioritas = type === 'checkbox' || columnNameForSetting.toLowerCase() === 'prioritas'
      
      // Display text: if has subheader use it, otherwise use original header
      const displayHeader = hasSubheader ? subheaderText : h.toString()

      return {
        id: `col_${i}`,
        accessorKey: `col_${i}`,
        header: displayHeader,
        enableColumnFilter: true,
        enableSorting: true,
        filterFn: customFilterFn,
        meta: {
          type,
          isVisible,
          isEditable,
          isSticky,
          headerIndex: i,
          hasSubheader,
          originalHeader: h.toString(),
          subheaderText,
          isPrioritas,
        },
        cell: ({ row, column, getValue }) => {
          const cellValue = getValue() as string
          const isEditing = editingCell?.rowIndex === row.original._rowIndex && editingCell?.columnId === column.id
          
          if (isEditing) {
            // Check if this column has dropdown options
            // Try multiple ways to match: exact match, case-insensitive, or by original header
            let options: string[] | undefined = 
              dropdownOptions[columnNameForSetting] || 
              dropdownOptions[h.toString().trim()] ||
              dropdownOptions[displayHeader]
            
            // Try case-insensitive match if not found
            if (!options) {
              const dropdownKey = Object.keys(dropdownOptions).find(
                key => key.toLowerCase() === columnNameForSetting.toLowerCase()
              )
              if (dropdownKey) {
                options = dropdownOptions[dropdownKey]
              }
            }
            
            console.log('Editing cell:', { 
              columnNameForSetting, 
              displayHeader, 
              originalHeader: h.toString(),
              type,
              hasOptions: !!options,
              optionsCount: options?.length || 0,
              availableDropdowns: Object.keys(dropdownOptions)
            })
            
            if (type === 'dropdown' && options && options.length > 0) {
              // Render dropdown
              return (
                <select
                  defaultValue={cellValue}
                  autoFocus
                  className="w-full px-2 py-1 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-sm"
                  onBlur={async (e) => {
                    const newValue = e.target.value
                    if (newValue !== cellValue) {
                      await handleCellUpdate(row.original._rowIndex, column.id, newValue)
                    }
                    setEditingCell(null)
                  }}
                  onChange={async (e) => {
                    const newValue = e.target.value
                    if (newValue !== cellValue) {
                      await handleCellUpdate(row.original._rowIndex, column.id, newValue)
                    }
                    setEditingCell(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingCell(null)
                    }
                  }}
                >
                  <option value="">-- Select --</option>
                  {options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              )
            } else {
              // Render normal input
              return (
                <input
                  type={type === 'date' ? 'date' : type === 'time' ? 'time' : 'text'}
                  defaultValue={cellValue}
                  autoFocus
                  className="w-full px-2 py-1 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-sm"
                  onBlur={async (e) => {
                    const newValue = e.target.value
                    if (newValue !== cellValue) {
                      await handleCellUpdate(row.original._rowIndex, column.id, newValue)
                    }
                    setEditingCell(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                      setEditingCell(null)
                    }
                  }}
                />
              )
            }
          }

          const displayValue = type === 'date' ? formatDateDDMMMYYYY(cellValue) : cellValue

          // If this is a PRIORITAS/checkbox column
          if (isPrioritas) {
            const isChecked = cellValue === 'true' || cellValue === 'TRUE' || cellValue === 'yes' || cellValue === 'YES' || cellValue === 'y' || cellValue === '1' || cellValue === 'checked'
            return (
              <div className="px-2 py-1 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={async (e) => {
                    const newValue = e.target.checked ? 'TRUE' : 'FALSE'
                    await handleCellUpdate(row.original._rowIndex, column.id, newValue)
                  }}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  style={{ accentColor: '#424eed' }}
                  disabled={!isEditable}
                  title={isEditable ? 'Toggle priority' : 'Not editable'}
                />
              </div>
            )
          }

          // Jika kolom memiliki upload feature
          if (hasUpload && cellValue) {
            return (
              <div className="px-2 py-1 flex items-center gap-1.5">
                {/* Make text editable if isEditable is true */}
                <span 
                  className={`flex-1 truncate text-sm ${isEditable ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1' : ''}`}
                  onClick={() => {
                    if (isEditable) {
                      setEditingCell({ rowIndex: row.original._rowIndex, columnId: column.id })
                    }
                  }}
                  title={isEditable ? 'Click to edit' : ''}
                >
                  {displayValue}
                </span>
                {(canUploadFiles || canDeleteFiles) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadModal({
                      rowIndex: row.original._rowIndex,
                      columnId: column.id,
                      cellValue: displayValue
                    })
                  }}
                  className="flex-shrink-0 p-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                  title="Manage Files"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
              )}
            </div>
          )
        }          return (
            <div
              className={`px-2 py-1 ${isEditable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
              onClick={() => {
                if (isEditable) {
                  setEditingCell({ rowIndex: row.original._rowIndex, columnId: column.id })
                }
              }}
              title={isEditable ? 'Click to edit' : ''}
            >
              {displayValue || '\u00A0'}
            </div>
          )
        },
      } as ColumnDef<RowData>
    }).filter(col => col.meta?.isVisible !== false)
  }, [headers, subheaders, colSettings, editingCell, data])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setFilterPopup(null)
        setSearchTerm('')
      }
    }
    
    if (filterPopup) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterPopup])

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
      columnOrder,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  })

  const handleAddRow = async () => {
    try {
      if (!sheetName) return

      // Create an empty row with all empty values
      const finalValues: string[] = []
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i]
        const setting = colSettings.find(c => c.col.toLowerCase() === h.toString().trim().toLowerCase())
        const type = setting?.type || 'text'
        if (type === 'uuid') {
          finalValues.push(generateUUID())
        } else {
          finalValues.push('')
        }
      }

      const payload = { sheetName, values: finalValues }
      const res = await fetch('/api/sheetAppend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok) {
        setToast({ message: j.error || 'Failed to add row', type: 'error' })
        return
      }
      setToast({ message: 'Row added successfully', type: 'success' })
      window.location.reload()
    } catch (e: any) {
      setToast({ message: String(e), type: 'error' })
    }
  }

  const handleDeleteRows = async () => {
    if (selectedRows.size === 0) {
      setToast({ message: 'Pilih row yang ingin dihapus', type: 'warning' })
      return
    }

    if (!confirm(`Hapus ${selectedRows.size} row yang dipilih?`)) {
      return
    }

    setDeleting(true)
    try {
      // Calculate header offset: +1 for main header, +1 if has subheader
      const headerOffset = subheaders ? 2 : 1
      
      // Convert selected indices to actual sheet row numbers
      // Add 1 for 1-based indexing in Google Sheets, plus header offset
      const rowNumbers = Array.from(selectedRows).map(idx => idx + 1 + headerOffset)
      
      // Sort in descending order to delete from bottom to top (to avoid index shifting issues)
      rowNumbers.sort((a, b) => b - a)

      for (const rowNum of rowNumbers) {
        const res = await fetch('/api/sheetDelete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetName, rowIndex: rowNum }),
        })
        
        if (!res.ok) {
          const j = await res.json()
          setToast({ message: j.error || `Failed to delete row ${rowNum}`, type: 'error' })
          setDeleting(false)
          return
        }
      }

      setToast({ message: `${selectedRows.size} row berhasil dihapus`, type: 'success' })
      setSelectedRows(new Set())
      window.location.reload()
    } catch (e: any) {
      setToast({ message: String(e), type: 'error' })
      setDeleting(false)
    }
  }

  const toggleSelectRow = (rowIndex: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map((_, idx) => idx)))
    }
  }

  const exportToExcel = () => {
    // Prepare data for Excel
    const exportData = []
    
    // Add header row
    const headerRow: Record<string, any> = {}
    columns.forEach(col => {
      headerRow[col.id as string] = typeof col.header === 'string' ? col.header : col.id
    })
    exportData.push(headerRow)
    
    // Add data rows
    table.getRowModel().rows.forEach(row => {
      const rowData: Record<string, any> = {}
      columns.forEach(col => {
        rowData[col.id as string] = row.getValue(col.id as string) || ''
      })
      exportData.push(rowData)
    })
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true })
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1')
    
    // Save file
    XLSX.writeFile(wb, `${sheetName || 'export'}.xlsx`)
  }

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <button
          className="p-2 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          style={{ background: 'linear-gradient(to right, #424eed, #5b67f7)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #3a42d4, #4e5ade)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #424eed, #5b67f7)'}
          onClick={handleAddRow}
          title="Add Row"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {selectedRows.size > 0 && (
          <button
            className="p-2 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #b91c1c)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #ef4444, #dc2626)'}
            onClick={handleDeleteRows}
            disabled={deleting}
            title={`Delete ${selectedRows.size} selected row(s)`}
          >
            {deleting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
        <button
          className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-blue-50 transition-all text-gray-700"
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#424eed'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          onClick={() => window.location.reload()}
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-blue-50 transition-all text-gray-700"
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#424eed'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          onClick={exportToExcel}
          title="Export Excel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        {columnFilters.length > 0 && (
          <button
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md font-medium"
            onClick={() => {
              setColumnFilters([])
              setSearchTerm('')
              setDateRangeStart('')
              setDateRangeEnd('')
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Clear All Filters ({columnFilters.length})
          </button>
        )}
        <div className="text-sm text-gray-600 italic ml-auto">

        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-30 border-b border-gray-200">
              {/* Main Header Row */}
              {table.getHeaderGroups().map(headerGroup => {
                // Build merged headers structure based on Google Sheets merge info
                const mergedHeaders: Array<{
                  headerText: string
                  headers: any[]
                  startIndex: number
                  hasSubheader: boolean
                }> = []
                
                let skipUntilIndex = -1
                
                headerGroup.headers.forEach((header, idx) => {
                  if (idx < skipUntilIndex) {
                    // This column is part of a previous merge, skip it
                    return
                  }
                  
                  const headerIndex = header.column.columnDef.meta?.headerIndex ?? 0
                  const originalHeader = header.column.columnDef.meta?.originalHeader || ''
                  const subheaderText = subheaders?.[headerIndex]?.toString().trim() || ''
                  const hasSubheader = subheaderText !== ''
                  
                  // Check if this column is the start of a merge in row 0
                  const merge = headerMerges?.find(m => 
                    m.startColumnIndex === headerIndex && m.startRowIndex === 0
                  )
                  
                  if (merge) {
                    // This is a merged cell, collect all headers in the merge range
                    const mergedCols = []
                    let mergeHasAnySubheader = false
                    
                    for (let i = merge.startColumnIndex; i < merge.endColumnIndex; i++) {
                      const h = headerGroup.headers.find(h => (h.column.columnDef.meta?.headerIndex ?? 0) === i)
                      if (h) {
                        mergedCols.push(h)
                        // Check if any column in the merge has a subheader
                        const subhdr = subheaders?.[i]?.toString().trim() || ''
                        if (subhdr !== '') mergeHasAnySubheader = true
                      }
                    }
                    
                    mergedHeaders.push({
                      headerText: originalHeader,
                      headers: mergedCols,
                      startIndex: idx,
                      hasSubheader: mergeHasAnySubheader
                    })
                    
                    skipUntilIndex = idx + mergedCols.length
                  } else {
                    // Not merged
                    mergedHeaders.push({
                      headerText: originalHeader,
                      headers: [header],
                      startIndex: idx,
                      hasSubheader: hasSubheader
                    })
                  }
                })
                
                return (
                  <tr key={headerGroup.id}>
                    <th 
                      className="sticky left-0 z-40 bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm border border-gray-300 px-4 py-3.5"
                      rowSpan={subheaders ? 2 : 1}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.size === data.length && data.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        style={{ accentColor: '#424eed' }}
                        title="Select All"
                      />
                    </th>
                    {mergedHeaders.map((merged, mIdx) => {
                      const firstHeader = merged.headers[0]
                      const isSticky = firstHeader.column.columnDef.meta?.isSticky
                      const colspan = merged.headers.length
                      const isMultiCol = colspan > 1
                      
                      return (
                        <th
                          key={`merged_${mIdx}`}
                          className={`relative px-4 py-3.5 ${merged.hasSubheader ? 'text-center' : 'text-left'} text-xs font-semibold uppercase tracking-wider border border-gray-300 select-none ${
                            merged.hasSubheader 
                              ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800' 
                              : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700'
                          } ${
                            isSticky ? 'sticky left-0 z-40 shadow-sm' : ''
                          }`}
                          colSpan={colspan > 1 ? colspan : undefined}
                          rowSpan={!merged.hasSubheader && subheaders ? 2 : 1}
                        >
                          <div className={`flex items-center ${merged.hasSubheader ? 'justify-center' : 'justify-between'} gap-2`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`flex items-center gap-1 ${!merged.hasSubheader && firstHeader.column.getCanSort() ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                onClick={!merged.hasSubheader ? firstHeader.column.getToggleSortingHandler() : undefined}
                                title={!merged.hasSubheader && firstHeader.column.getCanSort() ? 'Click to sort' : ''}
                              >
                                <span className="truncate">{merged.headerText}</span>
                                {!merged.hasSubheader && firstHeader.column.getIsSorted() && (
                                  <span>
                                    {{
                                      asc: '🔼',
                                      desc: '🔽',
                                    }[firstHeader.column.getIsSorted() as string]}
                                  </span>
                                )}
                              </div>
                              {!merged.hasSubheader && firstHeader.column.getCanFilter() && !isMultiCol && (
                                <button
                                  onClick={(e) => handleFilterClick(firstHeader.column.id, e)}
                                  className={`p-1 rounded-md transition-all duration-200 ${
                                    firstHeader.column.getFilterValue() 
                                      ? 'bg-blue-50 text-blue-600' 
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'
                                  }`}
                                  title="Filter options"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                )
              })}
              
              {/* Subheader Row */}
              {subheaders && (
                <tr>
                  {table.getHeaderGroups()[0].headers.map(header => {
                    const hasFilter = header.column.getFilterValue()
                    const isSticky = header.column.columnDef.meta?.isSticky
                    const headerIndex = header.column.columnDef.meta?.headerIndex ?? 0
                    const originalHeader = header.column.columnDef.meta?.originalHeader || ''
                    const subheaderText = subheaders[headerIndex]?.toString().trim() || ''
                    
                    // Check if this column's parent header is merged
                    const merge = headerMerges?.find(m => 
                      headerIndex >= m.startColumnIndex && 
                      headerIndex < m.endColumnIndex && 
                      m.startRowIndex === 0
                    )
                    
                    // If parent is merged but no subheader, skip (already handled with rowSpan=2)
                    if (merge && subheaderText === '') return null
                    
                    // If no merge and no subheader, skip (already handled with rowSpan=2)
                    if (!merge && subheaderText === '') return null
                    
                    return (
                      <th
                        key={`sub_${header.id}`}
                        className={`relative px-4 py-2.5 text-left text-xs font-medium text-gray-600 tracking-wide border border-gray-300 bg-gray-50 select-none ${
                          isSticky ? 'sticky left-0 z-40 bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer hover:text-blue-600' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                              title={header.column.getCanSort() ? 'Click to sort' : ''}
                            >
                              <span className="truncate">{subheaderText}</span>
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                            {header.column.getCanFilter() && (
                              <button
                                onClick={(e) => handleFilterClick(header.column.id, e)}
                                className={`p-1 rounded-md transition-all duration-200 ${hasFilter ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'}`}
                                title="Filter options"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="sticky left-0 bg-white z-10 shadow-sm border border-gray-200 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.index)}
                        onChange={() => toggleSelectRow(row.index)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        style={{ accentColor: '#424eed' }}
                      />
                    </td>
                    {row.getVisibleCells().map(cell => {
                      const isSticky = cell.column.columnDef.meta?.isSticky
                      return (
                        <td 
                          key={cell.id} 
                          className={`text-sm text-gray-900 whitespace-nowrap border border-gray-200 ${
                            isSticky ? 'sticky left-0 bg-white z-10 shadow-sm' : ''
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3.5 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span>
              Page <span className="font-semibold text-gray-900">{table.getState().pagination.pageIndex + 1}</span> of{' '}
              <span className="font-semibold text-gray-900">{table.getPageCount()}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Total: <span className="font-semibold text-gray-900">{table.getFilteredRowModel().rows.length}</span> rows
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700 transition-all"
            >
              {[5, 10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
            
            <div className="flex gap-1">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-gray-700 bg-white font-medium"
                title="First page"
              >
                {'<<'}
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-gray-700 bg-white font-medium"
                title="Previous page"
              >
                {'<'}
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-gray-700 bg-white font-medium"
                title="Next page"
              >
                {'>'}
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-gray-700 bg-white font-medium"
                title="Last page"
              >
                {'>>'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Filter Popup Dialog */}
      {filterPopup && (() => {
        const currentColumnId = filterPopup!.columnId
        const currentPosition = filterPopup!.position
        const column = table.getColumn(currentColumnId)
        const columnType = column?.columnDef.meta?.type || 'text'
        const isDateColumn = columnType === 'date'

        return (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setFilterPopup(null)}
            />
            <div
              ref={filterPopupRef}
              className="fixed z-[9980] bg-white border border-gray-200 rounded-xl shadow-xl w-80"
              style={{
                top: `${currentPosition.y}px`,
                left: `${currentPosition.x}px`,
              }}
            >
              <div className="p-4">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800">Filter Options</h3>
                    <button
                      onClick={() => setFilterPopup(null)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {isDateColumn ? (
                    <>
                        {/* Date Quick Filters */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Quick Filters</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'today')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              Today
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'yesterday')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              Yesterday
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'thisweek')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              This Week
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'lastweek')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              Last Week
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'thismonth')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              This Month
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'lastmonth')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              Last Month
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'thisyear')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              This Year
                            </button>
                            <button
                              onClick={() => applyDateFilter(currentColumnId, 'lastyear')}
                              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all text-gray-700 bg-white font-medium"
                            >
                              Last Year
                            </button>
                          </div>
                        </div>

                        {/* Date Range Manual */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Custom Date Range</label>
                          <div className="space-y-2">
                            <input
                              type="date"
                              value={dateRangeStart}
                              onChange={(e) => setDateRangeStart(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                              placeholder="Start date"
                            />
                            <input
                              type="date"
                              value={dateRangeEnd}
                              onChange={(e) => setDateRangeEnd(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                              placeholder="End date"
                            />
                            <button
                              onClick={() => {
                                if (dateRangeStart && dateRangeEnd) {
                                  applyDateRangeFilter(currentColumnId, dateRangeStart, dateRangeEnd)
                                }
                              }}
                              disabled={!dateRangeStart || !dateRangeEnd}
                              className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md font-medium"
                            >
                              Apply Date Range
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Search Input */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && searchTerm.trim()) {
                                setColumnFilters(prev => {
                                  const others = prev.filter(f => f.id !== currentColumnId)
                                  return [...others, { id: currentColumnId, value: searchTerm }]
                                })
                                setFilterPopup(null)
                                setSearchTerm('')
                              }
                            }}
                            placeholder="Type to search..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (searchTerm.trim()) {
                                setColumnFilters(prev => {
                                  const others = prev.filter(f => f.id !== currentColumnId)
                                  return [...others, { id: currentColumnId, value: searchTerm }]
                                })
                                setFilterPopup(null)
                                setSearchTerm('')
                              }
                            }}
                            className="mt-2 w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                          >
                            Apply Search
                          </button>
                        </div>

                        {/* Unique Values List */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Select Values ({getUniqueColumnValues(currentColumnId).length} unique)
                          </label>
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                            {getUniqueColumnValues(currentColumnId).map((value, index) => (
                              <label
                                key={index}
                                className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 bg-white transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    const column = table.getColumn(currentColumnId)
                                    if (!column) return
                                    
                                    const currentFilter = column.getFilterValue() as string[] | undefined
                                    let newFilter: string[] = []
                                    
                                    if (e.target.checked) {
                                      newFilter = [...(currentFilter || []), value]
                                    } else {
                                      newFilter = (currentFilter || []).filter(v => v !== value)
                                    }
                                    
                                    applyValueFilter(currentColumnId, newFilter)
                                  }}
                                  checked={(table.getColumn(currentColumnId)?.getFilterValue() as string[] || []).includes(value)}
                                  className="mr-2 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 accent-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate flex-1">
                                  {value || <em className="text-gray-400">(empty)</em>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Empty/Not Empty Buttons - Always show */}
                    <div className="mb-4 space-y-2">
                      <button
                        onClick={() => applyFilter(currentColumnId, 'empty')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all text-left text-gray-700 bg-white font-medium"
                      >
                        Show Empty Cells
                      </button>
                      <button
                        onClick={() => applyFilter(currentColumnId, 'notEmpty')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all text-left text-gray-700 bg-white font-medium"
                      >
                        Show Non-Empty Cells
                      </button>
                    </div>

                    {/* Clear Filter Button */}
                    <button
                      onClick={() => {
                        const column = table.getColumn(currentColumnId)
                        if (column) {
                          column.setFilterValue(undefined)
                        }
                        setSearchTerm('')
                        setDateRangeStart('')
                        setDateRangeEnd('')
                        setFilterPopup(null)
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Clear This Filter
                    </button>
                </div>
              </div>
            </>
          )
        })()}

      {/* File Manager Modal */}
      {uploadModal && (
        <>
          <div 
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9990]"
            onClick={() => {
              setUploadModal(null)
              setUploadFiles([])
              setActiveTab('files')
              setUploadProgress({})
            }}
          />
          <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      File Manager
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{uploadModal.cellValue}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadModal(null)
                      setUploadFiles([])
                      setActiveTab('files')
                      setUploadProgress({})
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'files'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Files ({filesList.length})
                    </span>
                  </button>
                  {canUploadFiles && (
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'upload'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'files' ? (
                  /* Files List */
                  <div className="space-y-3">
                    {loadingFiles ? (
                      /* Loading state */
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Loading files...</p>
                      </div>
                    ) : filesList.length === 0 ? (
                      /* Empty state */
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">No files uploaded yet</p>
                        {canUploadFiles ? (
                          <>
                            <p className="text-gray-400 text-xs mb-4">Upload your first file to get started</p>
                            <button
                              onClick={() => setActiveTab('upload')}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
                            >
                              Upload File
                            </button>
                          </>
                        ) : (
                          <p className="text-gray-400 text-xs">You do not have permission to upload files</p>
                        )}
                      </div>
                    ) : (
                      /* Files list */
                      filesList.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <img src={file.iconUrl} alt="" className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB • {new Date(file.createdDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFilePreview(file)}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                              title="Preview"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Open in Drive"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            {canDeleteFiles && (
                              <button
                                onClick={() => handleFileDelete(file.id, file.name)}
                                disabled={deletingFileId === file.id}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                {deletingFileId === file.id ? (
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Upload Tab */
                  <div>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const filesArray = Array.from(e.target.files)
                            setUploadFiles(filesArray)
                          }
                        }}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {uploadFiles.length > 0 ? `${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''} selected` : 'Click to select files'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {uploadFiles.length > 0 ? 
                            `Total: ${(uploadFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB` : 
                            'or drag and drop (multiple files supported)'
                          }
                        </p>
                      </label>
                    </div>

                    {uploadFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadFiles.map((file, index) => {
                          const progress = uploadProgress[file.name] || 0
                          const hasError = progress === -1
                          const isComplete = progress === 100
                          
                          return (
                            <div key={index} className={`p-3 border rounded-lg ${
                              hasError ? 'bg-red-50 border-red-200' : 
                              isComplete ? 'bg-blue-50 border-blue-200' : 
                              'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  hasError ? 'bg-red-100' : 
                                  isComplete ? 'bg-blue-100' : 
                                  'bg-gray-100'
                                }`}>
                                  {hasError ? (
                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  ) : isComplete ? (
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${
                                    hasError ? 'text-red-800' : 
                                    isComplete ? 'text-blue-800' : 
                                    'text-gray-800'
                                  }`}>{file.name}</p>
                                  <p className={`text-xs ${
                                    hasError ? 'text-red-600' : 
                                    isComplete ? 'text-blue-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {(file.size / 1024).toFixed(2)} KB
                                    {hasError && ' • Failed'}
                                    {isComplete && ' • Uploaded'}
                                    {!hasError && !isComplete && progress > 0 && ` • ${progress}%`}
                                  </p>
                                </div>
                                {!uploading && (
                                  <button
                                    onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== index))}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      hasError ? 'text-red-600 hover:bg-red-100' : 
                                      'text-gray-600 hover:bg-gray-200'
                                    }`}
                                    title="Remove file"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              
                              {/* Progress Bar */}
                              {progress > 0 && progress < 100 && !hasError && (
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        
                        <button
                          onClick={handleFileUpload}
                          disabled={uploading || uploadFiles.length === 0}
                          className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                          {uploading ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''}...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Upload {uploadFiles.length} File{uploadFiles.length > 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* File Preview Modal */}
      {previewModal && (
        <>
          <div 
            className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-[9998]"
            onClick={() => setPreviewModal(null)}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col"
                 style={{ width: '95vw', height: '95vh' }}>
              {/* Preview Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <img src={previewModal.file.iconUrl} alt="" className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 truncate">{previewModal.file.name}</h2>
                      <p className="text-sm text-gray-600">
                        {(previewModal.file.size / 1024).toFixed(2)} KB • {new Date(previewModal.file.createdDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewModal.file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <a
                      href={previewModal.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Open in Drive"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      onClick={() => setPreviewModal(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-hidden relative">
                {previewModal.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="animate-spin w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm font-medium">Loading preview...</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    {(() => {
                      const mimeType = previewModal.file.mimeType || ''
                      const previewUrl = getPreviewUrl(previewModal.file)
                      
                      if (mimeType.includes('image/')) {
                        return (
                          <div className="flex items-center justify-center h-full p-6">
                            <img 
                              src={previewUrl}
                              alt={previewModal.file.name}
                              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const fallback = document.createElement('div')
                                fallback.className = 'flex items-center justify-center h-64 bg-gray-100 rounded-lg'
                                fallback.innerHTML = '<p class="text-gray-500">Preview not available</p>'
                                target.parentNode?.appendChild(fallback)
                              }}
                            />
                          </div>
                        )
                      } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
                        return (
                          <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title={`Preview of ${previewModal.file.name}`}
                            onError={() => {
                              setToast({ message: 'Preview not available for this file type', type: 'info' })
                            }}
                          />
                        )
                      } else if (mimeType.includes('text/')) {
                        return (
                          <div className="p-6 overflow-auto h-full">
                            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                              <p className="text-gray-600 mb-2">Text file preview:</p>
                              <div className="bg-white p-4 rounded border border-gray-200 max-h-96 overflow-auto">
                                <iframe
                                  src={previewUrl}
                                  className="w-full h-64 border-0"
                                  title={`Text preview of ${previewModal.file.name}`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full p-6">
                            <div className="text-center">
                              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <img src={previewModal.file.iconUrl} alt="" className="w-10 h-10" />
                              </div>
                              <p className="text-gray-700 font-medium mb-2">{previewModal.file.name}</p>
                              <p className="text-gray-500 text-sm mb-4">Preview not available for this file type</p>
                              <div className="flex gap-2 justify-center">
                                <a
                                  href={previewModal.file.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-[#424eed] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                >
                                  Download File
                                </a>
                                <a
                                  href={previewModal.file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-[#424eed] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                >
                                  Open in Drive
                                </a>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


