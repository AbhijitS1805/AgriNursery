import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Polyhouses() {
  const [utilization, setUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolyhouse, setEditingPolyhouse] = useState(null);
  const [formData, setFormData] = useState({
    polyhouse_name: '',
    location: '',
    area_sqm: '',
    environment_type: 'shade-net'
  });

  useEffect(() => {
    loadPolyhouses();
  }, []);

  const loadPolyhouses = async () => {
    try {
      const data = await api.get('/polyhouses/utilization');
      setUtilization(data.data);
    } catch (error) {
      console.error('Error loading polyhouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPolyhouse(null);
    setFormData({
      polyhouse_name: '',
      location: '',
      area_sqm: '',
      environment_type: 'shade-net'
    });
    setShowModal(true);
  };

  const handleEdit = (polyhouse) => {
    setEditingPolyhouse(polyhouse);
    setFormData({
      polyhouse_name: polyhouse.polyhouse_name,
      location: polyhouse.location || '',
      area_sqm: polyhouse.area_sqm || '',
      environment_type: polyhouse.environment_type || 'shade-net'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPolyhouse) {
        await api.put(`/polyhouses/${editingPolyhouse.id}`, formData);
      } else {
        await api.post('/polyhouses', formData);
      }
      setShowModal(false);
      loadPolyhouses();
    } catch (error) {
      console.error('Error saving polyhouse:', error);
      alert('Error saving polyhouse: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this polyhouse?')) return;
    try {
      await api.delete(`/polyhouses/${id}`);
      loadPolyhouses();
    } catch (error) {
      console.error('Error deleting polyhouse:', error);
      alert('Error deleting polyhouse');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading polyhouses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Polyhouse Capacity Utilization</h2>
        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Polyhouse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {utilization.length === 0 ? (
          <div className="col-span-3 bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No polyhouses yet. Create your first one!</p>
          </div>
        ) : (
          utilization.map((poly) => {
            const utilizationPct = parseFloat(poly.utilization_percentage || 0);
            const getColor = () => {
              if (utilizationPct >= 90) return 'text-red-600';
              if (utilizationPct >= 70) return 'text-yellow-600';
              return 'text-green-600';
            };

            return (
              <div key={poly.id} className="bg-white rounded-lg shadow p-6 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(poly)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(poly.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{poly.polyhouse_name}</h3>
                
                {poly.using_area_estimate && (
                  <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Using area-based estimate. Add sections for accurate tracking.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Capacity:</span>
                    <span className="font-medium">
                      {poly.total_capacity || 0} slots
                      {poly.using_area_estimate && <span className="text-xs text-gray-500 ml-1">(est.)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Occupied:</span>
                    <span className="font-medium">{poly.occupied_capacity || 0} slots</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available:</span>
                    <span className={`font-medium ${(poly.available_capacity || 0) < 0 ? 'text-red-600' : ''}`}>
                      {poly.available_capacity || 0} slots
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Utilization</span>
                      <span className={`text-lg font-bold ${getColor()}`}>
                        {utilizationPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          utilizationPct >= 90
                            ? 'bg-red-500'
                            : utilizationPct >= 70
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingPolyhouse ? 'Edit Polyhouse' : 'Create New Polyhouse'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Polyhouse Name</label>
                <input
                  type="text"
                  required
                  value={formData.polyhouse_name}
                  onChange={(e) => setFormData({ ...formData, polyhouse_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq. meters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.area_sqm}
                  onChange={(e) => setFormData({ ...formData, area_sqm: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment Type</label>
                <select
                  value={formData.environment_type}
                  onChange={(e) => setFormData({ ...formData, environment_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="shade-net">Shade Net</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="mist-house">Mist House</option>
                  <option value="open">Open</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  {editingPolyhouse ? 'Update' : 'Create'}
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
    </div>
  );
}
