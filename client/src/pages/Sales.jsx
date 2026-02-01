import { useState, useEffect } from 'react';
import {
  CurrencyRupeeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';
import OfflineSync from '../components/OfflineSync';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

const PAYMENT_STATUS_COLORS = {
  'Paid': 'bg-green-100 text-green-800',
  'Partially Paid': 'bg-yellow-100 text-yellow-800',
  'Unpaid': 'bg-red-100 text-red-800',
  'Overdue': 'bg-red-200 text-red-900'
};

export default function Sales() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    total_sales: 0,
    paid_amount: 0,
    outstanding: 0,
    total_invoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchPaymentMethods();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.get('/sales-invoices');
      setInvoices(data || []);
      
      const totalSales = data.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      const paidAmount = data.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
      const outstanding = data.reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
      
      setStats({
        total_sales: totalSales,
        paid_amount: paidAmount,
        outstanding: outstanding,
        total_invoices: data.length
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const data = await api.get('/sales-payments/methods');
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance_due);
    setPaymentMethod('');
    setShowPaymentModal(true);
  };

  const handleViewInvoice = async (invoice) => {
    try {
      // Fetch full invoice details including items and payments
      const data = await api.get(`/sales-invoices/${invoice.id}`);
      setInvoiceDetails(data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    if (parseFloat(paymentAmount) <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    
    if (parseFloat(paymentAmount) > parseFloat(selectedInvoice.balance_due)) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }
    
    try {
      await api.post('/sales-payments', {
        sales_invoice_id: selectedInvoice.id,
        amount: parseFloat(paymentAmount),
        payment_method_id: parseInt(paymentMethod),
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Payment for invoice ${selectedInvoice.invoice_number}`
      });
      
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.booking_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="text-center py-12">Loading sales data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales & Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">Manage sales invoices and track payments</p>
      </div>

      {/* Offline Sync Status */}
      <OfflineSync />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyRupeeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sales</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ₹{stats.total_sales.toLocaleString('en-IN')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Paid Amount</dt>
                  <dd className="text-lg font-semibold text-green-600">
                    ₹{stats.paid_amount.toLocaleString('en-IN')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                  <dd className="text-lg font-semibold text-red-600">
                    ₹{stats.outstanding.toLocaleString('en-IN')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total_invoices}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search by invoice #, farmer name, or booking #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                  <p className="mt-1 text-sm text-gray-500">Invoices will be generated automatically from bookings.</p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.booking_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{invoice.farmer_name}</div>
                    <div className="text-sm text-gray-500">{invoice.farmer_mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoice_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ₹{parseFloat(invoice.paid_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    ₹{parseFloat(invoice.balance_due || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_COLORS[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {parseFloat(invoice.balance_due) > 0 && (
                      <button
                        onClick={() => handleRecordPayment(invoice)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Record Payment
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewInvoice(invoice)}
                      className="text-green-600 hover:text-green-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Invoice: {selectedInvoice.invoice_number}</div>
              <div className="text-sm text-gray-600">Farmer: {selectedInvoice.farmer_name}</div>
              <div className="text-lg font-bold text-gray-900 mt-2">
                Balance Due: ₹{parseFloat(selectedInvoice.balance_due).toLocaleString('en-IN')}
              </div>
            </div>

            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedInvoice.balance_due}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.method_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
                >
                  <BanknotesIcon className="h-5 w-5 mr-2" />
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewModal && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Invoice Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Invoice Header */}
            <div className="border-b pb-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-bold text-lg">{invoiceDetails.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Booking Number</p>
                  <p className="font-semibold">{invoiceDetails.booking_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="font-semibold">{formatDate(invoiceDetails.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${PAYMENT_STATUS_COLORS[invoiceDetails.status]}`}>
                    {invoiceDetails.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Farmer Details */}
            <div className="border-b pb-4 mb-4">
              <h4 className="font-semibold mb-2">Farmer Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{invoiceDetails.farmer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mobile</p>
                  <p className="font-semibold">{invoiceDetails.farmer_mobile}</p>
                </div>
                {invoiceDetails.farmer_village && (
                  <div>
                    <p className="text-sm text-gray-600">Village</p>
                    <p className="font-semibold">{invoiceDetails.farmer_village}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items */}
            <div className="border-b pb-4 mb-4">
              <h4 className="font-semibold mb-2">Items</h4>
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Plant</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceDetails.items && invoiceDetails.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{item.plant_name}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">₹{parseFloat(item.rate).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Amount Summary */}
            <div className="border-b pb-4 mb-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">₹{parseFloat(invoiceDetails.subtotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {invoiceDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({invoiceDetails.discount_percentage}%):</span>
                      <span>-₹{parseFloat(invoiceDetails.discount_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {invoiceDetails.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({invoiceDetails.tax_percentage}%):</span>
                      <span className="font-semibold">₹{parseFloat(invoiceDetails.tax_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{parseFloat(invoiceDetails.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span className="font-semibold">₹{parseFloat(invoiceDetails.paid_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-red-600 text-lg font-bold">
                    <span>Balance Due:</span>
                    <span>₹{parseFloat(invoiceDetails.balance_due || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {invoiceDetails.payments && invoiceDetails.payments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Payment History</h4>
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Receipt #</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceDetails.payments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{payment.receipt_number}</td>
                        <td className="px-4 py-2 text-sm">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-2 text-sm">{payment.payment_method || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {parseFloat(invoiceDetails.balance_due) > 0 && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleRecordPayment(invoiceDetails);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
