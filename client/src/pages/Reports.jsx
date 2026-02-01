import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Reports() {
  const [profitByVariety, setProfitByVariety] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.get('/reports/profit-by-variety');
      setProfitByVariety(data.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Production Cost Report by Plant Type</h2>
      <p className="text-gray-600">Track production costs and quantities by plant variety</p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plant Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Produced</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Production Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost per Plant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profitByVariety.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No production data yet. Start a production to see cost tracking here.
                </td>
              </tr>
            ) : (
              profitByVariety.map((variety) => (
                <tr key={variety.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{variety.common_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {parseFloat(variety.total_sold || 0).toLocaleString()} plants
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                    ₹{parseFloat(variety.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    ₹{(parseFloat(variety.total_cost || 0) / parseFloat(variety.total_sold || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <h3 className="font-semibold text-blue-900 mb-2">📊 About This Report</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Shows total production costs grouped by plant type</li>
          <li>• Includes all materials used (seeds, cocopeat, fertilizers, etc.)</li>
          <li>• Cost per plant is automatically calculated during production</li>
          <li>• Use this to set competitive selling prices and track profitability</li>
        </ul>
      </div>
    </div>
  );
}
