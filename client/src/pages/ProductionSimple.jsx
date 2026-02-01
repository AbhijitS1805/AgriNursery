import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function ProductionSimple() {
  const [productions, setProductions] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [polyhouses, setPolyhouses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    plant_name: '',
    quantity: '',
    seeds_per_plant: '1',
    items_used: [{ item_id: '', quantity_used: '', unit: '' }]
  });

  const [moveData, setMoveData] = useState({
    polyhouse_id: '',
    section: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, itemsData, polyhouseData] = await Promise.all([
        api.get('/production/simple'),
        api.get('/inventory/items'),
        api.get('/polyhouses')
      ]);
      console.log('Inventory items loaded:', itemsData.data); // Debug log
      console.log('Polyhouses loaded:', polyhouseData.data); // Debug log
      setProductions(prodData.data || []);
      setInventoryItems(itemsData.data || []);
      setPolyhouses(polyhouseData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items_used: [...formData.items_used, { item_id: '', quantity_used: '', unit: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items_used.filter((_, i) => i !== index);
    setFormData({ ...formData, items_used: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items_used];
    newItems[index][field] = value;
    setFormData({ ...formData, items_used: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Calculate total cost and cost per plant
      let totalCost = 0;
      const itemsWithCost = formData.items_used.map(item => {
        const invItem = inventoryItems.find(i => i.id === parseInt(item.item_id));
        const itemCost = parseFloat(invItem?.unit_cost || 0) * parseFloat(item.quantity_used);
        totalCost += itemCost;
        return {
          ...item,
          item_cost: itemCost,
          item_name: invItem?.item_name
        };
      });

      const costPerPlant = totalCost / parseFloat(formData.quantity);

      const submitData = {
        ...formData,
        items_used: itemsWithCost,
        total_cost: totalCost,
        cost_per_plant: costPerPlant
      };

      await api.post('/production/simple', submitData);
      setShowModal(false);
      setFormData({
        plant_name: '',
        quantity: '',
        seeds_per_plant: '1',
        items_used: [{ item_id: '', quantity_used: '', unit: '' }]
      });
      loadData();
      alert(`✅ Production started successfully!\n\nTotal Cost: ₹${totalCost.toFixed(2)}\nCost per Plant: ₹${costPerPlant.toFixed(2)}`);
    } catch (error) {
      console.error('Error creating production:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleMoveToPolyhouse = (production) => {
    setSelectedProduction(production);
    setMoveData({ polyhouse_id: '', section: '' });
    setShowMoveModal(true);
  };

  const handleSubmitMove = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/production/simple/${selectedProduction.id}/move`, moveData);
      setShowMoveModal(false);
      loadData();
      alert('✅ Plants moved to polyhouse successfully!');
    } catch (error) {
      console.error('Error moving to polyhouse:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Growing': return 'bg-yellow-100 text-yellow-800';
      case 'Ready': return 'bg-green-100 text-green-800';
      case 'In Polyhouse': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          <p className="text-gray-600 mt-1">Sow seeds and grow plants</p>
        </div>
        <button
          onClick={() => {
            console.log('Opening modal, inventory items:', inventoryItems.length);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Start Production
        </button>
      </div>

      {/* Productions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plant Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Plant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productions.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No productions yet. Start your first production!
                </td>
              </tr>
            ) : (
              productions.map((prod) => (
                <tr key={prod.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{prod.plant_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{prod.quantity} plants</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-semibold">
                    ₹{parseFloat(prod.cost_per_plant || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ₹{parseFloat(prod.total_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(prod.status)}`}>
                      {prod.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(prod.started_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {prod.polyhouse_name ? `${prod.polyhouse_name} - ${prod.section}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {prod.status === 'Growing' && (
                      <button
                        onClick={() => handleMoveToPolyhouse(prod)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                        Move to Polyhouse
                      </button>
                    )}
                    {prod.status === 'In Polyhouse' && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckIcon className="w-4 h-4" />
                        In Polyhouse
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Start Production Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Start Production</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plant_name}
                    onChange={(e) => setFormData({ ...formData, plant_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Tomato, Rose, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (Plants to Grow) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seeds per Plant <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={formData.seeds_per_plant}
                  onChange={(e) => setFormData({ ...formData, seeds_per_plant: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many seeds needed for 1 plant? (e.g., 1 seed = 1 plant, or 2 seeds = 1 plant)
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Materials Used (Seeds, Cocopeat, Fertilizers, etc.)</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Material
                  </button>
                </div>

                {formData.items_used.map((item, index) => {
                  const selectedItem = inventoryItems.find(i => i.id === parseInt(item.item_id));
                  const itemCost = selectedItem ? parseFloat(selectedItem.unit_cost || 0) * parseFloat(item.quantity_used || 0) : 0;
                  
                  return (
                    <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="block text-xs text-gray-600 mb-1">Material</label>
                          <select
                            required
                            value={item.item_id}
                            onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select Material</option>
                            {inventoryItems.length === 0 ? (
                              <option value="" disabled>No items available</option>
                            ) : (
                              inventoryItems.map((invItem) => (
                                <option key={invItem.id} value={invItem.id}>
                                  {invItem.item_name} (Stock: {invItem.current_stock} {invItem.unit_of_measure})
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={item.quantity_used}
                            onChange={(e) => handleItemChange(index, 'quantity_used', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Cost</label>
                          <div className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-700">
                            ₹{itemCost.toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">&nbsp;</label>
                          {formData.items_used.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="w-full bg-red-100 text-red-600 px-2 py-2 rounded-lg hover:bg-red-200 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedItem && (
                        <div className="mt-2 text-xs text-gray-500">
                          Unit Cost: ₹{selectedItem.unit_cost} per {selectedItem.unit_of_measure}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Cost Summary */}
                {formData.quantity && formData.items_used.some(i => i.item_id && i.quantity_used) && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Cost Summary</h4>
                    {formData.items_used.map((item, index) => {
                      const selectedItem = inventoryItems.find(i => i.id === parseInt(item.item_id));
                      if (!selectedItem || !item.quantity_used) return null;
                      const itemCost = parseFloat(selectedItem.unit_cost || 0) * parseFloat(item.quantity_used);
                      return (
                        <div key={index} className="flex justify-between text-sm text-gray-700 mb-1">
                          <span>{selectedItem.item_name}: {item.quantity_used} {selectedItem.unit_of_measure}</span>
                          <span className="font-medium">₹{itemCost.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-blue-300 mt-2 pt-2">
                      <div className="flex justify-between font-semibold text-blue-900">
                        <span>Total Cost:</span>
                        <span>₹{formData.items_used.reduce((sum, item) => {
                          const invItem = inventoryItems.find(i => i.id === parseInt(item.item_id));
                          return sum + (invItem ? parseFloat(invItem.unit_cost || 0) * parseFloat(item.quantity_used || 0) : 0);
                        }, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-700 text-lg mt-1">
                        <span>Cost per Plant:</span>
                        <span>₹{(formData.items_used.reduce((sum, item) => {
                          const invItem = inventoryItems.find(i => i.id === parseInt(item.item_id));
                          return sum + (invItem ? parseFloat(invItem.unit_cost || 0) * parseFloat(item.quantity_used || 0) : 0);
                        }, 0) / parseFloat(formData.quantity)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move to Polyhouse Modal */}
      {showMoveModal && selectedProduction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Move to Polyhouse</h2>
            <p className="text-gray-600 mb-4">
              Moving <strong>{selectedProduction.quantity} {selectedProduction.plant_name}</strong> plants
            </p>
            <form onSubmit={handleSubmitMove} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Polyhouse <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={moveData.polyhouse_id}
                  onChange={(e) => setMoveData({ ...moveData, polyhouse_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Polyhouse</option>
                  {polyhouses.length === 0 ? (
                    <option value="" disabled>No polyhouses available</option>
                  ) : (
                    polyhouses.map((ph) => (
                      <option key={ph.id} value={ph.id}>
                        {ph.polyhouse_name} ({ph.polyhouse_code})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section/Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={moveData.section}
                  onChange={(e) => setMoveData({ ...moveData, section: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Section A, Row 1, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Move to Polyhouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
