import { useState, useEffect } from 'react';
import { ChartBarIcon, TrophyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function SupplierPerformance() {
  const [scorecards, setScorecards] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [underperforming, setUnderperforming] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierMetrics, setSupplierMetrics] = useState([]);
  const [germinationHistory, setGerminationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scorecards');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scorecardsData, topData, underData] = await Promise.all([
        api.get('/supplier-performance/scorecards'),
        api.get('/supplier-performance/top-suppliers'),
        api.get('/supplier-performance/underperforming')
      ]);
      setScorecards(scorecardsData.data || []);
      setTopSuppliers(topData.data || []);
      setUnderperforming(underData.data || []);
    } catch (error) {
      console.error('Error loading supplier performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierDetails = async (supplier_id) => {
    try {
      const [metricsData, germinationData] = await Promise.all([
        api.get(`/supplier-performance/${supplier_id}/metrics`),
        api.get(`/supplier-performance/${supplier_id}/germination`)
      ]);
      setSupplierMetrics(metricsData.data || []);
      setGerminationHistory(germinationData.data || []);
    } catch (error) {
      console.error('Error loading supplier details:', error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingStars = (rating) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading supplier performance data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Performance Dashboard</h1>
        <p className="text-gray-600 mt-1">Track supplier quality, delivery, and germination rates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Suppliers</p>
              <p className="text-3xl font-bold text-gray-900">{scorecards.length}</p>
            </div>
            <ChartBarIcon className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Top Performers</p>
              <p className="text-3xl font-bold text-green-600">{topSuppliers.length}</p>
            </div>
            <TrophyIcon className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Underperforming</p>
              <p className="text-3xl font-bold text-red-600">{underperforming.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['scorecards', 'top-performers', 'underperforming'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Scorecards Tab */}
          {activeTab === 'scorecards' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-Time %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Germination %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejection %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scorecards.map((supplier) => (
                    <tr 
                      key={supplier.supplier_id}
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        loadSupplierDetails(supplier.supplier_id);
                      }}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{supplier.supplier_name}</div>
                        <div className="text-sm text-gray-500">{supplier.supplier_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getScoreColor(supplier.overall_score)}`}>
                          {supplier.overall_score ? supplier.overall_score.toFixed(1) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.quality_score ? supplier.quality_score.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.delivery_score ? supplier.delivery_score.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.on_time_percentage ? supplier.on_time_percentage.toFixed(1) : 'N/A'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.average_germination_rate ? supplier.average_germination_rate.toFixed(1) : 'N/A'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={supplier.rejection_rate > 10 ? 'text-red-600' : 'text-gray-700'}>
                          {supplier.rejection_rate ? supplier.rejection_rate.toFixed(1) : '0'}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">
                        {supplier.avg_overall_rating ? getRatingStars(supplier.avg_overall_rating) : 'No ratings'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Performers Tab */}
          {activeTab === 'top-performers' && (
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => (
                <div key={supplier.supplier_id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl font-bold text-green-600">#{index + 1}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.supplier_name}</h3>
                        <p className="text-sm text-gray-600">{supplier.supplier_code}</p>
                        <div className="mt-2 flex gap-4 text-sm">
                          <span className="text-green-700">Overall: <strong>{supplier.overall_score?.toFixed(1)}</strong></span>
                          <span className="text-gray-700">Quality: <strong>{supplier.quality_score?.toFixed(1)}</strong></span>
                          <span className="text-gray-700">Delivery: <strong>{supplier.delivery_score?.toFixed(1)}</strong></span>
                          <span className="text-gray-700">Germination: <strong>{supplier.average_germination_rate?.toFixed(1)}%</strong></span>
                        </div>
                      </div>
                    </div>
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Underperforming Tab */}
          {activeTab === 'underperforming' && (
            <div className="space-y-4">
              {underperforming.map((supplier) => (
                <div key={supplier.supplier_id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{supplier.supplier_name}</h3>
                      <p className="text-sm text-gray-600">{supplier.supplier_code}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {supplier.overall_score < 40 && (
                          <div className="text-red-700">⚠️ Low overall score: {supplier.overall_score?.toFixed(1)}</div>
                        )}
                        {supplier.rejection_rate > 20 && (
                          <div className="text-red-700">⚠️ High rejection rate: {supplier.rejection_rate?.toFixed(1)}%</div>
                        )}
                        {supplier.on_time_percentage < 60 && (
                          <div className="text-red-700">⚠️ Poor delivery: {supplier.on_time_percentage?.toFixed(1)}% on-time</div>
                        )}
                      </div>
                    </div>
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSupplier.supplier_name}</h2>
                  <p className="text-gray-600">{selectedSupplier.supplier_code}</p>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Performance Metrics History */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Performance Trend</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Overall</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quality</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Delivery</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">On-Time %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierMetrics.map((metric) => (
                        <tr key={metric.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {new Date(metric.period_start).toLocaleDateString()} - {new Date(metric.period_end).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">{metric.overall_score?.toFixed(1)}</td>
                          <td className="px-4 py-2 text-sm">{metric.quality_score?.toFixed(1)}</td>
                          <td className="px-4 py-2 text-sm">{metric.delivery_score?.toFixed(1)}</td>
                          <td className="px-4 py-2 text-sm">{metric.on_time_percentage?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Germination History */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Seed Germination History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Variety</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sown</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Germinated</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quality</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {germinationHistory.map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.seed_variety}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.seeds_sown}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.seeds_germinated}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={record.germination_rate >= 80 ? 'text-green-600 font-medium' : record.germination_rate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                              {record.germination_rate?.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.germination_quality}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {record.sow_date ? new Date(record.sow_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
