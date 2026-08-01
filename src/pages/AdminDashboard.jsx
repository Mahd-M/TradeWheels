import { useState } from 'react'
import AdminCarsTable from '../components/AdminCarsTable'
import AdminReportsTable from '../components/AdminReportsTable'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('cars')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('cars')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${activeTab === 'cars' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Listings
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${activeTab === 'reports' ? 'border-green-700 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Reported Comments
        </button>
      </div>

      {activeTab === 'cars' ? <AdminCarsTable /> : <AdminReportsTable />}
    </div>
  )
}

export default AdminDashboard