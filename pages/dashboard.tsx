import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { requireAuth } from '../lib/auth'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface CategoryConfig {
  name: string
  sheetName: string
  namaField: string
  skField: string
  color: string
  dateFields: string[]
}

const CATEGORIES: CategoryConfig[] = [
  { name: 'Pengusulan Pelaksana Tugas/Harian', sheetName: 'Pengusulan Pelaksana Tugas/Harian', namaField: 'NAMA', skField: 'NO. SURAT PLT/PLH', color: '#FF6384', dateFields: ['TGL. SURAT USUL', 'TGL. SURAT PLT/PLH'] },
  { name: 'Pengusulan Administrator & Pengawas', sheetName: 'Pengusulan Administrator dan Pengawas', namaField: 'NAMA', skField: 'NO. SK', color: '#36A2EB', dateFields: ['TGL. SURAT USUL', 'TGL. SK'] },
  { name: 'Pelantikan', sheetName: 'Pelantikan', namaField: 'NAMA', skField: 'NO. SK', color: '#FFCE56', dateFields: ['TGL. SK'] },
  { name: 'Penugasan Luar Instansi', sheetName: 'Penugasan Luar Instansi', namaField: 'NAMA', skField: 'NO. SK PENUGASAN', color: '#4BC0C0', dateFields: ['TGL. SURAT', 'TGL. SK PENUGASAN'] },
  { name: 'Pengusulan JPT', sheetName: 'Pengusulan JPT', namaField: 'NAMA', skField: 'NO. SK', color: '#9966FF', dateFields: ['TGL. SURAT USUL', 'TGL. SK'] }
]

interface CategoryData {
  usulanMasuk: number
  skKeluar: number
  details: Array<{ nama: string; sk: string; [key: string]: any }>
}

