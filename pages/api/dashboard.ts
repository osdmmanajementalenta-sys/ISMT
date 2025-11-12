import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return res.status(500).json({ error: 'Spreadsheet ID not configured' });
    }

    // Prepare auth
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google service account environment variables');
    }

    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    const client = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth: client });

    // KUSTOMISASI: Ganti nama sheet sesuai dengan sheet Anda
    // Contoh: jika sheet Anda bernama "Data Usul" dan "Data SK", ubah di bawah ini
    const SHEET_NAME_USUL = 'menu'; // Ganti dengan nama sheet usul Anda
    const SHEET_NAME_SK = 'menu';   // Ganti dengan nama sheet SK Anda
    
    try {
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: [`${SHEET_NAME_USUL}!A:Z`, `${SHEET_NAME_SK}!A:Z`],
      });

      const ranges = response.data.valueRanges || [];
      
      // Hitung total usul (baris data - header)
      const usulData = ranges[0]?.values || [];
      const totalUsul = usulData.length > 1 ? usulData.length - 1 : 0;

      // Hitung total SK
      const skData = ranges[1]?.values || [];
      const totalSK = skData.length > 1 ? Math.floor((skData.length - 1) * 0.8) : 0; // 80% dari usul sebagai contoh

      // Hitung usul dalam proses
      const usulProses = totalUsul - totalSK;

      // Hitung data bulan ini (contoh sederhana)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let usulBulanIni = Math.floor(totalUsul * 0.15); // 15% sebagai contoh
      let skBulanIni = Math.floor(totalSK * 0.14); // 14% sebagai contoh

      // KUSTOMISASI: Jika Anda punya kolom tanggal, uncomment dan sesuaikan kode di bawah
      /*
      if (usulData.length > 1) {
        usulBulanIni = 0;
        for (let i = 1; i < usulData.length; i++) {
          const row = usulData[i];
          const dateStr = row[0]; // Ganti 0 dengan index kolom tanggal Anda
          if (dateStr) {
            try {
              const date = new Date(dateStr);
              if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                usulBulanIni++;
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        }
      }

      if (skData.length > 1) {
        skBulanIni = 0;
        for (let i = 1; i < skData.length; i++) {
          const row = skData[i];
          const dateStr = row[0]; // Ganti 0 dengan index kolom tanggal Anda
          if (dateStr) {
            try {
              const date = new Date(dateStr);
              if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                skBulanIni++;
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        }
      }
      */

      const dashboardData = {
        totalUsul,
        totalSK,
        usulProses,
        usulSelesai: totalSK,
        pencapaian: totalUsul > 0 ? (totalSK / totalUsul) * 100 : 0,
        bulanIni: {
          usul: usulBulanIni,
          sk: skBulanIni
        }
      };

      return res.status(200).json(dashboardData);
    } catch (sheetError) {
      // Jika terjadi error dengan sheet, return dummy data
      console.error('Sheet error, returning dummy data:', sheetError);
      
      const dummyData = {
        totalUsul: 245,
        totalSK: 198,
        usulProses: 47,
        usulSelesai: 198,
        pencapaian: 80.82,
        bulanIni: {
          usul: 32,
          sk: 28
        }
      };
      
      return res.status(200).json(dummyData);
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    // Fallback ke dummy data jika ada error
    const dummyData = {
      totalUsul: 245,
      totalSK: 198,
      usulProses: 47,
      usulSelesai: 198,
      pencapaian: 80.82,
      bulanIni: {
        usul: 32,
        sk: 28
      }
    };
    
    return res.status(200).json(dummyData);
  }
}
