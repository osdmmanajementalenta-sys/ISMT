import type { NextApiRequest, NextApiResponse } from 'next'
import { getSheetData } from '../../lib/googleSheets'
import { verifySessionToken } from '../../lib/session'

// Helper function to format date from various formats to DD-MMM-YYYY
function formatDateDDMMMYYYY(dateStr: string): string {
  if (!dateStr) return ''
  try {
    let date: Date | null = null
    
    // Check if already in DD-MMM-YYYY format
    const ddmmmyyyyMatch = dateStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/)
    if (ddmmmyyyyMatch) {
      return dateStr // Already in correct format
    }
    
    // Check if in MM/DD/YYYY format (from Google Sheets)
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    // Check if in YYYY-MM-DD format (ISO)
    if (!date) {
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (isoMatch) {
        const [, year, month, day] = isoMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
    }
    
    // Try general Date parsing as fallback
    if (!date) {
      date = new Date(dateStr)
    }
    
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.status(400).json({ error: 'GOOGLE_SHEET_ID not set' })

  const sheetName = typeof req.query.sheet === 'string' ? req.query.sheet : undefined

  // verify session
  const token = req.cookies?.osdm_session || req.headers.cookie?.split(';').find((c) => c.trim().startsWith('osdm_session='))?.split('=')[1]
  const payload = verifySessionToken(token)

  if (!payload) return res.status(401).json({ error: 'Not authenticated' })

  // if requesting a specific sheet, check permissions via page_setting
  try {
    if (sheetName) {
      // always allow access to the page_setting, colom_setting, and users sheets for landed users so the UI
      // (landing page / sidebar / DataTable) can render permission cards, column settings, and user management.
      // Restrict other sheets according to the table.
      if (sheetName === 'page_setting' || sheetName === 'colom_setting' || sheetName === 'users') {
        const data = await getSheetData(sheetId, sheetName)
        return res.status(200).json(data)
      }

      const settings = await getSheetData(sheetId, 'page_setting')
      const headers = settings.headers
      const rows = settings.rows
      const type = payload.type || ''
      // find row for this type
      const row = rows.find((r) => (r[0] || '').toString().toLowerCase() === type.toString().toLowerCase())
      if (row) {
        const idx = headers.findIndex((h) => h === sheetName)
        if (idx === -1) {
          // sheet not listed in permissions -> deny
          return res.status(403).json({ error: 'Access denied' })
        }
        const val = (row[idx] || '').toString().toLowerCase()
        const allowed = val === 'yes' || val === 'y' || val === 'true'
        if (!allowed) return res.status(403).json({ error: 'Access denied' })
      } else {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    const data = await getSheetData(sheetId, sheetName)
    
    // Clean up date columns based on colom_setting
    if (sheetName && sheetName !== 'page_setting' && sheetName !== 'colom_setting') {
      try {
        const colSettings = await getSheetData(sheetId, 'colom_setting')
        const dateColumns: number[] = []
        
        // Find which columns are date type
        for (const settingRow of colSettings.rows) {
          const colName = (settingRow[0] || '').toString().trim()
          const colType = (settingRow[1] || '').toString().trim().toLowerCase()
          
          if (colType === 'date') {
            // Find the index of this column in the actual data
            const colIndex = data.headers.findIndex(h => 
              h.toString().trim().toLowerCase() === colName.toLowerCase()
            )
            if (colIndex !== -1) {
              dateColumns.push(colIndex)
            }
          }
        }
        
        // Format all date columns in all rows
        if (dateColumns.length > 0) {
          data.rows = data.rows.map(row => {
            const newRow = [...row]
            for (const colIndex of dateColumns) {
              if (newRow[colIndex]) {
                newRow[colIndex] = formatDateDDMMMYYYY(newRow[colIndex].toString())
              }
            }
            return newRow
          })
        }
      } catch (e) {
        console.warn('Failed to format dates:', e)
        // Continue without formatting if colom_setting fetch fails
      }
    }
    
    return res.status(200).json(data)
  } catch (err: any) {
    console.error('sheet error', err)
    return res.status(500).json({ error: err.message || 'unknown' })
  }
}
