import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

export default function PaymentEntry() {
    const [payments, setPayments] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedPayment, setSelectedPayment] = useState(null);
    
    const [formData, setFormData] = useState({
        voucher_type: 'Payment',
        voucher_date: new Date().toISOString().split('T')[0],
        party_type: 'Supplier',
        party_id: '',
        party_name: '',
        amount: '',
        payment_mode: 'Cash',
        bank_account_id: '',
        cheque_number: '',
        cheque_date: '',
        upi_ref: '',
        card_ref: '',
        narration: '',
        allocations: []
    });

    const [filters, setFilters] = useState({
        type: '',
        status: '',
        from_date: '',
        to_date: ''
    });

    useEffect(() => {
        fetchPayments();
        fetchBankAccounts();
    }, []);

    const fetchPayments = async () => {
        try {
            const params = new URLSearchParams(filters);
            const response = await axios.get(`${API_BASE_URL}/payments?${params}`);
            setPayments(response.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to fetch payments');
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/payments/bank-accounts`);
            setBankAccounts(response.data);
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
        }
    };

    const fetchOutstandingInvoices = async (partyType, partyId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/payments/outstanding`, {
                params: { party_type: partyType, party_id: partyId }
            });
            setOutstandingInvoices(response.data);
        } catch (error) {
            console.error('Error fetching outstanding invoices:', error);
        }
    };

    const openCreateModal = () => {
        setModalMode('create');
        setFormData({
            voucher_type: 'Payment',
            voucher_date: new Date().toISOString().split('T')[0],
            party_type: 'Supplier',
            party_id: '',
            party_name: '',
            amount: '',
            payment_mode: 'Cash',
            bank_account_id: '',
            cheque_number: '',
            cheque_date: '',
            upi_ref: '',
            card_ref: '',
            narration: '',
            allocations: []
        });
        setShowModal(true);
    };

    const openViewModal = (payment) => {
        setModalMode('view');
        setSelectedPayment(payment);
        setShowModal(true);
    };

    const openEditModal = (payment) => {
        setModalMode('edit');
        setSelectedPayment(payment);
        setFormData({
            voucher_type: payment.voucher_type,
            voucher_date: payment.voucher_date?.split('T')[0],
            party_type: payment.party_type,
            party_id: payment.party_id,
            party_name: payment.party_name,
            amount: payment.amount,
            payment_mode: payment.payment_mode,
            bank_account_id: payment.bank_account_id,
            cheque_number: payment.cheque_number,
            cheque_date: payment.cheque_date?.split('T')[0],
            upi_ref: payment.upi_ref,
            card_ref: payment.card_ref,
            narration: payment.narration,
            allocations: payment.allocations || []
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Fetch outstanding invoices when party changes
        if (name === 'party_id' && value) {
            fetchOutstandingInvoices(formData.party_type, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (modalMode === 'create') {
                await axios.post(`${API_BASE_URL}/payments`, formData);
                toast.success('Payment created successfully');
            } else if (modalMode === 'edit') {
                await axios.put(`${API_BASE_URL}/payments/${selectedPayment.id}`, formData);
                toast.success('Payment updated successfully');
            }
            
            setShowModal(false);
            fetchPayments();
        } catch (error) {
            console.error('Error saving payment:', error);
            toast.error('Failed to save payment');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payment?')) return;
        
        try {
            await axios.delete(`${API_BASE_URL}/payments/${id}`);
            toast.success('Payment deleted successfully');
            fetchPayments();
        } catch (error) {
            console.error('Error deleting payment:', error);
            toast.error('Failed to delete payment');
        }
    };

    const handleClearCheque = async (chequeId) => {
        try {
            await axios.put(`${API_BASE_URL}/payments/cheque/${chequeId}/clear`, {
                status: 'Cleared',
                clearance_date: new Date().toISOString().split('T')[0]
            });
            toast.success('Cheque cleared successfully');
            fetchPayments();
        } catch (error) {
            console.error('Error clearing cheque:', error);
            toast.error('Failed to clear cheque');
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Cleared': 'bg-green-100 text-green-800',
            'Bounced': 'bg-red-100 text-red-800',
            'Cancelled': 'bg-gray-100 text-gray-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Payment & Receipt Entry</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    + New Payment/Receipt
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="Payment">Payment</option>
                            <option value="Receipt">Receipt</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="Pending">Pending</option>
                            <option value="Cleared">Cleared</option>
                            <option value="Bounced">Bounced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">From Date</label>
                        <input
                            type="date"
                            value={filters.from_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">To Date</label>
                        <input
                            type="date"
                            value={filters.to_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        onClick={fetchPayments}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher No.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {payments.map(payment => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{payment.voucher_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.voucher_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs ${payment.voucher_type === 'Payment' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {payment.voucher_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{payment.party_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">₹{parseFloat(payment.amount).toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{payment.payment_mode}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(payment.status)}`}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                    <button
                                        onClick={() => openViewModal(payment)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => openEditModal(payment)}
                                        className="text-green-600 hover:text-green-800"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(payment.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {modalMode === 'create' && 'New Payment/Receipt'}
                                {modalMode === 'edit' && 'Edit Payment/Receipt'}
                                {modalMode === 'view' && 'Payment/Receipt Details'}
                            </h2>
                            
                            {modalMode === 'view' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="font-medium">Voucher Number:</label>
                                            <p>{selectedPayment?.voucher_number}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Date:</label>
                                            <p>{new Date(selectedPayment?.voucher_date).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Type:</label>
                                            <p>{selectedPayment?.voucher_type}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Party:</label>
                                            <p>{selectedPayment?.party_name}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Amount:</label>
                                            <p className="text-lg font-bold">₹{parseFloat(selectedPayment?.amount).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Payment Mode:</label>
                                            <p>{selectedPayment?.payment_mode}</p>
                                        </div>
                                        {selectedPayment?.narration && (
                                            <div className="col-span-2">
                                                <label className="font-medium">Narration:</label>
                                                <p>{selectedPayment.narration}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Type*</label>
                                            <select
                                                name="voucher_type"
                                                value={formData.voucher_type}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            >
                                                <option value="Payment">Payment</option>
                                                <option value="Receipt">Receipt</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Date*</label>
                                            <input
                                                type="date"
                                                name="voucher_date"
                                                value={formData.voucher_date}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Party Type*</label>
                                            <select
                                                name="party_type"
                                                value={formData.party_type}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            >
                                                <option value="Customer">Customer</option>
                                                <option value="Supplier">Supplier</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Party Name*</label>
                                            <input
                                                type="text"
                                                name="party_name"
                                                value={formData.party_name}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Amount*</label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Payment Mode*</label>
                                            <select
                                                name="payment_mode"
                                                value={formData.payment_mode}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Bank">Bank Transfer</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Card">Card</option>
                                            </select>
                                        </div>
                                        
                                        {(formData.payment_mode === 'Bank' || formData.payment_mode === 'Cheque') && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Bank Account*</label>
                                                <select
                                                    name="bank_account_id"
                                                    value={formData.bank_account_id}
                                                    onChange={handleInputChange}
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                    required
                                                >
                                                    <option value="">Select Bank Account</option>
                                                    {bankAccounts.map(bank => (
                                                        <option key={bank.id} value={bank.id}>
                                                            {bank.account_name} - {bank.account_number}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        
                                        {formData.payment_mode === 'Cheque' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Cheque Number*</label>
                                                    <input
                                                        type="text"
                                                        name="cheque_number"
                                                        value={formData.cheque_number}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Cheque Date*</label>
                                                    <input
                                                        type="date"
                                                        name="cheque_date"
                                                        value={formData.cheque_date}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                                        required
                                                    />
                                                </div>
                                            </>
                                        )}
                                        
                                        {formData.payment_mode === 'UPI' && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">UPI Reference</label>
                                                <input
                                                    type="text"
                                                    name="upi_ref"
                                                    value={formData.upi_ref}
                                                    onChange={handleInputChange}
                                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Narration</label>
                                            <textarea
                                                name="narration"
                                                value={formData.narration}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                rows="2"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-2 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            {modalMode === 'create' ? 'Create' : 'Update'}
                                        </button>
                                    </div>
                                </form>
                            )}
                            
                            {modalMode === 'view' && (
                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
