import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [bills, setBills] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [newValue, setNewValue] = useState('');
  const [formData, setFormData] = useState({
    sku_code: '',
    item_name: '',
    product_type: 'product',
    category_id: '1',
    sub_category: '',
    varieties: '',
    supplier_id: '',
    company: '',
    expiry_date: '',
    hsn_code: '',
    unit_of_measure: 'kg',
    opening_stock: '0',
    current_stock: '0',
    selling_price: '0.00',
    gst_included: true,
    gst_percentage: '18',
    cost_price: '0.00',
    minimum_stock: '',
    maximum_stock: '',
    bill_id: '' // Just link to existing bill
  });
  const [transactionData, setTransactionData] = useState({
    transaction_type: 'purchase',
    quantity: '',
    unit_cost: '',
    supplier_id: ''
  });

  useEffect(() => {
    loadInventory();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [categoriesData, suppliersData, subCategoriesData, companiesData, unitsData, billsData] = await Promise.all([
        api.get('/master/categories'),
        api.get('/master/suppliers'),
        api.get('/master/sub-categories'),
        api.get('/master/companies'),
        api.get('/master/units'),
        api.get('/purchases/bills')
      ]);
      setCategories(categoriesData.data.map(cat => ({ id: cat.id.toString(), name: cat.category_name })));
      setSuppliers(suppliersData.data.map(sup => ({ id: sup.id.toString(), name: sup.supplier_name })));
      setSubCategories(subCategoriesData.data.map(sub => sub.sub_category_name));
      setCompanies(companiesData.data.map(comp => ({ id: comp.company_code, name: comp.company_name })));
      setUnits(unitsData.data.map(unit => unit.unit_code));
      setBills(billsData.data || []);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const [itemsData, lowStockData] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/items/low-stock'),
      ]);
      setItems(itemsData.data);
      setLowStock(lowStockData.data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSKUCode = () => {
    // Generate SKU like: ITEM-YYYYMMDD-XXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ITEM-${dateStr}-${randomNum}`;
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    const newSKU = generateSKUCode();
    setFormData({
      sku_code: newSKU,
      item_name: '',
      product_type: 'product',
      category_id: '1',
      sub_category: '',
      varieties: '',
      supplier_id: '',
      company: '',
      expiry_date: '',
      hsn_code: '',
      unit_of_measure: 'kg',
      opening_stock: '0',
      current_stock: '0',
      selling_price: '0.00',
      gst_included: true,
      gst_percentage: '18',
      cost_price: '0.00',
      minimum_stock: '',
      maximum_stock: '',
      // Bill linkage
      bill_id: ''
    });
    setShowItemModal(true);
  };

  const handleEditItem = (item) => {
    console.log('Editing item:', item); // Debug log
    setEditingItem(item);
    const formValues = {
      sku_code: item.sku_code || '',
      item_name: item.item_name || '',
      product_type: item.product_type || 'product',
      category_id: item.category_id?.toString() || '1',
      sub_category: item.sub_category || '',
      varieties: item.varieties || '',
      supplier_id: item.supplier_id?.toString() || '',
      company: item.company || '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      hsn_code: item.hsn_code || '',
      unit_of_measure: item.unit_of_measure || 'kg',
      opening_stock: item.opening_stock?.toString() || item.current_stock?.toString() || '0',
      current_stock: item.current_stock?.toString() || '0',
      selling_price: item.selling_price?.toString() || item.unit_cost?.toString() || '0.00',
      gst_included: item.gst_included !== false,
      gst_percentage: item.gst_percentage?.toString() || '18',
      cost_price: item.cost_price?.toString() || item.unit_cost?.toString() || '0.00',
      minimum_stock: item.minimum_stock?.toString() || '',
      maximum_stock: item.maximum_stock?.toString() || '',
      // Bill linkage
      bill_id: item.bill_id?.toString() || ''
    };
    console.log('Form values:', formValues); // Debug log
    setFormData(formValues);
    setShowItemModal(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      // Prepare data with computed fields
      const submitData = {
        ...formData,
        unit_cost: formData.cost_price, // Set unit_cost to match cost_price
        current_stock: editingItem ? formData.current_stock : formData.opening_stock // For new items, current_stock = opening_stock
      };

      if (editingItem) {
        await api.put(`/inventory/items/${editingItem.id}`, submitData);
      } else {
        await api.post('/inventory/items', submitData);
      }
      setShowItemModal(false);
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      
      // User-friendly error messages
      if (errorMessage.includes('duplicate key') && errorMessage.includes('sku_code')) {
        alert(`❌ Item Code "${formData.sku_code}" already exists!\n\nPlease use a different Item Code/Lot Number.`);
      } else if (errorMessage.includes('duplicate key') && errorMessage.includes('item_name')) {
        alert(`❌ Item Name "${formData.item_name}" already exists!\n\nPlease use a different name.`);
      } else {
        alert('❌ Error saving item:\n\n' + errorMessage);
      }
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item');
    }
  };

  const handleTransaction = (item, type) => {
    setSelectedItem(item);
    setTransactionData({
      transaction_type: type,
      quantity: '',
      unit_cost: '',
      supplier_id: ''
    });
    setShowTransactionModal(true);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/transactions', {
        item_id: selectedItem.id,
        transaction_date: new Date().toISOString().split('T')[0], // Add transaction date
        ...transactionData
      });
      setShowTransactionModal(false);
      loadInventory();
      alert('✅ Transaction completed successfully!');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('❌ Error creating transaction: ' + (error.response?.data?.error || error.response?.data?.message || error.message));
    }
  };

  const handleAddCategory = async () => {
    if (newValue.trim()) {
      try {
        const response = await api.post('/master/categories', {
          category_name: newValue.trim(),
          category_type: 'consumable'
        });
        const newCat = response.data;
        setCategories([...categories, { id: newCat.id.toString(), name: newCat.category_name }]);
        setFormData({ ...formData, category_id: newCat.id.toString() });
        setNewValue('');
        setShowCategoryModal(false);
      } catch (error) {
        console.error('Error adding category:', error);
        alert('Error adding category: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAddSubCategory = async () => {
    if (newValue.trim()) {
      try {
        const response = await api.post('/master/sub-categories', {
          sub_category_name: newValue.trim()
        });
        const newSub = response.data;
        setSubCategories([...subCategories, newSub.sub_category_name]);
        setFormData({ ...formData, sub_category: newSub.sub_category_name });
        setNewValue('');
        setShowSubCategoryModal(false);
      } catch (error) {
        console.error('Error adding sub-category:', error);
        alert('Error adding sub-category: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAddSupplier = async () => {
    if (newValue.trim()) {
      try {
        const response = await api.post('/master/suppliers', {
          supplier_name: newValue.trim()
        });
        const newSup = response.data;
        setSuppliers([...suppliers, { id: newSup.id.toString(), name: newSup.supplier_name }]);
        setFormData({ ...formData, supplier_id: newSup.id.toString() });
        setNewValue('');
        setShowSupplierModal(false);
      } catch (error) {
        console.error('Error adding supplier:', error);
        alert('Error adding supplier: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAddCompany = async () => {
    if (newValue.trim()) {
      try {
        const response = await api.post('/master/companies', {
          company_name: newValue.trim()
        });
        const newComp = response.data;
        setCompanies([...companies, { id: newComp.company_code, name: newComp.company_name }]);
        setFormData({ ...formData, company: newComp.company_code });
        setNewValue('');
        setShowCompanyModal(false);
      } catch (error) {
        console.error('Error adding company:', error);
        alert('Error adding company: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAddUnit = async () => {
    if (newValue.trim()) {
      try {
        const response = await api.post('/master/units', {
          unit_name: newValue.trim()
        });
        const newUnit = response.data;
        setUnits([...units, newUnit.unit_code]);
        setFormData({ ...formData, unit_of_measure: newUnit.unit_code });
        setNewValue('');
        setShowUnitModal(false);
      } catch (error) {
        console.error('Error adding unit:', error);
        alert('Error adding unit: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Low Stock Alert</h3>
          <p className="text-yellow-700">{lowStock.length} items are running low on stock</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Items</h2>
        <button
          onClick={handleCreateItem}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const isLowStock = parseFloat(item.current_stock) <= parseFloat(item.minimum_stock);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.sku_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.item_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.category_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {parseFloat(item.current_stock).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {parseFloat(item.minimum_stock).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.unit_of_measure}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLowStock ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Low Stock</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Normal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransaction(item, 'purchase')}
                        className="text-green-600 hover:text-green-900"
                        title="Stock In"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleTransaction(item, 'consumption')}
                        className="text-orange-600 hover:text-orange-900"
                        title="Stock Out"
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingItem ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmitItem} className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lot No. / Item Code
                    {!editingItem && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, sku_code: generateSKUCode() })}
                        className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                        title="Generate new code"
                      >
                        🔄 Generate
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku_code}
                    onChange={(e) => setFormData({ ...formData, sku_code: e.target.value.trim() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ITEM-20251225-001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="product">Product</option>
                    <option value="raw-material">Raw Material</option>
                    <option value="finished-good">Finished Good</option>
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub Category
                    <button 
                      type="button" 
                      onClick={() => { setNewValue(''); setShowSubCategoryModal(true); }}
                      className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                      title="Add new subcategory"
                    >
                      ➕
                    </button>
                  </label>
                  <select
                    value={formData.sub_category}
                    onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {subCategories.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Varieties</label>
                  <input
                    type="text"
                    value={formData.varieties}
                    onChange={(e) => setFormData({ ...formData, varieties: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Organic, Hybrid"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                    <button 
                      type="button" 
                      onClick={() => { setNewValue(''); setShowCategoryModal(true); }}
                      className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                      title="Add new category"
                    >
                      ➕
                    </button>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suppliers
                    <button 
                      type="button" 
                      onClick={() => { setNewValue(''); setShowSupplierModal(true); }}
                      className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                      title="Add new supplier"
                    >
                      ➕
                    </button>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                    <button 
                      type="button" 
                      onClick={() => { setNewValue(''); setShowCompanyModal(true); }}
                      className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                      title="Add new company"
                    >
                      ➕
                    </button>
                  </label>
                  <select
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 31010000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                    <button 
                      type="button" 
                      onClick={() => { setNewValue(''); setShowUnitModal(true); }}
                      className="ml-2 text-blue-500 text-xs hover:text-blue-700"
                      title="Add new unit"
                    >
                      ➕
                    </button>
                  </label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {units.map((unit, idx) => (
                      <option key={idx} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.gst_included}
                        onChange={() => setFormData({ ...formData, gst_included: true })}
                        className="mr-2"
                      />
                      Included
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.gst_included}
                        onChange={() => setFormData({ ...formData, gst_included: false })}
                        className="mr-2"
                      />
                      Excluded
                    </label>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gst_percentage}
                    onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price / Production Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 6 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Purchase Bill Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Link to Purchase Bill
                </h3>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Bill (Optional)</label>
                    <select
                      value={formData.bill_id}
                      onChange={(e) => setFormData({ ...formData, bill_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- No Bill / Add Later --</option>
                      {bills.map(bill => (
                        <option key={bill.id} value={bill.id}>
                          {bill.bill_number} - {bill.supplier_name} (₹{bill.total_amount})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open('/purchases/bills', '_blank')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Bill
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Link this item to a purchase bill or create a new bill in the Purchase Bills page
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {transactionData.transaction_type === 'purchase' ? 'Stock In' : 'Stock Out'} - {selectedItem?.item_name}
            </h3>
            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              {transactionData.transaction_type === 'purchase' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transactionData.unit_cost}
                    onChange={(e) => setTransactionData({ ...transactionData, unit_cost: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Category</h3>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter category name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCategoryModal(false); setNewValue(''); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add SubCategory Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Sub Category</h3>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter sub category name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSubCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => { setShowSubCategoryModal(false); setNewValue(''); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Supplier</h3>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter supplier name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSupplier}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => { setShowSupplierModal(false); setNewValue(''); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Company</h3>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter company name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCompany}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCompanyModal(false); setNewValue(''); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Unit of Measure</h3>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter unit (e.g., tons, boxes)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddUnit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => { setShowUnitModal(false); setNewValue(''); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
