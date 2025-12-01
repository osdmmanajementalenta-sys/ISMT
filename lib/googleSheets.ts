import { google } from 'googleapis'

type MergeInfo = {
  startColumnIndex: number
  endColumnIndex: number
  startRowIndex: number
  endRowIndex: number
}

type SheetResult = {
  headers: string[]
  subheaders?: string[]
  rows: string[][]
  headerMerges?: MergeInfo[]
}

export async function getSheetData(sheetId: string, sheetName?: string): Promise<SheetResult> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google service account environment variables')
  }

  // prepare private key: handle quoted values and convert literal \n into newlines
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  privateKey = privateKey.trim()
  // Remove surrounding single or double quotes if present
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1)
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  const client = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    [
      'https://www.googleapis.com/auth/spreadsheets', // read/write
    ]
  )

  const sheets = google.sheets({ version: 'v4', auth: client })

  // Determine which sheet to read: use provided sheetName or fall back to the first sheet
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheetsMeta = meta?.data?.sheets || []

  let sheetTitle = sheetName
  if (!sheetTitle) {
    sheetTitle = sheetsMeta[0]?.properties?.title || 'Sheet1'
  }

  // find sheet properties to get rowCount and columnCount
  const targetSheet = sheetsMeta.find((s) => s.properties?.title === sheetTitle)
  const rowCount = targetSheet?.properties?.gridProperties?.rowCount || 1000
  const colCount = targetSheet?.properties?.gridProperties?.columnCount || 26

  // helper: convert column number to letter (1 -> A, 27 -> AA)
  function colToLetter(col: number) {
    let s = ''
    while (col > 0) {
      const m = (col - 1) % 26
      s = String.fromCharCode(65 + m) + s
      col = Math.floor((col - 1) / 26)
    }
    return s
  }

  const lastCol = colToLetter(colCount)

  // Quote sheet title per A1 notation rules (escape single quotes by doubling)
  const escapedTitle = sheetTitle.replace(/'/g, "''")
  const sheetRef = `'${escapedTitle}'`
  const a1Range = `${sheetRef}!A1:${lastCol}${rowCount}`

  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: a1Range })
  const values = resp.data.values || []

  // Get merge information from the sheet
  let headerMerges: MergeInfo[] = []
  if (targetSheet?.merges) {
    // Filter merges that are in the first row (row index 0)
    headerMerges = targetSheet.merges
      .filter((merge: any) => merge.startRowIndex === 0)
      .map((merge: any) => ({
        startColumnIndex: merge.startColumnIndex,
        endColumnIndex: merge.endColumnIndex,
        startRowIndex: merge.startRowIndex,
        endRowIndex: merge.endRowIndex,
      }))
  }

  const headers = values[0] || []
  let subheaders: string[] | undefined = undefined
  let dataStartIndex = 1

  // Detect if row 2 is a subheader row - for specific sheets
  const sheetsWithSubheaders = [
    'Pengusulan Administrator dan Pengawas',
    'Pengusulan Pelaksana Tugas/Harian',
    'Pelantikan',
    'Penugasan Luar Instansi',
    'Pengusulan JPT',
    'Data Rektor'
  ]
  
  // Only detect subheader if there are actual merge cells in row 0
  // This means the sheet has grouped headers
  if (sheetName && sheetsWithSubheaders.includes(sheetName) && values.length > 1 && headerMerges.length > 0) {
    const secondRow = values[1] || []
    
    // Check if row 2 has ANY text content (not just first cell)
    const row2HasContent = secondRow.some((cell: any) => {
      const text = (cell || '').toString().trim()
      return text !== '' && isNaN(Number(text))
    })
    
    // If row 2 has text content (and is not numbers), it's likely a subheader
    if (row2HasContent) {
      subheaders = secondRow.map((cell: any) => (cell || '').toString())
      dataStartIndex = 2
    }
  }

  const rows = values.slice(dataStartIndex)

  return { headers, subheaders, rows, headerMerges }
}

/**
 * Update a single cell in the sheet.
 * rowIndex is zero-based relative to the first data row (headers excluded)
 * colIndex is zero-based relative to headers
 */
