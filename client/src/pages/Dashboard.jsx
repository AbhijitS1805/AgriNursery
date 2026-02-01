import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BeakerIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/alerts'),
      ]);
      setStats(statsData.data);
      setAlerts(alertsData.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const statCards = [
    {
      name: 'Active Batches',
      value: stats?.active_batches || 0,
      icon: BeakerIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Plants',
      value: (stats?.total_plants || 0).toLocaleString(),
      icon: CubeIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Low Stock Items',
      value: stats?.low_stock_items || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Pending Tasks',
      value: stats?.pending_tasks || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Monthly Revenue',
      value: `₹${(stats?.monthly_revenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'Polyhouse Utilization',
      value: `${(stats?.avg_polyhouse_utilization || 0).toFixed(1)}%`,
      icon: BuildingOffice2Icon,
      color: 'bg-teal-500',
    },
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h3>
        </div>
        <div className="p-6">
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No alerts at this time</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm mt-1 opacity-75">{alert.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
