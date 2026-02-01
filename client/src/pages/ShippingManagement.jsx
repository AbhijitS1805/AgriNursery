import { useState, useEffect } from 'react';
import { TruckIcon, PlusIcon, PrinterIcon, MapPinIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function ShippingManagement() {
  const [shipments, setShipments] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [rateQuote, setRateQuote] = useState(null);

  const [formData, setFormData] = useState({
    reference_type: 'sales_order',
    reference_id: '',
    customer_id: '',
    carrier_id: '',
    service_type: 'standard',
    destination_name: '',
    destination_address: '',
    destination_city: '',
    destination_state: '',
    destination_pincode: '',
    destination_phone: '',
    total_weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    handling_instructions: 'Handle with care - Live plants',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shipmentsData, carriersData, customersData] = await Promise.all([
        api.get('/shipping'),
        api.get('/shipping/carriers'),
        api.get('/sales/customers')
      ]);
      setShipments(shipmentsData.data || []);
      setCarriers(carriersData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShipmentDetails = async (id) => {
    try {
      const response = await api.get(`/shipping/${id}`);
      setSelectedShipment(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading shipment details:', error);
    }
  };

  const handleCalculateRate = async () => {
    if (!formData.carrier_id || !formData.total_weight_kg) {
      alert('Please select carrier and enter weight');
      return;
    }

    try {
      const response = await api.post('/shipping/calculate-rate', {
        carrier_id: formData.carrier_id,
        service_type: formData.service_type,
        origin_pincode: '400001',
        destination_pincode: formData.destination_pincode,
        weight_kg: parseFloat(formData.total_weight_kg),
        is_fragile: true
      });
      setRateQuote(response.data);
    } catch (error) {
      console.error('Error calculating rate:', error);
      alert('Error calculating shipping rate');
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shipping', { ...formData, created_by: 1 });
      setShowModal(false);
      loadData();
      alert('Shipment created successfully');
    } catch (error) {
      console.error('Error creating shipment:', error);
      alert('Error creating shipment');
    }
  };

  const handlePrintLabel = async (id) => {
    try {
      const response = await api.post(`/shipping/${id}/print-label`);
      alert(`Label URL: ${response.data.label_url}`);
      // In production, this would open label in new tab or download PDF
    } catch (error) {
      console.error('Error printing label:', error);
      alert('Error printing label');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/shipping/${id}/status`, {
        status,
        location: '',
        description: `Status updated to ${status}`
      });
      loadData();
      if (showDetailsModal) {
        loadShipmentDetails(id);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      created: 'bg-gray-100 text-gray-800',
      label_printed: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      returned: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredShipments = shipments.filter(s => {
    if (activeTab === 'active') return !['delivered', 'cancelled', 'returned'].includes(s.shipment_status);
    if (activeTab === 'delivered') return s.shipment_status === 'delivered';
    if (activeTab === 'pending') return s.shipment_status === 'created';
    return true;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">Loading...</div></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shipping & Logistics</h1>
        <p className="text-gray-600 mt-1">Manage shipments, carriers, and deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Shipments</p>
              <p className="text-3xl font-bold text-gray-900">{shipments.length}</p>
            </div>
            <TruckIcon className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">In Transit</p>
          <p className="text-3xl font-bold text-purple-600">
            {shipments.filter(s => s.shipment_status === 'in_transit').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Pending Pickup</p>
          <p className="text-3xl font-bold text-yellow-600">
            {shipments.filter(s => s.shipment_status === 'created').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Delivered</p>
          <p className="text-3xl font-bold text-green-600">
            {shipments.filter(s => s.shipment_status === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['active', 'pending', 'delivered', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Create Shipment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipment #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                      {shipment.shipment_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(shipment.shipment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shipment.customer_name || shipment.destination_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {shipment.destination_city}, {shipment.destination_state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shipment.carrier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shipment.total_weight_kg || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(shipment.shipment_status)}`}>
                        {shipment.shipment_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => loadShipmentDetails(shipment.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Details
                      </button>
                      {shipment.shipment_status === 'created' && (
                        <button
                          onClick={() => handlePrintLabel(shipment.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Print Label
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Create Shipment</h2>
              <form onSubmit={handleCreateShipment}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select
                      required
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.customer_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                    <select
                      required
                      value={formData.carrier_id}
                      onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Carrier</option>
                      {carriers.map(c => (
                        <option key={c.id} value={c.id}>{c.carrier_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="express">Express</option>
                      <option value="standard">Standard</option>
                      <option value="economy">Economy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={formData.destination_name}
                      onChange={(e) => setFormData({ ...formData, destination_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      required
                      value={formData.destination_address}
                      onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={formData.destination_city}
                      onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={formData.destination_state}
                      onChange={(e) => setFormData({ ...formData, destination_state: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={formData.destination_pincode}
                      onChange={(e) => setFormData({ ...formData, destination_pincode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={formData.destination_phone}
                      onChange={(e) => setFormData({ ...formData, destination_phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.total_weight_kg}
                      onChange={(e) => setFormData({ ...formData, total_weight_kg: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
                    <input
                      type="number"
                      value={formData.length_cm}
                      onChange={(e) => setFormData({ ...formData, length_cm: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
                    <input
                      type="number"
                      value={formData.width_cm}
                      onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleCalculateRate}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Calculate Shipping Rate
                  </button>
                  {rateQuote && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">Estimated Cost: <strong>₹{rateQuote.total_cost?.toFixed(2)}</strong></p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
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
                    Create Shipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Details Modal */}
      {showDetailsModal && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedShipment.shipment.shipment_number}</h2>
                  <p className="text-gray-600">
                    {selectedShipment.shipment.carrier_name} - {selectedShipment.shipment.service_type}
                  </p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Destination</h3>
                  <p className="text-sm text-gray-700">{selectedShipment.shipment.destination_name}</p>
                  <p className="text-sm text-gray-600">{selectedShipment.shipment.destination_address}</p>
                  <p className="text-sm text-gray-600">
                    {selectedShipment.shipment.destination_city}, {selectedShipment.shipment.destination_state} - {selectedShipment.shipment.destination_pincode}
                  </p>
                  <p className="text-sm text-gray-600">{selectedShipment.shipment.destination_phone}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Shipment Details</h3>
                  <p className="text-sm text-gray-700">Weight: {selectedShipment.shipment.total_weight_kg} kg</p>
                  <p className="text-sm text-gray-700">Tracking: {selectedShipment.shipment.tracking_number || 'Not assigned'}</p>
                  <p className="text-sm text-gray-700">Status: <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedShipment.shipment.shipment_status)}`}>
                    {selectedShipment.shipment.shipment_status.replace(/_/g, ' ')}
                  </span></p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Tracking Timeline</h3>
                <div className="space-y-2">
                  {selectedShipment.tracking.map((track, index) => (
                    <div key={track.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        {index < selectedShipment.tracking.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{track.status}</p>
                        <p className="text-xs text-gray-600">{track.description}</p>
                        <p className="text-xs text-gray-500">{new Date(track.update_time).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {selectedShipment.shipment.shipment_status === 'created' && (
                  <>
                    <button
                      onClick={() => handlePrintLabel(selectedShipment.shipment.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <PrinterIcon className="w-5 h-5" />
                      Print Label
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedShipment.shipment.id, 'picked_up')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark Picked Up
                    </button>
                  </>
                )}
                {selectedShipment.shipment.shipment_status === 'picked_up' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment.id, 'in_transit')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Mark In Transit
                  </button>
                )}
                {selectedShipment.shipment.shipment_status === 'in_transit' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment.id, 'out_for_delivery')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Out for Delivery
                  </button>
                )}
                {selectedShipment.shipment.shipment_status === 'out_for_delivery' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment.id, 'delivered')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
