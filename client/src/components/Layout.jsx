import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../pages/Login';
import {
  HomeIcon,
  CubeIcon,
  CogIcon,
  BuildingOffice2Icon,
  ShoppingCartIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  UsersIcon,
  CalendarDaysIcon,
  TruckIcon,
  MapPinIcon,
  BriefcaseIcon,
  ClockIcon,
  CalendarIcon,
  BanknotesIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
  BeakerIcon,
  GlobeAltIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const navigationGroups = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    ]
  },
  {
    name: 'Procurement',
    items: [
      { name: 'Purchase Bills', href: '/purchase-bills', icon: DocumentTextIcon },
      { name: 'Inventory', href: '/inventory', icon: CubeIcon },
      { name: 'Supplier Performance', href: '/supplier-performance', icon: StarIcon },
      { name: 'Quality Inspection', href: '/quality-inspection', icon: BeakerIcon },
    ]
  },
  {
    name: 'Production',
    items: [
      { name: 'Production', href: '/production', icon: CogIcon },
      { name: 'Polyhouses', href: '/polyhouses', icon: BuildingOffice2Icon },
      { name: 'Ready Crops', href: '/ready-crops', icon: CheckBadgeIcon },
      { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentCheckIcon },
    ]
  },
  {
    name: 'Sales & Orders',
    items: [
      { name: 'Farmers', href: '/farmers', icon: UsersIcon },
      { name: 'Bookings', href: '/bookings', icon: CalendarDaysIcon },
      { name: 'Sales', href: '/sales', icon: ShoppingCartIcon },
    ]
  },
  {
    name: 'Delivery & Logistics',
    items: [
      { name: 'Shipping Management', href: '/shipping-management', icon: GlobeAltIcon },
      { name: 'Vehicles', href: '/vehicles', icon: TruckIcon },
      { name: 'Deliveries', href: '/deliveries', icon: MapPinIcon },
    ]
  },
  {
    name: 'HR & Payroll',
    items: [
      { name: 'Employees', href: '/employees', icon: BriefcaseIcon },
      { name: 'Attendance', href: '/attendance', icon: ClockIcon },
      { name: 'Leave', href: '/leave', icon: CalendarIcon },
      { name: 'Payroll', href: '/payroll', icon: BanknotesIcon },
    ]
  },
  {
    name: 'Accounting & Finance',
    items: [
      { name: 'Voucher Entry', href: '/voucher-entry', icon: BanknotesIcon },
      { name: 'Payments', href: '/payments', icon: CreditCardIcon },
      { name: 'Expenses', href: '/expenses', icon: ReceiptPercentIcon },
      { name: 'Trial Balance', href: '/trial-balance', icon: DocumentChartBarIcon },
      { name: 'Day Book', href: '/day-book', icon: BookOpenIcon },
    ]
  },
  {
    name: 'Reports',
    items: [
      { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ]
  },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState(
    navigationGroups.reduce((acc, group) => ({ ...acc, [group.name]: true }), {})
  );

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg overflow-y-auto">
        <div className="flex h-16 items-center justify-center bg-green-600">
          <h1 className="text-xl font-bold text-white">🌱 Agri-Nursery ERP</h1>
        </div>
        <nav className="mt-4 px-3 pb-6">
          {navigationGroups.map((group) => (
            <div key={group.name} className="mb-4">
              <button
                onClick={() => toggleGroup(group.name)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{group.name}</span>
                {expandedGroups[group.name] ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
              
              {expandedGroups[group.name] && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive
                            ? 'bg-green-100 text-green-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="bg-white shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              {navigationGroups
                .flatMap(group => group.items)
                .find((item) => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            
            {/* User info and logout */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCircleIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium text-gray-900">{user?.full_name || user?.username}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
