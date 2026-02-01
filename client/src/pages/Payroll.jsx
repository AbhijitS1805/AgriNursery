import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Draft'); // Draft, Paid, All
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState([]);

  useEffect(() => {
    fetchPayrollList();
  }, [filter]);

  const fetchPayrollList = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payroll/list');
      console.log('Payroll Response:', response);
      
      if (response.success) {
        let filtered = response.data;
        console.log('All payrolls:', filtered);
        console.log('Current filter:', filter);
        if (filter !== 'All') {
          filtered = filtered.filter(p => p.status === filter);
        }
        console.log('Filtered payrolls:', filtered);
        setPayrolls(filtered);
      }
    } catch (error) {
      toast.error('Failed to load payroll list');
      console.error('Payroll fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyPayroll = async () => {
    if (!window.confirm(`Generate payroll for ${getMonthName(selectedMonth)} ${selectedYear}?\n\nThis will process salary for ALL active employees.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/payroll/generate', {
        month: selectedMonth,
        year: selectedYear
      });
      
      if (response.success) {
        toast.success(response.message || 'Payroll generated successfully');
        fetchPayrollList();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate payroll');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const viewPayrollDetails = async (payroll) => {
    try {
      const response = await api.get(`/payroll/details/${payroll.id}`);
      if (response.success) {
        setSelectedPayroll(payroll);
        setPayrollDetails(response.data.components || []);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Failed to load payroll details');
      console.error(error);
    }
  };

  const approvePayroll = async (payrollId) => {
    if (!window.confirm('Approve this payroll?\n\nThis will:\n- Mark payroll as Approved\n- Create accounting voucher\n- Record journal entries (Salary Expense, Cash, Payables)')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/payroll/approve/${payrollId}`);
      
      if (response.success) {
        toast.success(`✅ Payroll approved!\nVoucher: ${response.data.voucher_number}`);
        fetchPayrollList();
        setShowDetailsModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve payroll');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Processed': 'bg-blue-100 text-blue-800',
      'Paid': 'bg-green-100 text-green-800',
      'Hold': 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Payroll Management</h1>
        <p className="text-gray-600 mt-1">Generate and manage employee salaries</p>
      </div>

      {/* Generate Payroll Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Generate Monthly Payroll</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateMonthlyPayroll}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            🚀 Generate Payroll
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b">
          {['All', 'Draft', 'Paid'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Payroll List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No payroll records found</p>
            <p className="text-gray-400 text-sm mt-2">Generate payroll for the selected month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payroll.employee_name}</div>
                      <div className="text-sm text-gray-500">{payroll.employee_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getMonthName(payroll.month)} {payroll.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(payroll.gross_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(payroll.total_earnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {formatCurrency(payroll.total_deductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      {formatCurrency(payroll.net_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(payroll.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => viewPayrollDetails(payroll)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        👁️ View
                      </button>
                      {payroll.status === 'Draft' && (
                        <button
                          onClick={() => approvePayroll(payroll.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          ✅ Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payroll Details Modal */}
      {showDetailsModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Payroll Details</h3>
                <p className="text-sm text-gray-600">{selectedPayroll.employee_name} - {getMonthName(selectedPayroll.month)} {selectedPayroll.year}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Total Earnings</div>
                  <div className="text-2xl font-bold text-green-700 mt-1">
                    {formatCurrency(selectedPayroll.total_earnings)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-600 font-medium">Total Deductions</div>
                  <div className="text-2xl font-bold text-red-700 mt-1">
                    {formatCurrency(selectedPayroll.total_deductions)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Net Salary</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">
                    {formatCurrency(selectedPayroll.net_salary)}
                  </div>
                </div>
              </div>

              {/* Component Breakdown */}
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 pb-2 border-b border-green-200">
                    ✅ EARNINGS
                  </h4>
                  {payrollDetails
                    .filter(d => d.component_type === 'Earning')
                    .map((detail, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-700">{detail.component_name}</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(detail.amount)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Deductions */}
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3 pb-2 border-b border-red-200">
                    ❌ DEDUCTIONS
                  </h4>
                  {payrollDetails
                    .filter(d => d.component_type === 'Deduction')
                    .map((detail, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-700">{detail.component_name}</span>
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(detail.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Accounting Info */}
              {selectedPayroll.status === 'Paid' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Accounting Entry</h4>
                  <div className="text-sm text-gray-600">
                    <p>✅ Voucher created with journal entries:</p>
                    <ul className="mt-2 ml-4 space-y-1">
                      <li>• <strong>Debit:</strong> Salary Expense - {formatCurrency(selectedPayroll.gross_salary)}</li>
                      <li>• <strong>Credit:</strong> Cash in Hand - {formatCurrency(selectedPayroll.net_salary)}</li>
                      {selectedPayroll.total_deductions > 0 && (
                        <li>• <strong>Credit:</strong> Statutory Payables - {formatCurrency(selectedPayroll.total_deductions)}</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedPayroll.status === 'Draft' && (
                  <button
                    onClick={() => approvePayroll(selectedPayroll.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✅ Approve & Create Voucher
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
