import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:5000/api';

function TrialBalance() {
  const [trialBalance, setTrialBalance] = useState([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    as_on_date: new Date().toISOString().split('T')[0],
    financial_year: '2025-26'
  });
  const [groupBy, setGroupBy] = useState('all'); // 'all' or 'group'

  useEffect(() => {
    fetchTrialBalance();
  }, [filters]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_BASE_URL}/accounting/reports/trial-balance?${params}`);
      setTrialBalance(response.data.trial_balance);
      setTotals(response.data.totals);
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const exportToCSV = () => {
    const headers = ['Ledger Name', 'Group', 'Nature', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance'];
    const rows = trialBalance.map(row => [
      row.ledger_name,
      row.account_group,
      row.nature,
      `${Math.abs(row.opening_balance || 0).toFixed(2)} ${row.opening_balance_type || ''}`,
      (row.total_debit || 0).toFixed(2),
      (row.total_credit || 0).toFixed(2),
      `${Math.abs(row.closing_balance || 0).toFixed(2)} ${row.closing_balance_type || ''}`
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${filters.as_on_date}.csv`;
    a.click();
  };

  const groupedData = groupBy === 'group' 
    ? trialBalance.reduce((acc, row) => {
        const group = row.account_group || 'Others';
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(row);
        return acc;
      }, {})
    : { 'All Ledgers': trialBalance };

  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
          <p className="mt-2 text-sm text-gray-700">
            Summary of all ledger balances as on {new Date(filters.as_on_date).toLocaleDateString()}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">As On Date</label>
            <input
              type="date"
              name="as_on_date"
              value={filters.as_on_date}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Financial Year</label>
            <input
              type="text"
              name="financial_year"
              value={filters.financial_year}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="all">All Ledgers</option>
              <option value="group">By Account Group</option>
            </select>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-blue-50 overflow-hidden rounded-lg p-5">
            <dt className="text-sm font-medium text-blue-900 truncate">Total Debit</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">
              ₹{totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </dd>
          </div>
          <div className="bg-orange-50 overflow-hidden rounded-lg p-5">
            <dt className="text-sm font-medium text-orange-900 truncate">Total Credit</dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-600">
              ₹{totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </dd>
          </div>
          <div className={`overflow-hidden rounded-lg p-5 ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
            <dt className={`text-sm font-medium truncate ${isBalanced ? 'text-green-900' : 'text-red-900'}`}>
              Status
            </dt>
            <dd className={`mt-1 text-3xl font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
            </dd>
            {!isBalanced && (
              <p className="mt-1 text-sm text-red-700">
                Difference: ₹{Math.abs(totals.totalDebit - totals.totalCredit).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading trial balance...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ledger Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nature
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opening Balance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closing Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedData).map(([groupName, ledgers]) => (
                  <React.Fragment key={groupName}>
                    {groupBy === 'group' && (
                      <tr className="bg-gray-100">
                        <td colSpan="7" className="px-6 py-3 text-sm font-bold text-gray-900">
                          {groupName}
                        </td>
                      </tr>
                    )}
                    {ledgers.map((row, index) => (
                      <tr key={row.ledger_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.ledger_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.account_group}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${row.nature === 'Asset' ? 'bg-blue-100 text-blue-800' : ''}
                            ${row.nature === 'Liability' ? 'bg-orange-100 text-orange-800' : ''}
                            ${row.nature === 'Income' ? 'bg-green-100 text-green-800' : ''}
                            ${row.nature === 'Expense' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {row.nature}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.opening_balance 
                            ? `₹${Math.abs(row.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${row.opening_balance_type}`
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.total_debit > 0 
                            ? `₹${parseFloat(row.total_debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {row.total_credit > 0 
                            ? `₹${parseFloat(row.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {row.closing_balance 
                            ? `₹${Math.abs(row.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${row.closing_balance_type}`
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-sm font-bold text-gray-900">
                    GRAND TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ₹{totals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ₹{totals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                    {isBalanced ? (
                      <span className="text-green-600">✓ Balanced</span>
                    ) : (
                      <span className="text-red-600">✗ Diff: ₹{Math.abs(totals.totalDebit - totals.totalCredit).toFixed(2)}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && trialBalance.length === 0 && (
        <div className="text-center py-12">
          <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">No transactions found for the selected period.</p>
        </div>
      )}
    </div>
  );
}

export default TrialBalance;
