import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, EyeIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function PurchaseBills() {
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    bill_number: '',
    supplier_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    receive_date: new Date().toISOString().split('T')[0],
    tax_percentage: '18',
    extra_charges: '0',
    extra_charges_description: '',
    advance_amount: '0',
    payment_mode: 'Cash',
    payment_status: 'Pending',
    items: [{ item_id: '', item_name: '', quantity: '', unit_price: '' }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billsData, suppliersData, itemsData] = await Promise.all([
        api.get('/purchases/bills'),
        api.get('/master/suppliers'),
        api.get('/inventory/items')
      ]);
      setBills(billsData.data || []);
      setSuppliers(suppliersData.data || []);
      setInventoryItems(itemsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', item_name: '', quantity: '', unit_price: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // If item selected, get its name
    if (field === 'item_id') {
      const item = inventoryItems.find(i => i.id === parseInt(value));
      if (item) {
        newItems[index].item_name = item.item_name;
        newItems[index].unit_price = item.cost_price || item.unit_cost || '0';
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0));
    }, 0);
    
    const taxAmount = (subtotal * parseFloat(formData.tax_percentage || 0)) / 100;
    const extraCharges = parseFloat(formData.extra_charges || 0);
    const totalAmount = subtotal + taxAmount + extraCharges;
    const advanceAmount = parseFloat(formData.advance_amount || 0);
    const balanceAmount = totalAmount - advanceAmount;

    return { subtotal, taxAmount, extraCharges, totalAmount, advanceAmount, balanceAmount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const submitData = {
        ...formData,
        ...totals
      };

      if (editingBill) {
        await api.put(`/purchases/bills/${editingBill.id}`, submitData);
        alert('✅ Purchase bill updated successfully!');
      } else {
        await api.post('/purchases/bills', submitData);
        alert('✅ Purchase bill created successfully!');
      }
      
      setShowModal(false);
      setEditingBill(null);
      setFormData({
        bill_number: '',
        supplier_id: '',
        bill_date: new Date().toISOString().split('T')[0],
        receive_date: new Date().toISOString().split('T')[0],
        tax_percentage: '18',
        extra_charges: '0',
        extra_charges_description: '',
        advance_amount: '0',
        payment_mode: 'Cash',
        payment_status: 'Pending',
        items: [{ item_id: '', item_name: '', quantity: '', unit_price: '' }]
      });
      loadData();
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewBill = async (bill) => {
    try {
      const response = await api.get(`/purchases/bills/${bill.id}`);
      setSelectedBill(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching bill details:', error);
      alert('Error loading bill details');
    }
  };

  const handleEditBill = async (bill) => {
    try {
      const response = await api.get(`/purchases/bills/${bill.id}`);
      const billData = response.data;
      
      setEditingBill(billData);
      setFormData({
        bill_number: billData.bill_number,
        supplier_id: billData.supplier_id.toString(),
        bill_date: billData.bill_date ? billData.bill_date.split('T')[0] : '',
        receive_date: billData.receive_date ? billData.receive_date.split('T')[0] : '',
        tax_percentage: billData.tax_percentage?.toString() || '18',
        extra_charges: billData.extra_charges?.toString() || '0',
        extra_charges_description: billData.extra_charges_description || '',
        advance_amount: billData.advance_amount?.toString() || '0',
        payment_mode: billData.payment_mode || 'Cash',
        payment_status: billData.payment_status || 'Pending',
        items: billData.items?.map(item => ({
          item_id: item.item_id?.toString() || '',
          item_name: item.item_name,
          quantity: item.quantity?.toString() || '',
          unit_price: item.unit_price?.toString() || ''
        })) || [{ item_id: '', item_name: '', quantity: '', unit_price: '' }]
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error loading bill for edit:', error);
      alert('Error loading bill details');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Bills</h1>
          <p className="text-gray-600 mt-1">Manage vendor bills and invoices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          New Purchase Bill
        </button>
      </div>

      {/* Bills List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bills.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No bills yet. Create your first purchase bill!
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{bill.bill_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{bill.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(bill.bill_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">₹{parseFloat(bill.total_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600">
                    ₹{parseFloat(bill.advance_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">
                    ₹{parseFloat(bill.balance_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      bill.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                      bill.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewBill(bill)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditBill(bill)}
                        className="text-green-600 hover:text-green-800"
                        title="Edit Bill"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingBill ? 'Edit Purchase Bill' : 'New Purchase Bill'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Bill Header */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bill_number}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.bill_date}
                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receive Date</label>
                  <input
                    type="date"
                    value={formData.receive_date}
                    onChange={(e) => setFormData({ ...formData, receive_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Bill Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">Item</label>
                        <select
                          required
                          value={item.item_id}
                          onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="">Select Item</option>
                          {inventoryItems.map((invItem) => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.item_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Total</label>
                        <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2">
                          ₹{(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">&nbsp;</label>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="w-full bg-red-100 text-red-600 px-2 py-2 rounded-lg hover:bg-red-200"
                          >
                            <TrashIcon className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Billing Summary */}
              <div className="border-t pt-4 grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax_percentage}
                      onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extra Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.extra_charges}
                      onChange={(e) => setFormData({ ...formData, extra_charges: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Transport, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extra Charges Description</label>
                    <input
                      type="text"
                      value={formData.extra_charges_description}
                      onChange={(e) => setFormData({ ...formData, extra_charges_description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Paid</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.advance_amount}
                      onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Bill Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({formData.tax_percentage}%):</span>
                      <span className="font-medium">₹{totals.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Extra Charges:</span>
                      <span className="font-medium">₹{totals.extraCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2 text-base font-semibold text-blue-900">
                      <span>Total Amount:</span>
                      <span>₹{totals.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Advance Paid:</span>
                      <span className="font-medium">₹{totals.advanceAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2 text-lg font-bold text-red-700">
                      <span>Balance Due:</span>
                      <span>₹{totals.balanceAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBill(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingBill ? 'Update Bill' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Bill Modal */}
      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Bill Details - {selectedBill.bill_number}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Supplier:</strong> {selectedBill.supplier_name}</div>
                <div><strong>Bill Date:</strong> {new Date(selectedBill.bill_date).toLocaleDateString()}</div>
                <div><strong>Receive Date:</strong> {new Date(selectedBill.receive_date).toLocaleDateString()}</div>
                <div><strong>Payment Mode:</strong> {selectedBill.payment_mode}</div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Items</h3>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-left">Quantity</th>
                      <th className="px-4 py-2 text-left">Unit Price</th>
                      <th className="px-4 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.items?.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{item.item_name}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-2">₹{parseFloat(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 bg-gray-50 p-4 rounded">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(selectedBill.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({selectedBill.tax_percentage}%):</span>
                    <span>₹{parseFloat(selectedBill.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Charges:</span>
                    <span>₹{parseFloat(selectedBill.extra_charges || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{parseFloat(selectedBill.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Paid:</span>
                    <span>₹{parseFloat(selectedBill.advance_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Balance:</span>
                    <span>₹{parseFloat(selectedBill.balance_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
