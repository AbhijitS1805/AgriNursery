import { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import toast from 'react-hot-toast';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  // Extract just the date part (YYYY-MM-DD) without timezone conversion
  return dateString.split('T')[0];
};

const STATUS_COLORS = {
  'Active': 'bg-green-100 text-green-800',
  'On Leave': 'bg-yellow-100 text-yellow-800',
  'Resigned': 'bg-gray-100 text-gray-800',
  'Terminated': 'bg-red-100 text-red-800',
  'Retired': 'bg-blue-100 text-blue-800'
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentFormData, setDepartmentFormData] = useState({
    department_name: '',
    description: ''
  });
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentModalMode, setDepartmentModalMode] = useState('create');
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [designationFormData, setDesignationFormData] = useState({
    designation_name: '',
    description: ''
  });
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [designationModalMode, setDesignationModalMode] = useState('create');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryComponents, setSalaryComponents] = useState([]);
  const [employeeSalaryData, setEmployeeSalaryData] = useState(null);
  const [salaryFormData, setSalaryFormData] = useState({
    effective_from: new Date().toISOString().split('T')[0],
    components: []
  });
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    department_id: '',
    designation_id: '',
    date_of_joining: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    status: 'Active',
    salary_components: []
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchDesignations();
    fetchSalaryComponents();
    fetchStats();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (departmentFilter) params.append('department_id', departmentFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const data = await api.get(`/employees?${params.toString()}`);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/master/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await api.get('/master/designations');
      setDesignations(response.data || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const fetchSalaryComponents = async () => {
    try {
      const response = await api.get('/master/salary-components');
      setSalaryComponents(response.data || []);
    } catch (error) {
      console.error('Error fetching salary components:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get('/employees/stats');
      setStats(data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const initializeSalaryComponents = () => {
    if (!salaryComponents || salaryComponents.length === 0) {
      return [];
    }
    const earnings = salaryComponents.filter(c => c.component_type === 'Earning' && c.is_active);
    const deductions = salaryComponents.filter(c => c.component_type === 'Deduction' && c.is_active);
    return [
      ...earnings.map(c => ({ component_id: c.id, component_type: 'Earning', amount: 0 })),
      ...deductions.map(c => ({ component_id: c.id, component_type: 'Deduction', amount: 0 }))
    ];
  };

  const handleSalaryChange = (componentId, value) => {
    setFormData(prev => ({
      ...prev,
      salary_components: prev.salary_components.map(comp =>
        comp.component_id === componentId
          ? { ...comp, amount: parseFloat(value) || 0 }
          : comp
      )
    }));
  };

  const calculateFormGross = () => {
    return formData.salary_components
      ?.filter(c => c.component_type === 'Earning')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0;
  };

  const calculateFormDeductions = () => {
    return formData.salary_components
      ?.filter(c => c.component_type === 'Deduction')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0;
  };

  const calculateFormNet = () => {
    return calculateFormGross() - calculateFormDeductions();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      full_name: '',
      mobile: '',
      email: '',
      department_id: '',
      designation_id: '',
      date_of_joining: '',
      date_of_birth: '',
      address: '',
      emergency_contact: '',
      status: 'Active',
      salary_components: initializeSalaryComponents()
    });
    setShowCreateModal(true);
  };

  const openEditModal = async (employee) => {
    setModalMode('edit');
    setSelectedEmployee(employee);
    
    // Load existing salary if available
    let existingSalary = initializeSalaryComponents();
    try {
      const response = await api.get(`/payroll/employee-salary/${employee.id}`);
      const salaryData = response.data?.data || response.data;
      if (salaryData && salaryData.components) {
        existingSalary = salaryData.components.map(comp => ({
          component_id: comp.component_id,
          component_type: comp.component_type,
          amount: comp.amount || 0
        }));
      }
    } catch (error) {
      console.error('Error loading salary:', error);
    }
    
    setFormData({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      mobile: employee.mobile,
      email: employee.email || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      date_of_joining: formatDateForInput(employee.date_of_joining),
      date_of_birth: formatDateForInput(employee.date_of_birth),
      address: employee.permanent_address || '',
      emergency_contact: employee.emergency_contact_mobile || '',
      status: employee.status,
      salary_components: existingSalary
    });
    setShowCreateModal(true);
  };

  const openViewModal = (employee) => {
    setModalMode('view');
    setSelectedEmployee(employee);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let employeeId = selectedEmployee?.id;
      
      if (modalMode === 'create') {
        const response = await api.post('/employees', formData);
        employeeId = response.id;  // Backend returns the employee object directly
        toast.success('Employee added successfully');
      } else if (modalMode === 'edit') {
        await api.put(`/employees/${selectedEmployee.id}`, formData);
        toast.success('Employee updated successfully');
      }
      
      // Save salary if components have values
      const activeComponents = formData.salary_components?.filter(c => parseFloat(c.amount) > 0) || [];
      if (activeComponents.length > 0 && employeeId) {
        try {
          await api.post('/payroll/employee-salary', {
            employee_id: employeeId,
            effective_from: formData.date_of_joining || new Date().toISOString().split('T')[0],
            components: activeComponents
          });
          toast.success('Salary package assigned');
        } catch (salaryError) {
          console.error('Error saving salary:', salaryError);
          const errorMsg = salaryError.response?.data?.error || salaryError.response?.data?.message || 'Salary assignment failed';
          toast.error(errorMsg);
        }
      }
      
      setShowCreateModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const openDepartmentModal = (dept = null, mode = null) => {
    if (dept) {
      setDepartmentModalMode('edit');
      setSelectedDepartment(dept);
      setDepartmentFormData({
        department_name: dept.department_name,
        description: dept.description || ''
      });
    } else if (mode === 'create') {
      setDepartmentModalMode('create');
      setSelectedDepartment(null);
      setDepartmentFormData({
        department_name: '',
        description: ''
      });
    } else {
      setDepartmentModalMode('list');
      setSelectedDepartment(null);
      setDepartmentFormData({
        department_name: '',
        description: ''
      });
    }
    setShowDepartmentModal(true);
  };

  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (departmentModalMode === 'create') {
        await api.post('/master/departments', departmentFormData);
        toast.success('Department added successfully');
      } else {
        await api.put(`/master/departments/${selectedDepartment.id}`, departmentFormData);
        toast.success('Department updated successfully');
      }
      setShowDepartmentModal(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error(error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/master/departments/${deptId}`);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const openDesignationModal = (designation = null, mode = null) => {
    if (designation) {
      setDesignationModalMode('edit');
      setSelectedDesignation(designation);
      setDesignationFormData({
        designation_name: designation.designation_name,
        description: designation.description || ''
      });
    } else if (mode === 'create') {
      setDesignationModalMode('create');
      setSelectedDesignation(null);
      setDesignationFormData({
        designation_name: '',
        description: ''
      });
    } else {
      setDesignationModalMode('list');
      setSelectedDesignation(null);
      setDesignationFormData({
        designation_name: '',
        description: ''
      });
    }
    setShowDesignationModal(true);
  };

  const handleDesignationSubmit = async (e) => {
    e.preventDefault();
    try {
      if (designationModalMode === 'create') {
        await api.post('/master/designations', designationFormData);
        toast.success('Designation added successfully');
      } else {
        await api.put(`/master/designations/${selectedDesignation.id}`, designationFormData);
        toast.success('Designation updated successfully');
      }
      setShowDesignationModal(false);
      fetchDesignations();
    } catch (error) {
      console.error('Error saving designation:', error);
      toast.error(error.response?.data?.message || 'Failed to save designation');
    }
  };

  const handleDeleteDesignation = async (desigId) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;
    try {
      await api.delete(`/master/designations/${desigId}`);
      toast.success('Designation deleted successfully');
      fetchDesignations();
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete designation');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm, departmentFilter, statusFilter]);

  // ============================================
  // SALARY MANAGEMENT
  // ============================================

  const openSalaryModal = async (employee) => {
    setSelectedEmployee(employee);
    setShowSalaryModal(true);
    
    try {
      // Fetch employee's current salary structure
      const response = await api.get(`/payroll/employee-salary/${employee.id}`);
      const salaryData = response.data?.data || response.data;
      
      if (salaryData && salaryData.components && salaryData.components.length > 0) {
        setEmployeeSalaryData(salaryData);
        setSalaryFormData({
          effective_from: salaryData.effective_from || new Date().toISOString().split('T')[0],
          components: salaryData.components.map(comp => ({
            component_id: comp.component_id,
            component_type: comp.component_type,
            amount: comp.amount || 0,
            percentage: comp.percentage || null
          }))
        });
      } else {
        // Initialize with empty salary structure
        const earnings = salaryComponents.filter(c => c.component_type === 'Earning' && c.is_active);
        const deductions = salaryComponents.filter(c => c.component_type === 'Deduction' && c.is_active);
        
        setSalaryFormData({
          effective_from: new Date().toISOString().split('T')[0],
          components: [
            ...earnings.map(c => ({ component_id: c.id, component_type: 'Earning', amount: 0, percentage: null })),
            ...deductions.map(c => ({ component_id: c.id, component_type: 'Deduction', amount: 0, percentage: null }))
          ]
        });
        setEmployeeSalaryData(null);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      // Initialize with empty salary on error
      const earnings = salaryComponents.filter(c => c.component_type === 'Earning' && c.is_active);
      const deductions = salaryComponents.filter(c => c.component_type === 'Deduction' && c.is_active);
      
      setSalaryFormData({
        effective_from: new Date().toISOString().split('T')[0],
        components: [
          ...earnings.map(c => ({ component_id: c.id, component_type: 'Earning', amount: 0, percentage: null })),
          ...deductions.map(c => ({ component_id: c.id, component_type: 'Deduction', amount: 0, percentage: null }))
        ]
      });
      setEmployeeSalaryData(null);
    }
  };

  const handleSalaryComponentChange = (componentId, field, value) => {
    setSalaryFormData(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.component_id === componentId
          ? { ...comp, [field]: value }
          : comp
      )
    }));
  };

  const calculateCTC = () => {
    return salaryFormData.components.reduce((total, comp) => {
      return total + parseFloat(comp.amount || 0);
    }, 0);
  };

  const calculateGrossSalary = () => {
    return salaryFormData.components
      .filter(comp => comp.component_type === 'Earning')
      .reduce((total, comp) => total + parseFloat(comp.amount || 0), 0);
  };

  const calculateTotalDeductions = () => {
    return salaryFormData.components
      .filter(comp => comp.component_type === 'Deduction')
      .reduce((total, comp) => total + parseFloat(comp.amount || 0), 0);
  };

  const calculateNetSalary = () => {
    return calculateGrossSalary() - calculateTotalDeductions();
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    
    try {
      // Filter out components with zero amount
      const activeComponents = salaryFormData.components.filter(comp => parseFloat(comp.amount || 0) > 0);
      
      if (activeComponents.length === 0) {
        toast.error('Please add at least one salary component');
        return;
      }
      
      await api.post('/payroll/employee-salary', {
        employee_id: selectedEmployee.id,
        effective_from: salaryFormData.effective_from,
        components: activeComponents
      });
      
      toast.success('Salary assigned successfully');
      setShowSalaryModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error(error.response?.data?.error || 'Failed to save salary');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">Manage employee information and records</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => openDepartmentModal()}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            Manage Departments
          </button>
          <button
            onClick={() => openDesignationModal()}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Manage Designations
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total_employees || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-semibold text-green-600">{stats.active_employees || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-blue-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Permanent</dt>
                  <dd className="text-lg font-semibold text-blue-600">{stats.permanent || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Contract</dt>
                  <dd className="text-lg font-semibold text-yellow-600">{stats.contract || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.department_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new employee.</p>
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.department_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.designation_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.mobile}</div>
                    {employee.email && <div className="text-sm text-gray-500">{employee.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(employee.date_of_joining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.years_of_service ? `${Math.floor(employee.years_of_service)} yrs` : 'New'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[employee.status]}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => openViewModal(employee)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => openEditModal(employee)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => openSalaryModal(employee)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Manage Salary"
                    >
                      💰 Salary
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {modalMode === 'create' ? 'Add Employee' : modalMode === 'edit' ? 'Edit Employee' : 'Employee Details'}
                    </h3>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {modalMode === 'view' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Employee Code</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.employee_code}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.full_name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobile</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.mobile}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.department_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Designation</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.designation_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedEmployee?.date_of_joining)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[selectedEmployee?.status]}`}>
                              {selectedEmployee?.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>

                          <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobile *</label>
                          <input
                            type="tel"
                            required
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department</label>
                          <select
                            value={formData.department_id}
                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select Department</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.department_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Designation</label>
                          <select
                            value={formData.designation_id}
                            onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
            <option value="">Select Designation</option>
                            {designations.map(d => (
                              <option key={d.id} value={d.id}>{d.designation_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                          <input
                            type="date"
                            value={formData.date_of_joining}
                            onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                          <input
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                          <input
                            type="tel"
                            value={formData.emergency_contact}
                            onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                            <option value="Retired">Retired</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      {/* Salary Section */}
                      {modalMode !== 'view' && formData.salary_components && (
                        <div className="col-span-2 mt-6">
                          <div className="border-t pt-6">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-semibold text-gray-900">💰 Salary Package</h4>
                              <div className="text-right">
                                <div className="text-xl font-bold text-indigo-600">
                                  ₹{calculateFormNet().toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-gray-500">Net Monthly Salary</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Earnings */}
                              <div>
                                <h5 className="text-sm font-semibold text-green-700 mb-2">Earnings</h5>
                                <div className="space-y-2">
                                  {formData.salary_components
                                    .filter(c => c.component_type === 'Earning')
                                    .map(comp => {
                                      const component = salaryComponents.find(sc => sc.id === comp.component_id);
                                      return (
                                        <div key={comp.component_id} className="flex items-center space-x-2">
                                          <label className="text-xs text-gray-600 w-32">
                                            {component?.component_name}
                                          </label>
                                          <input
                                            type="number"
                                            value={comp.amount}
                                            onChange={(e) => handleSalaryChange(comp.component_id, e.target.value)}
                                            placeholder="₹"
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            min="0"
                                            step="100"
                                          />
                                        </div>
                                      );
                                    })}
                                </div>
                                <div className="mt-2 px-2 py-1 bg-green-50 rounded text-sm font-semibold text-green-800">
                                  Total: ₹{calculateFormGross().toLocaleString('en-IN')}
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h5 className="text-sm font-semibold text-red-700 mb-2">Deductions</h5>
                                <div className="space-y-2">
                                  {formData.salary_components
                                    .filter(c => c.component_type === 'Deduction')
                                    .map(comp => {
                                      const component = salaryComponents.find(sc => sc.id === comp.component_id);
                                      return (
                                        <div key={comp.component_id} className="flex items-center space-x-2">
                                          <label className="text-xs text-gray-600 w-32">
                                            {component?.component_name}
                                          </label>
                                          <input
                                            type="number"
                                            value={comp.amount}
                                            onChange={(e) => handleSalaryChange(comp.component_id, e.target.value)}
                                            placeholder="₹"
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                                            min="0"
                                            step="100"
                                          />
                                        </div>
                                      );
                                    })}
                                </div>
                                <div className="mt-2 px-2 py-1 bg-red-50 rounded text-sm font-semibold text-red-800">
                                  Total: ₹{calculateFormDeductions().toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 p-3 bg-indigo-50 rounded text-center">
                              <div className="text-xs text-gray-600">Annual CTC</div>
                              <div className="text-lg font-bold text-indigo-600">
                                ₹{((calculateFormGross() - calculateFormDeductions()) * 12).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {modalMode === 'create' ? 'Add Employee' : 'Update Employee'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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

      {/* Department Management Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {departmentModalMode === 'list' ? 'Manage Departments' : (departmentModalMode === 'create' ? 'Add Department' : 'Edit Department')}
                </h3>
                <button
                  onClick={() => setShowDepartmentModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
              {departmentModalMode !== 'list' ? (
                <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={departmentFormData.department_name}
                      onChange={(e) => setDepartmentFormData({ ...departmentFormData, department_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={departmentFormData.description}
                      onChange={(e) => setDepartmentFormData({ ...departmentFormData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentModalMode('list');
                        setDepartmentFormData({ department_name: '', description: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Back to List
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {departmentModalMode === 'create' ? 'Add Department' : 'Update Department'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">All Departments</h4>
                    <button
                      onClick={() => openDepartmentModal(null, 'create')}
                      className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add New
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {departments.map((dept) => (
                          <tr key={dept.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {dept.department_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {dept.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => openDepartmentModal(dept)}
                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                              >
                                <PencilIcon className="h-4 w-4 inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {departments.length === 0 && (
                          <tr>
                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                              No departments found. Click "Add New" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Designation Management Modal */}
      {showDesignationModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {designationModalMode === 'list' ? 'Manage Designations' : (designationModalMode === 'create' ? 'Add Designation' : 'Edit Designation')}
                </h3>
                <button
                  onClick={() => setShowDesignationModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
              {designationModalMode !== 'list' ? (
                <form onSubmit={handleDesignationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Designation Name *
                    </label>
                    <input
                      type="text"
                      value={designationFormData.designation_name}
                      onChange={(e) => setDesignationFormData({ ...designationFormData, designation_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={designationFormData.description}
                      onChange={(e) => setDesignationFormData({ ...designationFormData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDesignationModalMode('list');
                        setDesignationFormData({ designation_name: '', description: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Back to List
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {designationModalMode === 'create' ? 'Add Designation' : 'Update Designation'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">All Designations</h4>
                    <button
                      onClick={() => openDesignationModal(null, 'create')}
                      className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add New
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Designation Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {designations.map((desig) => (
                          <tr key={desig.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {desig.designation_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {desig.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => openDesignationModal(desig)}
                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                              >
                                <PencilIcon className="h-4 w-4 inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteDesignation(desig.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {designations.length === 0 && (
                          <tr>
                            <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                              No designations found. Click "Add New" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salary Management Modal */}
      {showSalaryModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowSalaryModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSaveSalary}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Salary Management</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedEmployee?.full_name} ({selectedEmployee?.employee_code})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">
                        ₹{calculateNetSalary().toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-gray-500">Net Salary/Month</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective From
                    </label>
                    <input
                      type="date"
                      value={salaryFormData.effective_from}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, effective_from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div>
                      <h4 className="text-md font-semibold text-green-700 mb-3">📈 Earnings</h4>
                      <div className="space-y-3">
                        {salaryFormData.components
                          .filter(comp => comp.component_type === 'Earning')
                          .map(comp => {
                            const component = salaryComponents.find(c => c.id === comp.component_id);
                            return (
                              <div key={comp.component_id} className="border border-gray-200 rounded p-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {component?.component_name}
                                  {component?.is_taxable && <span className="text-xs text-orange-600"> (Taxable)</span>}
                                </label>
                                <input
                                  type="number"
                                  value={comp.amount}
                                  onChange={(e) => handleSalaryComponentChange(comp.component_id, 'amount', e.target.value)}
                                  placeholder="Amount (₹)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-4 p-3 bg-green-50 rounded">
                        <div className="flex justify-between text-sm font-semibold text-green-800">
                          <span>Gross Salary:</span>
                          <span>₹{calculateGrossSalary().toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h4 className="text-md font-semibold text-red-700 mb-3">📉 Deductions</h4>
                      <div className="space-y-3">
                        {salaryFormData.components
                          .filter(comp => comp.component_type === 'Deduction')
                          .map(comp => {
                            const component = salaryComponents.find(c => c.id === comp.component_id);
                            return (
                              <div key={comp.component_id} className="border border-gray-200 rounded p-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {component?.component_name}
                                </label>
                                <input
                                  type="number"
                                  value={comp.amount}
                                  onChange={(e) => handleSalaryComponentChange(comp.component_id, 'amount', e.target.value)}
                                  placeholder="Amount (₹)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-4 p-3 bg-red-50 rounded">
                        <div className="flex justify-between text-sm font-semibold text-red-800">
                          <span>Total Deductions:</span>
                          <span>₹{calculateTotalDeductions().toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-600">CTC (Annual)</div>
                        <div className="text-lg font-bold text-indigo-600">
                          ₹{(calculateCTC() * 12).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Gross (Monthly)</div>
                        <div className="text-lg font-bold text-green-600">
                          ₹{calculateGrossSalary().toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Net (Monthly)</div>
                        <div className="text-lg font-bold text-blue-600">
                          ₹{calculateNetSalary().toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSalaryModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
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