export async function updateSheetCell(sheetId: string, sheetName: string, rowIndex: number, colIndex: number, value: string) {
  // prepare auth (reuse logic above)
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google service account environment variables')
  }

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  privateKey = privateKey.trim()
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1)
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  const client = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  )

  const sheets = google.sheets({ version: 'v4', auth: client })

  // get sheet metadata to compute A1 coordinate
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheetsMeta = meta?.data?.sheets || []
  const target = sheetsMeta.find((s) => s.properties?.title === sheetName)
  if (!target) throw new Error('Sheet not found')

  // Detect if sheet has subheader (same logic as getSheetData)
  let headerRowCount = 1
  
  // Sheets that are known to have subheaders
  const sheetsWithSubheaders = [
    'Pengusulan Administrator dan Pengawas',
    'Pengusulan Pelaksaka Tugas/Harian',
    'Pelantikan',
    'Penugasan Luar Instansi',
    'Pengusulan JPT',
    'Data Rektor'
  ]
  
  if (sheetsWithSubheaders.includes(sheetName)) {
    // Check if sheet has merged cells in row 0 (indicating subheaders)
    let hasSubheaders = false
    if (target?.merges) {
      hasSubheaders = target.merges.some((merge: any) => merge.startRowIndex === 0)
    }
    
    if (hasSubheaders) {
      // Check if row 2 exists and has text content
      const escapedTitle = sheetName.replace(/'/g, "''")
      const checkRange = `'${escapedTitle}'!A1:E3`
      const checkResp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: checkRange })
      const checkValues = checkResp.data.values || []
      
      if (checkValues.length > 1) {
        const secondRow = checkValues[1] || []
        
        const row2HasContent = secondRow.some((cell: any) => {
          const text = (cell || '').toString().trim()
          return text !== '' && isNaN(Number(text))
        })
        
        if (row2HasContent) {
          headerRowCount = 2 // Has subheader
        }
      }
    }
  }

  const startRow = headerRowCount + 1 + rowIndex // 1-based rows in sheets

  // helper: col index (0 -> A)
  function colToLetter(col: number) {
    let s = ''
    let n = col + 1
    while (n > 0) {
      const m = (n - 1) % 26
      s = String.fromCharCode(65 + m) + s
      n = Math.floor((n - 1) / 26)
    }
    return s
  }

  const colLetter = colToLetter(colIndex)
  const escapedTitle = sheetName.replace(/'/g, "''")
  const range = `'${escapedTitle}'!${colLetter}${startRow}`

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[value]],
    },
  })
}

export async function appendSheetRow(sheetId: string, sheetName: string, values: Array<string>) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google service account environment variables')
  }

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  privateKey = privateKey.trim()
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1)
  }
  privateKey = privateKey.replace(/\\n/g, '\n')

  const client = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  )

  const sheets = google.sheets({ version: 'v4', auth: client })

  // Get sheet metadata to detect subheaders
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheetsMeta = meta?.data?.sheets || []
  const targetSheet = sheetsMeta.find((s) => s.properties?.title === sheetName)
  
  // Check if sheet has merged cells in row 0 (indicating subheaders)
  let hasSubheaders = false
  if (targetSheet?.merges) {
    hasSubheaders = targetSheet.merges.some((merge: any) => merge.startRowIndex === 0)
  }

  // Sheets that are known to have subheaders
  const sheetsWithSubheaders = [
    'Pengusulan Administrator dan Pengawas',
    'Pengusulan Pelaksana Tugas/Harian',
    'Pelantikan',
    'Penugasan Luar Instansi',
    'Pengusulan JPT',
    'Data Rektor'
  ]

  // Determine starting row: if has subheaders, row 3 (index 2), otherwise row 2 (index 1)
  const insertRowIndex = (hasSubheaders && sheetsWithSubheaders.includes(sheetName)) ? 2 : 1
  
  const escapedTitle = sheetName.replace(/'/g, "''")
  
  // Get sheet ID for the target sheet
  const sheetIdNum = targetSheet?.properties?.sheetId
  if (sheetIdNum === undefined) {
    throw new Error(`Sheet ${sheetName} not found`)
  }

  // Insert a new row at the top (after headers)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetIdNum,
              dimension: 'ROWS',
              startIndex: insertRowIndex,
              endIndex: insertRowIndex + 1
            },
            inheritFromBefore: false
          }
        }
      ]
    }
  })

  // Write data to the newly inserted row
  const range = `'${escapedTitle}'!A${insertRowIndex + 1}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values]
    }
  })
}
