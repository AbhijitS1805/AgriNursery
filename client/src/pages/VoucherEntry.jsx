import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:5000/api';

function VoucherEntry() {
  const [voucherTypes, setVoucherTypes] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  
  const [formData, setFormData] = useState({
    voucher_type_code: '',
    voucher_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    reference_date: '',
    party_ledger_id: '',
    narration: '',
    financial_year: '2025-26',
    entries: [
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '', cost_center_id: '' },
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '', cost_center_id: '' }
    ]
  });

  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [formData.entries]);

  const fetchMasterData = async () => {
    try {
      const [typesRes, ledgersRes, centersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/accounting/voucher-types`),
        axios.get(`${API_BASE_URL}/accounting/ledgers`),
        axios.get(`${API_BASE_URL}/accounting/cost-centers`)
      ]);
      setVoucherTypes(typesRes.data);
      setLedgers(ledgersRes.data);
      setCostCenters(centersRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
      setMessage({ type: 'error', text: 'Failed to load master data' });
    }
  };

  const calculateTotals = () => {
    const debit = formData.entries.reduce((sum, entry) => 
      sum + (parseFloat(entry.debit_amount) || 0), 0);
    const credit = formData.entries.reduce((sum, entry) => 
      sum + (parseFloat(entry.credit_amount) || 0), 0);
    setTotals({ debit, credit });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...formData.entries];
    newEntries[index][field] = value;

    // If entering debit, clear credit and vice versa
    if (field === 'debit_amount' && value) {
      newEntries[index].credit_amount = '';
    } else if (field === 'credit_amount' && value) {
      newEntries[index].debit_amount = '';
    }

    setFormData(prev => ({ ...prev, entries: newEntries }));
  };

  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { 
        ledger_id: '', 
        debit_amount: '', 
        credit_amount: '', 
        narration: '', 
        cost_center_id: '' 
      }]
    }));
  };

  const removeEntry = (index) => {
    if (formData.entries.length > 2) {
      const newEntries = formData.entries.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, entries: newEntries }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate balance
    if (Math.abs(totals.debit - totals.credit) > 0.01) {
      setMessage({ 
        type: 'error', 
        text: `Voucher not balanced! Debit: ₹${totals.debit.toFixed(2)}, Credit: ₹${totals.credit.toFixed(2)}` 
      });
      return;
    }

    // Validate entries
    const validEntries = formData.entries.filter(e => 
      e.ledger_id && (parseFloat(e.debit_amount) > 0 || parseFloat(e.credit_amount) > 0)
    );

    if (validEntries.length < 2) {
      setMessage({ type: 'error', text: 'At least 2 entries are required' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        entries: validEntries.map(e => ({
          ledger_id: parseInt(e.ledger_id),
          debit_amount: parseFloat(e.debit_amount) || 0,
          credit_amount: parseFloat(e.credit_amount) || 0,
          narration: e.narration || formData.narration,
          cost_center_id: e.cost_center_id ? parseInt(e.cost_center_id) : null
        })),
        party_ledger_id: formData.party_ledger_id ? parseInt(formData.party_ledger_id) : null,
        created_by: 1 // TODO: Get from auth context
      };

      await axios.post(`${API_BASE_URL}/accounting/vouchers`, payload);
      
      setMessage({ type: 'success', text: 'Voucher created successfully!' });
      
      // Reset form
      setFormData({
        voucher_type_code: '',
        voucher_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        reference_date: '',
        party_ledger_id: '',
        narration: '',
        financial_year: '2025-26',
        entries: [
          { ledger_id: '', debit_amount: '', credit_amount: '', narration: '', cost_center_id: '' },
          { ledger_id: '', debit_amount: '', credit_amount: '', narration: '', cost_center_id: '' }
        ]
      });
    } catch (error) {
      console.error('Error creating voucher:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create voucher' 
      });
    } finally {
      setLoading(false);
    }
  };

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voucher Entry</h1>
          <p className="mt-2 text-sm text-gray-700">Create journal vouchers with double-entry</p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckIcon className="h-5 w-5 text-green-400" />
              ) : (
                <XMarkIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button onClick={() => setMessage({ type: '', text: '' })}>
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Voucher Details</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Voucher Type *</label>
              <select
                name="voucher_type_code"
                value={formData.voucher_type_code}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Select Type</option>
                {voucherTypes.map(type => (
                  <option key={type.id} value={type.type_code}>
                    {type.type_name} ({type.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Voucher Date *</label>
              <input
                type="date"
                name="voucher_date"
                value={formData.voucher_date}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Number</label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleInputChange}
                placeholder="Invoice/Bill #"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Date</label>
              <input
                type="date"
                name="reference_date"
                value={formData.reference_date}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Party (Optional)</label>
              <select
                name="party_ledger_id"
                value={formData.party_ledger_id}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Select Party</option>
                {ledgers
                  .filter(l => l.group_name === 'Sundry Debtors' || l.group_name === 'Sundry Creditors')
                  .map(ledger => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.ledger_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Narration</label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                rows={2}
                placeholder="Enter narration..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Journal Entries */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Journal Entries</h2>
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ledger *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Center
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Narration
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <select
                        value={entry.ledger_id}
                        onChange={(e) => handleEntryChange(index, 'ledger_id', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      >
                        <option value="">Select Ledger</option>
                        {ledgers.map(ledger => (
                          <option key={ledger.id} value={ledger.id}>
                            {ledger.ledger_name} ({ledger.group_name})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.debit_amount}
                        onChange={(e) => handleEntryChange(index, 'debit_amount', e.target.value)}
                        placeholder="0.00"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.credit_amount}
                        onChange={(e) => handleEntryChange(index, 'credit_amount', e.target.value)}
                        placeholder="0.00"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={entry.cost_center_id}
                        onChange={(e) => handleEntryChange(index, 'cost_center_id', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      >
                        <option value="">None</option>
                        {costCenters.map(center => (
                          <option key={center.id} value={center.id}>
                            {center.center_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => handleEntryChange(index, 'narration', e.target.value)}
                        placeholder="Optional"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {formData.entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-3 py-3 text-sm font-bold text-gray-900">TOTALS</td>
                  <td className="px-3 py-3 text-sm font-bold text-gray-900">
                    ₹{totals.debit.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-sm font-bold text-gray-900">
                    ₹{totals.credit.toFixed(2)}
                  </td>
                  <td colSpan="3" className="px-3 py-3 text-right">
                    {isBalanced ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Balanced
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Not Balanced (Diff: ₹{Math.abs(totals.debit - totals.credit).toFixed(2)})
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isBalanced}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default VoucherEntry;
