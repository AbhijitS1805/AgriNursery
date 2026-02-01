import { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

function ReadyCrops() {
  const [readyCrops, setReadyCrops] = useState([]);
  const [filteredCrops, setFilteredCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolyhouse, setSelectedPolyhouse] = useState('all');

  useEffect(() => {
    fetchReadyCrops();
  }, []);

  useEffect(() => {
    filterCrops();
  }, [searchTerm, selectedPolyhouse, readyCrops]);

  const fetchReadyCrops = async () => {
    try {
      setLoading(true);
      const response = await api.get('/production/ready-crops');
      // api interceptor already unwraps response.data, so response is the array directly
      setReadyCrops(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching ready crops:', err);
      setError('Failed to load ready crops. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterCrops = () => {
    // Safety check: ensure readyCrops is an array
    if (!Array.isArray(readyCrops)) {
      setFilteredCrops([]);
      return;
    }

    let filtered = [...readyCrops];

    // Filter by search term (plant name)
    if (searchTerm) {
      filtered = filtered.filter(crop =>
        crop.plant_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by polyhouse
    if (selectedPolyhouse !== 'all') {
      filtered = filtered.filter(crop => crop.polyhouse_id === parseInt(selectedPolyhouse));
    }

    setFilteredCrops(filtered);
  };

  // Get unique polyhouses for filter dropdown
  const uniquePolyhouses = (readyCrops || []).reduce((acc, crop) => {
    if (crop.polyhouse_id && !acc.find(ph => ph.id === crop.polyhouse_id)) {
      acc.push({ id: crop.polyhouse_id, name: crop.polyhouse_name });
    }
    return acc;
  }, []);

  const totalQuantity = (filteredCrops || []).reduce((sum, crop) => sum + parseFloat(crop.quantity || 0), 0);
  const totalValue = (filteredCrops || []).reduce((sum, crop) => sum + parseFloat(crop.total_cost || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading ready crops...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ready Crops Inventory</h1>
          <p className="mt-2 text-sm text-gray-700">
            Plants currently in polyhouses ready for sale
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Plants Ready
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {totalQuantity.toLocaleString()}
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
                <MapPinIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Plant Varieties
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {new Set((filteredCrops || []).map(c => c.plant_name)).size}
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
                <CurrencyRupeeIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Inventory Value
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search Plant Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by plant name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Polyhouse Filter */}
          <div>
            <label htmlFor="polyhouse" className="block text-sm font-medium text-gray-700">
              Filter by Polyhouse
            </label>
            <select
              id="polyhouse"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              value={selectedPolyhouse}
              onChange={(e) => setSelectedPolyhouse(e.target.value)}
            >
              <option value="all">All Polyhouses</option>
              {uniquePolyhouses.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {/* Ready Crops Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plant Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Polyhouse Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost/Plant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCrops.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <CheckCircleIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="font-medium">No ready crops found</p>
                      <p className="mt-1">
                        {searchTerm || selectedPolyhouse !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Start a production and move plants to polyhouse to see them here'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCrops.map((crop) => {
                  const costPerPlant = crop.quantity > 0 ? crop.total_cost / crop.quantity : 0;
                  return (
                    <tr key={crop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{crop.plant_name}</div>
                        <div className="text-sm text-gray-500">ID: {crop.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{crop.quantity}</div>
                        <div className="text-xs text-gray-500">plants</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {crop.polyhouse_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{crop.polyhouse_code || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {crop.section_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {crop.production_date ? new Date(crop.production_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{costPerPlant.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{crop.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Ready for Sale
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      {filteredCrops.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Ready Crops Inventory</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This page shows all plants that have been moved to polyhouses and are ready for sale.
                  The cost per plant includes all production materials used. Total inventory value represents
                  the production cost investment in ready-to-sell plants.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadyCrops;
