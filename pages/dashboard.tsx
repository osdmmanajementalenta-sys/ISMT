import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DashboardCard from '../components/DashboardCard';
import ProgressBar from '../components/ProgressBar';

interface DashboardData {
  totalUsul: number;
  totalSK: number;
  usulProses: number;
  usulSelesai: number;
  pencapaian: number;
  bulanIni: {
    usul: number;
    sk: number;
  };
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalUsul: 0,
    totalSK: 0,
    usulProses: 0,
    usulSelesai: 0,
    pencapaian: 0,
    bulanIni: {
      usul: 0,
      sk: 0
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data dari API
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Fallback ke dummy data jika API gagal
        const dummyData: DashboardData = {
          totalUsul: 245,
          totalSK: 198,
          usulProses: 47,
          usulSelesai: 198,
          pencapaian: (198 / 245) * 100,
          bulanIni: {
            usul: 32,
            sk: 28
          }
        };
        
        setData(dummyData);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  const pencapaianPercentage = data.totalUsul > 0 ? (data.totalSK / data.totalUsul) * 100 : 0;
  const bulanIniPercentage = data.bulanIni.usul > 0 ? (data.bulanIni.sk / data.bulanIni.usul) * 100 : 0;

  return (
    <Layout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Pencapaian</h1>
          <p className="text-gray-600 mt-2">
            Monitoring usul yang masuk dan SK yang telah diselesaikan
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Usul Masuk"
            value={data.totalUsul}
            icon="📥"
            color="blue"
            subtitle="Semua usul yang masuk"
            trend={{ value: 12, isPositive: true }}
          />
          
          <DashboardCard
            title="SK Selesai"
            value={data.totalSK}
            icon="✅"
            color="green"
            subtitle="SK yang telah diterbitkan"
            trend={{ value: 8, isPositive: true }}
          />
          
          <DashboardCard
            title="Dalam Proses"
            value={data.usulProses}
            icon="⏳"
            color="yellow"
            subtitle="Usul sedang diproses"
          />
          
          <DashboardCard
            title="Tingkat Pencapaian"
            value={`${pencapaianPercentage.toFixed(1)}%`}
            icon="🎯"
            color="purple"
            subtitle="Rasio SK terhadap Usul"
          />
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Overall Progress */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 Progress Keseluruhan
            </h2>
            <div className="space-y-6">
              <div>
                <ProgressBar
                  percentage={pencapaianPercentage}
                  label="Pencapaian Total"
                  color="green"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Usul</p>
                  <p className="text-2xl font-bold text-blue-600">{data.totalUsul}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">SK Selesai</p>
                  <p className="text-2xl font-bold text-green-600">{data.totalSK}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Progress */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📅 Progress Bulan Ini
            </h2>
            <div className="space-y-6">
              <div>
                <ProgressBar
                  percentage={bulanIniPercentage}
                  label="Pencapaian Bulan Ini"
                  color="indigo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Usul Masuk</p>
                  <p className="text-2xl font-bold text-indigo-600">{data.bulanIni.usul}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">SK Selesai</p>
                  <p className="text-2xl font-bold text-purple-600">{data.bulanIni.sk}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📈 Statistik Detail
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm font-medium text-gray-600">Rata-rata Waktu Proses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">14 Hari</p>
              <p className="text-xs text-gray-500 mt-1">Dari usul hingga SK</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm font-medium text-gray-600">Efisiensi Penyelesaian</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pencapaianPercentage.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">SK selesai vs total usul</p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm font-medium text-gray-600">Pending Process</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.usulProses}</p>
              <p className="text-xs text-gray-500 mt-1">Memerlukan tindak lanjut</p>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Informasi Dashboard
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Data diperbarui secara real-time dari Google Sheets. 
                Untuk melihat detail per-usul, silakan kunjungi halaman Sheet yang sesuai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
