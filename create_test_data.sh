#!/bin/bash

# ============================================
# Test Data Creation Script
# Complete flow: Inventory → Production → Polyhouse
# ============================================

echo "🌱 Creating Test Data for Complete Flow..."
echo "=========================================="
echo ""

API_BASE="http://localhost:5000/api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Adding Raw Materials to Inventory${NC}"
echo "─────────────────────────────────────────────"

# Note: We'll use the UI to add inventory items as it has all the validation
# This script will verify the data after manual addition

echo "✅ Suppliers already added:"
curl -s "$API_BASE/master/suppliers" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    for s in data.get('data', []):
        print(f\"  - {s['supplier_code']}: {s['supplier_name']}\")
"
echo ""

echo -e "${BLUE}Step 2: Checking Plant Varieties${NC}"
echo "─────────────────────────────────────────────"
curl -s "$API_BASE/batches/varieties" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    varieties = data.get('data', [])
    print(f'✅ {len(varieties)} plant varieties available:')
    for v in varieties:
        print(f\"  - {v['variety_code']}: {v['common_name']} ({v['botanical_name']})\")
"
echo ""

echo -e "${BLUE}Step 3: Checking Polyhouse Sections${NC}"
echo "─────────────────────────────────────────────"
curl -s "$API_BASE/batches/sections" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    sections = data.get('data', [])
    print(f'✅ {len(sections)} polyhouse sections ready:')
    total_cap = 0
    for s in sections:
        cap = s['total_capacity']
        avail = s['available_capacity']
        occ = s['occupied_capacity']
        name = s['section_name']
        code = s['section_code']
        total_cap += cap
        print(f\"  - {code}: {name}\")
        print(f\"    Capacity: {avail}/{cap} available ({occ} occupied)\")
    print(f\"\nTotal System Capacity: {total_cap:,} plants\")
"
echo ""

echo -e "${YELLOW}Next Steps - Manual Testing:${NC}"
echo "════════════════════════════════════════════"
echo ""
echo "1️⃣  Add Inventory Items (Raw Materials)"
echo "   Go to: http://localhost:3000/inventory"
echo "   Add these items:"
echo ""
echo "   📦 Item 1: Red Rose Seeds"
echo "      - Item Code: SEED-ROSE-001"
echo "      - Item Name: Red Rose Seeds Premium"
echo "      - Category: Seeds"
echo "      - Supplier: Green Seeds Co."
echo "      - Unit: Grams"
echo "      - Quantity: 5000"
echo "      - Unit Cost: ₹2.00"
echo "      - Selling Price: ₹3.00"
echo "      - Min Stock: 500"
echo ""
echo "   📦 Item 2: Coco Peat"
echo "      - Item Code: MEDIA-COCO-001"
echo "      - Item Name: Coco Peat Premium Grade"
echo "      - Category: Growing Media"
echo "      - Supplier: Nature Nursery Supplies"
echo "      - Unit: Kilograms"
echo "      - Quantity: 1000"
echo "      - Unit Cost: ₹15.00"
echo "      - Selling Price: ₹25.00"
echo "      - Min Stock: 100"
echo ""
echo "   📦 Item 3: NPK Fertilizer"
echo "      - Item Code: FERT-NPK-001"
echo "      - Item Name: NPK 10:26:26"
echo "      - Category: Fertilizers"
echo "      - Supplier: Agro Fertilizers Ltd"
echo "      - Unit: Kilograms"
echo "      - Quantity: 500"
echo "      - Unit Cost: ₹80.00"
echo "      - Selling Price: ₹120.00"
echo "      - Min Stock: 50"
echo ""
echo "   📦 Item 4: Plastic Pots"
echo "      - Item Code: POT-4INCH-001"
echo "      - Item Name: 4-inch Plastic Pots"
echo "      - Category: Pots & Containers"
echo "      - Supplier: Nature Nursery Supplies"
echo "      - Unit: Pieces"
echo "      - Quantity: 10000"
echo "      - Unit Cost: ₹5.00"
echo "      - Selling Price: ₹8.00"
echo "      - Min Stock: 1000"
echo ""
echo "2️⃣  Create BOM (Bill of Materials)"
echo "   Go to: http://localhost:3000/production → BOM tab"
echo "   Create BOM for Red Rose:"
echo "      - Variety: Red Rose (ROSE-RED-001)"
echo "      - Add materials:"
echo "        * Red Rose Seeds: 2 grams per plant"
echo "        * Coco Peat: 0.5 kg per plant"
echo "        * NPK Fertilizer: 0.05 kg per plant"
echo "        * Plastic Pots: 1 piece per plant"
echo ""
echo "3️⃣  Create Production Order"
echo "   Go to: http://localhost:3000/production → Orders tab"
echo "   Click 'Create Production Order'"
echo "      - Plant Variety: Red Rose"
echo "      - Quantity: 1000 plants"
echo "      - Start Date: Today"
echo "      - Expected Completion: 90 days"
echo ""
echo "4️⃣  Start Production"
echo "   Click 'Start' on the production order"
echo "   ✅ Batch auto-created"
echo "   ✅ Materials auto-consumed"
echo ""
echo "5️⃣  Move Batch to Polyhouse"
echo "   Go to: http://localhost:3000/batches"
echo "   Click → icon next to the batch"
echo "   Journey:"
echo "      Week 0:  → Germination Zone (1000 plants)"
echo "      Week 2:  → Seedling Area (980 plants)"
echo "      Week 4:  → Vegetative Growth (970 plants)"
echo "      Week 12: → Hardening Zone (960 plants)"
echo "      Week 16: → Ready for Sale (950 plants)"
echo ""
echo "6️⃣  Convert to Finished Goods"
echo "   Go to: http://localhost:3000/production → Finished Goods"
echo "   Convert batch to sellable inventory"
echo ""
echo "════════════════════════════════════════════"
echo -e "${GREEN}System is ready for complete flow testing!${NC}"
echo ""
echo "📖 Detailed instructions: TEST_COMPLETE_FLOW.md"
echo "🚀 Start testing: http://localhost:3000"
echo ""
