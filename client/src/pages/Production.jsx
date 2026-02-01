import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, PlayIcon, CheckIcon, CubeIcon } from '@heroicons/react/24/outline';

export default function Production() {
  const [activeTab, setActiveTab] = useState('orders'); // orders, bom, finished-goods
  
  // Production Orders
  const [productionOrders, setProductionOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    plant_variety_id: '',
    planned_quantity: '',
    planned_start_date: '',
    planned_completion_date: ''
  });

  // BOM
  const [bomList, setBomList] = useState([]);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState(null);
  const [bomForm, setBomForm] = useState({
    plant_variety_id: '',
    item_id: '',
    quantity_per_plant: '',
    stage_id: '',
    notes: ''
  });

  // Finished Goods
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({
    batch_id: '',
    selling_price: '',
    quality_grade: 'Standard',
    size: 'Medium'
  });

  // Master Data
  const [plantVarieties, setPlantVarieties] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [growthStages, setGrowthStages] = useState([]);
  const [readyBatches, setReadyBatches] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [varietiesData, itemsData, stagesData] = await Promise.all([
        api.get('/batches/varieties'),
        api.get('/inventory/items'),
        api.get('/batches/stages')
      ]);

      setPlantVarieties(varietiesData.data || []);
      setInventoryItems(itemsData.data || []);
      setGrowthStages(stagesData.data || []);

      if (activeTab === 'orders') {
        const ordersData = await api.get('/production/orders');
        setProductionOrders(ordersData.data || []);
      } else if (activeTab === 'bom') {
        const bomData = await api.get('/production/bom');
        setBomList(bomData.data || []);
      } else if (activeTab === 'finished-goods') {
        const [fgData, batchesData] = await Promise.all([
          api.get('/production/finished-goods'),
          api.get('/batches/active')
        ]);
        setFinishedGoods(fgData.data || []);
        // Filter batches in "Ready for Sale" stage
        setReadyBatches((batchesData.data || []).filter(b => 
          b.current_stage === 'Ready for Sale' || b.current_stage === 'Ready'
        ));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  // PRODUCTION ORDERS
  // ===================================

  const handleCreateOrder = () => {
    setOrderForm({
      plant_variety_id: '',
      planned_quantity: '',
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_completion_date: ''
    });
    setShowOrderModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/production/orders', orderForm);
      setShowOrderModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating production order:', error);
      alert('Error creating production order');
    }
  };

  const handleStartProduction = async (orderId) => {
    if (!confirm('Start production? This will create a batch and consume raw materials.')) return;
    
    try {
      const response = await api.post('/production/orders/start', { production_order_id: orderId });
      alert(`Production started!\nBatch: ${response.data.batch.batch_code}\nMaterials consumed: ${response.data.materials_consumed} items`);
      loadData();
    } catch (error) {
      console.error('Error starting production:', error);
      alert('Error starting production: ' + (error.response?.data?.error || error.message));
    }
  };

  // ===================================
  // BILL OF MATERIALS
  // ===================================

  const handleCreateBOM = () => {
    setEditingBOM(null);
    setBomForm({
      plant_variety_id: '',
      item_id: '',
      quantity_per_plant: '',
      stage_id: '',
      notes: ''
    });
    setShowBOMModal(true);
  };

  const handleEditBOM = (bom) => {
    setEditingBOM(bom);
    setBomForm({
      plant_variety_id: bom.plant_variety_id,
      item_id: bom.item_id,
      quantity_per_plant: bom.quantity_per_plant,
      stage_id: bom.stage_id || '',
      notes: bom.notes || ''
    });
    setShowBOMModal(true);
  };

  const handleSubmitBOM = async (e) => {
    e.preventDefault();
    try {
      if (editingBOM) {
        await api.put(`/production/bom/${editingBOM.id}`, bomForm);
      } else {
        await api.post('/production/bom', bomForm);
      }
      setShowBOMModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving BOM:', error);
      alert('Error saving BOM');
    }
  };

  const handleDeleteBOM = async (id) => {
    if (!confirm('Delete this BOM entry?')) return;
    try {
      await api.delete(`/production/bom/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting BOM:', error);
      alert('Error deleting BOM');
    }
  };

  // ===================================
  // FINISHED GOODS
  // ===================================

  const handleConvertToFinishedGoods = (batch) => {
    setConvertForm({
      batch_id: batch.id,
      selling_price: batch.cost_per_plant ? (parseFloat(batch.cost_per_plant) * 1.5).toFixed(2) : '',
      quality_grade: 'Standard',
      size: 'Medium'
    });
    setShowConvertModal(true);
  };

  const handleSubmitConvert = async (e) => {
    e.preventDefault();
    try {
      await api.post('/production/finished-goods/convert', convertForm);
      setShowConvertModal(false);
      alert('Batch converted to finished goods inventory!');
      loadData();
    } catch (error) {
      console.error('Error converting to finished goods:', error);
      alert('Error converting: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Production Management</h1>
        {activeTab === 'orders' && (
          <button onClick={handleCreateOrder} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            New Production Order
          </button>
        )}
        {activeTab === 'bom' && (
          <button onClick={handleCreateBOM} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add BOM Recipe
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Production Orders
          </button>
          <button
            onClick={() => setActiveTab('bom')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bill of Materials (Recipes)
          </button>
          <button
            onClick={() => setActiveTab('finished-goods')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'finished-goods'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Finished Goods Inventory
          </button>
        </nav>
      </div>

      {/* Production Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plant Variety</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productionOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.po_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{order.plant_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{order.planned_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{order.batch_code || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {order.planned_start_date ? new Date(order.planned_start_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.status === 'planned' && (
                      <button
                        onClick={() => handleStartProduction(order.id)}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1"
                      >
                        <PlayIcon className="w-5 h-5" />
                        Start
                      </button>
                    )}
                    {order.status === 'in-progress' && (
                      <span className="text-blue-600 flex items-center gap-1">
                        <CubeIcon className="w-5 h-5" />
                        In Production
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {productionOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No production orders. Create one to start production.
            </div>
          )}
        </div>
      )}

      {/* BOM Tab */}
      {activeTab === 'bom' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plant Variety</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty per Plant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bomList.map((bom) => (
                <tr key={bom.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{bom.plant_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{bom.item_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {bom.quantity_per_plant} {bom.unit_of_measure}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{bom.stage_name || 'Initial'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{bom.current_stock} {bom.unit_of_measure}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEditBOM(bom)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBOM(bom.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bomList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No BOM recipes defined. Add recipes to automate material consumption.
            </div>
          )}
        </div>
      )}

      {/* Finished Goods Tab */}
      {activeTab === 'finished-goods' && (
        <>
          {/* Ready Batches to Convert */}
          {readyBatches.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-900 mb-2">Batches Ready to Convert to Finished Goods:</h3>
              <div className="space-y-2">
                {readyBatches.map((batch) => (
                  <div key={batch.id} className="flex justify-between items-center bg-white rounded p-3">
                    <div>
                      <span className="font-medium">{batch.batch_code}</span> - {batch.plant_variety} 
                      <span className="text-gray-600 ml-2">({batch.current_quantity} plants)</span>
                    </div>
                    <button
                      onClick={() => handleConvertToFinishedGoods(batch)}
                      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Convert to FG
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finishedGoods.map((fg) => (
                  <tr key={fg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{fg.sku_code}</td>
                    <td className="px-6 py-4 text-gray-700">{fg.item_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{fg.batch_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{fg.available_quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{fg.quality_grade}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">₹{parseFloat(fg.cost_per_unit || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">₹{parseFloat(fg.selling_price).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">₹{parseFloat(fg.total_value || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {finishedGoods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No finished goods yet. Convert ready batches to finished goods inventory.
              </div>
            )}
          </div>
        </>
      )}

      {/* Production Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">New Production Order</h3>
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plant Variety *</label>
                <select
                  required
                  value={orderForm.plant_variety_id}
                  onChange={(e) => setOrderForm({ ...orderForm, plant_variety_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select variety</option>
                  {plantVarieties.map((v) => (
                    <option key={v.id} value={v.id}>{v.common_name} ({v.variety_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={orderForm.planned_quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, planned_quantity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Start Date</label>
                <input
                  type="date"
                  value={orderForm.planned_start_date}
                  onChange={(e) => setOrderForm({ ...orderForm, planned_start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion Date</label>
                <input
                  type="date"
                  value={orderForm.planned_completion_date}
                  onChange={(e) => setOrderForm({ ...orderForm, planned_completion_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {showBOMModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingBOM ? 'Edit' : 'Add'} BOM Recipe</h3>
            <form onSubmit={handleSubmitBOM} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plant Variety *</label>
                <select
                  required
                  disabled={!!editingBOM}
                  value={bomForm.plant_variety_id}
                  onChange={(e) => setBomForm({ ...bomForm, plant_variety_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select variety</option>
                  {plantVarieties.map((v) => (
                    <option key={v.id} value={v.id}>{v.common_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material *</label>
                <select
                  required
                  disabled={!!editingBOM}
                  value={bomForm.item_id}
                  onChange={(e) => setBomForm({ ...bomForm, item_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select material</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.current_stock} {item.unit_of_measure})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity per Plant *</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={bomForm.quantity_per_plant}
                  onChange={(e) => setBomForm({ ...bomForm, quantity_per_plant: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., 0.005 (5 grams)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Growth Stage (Optional)</label>
                <select
                  value={bomForm.stage_id}
                  onChange={(e) => setBomForm({ ...bomForm, stage_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Initial (Seed stage)</option>
                  {growthStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.stage_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={bomForm.notes}
                  onChange={(e) => setBomForm({ ...bomForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows="2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBOMModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Finished Goods Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Convert to Finished Goods</h3>
            <form onSubmit={handleSubmitConvert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price per Plant *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={convertForm.selling_price}
                  onChange={(e) => setConvertForm({ ...convertForm, selling_price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
                <select
                  value={convertForm.quality_grade}
                  onChange={(e) => setConvertForm({ ...convertForm, quality_grade: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Premium">Premium</option>
                  <option value="Standard">Standard</option>
                  <option value="Economy">Economy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={convertForm.size}
                  onChange={(e) => setConvertForm({ ...convertForm, size: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                  <option value="Extra Large">Extra Large</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
