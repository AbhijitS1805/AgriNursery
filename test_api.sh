#!/bin/bash

# ============================================
# Agriculture Nursery ERP - API Test Script
# ============================================
# Tests complete flow from inventory to polyhouse
# Run this after starting the application

echo "🧪 Starting Complete Flow API Tests..."
echo "======================================"
echo ""

API_BASE="http://localhost:5000/api"
FAILED=0
PASSED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_key=$3
    
    echo -n "Testing $name... "
    response=$(curl -s "$API_BASE$endpoint")
    
    if echo "$response" | grep -q "\"$expected_key\""; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Response: $response"
        ((FAILED++))
        return 1
    fi
}

echo "1️⃣  Testing Master Data Endpoints"
echo "─────────────────────────────────"
test_endpoint "Categories" "/master/categories" "category_name"
test_endpoint "Sub-categories" "/master/sub-categories" "success"
test_endpoint "Units" "/master/units" "unit_name"
test_endpoint "Suppliers" "/master/suppliers" "supplier_name"
test_endpoint "Companies" "/master/companies" "success"
echo ""

echo "2️⃣  Testing Plant Varieties"
echo "─────────────────────────────────"
test_endpoint "Plant Varieties" "/batches/varieties" "variety_code"
test_endpoint "Growth Stages" "/batches/stages" "stage_name"
echo ""

echo "3️⃣  Testing Polyhouse Sections"
echo "─────────────────────────────────"
response=$(curl -s "$API_BASE/batches/sections")
echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success') and len(data.get('data', [])) == 5:
    print('✅ PASS: All 5 polyhouse sections available')
    sections = data['data']
    for s in sections:
        capacity = s['available_capacity']
        total = s['total_capacity']
        name = s['section_name']
        print(f\"  - {name}: {capacity}/{total} available\")
    exit(0)
else:
    print('❌ FAIL: Expected 5 sections')
    exit(1)
"
if [ $? -eq 0 ]; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

echo "4️⃣  Testing Inventory System"
echo "─────────────────────────────────"
test_endpoint "Inventory Items" "/inventory/items" "success"
test_endpoint "Low Stock Items" "/inventory/items/low-stock" "success"
echo ""

echo "5️⃣  Testing Production System"
echo "─────────────────────────────────"
test_endpoint "Production Orders" "/production/orders" "success"
test_endpoint "BOM List" "/production/bom" "success"
test_endpoint "Finished Goods" "/production/finished-goods" "success"
echo ""

echo "6️⃣  Testing Batches System"
echo "─────────────────────────────────"
test_endpoint "Batches List" "/batches" "success"
echo ""

echo "7️⃣  Testing Sales System"
echo "─────────────────────────────────"
test_endpoint "Sales Orders" "/sales/orders" "success"
test_endpoint "Customers" "/sales/customers" "success"
echo ""

echo "8️⃣  Testing Tasks System"
echo "─────────────────────────────────"
test_endpoint "Tasks List" "/tasks" "success"
echo ""

echo "9️⃣  Testing Polyhouses Dashboard"
echo "─────────────────────────────────"
test_endpoint "Polyhouse Utilization" "/polyhouses/utilization" "success"
echo ""

echo "🔟 Testing Dashboard"
echo "─────────────────────────────────"
test_endpoint "Dashboard Stats" "/dashboard/stats" "success"
test_endpoint "Dashboard Alerts" "/dashboard/alerts" "success"
echo ""

echo "======================================"
echo "📊 Test Results Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED tests${NC}"
echo -e "Failed: ${RED}$FAILED tests${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for end-to-end testing.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3000"
    echo "2. Follow TEST_COMPLETE_FLOW.md for manual testing"
    echo "3. Start with Inventory → Add first item"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the application.${NC}"
    exit 1
fi
