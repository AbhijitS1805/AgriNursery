#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n✓ Testing: ${description}`);
    console.log(`  GET ${API_BASE}${endpoint}`);
    const response = await axios.get(`${API_BASE}${endpoint}`);
    console.log(`  ✓ Status: ${response.status}`);
    console.log(`  ✓ Data: ${Array.isArray(response.data) ? `${response.data.length} items` : 'Object'}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    if (error.response) {
      console.log(`  ✗ Status: ${error.response.status}`);
      console.log(`  ✗ Data:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

async function testPOST(endpoint, data, description) {
  try {
    console.log(`\n✓ Testing: ${description}`);
    console.log(`  POST ${API_BASE}${endpoint}`);
    console.log(`  Data:`, JSON.stringify(data, null, 2));
    const response = await axios.post(`${API_BASE}${endpoint}`, data);
    console.log(`  ✓ Status: ${response.status}`);
    console.log(`  ✓ Response:`, JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    if (error.response) {
      console.log(`  ✗ Status: ${error.response.status}`);
      console.log(`  ✗ Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting AgriNursery ERP API Tests\n');
  console.log('=' .repeat(60));

  // Test all endpoints
  await testAPI('/bookings', 'Get all bookings');
  await testAPI('/sales-invoices', 'Get all sales invoices');
  await testAPI('/sales-payments/methods', 'Get payment methods');
  await testAPI('/farmers', 'Get all farmers');
  await testAPI('/vehicles', 'Get all vehicles');
  await testAPI('/employees', 'Get all employees');
  await testAPI('/employees/departments', 'Get departments');
  await testAPI('/employees/stats', 'Get employee stats');
  await testAPI('/attendance/today', 'Get today\'s attendance');
  await testAPI('/attendance/stats', 'Get attendance stats');
  await testAPI('/leave/types', 'Get leave types');

  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 Testing POST Operations\n');
  console.log('=' .repeat(60));

  // Test creating a farmer
  const farmerResult = await testPOST('/farmers', {
    name: 'Test API Farmer',
    mobile: '9999999999',
    village: 'Test Village',
    district: 'Test District'
  }, 'Create new farmer');

  if (farmerResult.success && farmerResult.data.farmer) {
    const farmerId = farmerResult.data.farmer.id;
    console.log(`  ✓ Created farmer ID: ${farmerId}`);

    // Test creating a booking
    const bookingResult = await testPOST('/bookings', {
      farmer_id: farmerId,
      required_date: '2026-02-01',
      items: [
        { crop_id: 1, quantity: 100, rate: 10 }
      ],
      notes: 'API Test Booking'
    }, 'Create new booking');

    if (bookingResult.success && bookingResult.data.booking) {
      console.log(`  ✓ Created booking: ${bookingResult.data.booking.booking_number}`);
    }
  }

  // Test attendance marking
  const attendanceResult = await testPOST('/attendance', {
    employee_id: 1,
    attendance_date: '2026-01-10',
    status: 'Present',
    check_in: '09:00',
    check_out: '18:00'
  }, 'Mark attendance');

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ API Testing Complete!\n');
}

runTests().catch(console.error);
