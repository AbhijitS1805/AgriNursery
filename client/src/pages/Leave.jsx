import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Cancelled': 'bg-gray-100 text-gray-800'
};

export default function Leave() {
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('');

  const [formData, setFormData] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    is_half_day: false
  });

  const [actionFormData, setActionFormData] = useState({
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Note: In production, get employee_id from authenticated user context
      // For now, we'll fetch without balance if no employee_id is available
      const promises = [
        axios.get(`${API_URL}/leave`, { params: { status: statusFilter || undefined } }),
        axios.get(`${API_URL}/leave/types`),
        axios.get(`${API_URL}/leave/stats`)
      ];

      // TODO: Add authentication and get employee_id from context
      // For now, leave balance will be empty unless employee_id is provided
      // promises.push(axios.get(`${API_URL}/leave/balance`, { params: { employee_id: currentUser.id } }));

      const [applicationsRes, typesRes, statsRes] = await Promise.all(promises);

      setLeaveApplications(applicationsRes.data || []);
      setLeaveTypes(typesRes.data || []);
      setStats(statsRes.data || {});
      setLeaveBalance([]); // Will be populated when authentication is added
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast.error('Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/leave`, formData);
      toast.success('Leave application submitted successfully');
      setShowApplyModal(false);
      setFormData({
        leave_type_id: '',
        from_date: '',
        to_date: '',
        reason: '',
        is_half_day: false
      });
      fetchData();
    } catch (error) {
      console.error('Error applying leave:', error);
      toast.error(error.response?.data?.message || 'Failed to apply leave');
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    setSelectedLeave(leaveApplications.find(l => l.id === leaveId));
    setActionType(action);
    setShowActionModal(true);
  };

  const submitLeaveAction = async () => {
    try {
      await axios.patch(`${API_URL}/leave/${selectedLeave.id}/status`, {
        status: actionType,
        remarks: actionFormData.remarks
      });
      toast.success(`Leave ${actionType.toLowerCase()} successfully`);
      setShowActionModal(false);
      setActionFormData({ remarks: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating leave:', error);
      toast.error(error.response?.data?.message || 'Failed to update leave');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const calculateDays = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Apply Leave
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-gray-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_applications || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-yellow-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.pending_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-green-600">{stats.approved_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <XCircleIcon className="h-6 w-6 text-red-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-semibold text-red-600">{stats.rejected_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Balance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {leaveBalance.map((balance) => (
            <div key={balance.leave_type_id} className="border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">{balance.leave_type_name}</p>
              <p className="text-2xl font-bold text-indigo-600">{balance.available_days || 0}</p>
              <p className="text-xs text-gray-400">of {balance.allocated_days || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Leave Applications Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaveApplications.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No leave applications found</h3>
                  <p className="mt-1 text-sm text-gray-500">Apply for leave to see it here.</p>
                </td>
              </tr>
            ) : (
              leaveApplications.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {leave.application_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{leave.employee_name}</div>
                    <div className="text-sm text-gray-500">{leave.employee_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {leave.leave_type_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(leave.from_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(leave.to_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {leave.total_days} {leave.is_half_day ? '(Half)' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[leave.status]}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {leave.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'Approved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleLeaveAction(leave.id, 'Rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Apply for Leave</h3>
              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Type *</label>
                  <select
                    required
                    value={formData.leave_type_id}
                    onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.leave_type_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">From Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.from_date}
                    onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">To Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.to_date}
                    onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_half_day}
                      onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Half Day</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason *</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedLeave && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType} Leave Application
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Employee: <span className="font-medium">{selectedLeave.employee_name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Leave Type: <span className="font-medium">{selectedLeave.leave_type_name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Duration: <span className="font-medium">{formatDate(selectedLeave.from_date)} to {formatDate(selectedLeave.to_date)}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={actionFormData.remarks}
                  onChange={(e) => setActionFormData({ remarks: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add your remarks..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitLeaveAction}
                  className={`px-4 py-2 rounded-md text-white ${
                    actionType === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {actionType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
