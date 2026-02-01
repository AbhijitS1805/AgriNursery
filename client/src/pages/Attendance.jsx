import { useState, useEffect } from 'react';
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

const formatDate = (dateString) => {
  if (!dateString) return '';
  // Handle both ISO string and date-only formats
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

const STATUS_COLORS = {
  'Present': 'bg-green-100 text-green-800',
  'Absent': 'bg-red-100 text-red-800',
  'Half Day': 'bg-yellow-100 text-yellow-800',
  'Late': 'bg-orange-100 text-orange-800',
  'On Leave': 'bg-blue-100 text-blue-800',
  'Holiday': 'bg-purple-100 text-purple-800',
  'Week Off': 'bg-gray-100 text-gray-800'
};

export default function Attendance() {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchStats();
  }, [selectedDate]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/attendance/today?date=${selectedDate}`);
      setTodayAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get('/attendance/stats');
      setStats(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const markAttendance = async (employeeId, status) => {
    try {
      await api.post('/attendance', {
        employee_id: employeeId,
        attendance_date: selectedDate,
        status: status,
        check_in_time: status === 'Present' ? '09:00' : null,
        check_out_time: status === 'Present' ? '18:00' : null
      });
      
      toast.success('Attendance marked successfully');
      fetchTodayAttendance();
      fetchStats();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const markAllPresent = async () => {
    try {
      const records = todayAttendance
        .filter(emp => !emp.status)
        .map(emp => ({
          employee_id: emp.employee_id,
          attendance_date: selectedDate,
          status: 'Present',
          check_in_time: '09:00',
          check_out_time: '18:00'
        }));

      if (records.length === 0) {
        toast.error('All employees already marked');
        return;
      }

      await api.post('/attendance/bulk', { attendance_records: records });
      toast.success(`Marked ${records.length} employees as present`);
      fetchTodayAttendance();
      fetchStats();
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading attendance...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">Mark and track employee attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={markAllPresent}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Mark All Present
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Present</p>
                <p className="text-2xl font-semibold text-green-600">{stats.present_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <XCircleIcon className="h-6 w-6 text-red-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Absent</p>
                <p className="text-2xl font-semibold text-red-600">{stats.absent_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">On Leave</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.on_leave_count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-gray-500" />
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Avg Hours</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.avg_hours || '0.0'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todayAttendance.map((emp) => (
              <tr key={emp.employee_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                  <div className="text-sm text-gray-500">{emp.employee_code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {emp.department_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {emp.check_in_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {emp.check_out_time || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {emp.total_hours ? `${emp.total_hours} hrs` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {emp.status ? (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[emp.status]}`}>
                      {emp.status}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Not marked</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!emp.status && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => markAttendance(emp.employee_id, 'Present')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markAttendance(emp.employee_id, 'Absent')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => markAttendance(emp.employee_id, 'Half Day')}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Half Day
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
