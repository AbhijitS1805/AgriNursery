import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ExpenseManagement() {
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedExpense, setSelectedExpense] = useState(null);
    
    const [formData, setFormData] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        category_id: '',
        expense_name: '',
        vendor_name: '',
        base_amount: '',
        tax_amount: '',
        total_amount: '',
        payment_mode: 'Cash',
        payment_status: 'Pending',
        paid_amount: '',
        bill_number: '',
        remarks: ''
    });

    const [filters, setFilters] = useState({
        category_id: '',
        status: '',
        from_date: '',
        to_date: ''
    });

    useEffect(() => {
        fetchExpenses();
        fetchCategories();
    }, []);

    const fetchExpenses = async () => {
        try {
            const params = new URLSearchParams(filters);
            const response = await axios.get(`${API_BASE_URL}/expenses?${params}`);
            setExpenses(response.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to fetch expenses');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/expenses/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const openCreateModal = () => {
        setModalMode('create');
        setFormData({
            expense_date: new Date().toISOString().split('T')[0],
            category_id: '',
            expense_name: '',
            vendor_name: '',
            base_amount: '',
            tax_amount: '',
            total_amount: '',
            payment_mode: 'Cash',
            payment_status: 'Pending',
            paid_amount: '',
            bill_number: '',
            remarks: ''
        });
        setShowModal(true);
    };

    const openViewModal = (expense) => {
        setModalMode('view');
        setSelectedExpense(expense);
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        setModalMode('edit');
        setSelectedExpense(expense);
        setFormData({
            expense_date: expense.expense_date?.split('T')[0],
            category_id: expense.category_id,
            expense_name: expense.expense_name,
            vendor_name: expense.vendor_name,
            base_amount: expense.base_amount,
            tax_amount: expense.tax_amount,
            total_amount: expense.total_amount,
            payment_mode: expense.payment_mode,
            payment_status: expense.payment_status,
            paid_amount: expense.paid_amount,
            bill_number: expense.bill_number,
            remarks: expense.remarks
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // Auto-calculate total amount
            if (name === 'base_amount' || name === 'tax_amount') {
                const base = parseFloat(name === 'base_amount' ? value : updated.base_amount) || 0;
                const tax = parseFloat(name === 'tax_amount' ? value : updated.tax_amount) || 0;
                updated.total_amount = (base + tax).toFixed(2);
            }
            
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (modalMode === 'create') {
                await axios.post(`${API_BASE_URL}/expenses`, formData);
                toast.success('Expense created successfully');
            } else if (modalMode === 'edit') {
                await axios.put(`${API_BASE_URL}/expenses/${selectedExpense.id}`, formData);
                toast.success('Expense updated successfully');
            }
            
            setShowModal(false);
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error('Failed to save expense');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        
        try {
            await axios.delete(`${API_BASE_URL}/expenses/${id}`);
            toast.success('Expense deleted successfully');
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Failed to delete expense');
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-blue-100 text-blue-800',
            'Paid': 'bg-green-100 text-green-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Expense Management</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    + New Expense
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                            value={filters.category_id}
                            onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                            ))}
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
                            <option value="Partial">Partial</option>
                            <option value="Paid">Paid</option>
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
                        onClick={fetchExpenses}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense No.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {expenses.map(expense => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{expense.expense_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{expense.category_name}</td>
                                <td className="px-6 py-4">{expense.expense_name}</td>
                                <td className="px-6 py-4">{expense.vendor_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">₹{parseFloat(expense.total_amount).toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(expense.payment_status)}`}>
                                        {expense.payment_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                    <button
                                        onClick={() => openViewModal(expense)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => openEditModal(expense)}
                                        className="text-green-600 hover:text-green-800"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(expense.id)}
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {modalMode === 'create' && 'New Expense'}
                                {modalMode === 'edit' && 'Edit Expense'}
                                {modalMode === 'view' && 'Expense Details'}
                            </h2>
                            
                            {modalMode === 'view' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="font-medium">Expense Number:</label>
                                            <p>{selectedExpense?.expense_number}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Date:</label>
                                            <p>{new Date(selectedExpense?.expense_date).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Category:</label>
                                            <p>{selectedExpense?.category_name}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Expense Name:</label>
                                            <p>{selectedExpense?.expense_name}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Vendor:</label>
                                            <p>{selectedExpense?.vendor_name}</p>
                                        </div>
                                        <div>
                                            <label className="font-medium">Total Amount:</label>
                                            <p className="text-lg font-bold">₹{parseFloat(selectedExpense?.total_amount).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Date*</label>
                                            <input
                                                type="date"
                                                name="expense_date"
                                                value={formData.expense_date}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Category*</label>
                                            <select
                                                name="category_id"
                                                value={formData.category_id}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Expense Name*</label>
                                            <input
                                                type="text"
                                                name="expense_name"
                                                value={formData.expense_name}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Vendor Name</label>
                                            <input
                                                type="text"
                                                name="vendor_name"
                                                value={formData.vendor_name}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Bill Number</label>
                                            <input
                                                type="text"
                                                name="bill_number"
                                                value={formData.bill_number}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Base Amount*</label>
                                            <input
                                                type="number"
                                                name="base_amount"
                                                value={formData.base_amount}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Tax Amount</label>
                                            <input
                                                type="number"
                                                name="tax_amount"
                                                value={formData.tax_amount}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                step="0.01"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Total Amount</label>
                                            <input
                                                type="number"
                                                name="total_amount"
                                                value={formData.total_amount}
                                                className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50"
                                                step="0.01"
                                                readOnly
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
                                                <option value="Bank">Bank</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="UPI">UPI</option>
                                                <option value="Card">Card</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Payment Status*</label>
                                            <select
                                                name="payment_status"
                                                value={formData.payment_status}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                required
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Partial">Partial</option>
                                                <option value="Paid">Paid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Paid Amount</label>
                                            <input
                                                type="number"
                                                name="paid_amount"
                                                value={formData.paid_amount}
                                                onChange={handleInputChange}
                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Remarks</label>
                                            <textarea
                                                name="remarks"
                                                value={formData.remarks}
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
