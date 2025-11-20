import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import DataTable from '../../components/DataTable'
import { requireAuth } from '../../lib/auth'

type MergeInfo = {
  startColumnIndex: number
  endColumnIndex: number
  startRowIndex: number
  endRowIndex: number
}

type SheetData = {
  headers: string[]
  subheaders?: string[]
  rows: string[][]
  headerMerges?: MergeInfo[]
}

function SheetPage() {
  const router = useRouter()
  const { sheetName } = router.query
  const [data, setData] = useState<SheetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sheetName || Array.isArray(sheetName)) return
    fetch(`/api/sheet?sheet=${encodeURIComponent(sheetName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch((e) => setError(String(e)))
  }, [sheetName])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <h2 className="text-xl font-semibold mb-4 flex-shrink-0">{sheetName}</h2>
      {error && <div className="text-red-600 mb-4 flex-shrink-0">{error}</div>}
      {!data && !error && <div className="text-gray-600 flex-shrink-0">Loading...</div>}
      {data && (
        <div className="flex-1 min-h-0">
          <DataTable
            headers={data.headers}
            subheaders={data.subheaders}
            headerMerges={data.headerMerges}
            rows={data.rows}
            sheetName={typeof sheetName === 'string' ? sheetName : undefined}
          />
        </div>
      )}
    </div>
  )
}

export default requireAuth(SheetPage)
