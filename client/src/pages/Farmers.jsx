import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [filteredFarmers, setFilteredFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);

  // Location data
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    farmer_name: '',
    mobile: '',
    mobile2: '',
    address: '',
    state_id: '',
    district_id: '',
    taluka_id: ''
  });

  useEffect(() => {
    fetchFarmers();
    fetchStates();
  }, []);

  useEffect(() => {
    filterFarmers();
  }, [searchTerm, farmers]);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/farmers');
      setFarmers(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching farmers:', err);
      setError('Failed to load farmers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await api.get('/locations/states');
      setStates(response);
    } catch (err) {
      console.error('Error fetching states:', err);
    }
  };

  const fetchDistricts = async (stateId) => {
    try {
      console.log('Fetching districts for state:', stateId);
      const response = await api.get(`/locations/districts/${stateId}`);
      console.log('Districts received:', response);
      setDistricts(response);
      setTalukas([]);
      setVillages([]);
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  };

  const fetchTalukas = async (districtId) => {
    try {
      console.log('Fetching talukas for district:', districtId);
      const response = await api.get(`/locations/talukas/${districtId}`);
      console.log('Talukas received:', response);
      setTalukas(response);
      setVillages([]);
    } catch (err) {
      console.error('Error fetching talukas:', err);
    }
  };

  const fetchVillages = async (talukaId) => {
    try {
      console.log('Fetching villages for taluka:', talukaId);
      const response = await api.get(`/locations/villages/${talukaId}`);
      console.log('Villages received:', response);
      setVillages(response);
    } catch (err) {
      console.error('Error fetching villages:', err);
    }
  };

  const filterFarmers = () => {
    if (!Array.isArray(farmers)) {
      setFilteredFarmers([]);
      return;
    }

    let filtered = [...farmers];

    if (searchTerm) {
      filtered = filtered.filter(farmer =>
        farmer.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.mobile?.includes(searchTerm) ||
        farmer.taluka_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFarmers(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle cascading dropdowns
    if (name === 'state_id') {
      setFormData(prev => ({ 
        ...prev, 
        state_id: value,
        district_id: '',
        taluka_id: ''
      }));
      setDistricts([]);
      setTalukas([]);
      if (value) {
        fetchDistricts(value);
      }
    } else if (name === 'district_id') {
      setFormData(prev => ({ 
        ...prev, 
        district_id: value,
        taluka_id: ''
      }));
      setTalukas([]);
      if (value) {
        fetchTalukas(value);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenModal = (farmer = null) => {
    if (farmer) {
      setEditingFarmer(farmer);
      setFormData({
        farmer_name: farmer.farmer_name || '',
        mobile: farmer.mobile || '',
        mobile2: farmer.mobile2 || '',
        address: farmer.address || '',
        state_id: farmer.state_id || '',
        district_id: farmer.district_id || '',
        taluka_id: farmer.taluka_id || ''
      });
      
      // Load cascading data for editing
      if (farmer.state_id) fetchDistricts(farmer.state_id);
      if (farmer.district_id) fetchTalukas(farmer.district_id);
    } else {
      setEditingFarmer(null);
      setFormData({
        farmer_name: '',
        mobile: '',
        mobile2: '',
        address: '',
        state_id: '',
        district_id: '',
        taluka_id: ''
      });
      setDistricts([]);
      setTalukas([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFarmer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.farmer_name || !formData.mobile || !formData.state_id || !formData.district_id || !formData.taluka_id) {
      alert('Please fill in all required fields (marked with *)');
      return;
    }

    try {
      if (editingFarmer) {
        await api.put(`/farmers/${editingFarmer.id}`, formData);
        alert('Farmer updated successfully!');
      } else {
        await api.post('/farmers', formData);
        alert('Farmer added successfully!');
      }

      handleCloseModal();
      fetchFarmers();
    } catch (err) {
      console.error('Error saving farmer:', err);
      alert('Error saving farmer: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this farmer?')) {
      return;
    }

    try {
      await api.delete(`/farmers/${id}`);
      alert('Farmer deleted successfully!');
      fetchFarmers();
    } catch (err) {
      console.error('Error deleting farmer:', err);
      alert('Error deleting farmer: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading farmers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farmers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your farmer customers
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add New Farmer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search here"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {/* Farmers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farmer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taluka
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                    <UserPlusIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="font-medium">No farmers found</p>
                    <p className="mt-1">
                      {searchTerm ? 'Try adjusting your search' : 'Add your first farmer to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFarmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {farmer.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {farmer.farmer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {farmer.mobile}
                      {farmer.mobile2 && <div className="text-xs text-gray-500">{farmer.mobile2}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {farmer.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {farmer.taluka_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenModal(farmer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(farmer.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingFarmer ? 'Edit Farmer' : 'Add New Farmers'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Farmer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Farmer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="farmer_name"
                        value={formData.farmer_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                      />
                    </div>

                    {/* Mobile number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mobile number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                      />
                    </div>

                    {/* Mobile number 2 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mobile number 2 (optional)
                      </label>
                      <input
                        type="tel"
                        name="mobile2"
                        value={formData.mobile2}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="state_id"
                        value={formData.state_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.state_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="district_id"
                        value={formData.district_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                        disabled={!formData.state_id}
                      >
                        <option value="">Select District</option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.district_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Taluka */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Taluka <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="taluka_id"
                        value={formData.taluka_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                        disabled={!formData.district_id}
                      >
                        <option value="">Select Taluka</option>
                        {talukas.map((taluka) => (
                          <option key={taluka.id} value={taluka.id}>
                            {taluka.taluka_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
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

export default Farmers;
