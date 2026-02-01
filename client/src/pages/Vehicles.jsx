import { useState, useEffect } from 'react';
import { TruckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: '',
    capacity_kg: '',
    driver_name: '',
    driver_mobile: '',
    fuel_type: 'Diesel',
    status: 'Available'
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vehicles`);
      setVehicles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to fetch vehicles');
      setVehicles([]);
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      vehicle_number: '',
      vehicle_type: '',
      capacity_kg: '',
      driver_name: '',
      driver_mobile: '',
      fuel_type: 'Diesel',
      status: 'Available'
    });
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setModalMode('edit');
    setSelectedVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      capacity_kg: vehicle.capacity_kg,
      driver_name: vehicle.driver_name,
      driver_mobile: vehicle.driver_mobile,
      fuel_type: vehicle.fuel_type || 'Diesel',
      status: vehicle.status
    });
    setShowModal(true);
  };

  const openViewModal = (vehicle) => {
    setModalMode('view');
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await axios.post(`${API_BASE_URL}/vehicles`, formData);
        toast.success('Vehicle added successfully');
      } else if (modalMode === 'edit') {
        await axios.put(`${API_BASE_URL}/vehicles/${selectedVehicle.id}`, formData);
        toast.success('Vehicle updated successfully');
      }
      setShowModal(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to save vehicle');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/vehicles/${id}`);
      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const STATUS_COLORS = {
    'Available': 'bg-green-100 text-green-800',
    'In Use': 'bg-blue-100 text-blue-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Retired': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage delivery vehicles and fleet</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Vehicles</dt>
                  <dd className="text-lg font-semibold text-gray-900">{vehicles.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {vehicles.filter(v => v.status === 'Available').length}
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
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Use</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {vehicles.filter(v => v.status === 'In Use').length}
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
                <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Maintenance</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {vehicles.filter(v => v.status === 'Maintenance').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No vehicles found. Add your first vehicle to get started.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {vehicle.vehicle_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.vehicle_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.capacity_kg} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{vehicle.driver_name}</div>
                    <div className="text-sm text-gray-500">{vehicle.driver_mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[vehicle.status]}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => openViewModal(vehicle)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => openEditModal(vehicle)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {modalMode === 'create' ? 'Add New Vehicle' : modalMode === 'edit' ? 'Edit Vehicle' : 'Vehicle Details'}
                    </h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {modalMode === 'view' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.vehicle_number}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.vehicle_type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Capacity</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.capacity_kg} kg</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driver Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.driver_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driver Mobile</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.driver_mobile}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedVehicle?.fuel_type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[selectedVehicle?.status]}`}>
                            {selectedVehicle?.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.vehicle_number}
                          onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vehicle Type *</label>
                        <select
                          required
                          value={formData.vehicle_type}
                          onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select Type</option>
                          <option value="Pickup Truck">Pickup Truck</option>
                          <option value="Van">Van</option>
                          <option value="Auto Rickshaw">Auto Rickshaw</option>
                          <option value="Tempo">Tempo</option>
                          <option value="Truck">Truck</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Capacity (kg) *</label>
                        <input
                          type="number"
                          required
                          value={formData.capacity_kg}
                          onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driver Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.driver_name}
                          onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Driver Mobile *</label>
                        <input
                          type="tel"
                          required
                          value={formData.driver_mobile}
                          onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                        <select
                          value={formData.fuel_type}
                          onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="Diesel">Diesel</option>
                          <option value="Petrol">Petrol</option>
                          <option value="CNG">CNG</option>
                          <option value="Electric">Electric</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="Available">Available</option>
                          <option value="In Use">In Use</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {modalMode === 'create' ? 'Add Vehicle' : 'Update Vehicle'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
