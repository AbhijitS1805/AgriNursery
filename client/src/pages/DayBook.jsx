import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CalendarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:5000/api';

function DayBook() {
  const [dayBook, setDayBook] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherDetails, setVoucherDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    to_date: new Date().toISOString().split('T')[0],
    voucher_type: '',
    financial_year: '2025-26'
  });

  const [voucherTypes, setVoucherTypes] = useState([]);

  useEffect(() => {
    fetchVoucherTypes();
  }, []);

  useEffect(() => {
    fetchDayBook();
  }, [filters]);

  const fetchVoucherTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accounting/voucher-types`);
      setVoucherTypes(response.data);
    } catch (error) {
      console.error('Error fetching voucher types:', error);
    }
  };

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_BASE_URL}/accounting/reports/day-book?${params}`);
      setDayBook(response.data.entries);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching day book:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const viewVoucher = async (voucherId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accounting/vouchers/${voucherId}`);
      setVoucherDetails(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching voucher details:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Voucher #', 'Reference #', 'Party', 'Narration', 'Amount'];
    const rows = dayBook.map(row => [
      new Date(row.voucher_date).toLocaleDateString(),
      row.abbreviation,
      row.voucher_number,
      row.reference_number || '',
      row.party_name || '',
      row.narration || '',
      row.total_amount.toFixed(2)
    ]);

    const csv = [headers, ...rows, ['', '', '', '', '', 'TOTAL', total.toFixed(2)]].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-book-${filters.from_date}-to-${filters.to_date}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Day Book</h1>
          <p className="mt-2 text-sm text-gray-700">
            All vouchers from {new Date(filters.from_date).toLocaleDateString()} to {new Date(filters.to_date).toLocaleDateString()}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
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
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Voucher Type</label>
            <select
              name="voucher_type"
              value={filters.voucher_type}
              onChange={handleFilterChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="">All Types</option>
              {voucherTypes.map(type => (
                <option key={type.id} value={type.abbreviation}>
                  {type.type_name} ({type.abbreviation})
                </option>
              ))}
            </select>
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
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-blue-50 overflow-hidden rounded-lg p-5">
            <dt className="text-sm font-medium text-blue-900 truncate">Total Vouchers</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">{dayBook.length}</dd>
          </div>
          <div className="bg-green-50 overflow-hidden rounded-lg p-5">
            <dt className="text-sm font-medium text-green-900 truncate">Total Amount</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </dd>
          </div>
          <div className="bg-purple-50 overflow-hidden rounded-lg p-5">
            <dt className="text-sm font-medium text-purple-900 truncate">Average per Voucher</dt>
            <dd className="mt-1 text-3xl font-semibold text-purple-600">
              ₹{dayBook.length > 0 ? (total / dayBook.length).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </dd>
          </div>
        </div>
      </div>

      {/* Day Book Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading day book...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Narration
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dayBook.map((entry, index) => (
                  <tr key={entry.voucher_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.voucher_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.abbreviation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.voucher_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.party_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {entry.narration || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      ₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => viewVoucher(entry.voucher_id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Voucher Details Modal */}
      {showModal && voucherDetails && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setShowModal(false)}
              aria-hidden="true"
            ></div>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 id="modal-title" className="text-lg font-medium text-gray-900">
                    Voucher Details - {voucherDetails.voucher.voucher_number}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)} 
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{voucherDetails.voucher.type_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{new Date(voucherDetails.voucher.voucher_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-medium">{voucherDetails.voucher.reference_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Party</p>
                    <p className="font-medium">{voucherDetails.voucher.party_name || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Narration</p>
                    <p className="font-medium">{voucherDetails.voucher.narration || '-'}</p>
                  </div>
                </div>

                <h4 className="font-medium mb-2">Journal Entries</h4>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ledger</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {voucherDetails.entries.map(entry => (
                      <tr key={entry.id}>
                        <td className="px-4 py-2 text-sm">{entry.ledger_name}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {entry.debit_amount > 0 ? `₹${parseFloat(entry.debit_amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {entry.credit_amount > 0 ? `₹${parseFloat(entry.credit_amount).toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DayBook;
