import { google } from 'googleapis'

type SheetResult = {
  headers: string[]
  rows: string[][]
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

  const headers = values[0] || []
  const rows = values.slice(1)

  return { headers, rows }
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

  const headerRowCount = 1
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

  const escapedTitle = sheetName.replace(/'/g, "''")
  const range = `'${escapedTitle}'!A1`

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values],
    },
  })
}
