import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, PencilIcon, TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [movingBatch, setMovingBatch] = useState(null);
  const [formData, setFormData] = useState({
    batch_code: '',
    plant_variety: '',
    initial_quantity: '',
    section_id: '',
    source_type: 'in-house',
    supplier_id: ''
  });
  const [moveData, setMoveData] = useState({
    to_section_id: '',
    quantity_moved: '',
    movement_reason: 'Growth Stage Change',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchesData, sectionsData, varietiesData] = await Promise.all([
        api.get('/batches/active'),
        api.get('/batches/sections'),
        api.get('/batches/varieties')
      ]);
      setBatches(batchesData.data);
      setSections(sectionsData.data);
      setVarieties(varietiesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBatch(null);
    setFormData({
      batch_code: '',
      plant_variety: '',
      initial_quantity: '',
      section_id: '',
      source_type: 'in-house',
      supplier_id: ''
    });
    setShowModal(true);
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_code: batch.batch_code,
      plant_variety: batch.plant_variety,
      initial_quantity: batch.initial_quantity,
      section_id: batch.section_id || '',
      source_type: batch.source_type,
      supplier_id: batch.supplier_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await api.put(`/batches/${editingBatch.id}`, formData);
      } else {
        await api.post('/batches', formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Error saving batch: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      await api.delete(`/batches/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Error deleting batch');
    }
  };

  // Move batch to polyhouse
  const handleMoveToPolyhouse = (batch) => {
    setMovingBatch(batch);
    setMoveData({
      to_section_id: '',
      quantity_moved: batch.current_quantity,
      movement_reason: 'Growth Stage Change',
      notes: ''
    });
    setShowMoveModal(true);
  };

  const handleSubmitMove = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches/move', {
        batch_id: movingBatch.id,
        ...moveData,
        quantity_moved: parseInt(moveData.quantity_moved)
      });
      setShowMoveModal(false);
      alert('Batch moved to polyhouse successfully!');
      loadData();
    } catch (error) {
      console.error('Error moving batch:', error);
      alert('Error moving batch: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading batches...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Active Batches</h2>
        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Batch
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variety</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Plant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{batch.batch_code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{batch.plant_variety}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {batch.current_stage}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{batch.current_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">{batch.full_location || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  ₹{parseFloat(batch.cost_per_plant || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  ₹{parseFloat(batch.current_value || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleMoveToPolyhouse(batch)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title="Move to Polyhouse"
                  >
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(batch)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(batch.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingBatch ? 'Edit Batch' : 'Create New Batch'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Code</label>
                <input
                  type="text"
                  required
                  value={formData.batch_code}
                  onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plant Variety</label>
                <input
                  type="text"
                  required
                  value={formData.plant_variety}
                  onChange={(e) => setFormData({ ...formData, plant_variety: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                <input
                  type="number"
                  required
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select
                  value={formData.source_type}
                  onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="in-house">In-House</option>
                  <option value="purchased">Purchased</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  {editingBatch ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move to Polyhouse Modal */}
      {showMoveModal && movingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              Move Batch to Polyhouse
            </h3>
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>Batch:</strong> {movingBatch.batch_code}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Current Location:</strong> {movingBatch.full_location || 'Not assigned'}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Quantity:</strong> {movingBatch.current_quantity} plants
              </p>
            </div>
            <form onSubmit={handleSubmitMove} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Move to Section *
                </label>
                <select
                  required
                  value={moveData.to_section_id}
                  onChange={(e) => setMoveData({ ...moveData, to_section_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select section...</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.polyhouse_name} - {section.section_name} 
                      ({section.available_capacity}/{section.total_capacity} available)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Move *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={movingBatch.current_quantity}
                  value={moveData.quantity_moved}
                  onChange={(e) => setMoveData({ ...moveData, quantity_moved: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Movement Reason
                </label>
                <select
                  value={moveData.movement_reason}
                  onChange={(e) => setMoveData({ ...moveData, movement_reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="Germination">Germination Complete</option>
                  <option value="Growth Stage Change">Growth Stage Change</option>
                  <option value="Space Optimization">Space Optimization</option>
                  <option value="Disease Control">Disease Control</option>
                  <option value="Climate Control">Climate Control Needed</option>
                  <option value="Ready for Hardening">Ready for Hardening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={moveData.notes}
                  onChange={(e) => setMoveData({ ...moveData, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows="2"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                  Move Batch
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
