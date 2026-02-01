import { useState, useEffect } from 'react';
import { ClipboardDocumentCheckIcon, XCircleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function QualityInspection() {
  const [inspections, setInspections] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [debitNotes, setDebitNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inspections');

  const [formData, setFormData] = useState({
    reference_type: 'purchase_bill',
    reference_id: '',
    supplier_id: '',
    po_number: '',
    bill_number: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inspectionsData, suppliersData, itemsData, debitNotesData] = await Promise.all([
        api.get('/quality-inspection'),
        api.get('/master/suppliers'),
        api.get('/inventory/items'),
        api.get('/quality-inspection/debit-notes/all')
      ]);
      setInspections(inspectionsData.data || []);
      setSuppliers(suppliersData.data || []);
      setInventoryItems(itemsData.data || []);
      setDebitNotes(debitNotesData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInspectionDetails = async (id) => {
    try {
      const response = await api.get(`/quality-inspection/${id}`);
      setSelectedInspection(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading inspection details:', error);
    }
  };

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    try {
      await api.post('/quality-inspection', formData);
      setShowModal(false);
      loadData();
      setFormData({
        reference_type: 'purchase_bill',
        reference_id: '',
        supplier_id: '',
        po_number: '',
        bill_number: '',
        inspection_date: new Date().toISOString().split('T')[0],
        inspector_name: '',
        items: []
      });
    } catch (error) {
      console.error('Error creating inspection:', error);
      alert('Error creating inspection');
    }
  };

  const handleApproveInspection = async (id) => {
    if (!confirm('Approve this inspection? Accepted items will be added to inventory.')) return;
    
    try {
      await api.put(`/quality-inspection/${id}/approve`, {
        approved_by: 1,
        notes: 'Approved'
      });
      alert('Inspection approved successfully');
      loadData();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error approving inspection:', error);
      alert('Error approving inspection');
    }
  };

  const handleRejectInspection = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    const createDebitNote = confirm('Create debit note for rejected items?');
    
    try {
      await api.put(`/quality-inspection/${id}/reject`, {
        rejection_reason: reason,
        approved_by: 1,
        create_debit_note: createDebitNote
      });
      alert('Inspection rejected' + (createDebitNote ? ' and debit note created' : ''));
      loadData();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error rejecting inspection:', error);
      alert('Error rejecting inspection');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await api.put(`/quality-inspection/items/${itemId}`, updates);
      loadInspectionDetails(selectedInspection.inspection.id);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error updating item');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      conditional_approved: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const addInspectionItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        item_id: '',
        item_name: '',
        batch_number: '',
        ordered_quantity: '',
        received_quantity: '',
        inspected_quantity: '',
        unit_price: '',
        total_value: ''
      }]
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">Loading...</div></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quality Inspection & Control</h1>
        <p className="text-gray-600 mt-1">QC gate for incoming materials with auto debit note generation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Inspections</p>
              <p className="text-3xl font-bold text-gray-900">{inspections.length}</p>
            </div>
            <ClipboardDocumentCheckIcon className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">
            {inspections.filter(i => i.inspection_status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {inspections.filter(i => i.inspection_status === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Debit Notes</p>
          <p className="text-3xl font-bold text-red-600">{debitNotes.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['inspections', 'debit-notes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'inspections' ? 'Quality Inspections' : 'Debit Notes'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'inspections' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(filter => (
                    <button
                      key={filter}
                      className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  New Inspection
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspection #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO/Bill #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inspections.map((inspection) => (
                      <tr key={inspection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                          {inspection.inspection_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {inspection.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {inspection.po_number || inspection.bill_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {inspection.total_items_inspected || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {inspection.pass_percentage ? inspection.pass_percentage.toFixed(1) : '0'}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inspection.inspection_status)}`}>
                            {inspection.inspection_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => loadInspectionDetails(inspection.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'debit-notes' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DN Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {debitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{dn.debit_note_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(dn.debit_note_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{dn.supplier_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dn.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{parseFloat(dn.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dn.status)}`}>
                          {dn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Inspection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Create Quality Inspection</h2>
              <form onSubmit={handleCreateInspection}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.supplier_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date</label>
                    <input
                      type="date"
                      required
                      value={formData.inspection_date}
                      onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                    <input
                      type="text"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Name</label>
                    <input
                      type="text"
                      required
                      value={formData.inspector_name}
                      onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Inspection Items</label>
                    <button
                      type="button"
                      onClick={addInspectionItem}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 mb-2 p-2 border rounded">
                      <select
                        value={item.item_id}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          const selectedItem = inventoryItems.find(i => i.id === parseInt(e.target.value));
                          newItems[index] = {
                            ...newItems[index],
                            item_id: e.target.value,
                            item_name: selectedItem?.item_name || ''
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">Select Item</option>
                        {inventoryItems.map(i => (
                          <option key={i.id} value={i.id}>{i.item_name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Ordered Qty"
                        value={item.ordered_quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].ordered_quantity = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="border rounded px-2 py-1"
                      />
                      <input
                        type="number"
                        placeholder="Received Qty"
                        value={item.received_quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].received_quantity = e.target.value;
                          newItems[index].inspected_quantity = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="border rounded px-2 py-1"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].unit_price = e.target.value;
                          newItems[index].total_value = (parseFloat(e.target.value) * parseFloat(item.received_quantity || 0)).toFixed(2);
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="border rounded px-2 py-1"
                      />
                    </div>
                  ))}
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
                    Create Inspection
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Details Modal */}
      {showDetailsModal && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedInspection.inspection.inspection_number}</h2>
                  <p className="text-gray-600">
                    {selectedInspection.inspection.supplier_name} - {new Date(selectedInspection.inspection.inspection_date).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Inspection Items</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ordered</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Received</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Accepted</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rejected</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInspection.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm">{item.item_name}</td>
                        <td className="px-4 py-2 text-sm">{item.ordered_quantity}</td>
                        <td className="px-4 py-2 text-sm">{item.received_quantity}</td>
                        <td className="px-4 py-2 text-sm">{item.accepted_quantity || 0}</td>
                        <td className="px-4 py-2 text-sm">{item.rejected_quantity || 0}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.quality_status)}`}>
                            {item.quality_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedInspection.inspection.inspection_status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleRejectInspection(selectedInspection.inspection.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircleIcon className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveInspection(selectedInspection.inspection.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
