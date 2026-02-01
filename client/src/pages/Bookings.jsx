import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Confirmed': 'bg-blue-100 text-blue-800',
  'Ready': 'bg-green-100 text-green-800',
  'Partially Delivered': 'bg-purple-100 text-purple-800',
  'Delivered': 'bg-gray-100 text-gray-800',
  'Cancelled': 'bg-red-100 text-red-800'
};

// Helper function to format date without timezone issues
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Extract date part and create date in local timezone
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    farmer_id: '',
    required_date: '',
    discount_percent: 0,
    tax_percent: 0,
    notes: '',
    internal_notes: '',
    items: []
  });

  useEffect(() => {
    fetchBookings();
    fetchFarmers();
    fetchAvailablePlants();
    fetchStats();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await api.get('/farmers');
      setFarmers(response);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    }
  };

  const fetchAvailablePlants = async () => {
    try {
      const response = await api.get('/bookings/available-plants');
      setAvailablePlants(response);
    } catch (error) {
      console.error('Error fetching available plants:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/bookings/stats');
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleOpenModal = async (booking = null) => {
    if (booking) {
      // Fetch full booking details including items
      try {
        // Note: api.get already returns the data (not response.data) due to response interceptor
        const fullBooking = await api.get(`/bookings/${booking.id}`);
        
        if (!fullBooking || !fullBooking.farmer_id) {
          console.error('Invalid booking data received:', fullBooking);
          toast.error('Invalid booking data received');
          return;
        }
        
        setSelectedBooking(fullBooking);
        setFormData({
          farmer_id: fullBooking.farmer_id,
          required_date: fullBooking.required_date ? fullBooking.required_date.split('T')[0] : '',
          discount_percent: fullBooking.discount_percent || 0,
          tax_percent: fullBooking.tax_percent || 0,
          notes: fullBooking.notes || '',
          internal_notes: fullBooking.internal_notes || '',
          items: fullBooking.items || []
        });
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error(error.response?.data?.message || 'Failed to load booking details');
        return;
      }
    } else {
      // New booking
      setSelectedBooking(null);
      setFormData({
        farmer_id: '',
        required_date: '',
        discount_percent: 0,
        tax_percent: 0,
        notes: '',
        internal_notes: '',
        items: [{ plant_name: '', production_id: '', quantity: 1, unit_price: 0 }]
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
    setFormData({
      farmer_id: '',
      required_date: '',
      discount_percent: 0,
      tax_percent: 0,
      notes: '',
      internal_notes: '',
      items: []
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-fill data when production is selected
    if (field === 'production_id' && value) {
      const plant = availablePlants.find(p => p.id === parseInt(value));
      if (plant) {
        newItems[index].plant_name = plant.plant_name;
        newItems[index].unit_price = plant.suggested_price || 0;
      }
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { plant_name: '', production_id: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    if (selectedBooking) {
      // When viewing, use selectedBooking data
      return {
        subtotal: parseFloat(selectedBooking.subtotal) || 0,
        discount: parseFloat(selectedBooking.discount_amount) || 0,
        tax: parseFloat(selectedBooking.tax_amount) || 0,
        total: parseFloat(selectedBooking.total_amount) || 0
      };
    }
    
    // When creating, calculate from formData
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discount = subtotal * (formData.discount_percent / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (formData.tax_percent / 100);
    const total = subtotal - discount + tax;
    
    return { subtotal, discount, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedBooking) {
        // Update existing booking
        await api.put(`/bookings/${selectedBooking.id}`, formData);
      } else {
        // Create new booking
        await api.post('/bookings', formData);
      }
      
      fetchBookings();
      fetchStats();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking: ' + (error.response?.data?.message || error.message));
    }
  };

  const generateInvoice = async (bookingId) => {
    if (!confirm('Generate invoice for this booking?')) return;
    
    try {
      await api.post('/sales-invoices', {
        booking_id: bookingId,
        due_days: 30,
        notes: 'Thank you for your business!'
      });
      
      fetchBookings();
      alert('Invoice generated successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredBookings = (bookings || []).filter(booking => {
    const matchesSearch = 
      booking.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discount, tax, total } = calculateTotal();

  if (loading) {
    return <div className="p-6">Loading bookings...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plant Bookings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage farmer plant bookings and orders
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total_bookings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.confirmed_bookings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.pending_bookings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyRupeeIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      ₹{parseFloat(stats.total_booking_value || 0).toLocaleString('en-IN')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by booking number or farmer..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Ready">Ready</option>
            <option value="Partially Delivered">Partially Delivered</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Booking
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Farmer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
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
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.booking_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.farmer_name}</div>
                  <div className="text-sm text-gray-500">{booking.farmer_mobile}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(booking.booking_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(booking.required_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.item_count} items ({booking.total_quantity} plants)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ₹{parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[booking.status]}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(booking)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                    {!booking.invoice_number && booking.status !== 'Cancelled' && (
                      <button
                        onClick={() => generateInvoice(booking.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Invoice
                      </button>
                    )}
                    {booking.invoice_number && (
                      <span className="text-gray-500 text-xs">
                        {booking.invoice_number}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No bookings found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBooking ? 'View Booking Details' : 'Create New Booking'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Farmer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Farmer <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="farmer_id"
                    value={formData.farmer_id}
                    onChange={handleInputChange}
                    required
                    disabled={selectedBooking}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  >
                    <option value="">Select Farmer</option>
                    {farmers.map(farmer => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.farmer_name} ({farmer.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Required Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="required_date"
                    value={formData.required_date}
                    onChange={handleInputChange}
                    required
                    disabled={selectedBooking}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>

                {/* Discount % */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    name="discount_percent"
                    value={formData.discount_percent}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={selectedBooking}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>

                {/* Tax % */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax/GST %
                  </label>
                  <input
                    type="number"
                    name="tax_percent"
                    value={formData.tax_percent}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={selectedBooking}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    disabled={selectedBooking}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  />
                </div>

                {!selectedBooking && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      name="internal_notes"
                      value={formData.internal_notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Staff notes (not visible to farmer)"
                    />
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Items <span className="text-red-500">*</span>
                  </label>
                  {!selectedBooking && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      + Add Item
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(selectedBooking ? (selectedBooking.items || []) : formData.items).map((item, index) => (
                    <div key={index} className="flex gap-2 items-start border p-3 rounded">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <div>
                          <select
                            value={item.production_id}
                            onChange={(e) => handleItemChange(index, 'production_id', e.target.value)}
                            disabled={selectedBooking}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          >
                            <option value="">Select Plant</option>
                            {availablePlants.map(plant => (
                              <option key={plant.id} value={plant.id}>
                                {plant.plant_name} ({plant.available_quantity} available)
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <input
                            type="number"
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            required
                            disabled={selectedBooking}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          />
                        </div>
                        
                        <div>
                          <input
                            type="number"
                            placeholder="Price per plant"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            required
                            disabled={selectedBooking}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <span className="text-sm font-medium">
                            ₹{(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {!selectedBooking && formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 mb-4">
                <div className="flex justify-end space-y-2 flex-col">
                  <div className="flex justify-between items-center w-64 ml-auto">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center w-64 ml-auto">
                    <span className="text-sm text-gray-600">Discount ({selectedBooking ? selectedBooking.discount_percent : formData.discount_percent}%):</span>
                    <span className="text-sm font-medium text-red-600">-₹{discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center w-64 ml-auto">
                    <span className="text-sm text-gray-600">Tax ({selectedBooking ? selectedBooking.tax_percent : formData.tax_percent}%):</span>
                    <span className="text-sm font-medium">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center w-64 ml-auto border-t pt-2">
                    <span className="text-base font-semibold">Total:</span>
                    <span className="text-base font-bold text-indigo-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {selectedBooking ? 'Close' : 'Cancel'}
                </button>
                {!selectedBooking && (
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create Booking
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
