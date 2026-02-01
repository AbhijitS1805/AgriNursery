import { useState, useEffect } from 'react';
import { MapPinIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [formData, setFormData] = useState({
    booking_id: '',
    vehicle_id: '',
    driver_id: '',
    delivery_date: '',
    delivery_slot: '',
    delivery_address: '',
    customer_notes: ''
  });

  useEffect(() => {
    fetchDeliveries();
    fetchVehicles();
    fetchPersonnel();
    fetchBookings();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/deliveries`);
      setDeliveries(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast.error('Failed to fetch deliveries');
      setDeliveries([]);
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vehicles`);
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchPersonnel = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setPersonnel(response.data);
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      booking_id: '',
      vehicle_id: '',
      driver_id: '',
      delivery_date: '',
      delivery_slot: '',
      delivery_address: '',
      customer_notes: ''
    });
    setShowModal(true);
  };

  const openViewModal = (delivery) => {
    setModalMode('view');
    setSelectedDelivery(delivery);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/deliveries`, formData);
      toast.success('Delivery scheduled successfully');
      setShowModal(false);
      fetchDeliveries();
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule delivery');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`${API_BASE_URL}/deliveries/${id}/status`, { status });
      toast.success(`Delivery ${status.toLowerCase()} successfully`);
      fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery:', error);
      toast.error('Failed to update delivery status');
    }
  };

  const STATUS_COLORS = {
    'Scheduled': 'bg-blue-100 text-blue-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'Failed': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
          <p className="mt-1 text-sm text-gray-500">Schedule and track deliveries</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Schedule Delivery
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total</dt>
                  <dd className="text-lg font-semibold text-gray-900">{deliveries.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => d.status === 'Scheduled').length}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">In Transit</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => d.status === 'In Transit').length}
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
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Delivered</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => d.status === 'Delivered').length}
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
                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => d.status === 'Failed' || d.status === 'Cancelled').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search deliveries..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Failed">Failed</option>
            </select>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delivery #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
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
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by scheduling a delivery from a booking.
                  </p>
                </td>
              </tr>
            ) : (
              deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {delivery.delivery_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.booking_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{delivery.customer_name}</div>
                    <div className="text-sm text-gray-500">{delivery.customer_mobile}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.delivery_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.vehicle_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.driver_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[delivery.status]}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => openViewModal(delivery)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View
                    </button>
                    {delivery.status === 'Scheduled' && (
                      <button 
                        onClick={() => handleUpdateStatus(delivery.id, 'In Transit')}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        Start
                      </button>
                    )}
                    {delivery.status === 'In Transit' && (
                      <button 
                        onClick={() => handleUpdateStatus(delivery.id, 'Delivered')}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {modalMode === 'create' ? 'Schedule Delivery' : 'Delivery Details'}
                    </h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {modalMode === 'view' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delivery #</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.delivery_number}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Booking #</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.booking_number}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Customer</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.customer_name}</p>
                          <p className="text-sm text-gray-500">{selectedDelivery?.customer_mobile}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.delivery_date}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.vehicle_number}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Driver</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.driver_name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[selectedDelivery?.status]}`}>
                              {selectedDelivery?.status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedDelivery?.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Booking *</label>
                        <select
                          required
                          value={formData.booking_id}
                          onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select Booking</option>
                          {bookings.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.booking_number} - {b.customer_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Vehicle *</label>
                          <select
                            required
                            value={formData.vehicle_id}
                            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select Vehicle</option>
                            {vehicles.filter(v => v.status === 'Available').map(v => (
                              <option key={v.id} value={v.id}>
                                {v.vehicle_number} - {v.vehicle_type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Driver *</label>
                          <select
                            required
                            value={formData.driver_id}
                            onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select Driver</option>
                            {personnel.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.full_name} ({p.employee_code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Delivery Date *</label>
                          <input
                            type="date"
                            required
                            value={formData.delivery_date}
                            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                          <select
                            value={formData.delivery_slot}
                            onChange={(e) => setFormData({ ...formData, delivery_slot: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select Slot</option>
                            <option value="Morning (8-12)">Morning (8-12)</option>
                            <option value="Afternoon (12-4)">Afternoon (12-4)</option>
                            <option value="Evening (4-8)">Evening (4-8)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Delivery Address *</label>
                        <textarea
                          required
                          rows={3}
                          value={formData.delivery_address}
                          onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Customer Notes</label>
                        <textarea
                          rows={2}
                          value={formData.customer_notes}
                          onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Schedule Delivery
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
