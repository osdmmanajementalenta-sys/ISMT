import type { NextApiRequest, NextApiResponse } from 'next'
import { getSheetData } from '../../lib/googleSheets'
import { verifySessionToken } from '../../lib/session'

const CATEGORIES = [
  { name: 'Pengusulan Pelaksana Tugas/Harian', sheetName: 'Pengusulan Pelaksana Tugas/Harian', namaField: 'NAMA', skField: 'NO. SURAT PLT/PLH', dateFields: ['TGL. SURAT USUL', 'TGL. SURAT PLT/PLH'] },
  { name: 'Pengusulan Administrator & Pengawas', sheetName: 'Pengusulan Administrator dan Pengawas', namaField: 'NAMA', skField: 'NO. SK', dateFields: ['TGL. SURAT USUL', 'TGL. SK'] },
  { name: 'Pelantikan', sheetName: 'Pelantikan', namaField: 'NAMA', skField: 'NO. SK', dateFields: ['TGL. SK'] },
  { name: 'Penugasan Luar Instansi', sheetName: 'Penugasan Luar Instansi', namaField: 'NAMA', skField: 'NO. SK PENUGASAN', dateFields: ['TGL. SURAT', 'TGL. SK PENUGASAN'] },
  { name: 'Pengusulan JPT', sheetName: 'Pengusulan JPT', namaField: 'NAMA', skField: 'NO. SK', dateFields: ['TGL. SURAT USUL', 'TGL. SK'] }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.status(400).json({ error: 'GOOGLE_SHEET_ID not set' })

  // Verify session
  const token = req.cookies?.osdm_session || req.headers.cookie?.split(';').find((c) => c.trim().startsWith('osdm_session='))?.split('=')[1]
  const payload = verifySessionToken(token)

  if (!payload) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const result: any = {}

    // Fetch all sheets in parallel (more efficient than sequential)
    const fetchPromises = CATEGORIES.map(async (category) => {
      try {
        const data = await getSheetData(sheetId, category.sheetName)
        const headers = data.headers || []
        const subheaders = data.subheaders || []
        const rows = data.rows || []

        // Debug log - tampilkan SEMUA header dan subheader
        console.log(`\n🔍 ${category.name}:`)
        console.log('  📋 Headers:', headers)
        console.log('  📋 Subheaders:', subheaders)
        console.log('  📋 Has subheaders?', subheaders.length > 0)

        // Use subheaders if available
        const headersToSearch = subheaders.length > 0 ? subheaders : headers
        console.log('  🔎 Will search in:', subheaders.length > 0 ? 'SUBHEADERS' : 'HEADERS')

        // Search NAMA in headers (biasanya di row 1)
        let namaIndex = headers.findIndex((h: string) => h && h.toUpperCase().includes(category.namaField.toUpperCase()))
        
        // Search SK in subheaders first (jika ada), lalu headers
        let skIndex = -1
        if (subheaders.length > 0) {
          skIndex = subheaders.findIndex((h: string) => {
            if (!h) return false
            const headerNormalized = h.toUpperCase().replace(/[\s.]/g, '')
            const skFieldNormalized = category.skField.toUpperCase().replace(/[\s.]/g, '')
            return headerNormalized.includes(skFieldNormalized)
          })
        }
        
        // Jika tidak ketemu di subheader, cari di header
        if (skIndex === -1) {
          skIndex = headers.findIndex((h: string) => {
            if (!h) return false
            const headerNormalized = h.toUpperCase().replace(/[\s.]/g, '')
            const skFieldNormalized = category.skField.toUpperCase().replace(/[\s.]/g, '')
            return headerNormalized.includes(skFieldNormalized)
          })
        }

        // Debug log
        console.log('  🔍 Looking for NAMA field:', category.namaField)
        console.log('     → Found at index:', namaIndex, 'in HEADERS')
        if (namaIndex !== -1) console.log('     → Column name:', headers[namaIndex])
        
        console.log('  🔍 Looking for SK field:', category.skField)
        console.log('     → Found at index:', skIndex, 'in', skIndex !== -1 && subheaders.length > 0 && subheaders[skIndex] ? 'SUBHEADERS' : 'HEADERS')
        if (skIndex !== -1) {
          const foundIn = subheaders.length > 0 && subheaders[skIndex] ? subheaders : headers
          console.log('     → Column name:', foundIn[skIndex])
        }
        
        console.log('  📊 Total rows:', rows.length)

        // Calculate statistics
        const usulanMasuk = rows.filter((row: string[]) => namaIndex !== -1 && row[namaIndex] && row[namaIndex].toString().trim() !== '').length
        const skKeluar = rows.filter((row: string[]) => namaIndex !== -1 && row[namaIndex] && row[namaIndex].toString().trim() !== '' && skIndex !== -1 && row[skIndex] && row[skIndex].toString().trim() !== '').length

        console.log('  - Usulan Masuk:', usulanMasuk)
        console.log('  - SK Keluar:', skKeluar)

        // Get details
        const details = rows
          .filter((row: string[]) => namaIndex !== -1 && row[namaIndex] && row[namaIndex].toString().trim() !== '')
          .map((row: string[]) => {
            const detail: any = { 
              nama: namaIndex !== -1 ? row[namaIndex] : '', 
              sk: skIndex !== -1 ? row[skIndex] : '' 
            }
            // Add date fields
            category.dateFields.forEach((dateField: string) => {
              const idx = headersToSearch.findIndex((h: string) => h && h.toUpperCase() === dateField.toUpperCase())
              if (idx !== -1) {
                detail[dateField] = row[idx] || ''
              }
            })
            return detail
          })

        result[category.name] = {
          usulanMasuk,
          skKeluar,
          details
        }
      } catch (err) {
        console.error(`Error fetching ${category.name}:`, err)
        result[category.name] = {
          usulanMasuk: 0,
          skKeluar: 0,
          details: []
        }
      }
    })

    await Promise.all(fetchPromises)

    return res.status(200).json(result)
  } catch (err: any) {
    console.error('Dashboard API error:', err)
    return res.status(500).json({ error: err.message || 'unknown', details: err.toString() })
  }
}