function Dashboard() {
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0].name)
  const [categoryData, setCategoryData] = useState<Record<string, CategoryData>>({})
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [quotaError, setQuotaError] = useState(false)

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null
    const ddmmmyyyyMatch = dateStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/)
    if (ddmmmyyyyMatch) {
      const [, day, monthStr, year] = ddmmmyyyyMatch
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      const monthIndex = months.indexOf(monthStr.toLowerCase())
      if (monthIndex !== -1) return new Date(parseInt(year), monthIndex, parseInt(day))
    }
    return new Date(dateStr)
  }

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true)
      setQuotaError(false)

      // Try to load from localStorage first
      const cacheKey = 'dashboard_cache'
      const cacheTimeKey = 'dashboard_cache_time'
      
      // Clear cache untuk testing (hapus setelah debug selesai)
      localStorage.removeItem(cacheKey)
      localStorage.removeItem(cacheTimeKey)
      
      const cached = localStorage.getItem(cacheKey)
      const cacheTime = localStorage.getItem(cacheTimeKey)
      
      // Use cache if less than 5 minutes old
      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
        console.log('📦 Loading from cache...')
        setCategoryData(JSON.parse(cached))
        setLoading(false)
        return
      }

      try {
        // Single API call untuk semua kategori (lebih efisien!)
        const resp = await fetch('/api/dashboard')
        
        if (resp.ok) {
          const data = await resp.json()
          console.log('✅ Dashboard data loaded:', Object.keys(data))
          
          // Debug: tampilkan detail setiap kategori dari API
          for (const categoryName in data) {
            const catData = data[categoryName]
            console.log(`📦 API Response for ${categoryName}:`, {
              usulanMasuk: catData.usulanMasuk,
              skKeluar: catData.skKeluar,
              detailsCount: catData.details?.length || 0
            })
          }
          
          console.log('📊 Full data:', data)
          
          // Apply date filter on client side
          const filteredData: Record<string, CategoryData> = {}
          
          for (const categoryName in data) {
            const categoryData = data[categoryName]
            const category = CATEGORIES.find(c => c.name === categoryName)
            
            if (!category) continue
            
            let details = categoryData.details || []
            
            // Filter by date if needed
            if (dateStart || dateEnd) {
              const start = dateStart ? new Date(dateStart) : null
              const end = dateEnd ? new Date(dateEnd) : null
              
              details = details.filter((detail: any) => {
                // Gunakan kolom tanggal PERTAMA sebagai acuan filter
                const primaryDateField = category.dateFields[0]
                const dateStr = detail[primaryDateField]
                
                // Jika tidak ada tanggal, jangan tampilkan saat filter aktif
                if (!dateStr || dateStr.trim() === '') {
                  return false
                }
                
                const cellDate = parseDate(dateStr)
                if (!cellDate) return false
                
                // Cek apakah dalam rentang
                if (start && cellDate < start) return false
                if (end && cellDate > end) return false
                
                return true // Dalam rentang
              })
            }
            
            // Recalculate counts based on filtered details
            const usulanMasuk = details.length
            const skKeluar = details.filter((d: any) => d.sk && d.sk.trim() !== '').length
            
            filteredData[categoryName] = {
              usulanMasuk,
              skKeluar,
              details
            }
            
            console.log(`📋 ${categoryName}:`, { usulanMasuk, skKeluar, detailsCount: details.length })
          }
          
          setCategoryData(filteredData)
          
          // Save to localStorage
          localStorage.setItem('dashboard_cache', JSON.stringify(data))
          localStorage.setItem('dashboard_cache_time', Date.now().toString())
          console.log('💾 Saved to cache')
        } else {
          const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Failed to fetch dashboard:', resp.status, errorData)
          
          if (errorData.error && errorData.error.includes('Quota exceeded')) {
            setQuotaError(true)
            
            // Auto retry
            if (retryCount < 3) {
              console.log(`Quota exceeded. Will retry in 10 seconds... (attempt ${retryCount + 1}/3)`)
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
              }, 10000)
            }
          }
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      }
      
      setLoading(false)
    }

    fetchAllData()
  }, [dateStart, dateEnd, retryCount])

  const pieData = {
    labels: CATEGORIES.map(c => c.name),
    datasets: [{
      label: 'Jumlah Usulan',
      data: CATEGORIES.map(c => categoryData[c.name]?.usulanMasuk || 0),
      backgroundColor: CATEGORIES.map(c => c.color),
      borderColor: CATEGORIES.map(c => c.color),
      borderWidth: 2,
    }],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) setSelectedCategory(CATEGORIES[elements[0].index].name)
    },
    plugins: {
      legend: { position: 'bottom' as const, labels: { padding: 15, font: { size: 12 } } },
      tooltip: { callbacks: { label: function(context: any) { return `${context.label || ''}: ${context.parsed || 0} usulan` } } }
    }
  }

  const selectedData = categoryData[selectedCategory] || { usulanMasuk: 0, skKeluar: 0, details: [] }
  const totalUsulan = Object.values(categoryData).reduce((sum, cat) => sum + cat.usulanMasuk, 0)
  const totalSK = Object.values(categoryData).reduce((sum, cat) => sum + cat.skKeluar, 0)

  return (
    <Layout>
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Statistik</h1>
          <p className="text-gray-600">Monitoring dan analisis data kepegawaian</p>
        </div>

        {quotaError && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Google Sheets API Quota Exceeded</p>
                <p className="text-xs mt-1">Terlalu banyak request. Menunggu {10 - (retryCount * 10)} detik untuk retry otomatis... Atau tunggu 1-2 menit dan refresh manual.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📅 Filter Rentang Tanggal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          {(dateStart || dateEnd) && (
            <button onClick={() => { setDateStart(''); setDateEnd('') }} className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
              Clear Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div><p className="text-sm opacity-90 mb-1">Total Usulan Masuk</p><p className="text-4xl font-bold">{totalUsulan}</p></div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"><span className="text-3xl">📝</span></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div><p className="text-sm opacity-90 mb-1">Total SK Keluar</p><p className="text-4xl font-bold">{totalSK}</p></div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"><span className="text-3xl">✅</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Distribusi per Kategori</h3>
            <div className="h-80">{loading ? <div className="h-full flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> : <Pie data={pieData} options={pieOptions} />}</div>
            <div className="mt-6 space-y-2">
              {CATEGORIES.map(category => (
                <button key={category.name} onClick={() => setSelectedCategory(category.name)} className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all ${selectedCategory === category.name ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  <div className="flex items-center justify-between"><span>{category.name}</span><span className="text-xs opacity-75">{categoryData[category.name]?.usulanMasuk || 0}</span></div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <h3 className="text-xl font-bold mb-2">{selectedCategory}</h3>
              <div className="flex gap-6">
                <div><p className="text-sm opacity-90">Usulan Masuk</p><p className="text-2xl font-bold">{selectedData.usulanMasuk}</p></div>
                <div><p className="text-sm opacity-90">SK Keluar</p><p className="text-2xl font-bold">{selectedData.skKeluar}</p></div>
                <div><p className="text-sm opacity-90">Persentase</p><p className="text-2xl font-bold">{selectedData.usulanMasuk > 0 ? Math.round((selectedData.skKeluar / selectedData.usulanMasuk) * 100) : 0}%</p></div>
              </div>
            </div>

            <div className="overflow-auto max-h-96 p-6">
              {selectedData.details.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. SK/Surat</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedData.details.map((detail, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{detail.nama}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{detail.sk || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {detail.sk && detail.sk.trim() !== '' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">✅ Selesai</span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">⏳ Proses</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  <p className="text-lg font-medium">Tidak ada data</p>
                  <p className="text-sm">Pilih kategori atau sesuaikan filter tanggal</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default requireAuth(Dashboard)
