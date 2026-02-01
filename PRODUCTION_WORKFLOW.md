# 🏭 Production Management - Raw Materials to Finished Goods

## 🎯 Overview

The Agriculture Nursery ERP now has **TWO SEPARATE INVENTORY SYSTEMS**:

1. **Raw Materials Inventory** (`/inventory`) - Seeds, fertilizers, pesticides purchased from vendors
2. **Finished Goods Inventory** (`/production` → Finished Goods tab) - Plants grown from seeds

This implements a complete **manufacturing/production workflow** connecting purchases to sales.

---

## 📊 Complete Production Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. PURCHASE RAW MATERIALS
   └─> Inventory → Add Item → Stock In
       Examples: Rose Seeds (500g), NPK Fertilizer (25kg), Pesticide

2. DEFINE BOM (Bill of Materials) = RECIPE
   └─> Production → BOM Tab → Add BOM Recipe
       Example: Rose Plant needs:
       - Rose Seeds: 0.005 kg per plant
       - NPK Fertilizer: 0.02 kg per plant  
       - Pesticide: 0.001 liters per plant

3. CREATE PRODUCTION ORDER
   └─> Production → Production Orders → New Production Order
       Example: Grow 1000 Rose Plants
       - Plant Variety: Red Rose
       - Quantity: 1000 plants
       - Start Date: Today
       - Expected Completion: 120 days

4. START PRODUCTION (Auto-Deducts Raw Materials)
   └─> Click "Start" button
       Automatically:
       ✅ Creates BATCH (BCH00001)
       ✅ Deducts raw materials from inventory:
          - Rose Seeds: 1000 × 0.005 = 5 kg
          - NPK Fertilizer: 1000 × 0.02 = 20 kg
          - Pesticide: 1000 × 0.001 = 1 liter
       ✅ Creates Material Requisition (MR000001)
       ✅ Updates batch costs (seed_cost)
       ✅ Records inventory transactions

5. GROW PLANTS (Existing Batches Module)
   └─> Batches → Track growth stages
       - Seed → Germination → Seedling → Vegetative → Ready for Sale

6. CONVERT TO FINISHED GOODS
   └─> Production → Finished Goods → Convert to FG
       When batch reaches "Ready for Sale":
       ✅ Creates Finished Goods Inventory record
       ✅ Generates SKU: FG-ROSE-RED-001-BCH00001
       ✅ Sets selling price, quality grade, size
       ✅ Makes plants available for sales

7. SELL PLANTS
   └─> Sales → Create Sales Order
       Sells from Finished Goods Inventory
```

---

## 🗄️ Database Tables

### Production-Specific Tables

#### 1. production_bom (Bill of Materials)
```sql
- plant_variety_id → Which plant this recipe is for
- item_id → Raw material needed (from inventory_items)
- quantity_per_plant → How much per plant (0.005 kg)
- stage_id → When to use (NULL = initial/seed stage)
```

**Example Records:**
```
Plant: Red Rose | Material: Rose Seeds | Qty: 0.005 kg | Stage: Seed
Plant: Red Rose | Material: NPK Fertilizer | Qty: 0.02 kg | Stage: Vegetative
Plant: Tomato | Material: Tomato Seeds | Qty: 0.003 kg | Stage: Seed
```

#### 2. production_orders
```sql
- po_number → PRD00001, PRD00002
- plant_variety_id → What to grow
- planned_quantity → How many plants
- batch_id → Created when production starts
- status → planned, in-progress, completed
```

#### 3. material_requisitions
```sql
- requisition_number → MR000001
- batch_id → Which batch consumed materials
- production_order_id → Related production order
- status → pending, approved, issued
```

#### 4. material_requisition_items
```sql
- requisition_id → Parent requisition
- item_id → Raw material consumed
- requested_quantity → How much was needed
- issued_quantity → How much was actually used
- total_cost → Cost of materials consumed
```

#### 5. finished_goods_inventory
```sql
- batch_id → Link to batches table (UNIQUE)
- sku_code → FG-ROSE-RED-001-BCH00001
- item_name → "Red Rose - Standard (BCH00001)"
- available_quantity → Plants ready to sell
- reserved_quantity → Reserved for orders
- sold_quantity → Already sold
- cost_per_unit → From batch.cost_per_plant
- selling_price → Set when converting
- quality_grade → Premium/Standard/Economy
- size → Small/Medium/Large/Extra Large
```

---

## 🔄 How It Works - Step by Step

### Step 1: Define BOM (One-time setup per variety)

**Go to:** Production → BOM Tab → Add BOM Recipe

**Example for Rose Plants:**

| Plant Variety | Raw Material | Qty per Plant | Stage | Notes |
|---------------|--------------|---------------|-------|-------|
| Red Rose | Rose Seeds | 0.005 kg | Seed | Initial planting |
| Red Rose | Starter Fertilizer | 0.01 kg | Seed | At planting |
| Red Rose | NPK Fertilizer | 0.02 kg | Vegetative | During growth |
| Red Rose | Pesticide Spray | 0.001 L | Vegetative | Weekly spray |

**Why BOM is important:**
- ✅ Automates material consumption when production starts
- ✅ Ensures consistent costing
- ✅ Tracks material usage per plant
- ✅ Helps in purchase planning

---

### Step 2: Create Production Order

**Go to:** Production → Production Orders → New Production Order

**Fill Form:**
```
Plant Variety: Red Rose
Planned Quantity: 1000 plants
Planned Start Date: 2025-12-21
Expected Completion: 2026-04-20 (120 days)
```

**Creates Record:**
```
PO Number: PRD00001
Status: Planned
```

---

### Step 3: Start Production

**Click:** "Start" button on production order

**What Happens Automatically:**

1. **Creates Batch:**
   ```
   Batch Code: BCH00001
   Plant Variety: Red Rose
   Initial Quantity: 1000
   Current Stage: Seed
   Status: Active
   ```

2. **Checks BOM and Calculates Materials Needed:**
   ```
   For 1000 Rose Plants:
   - Rose Seeds: 1000 × 0.005 kg = 5 kg
   - Starter Fertilizer: 1000 × 0.01 kg = 10 kg
   ```

3. **Creates Material Requisition:**
   ```
   Requisition Number: MR000001
   Batch: BCH00001
   Status: Approved
   ```

4. **Creates Requisition Items:**
   ```
   Item: Rose Seeds | Qty: 5 kg | Cost: ₹500 | Total: ₹2,500
   Item: Starter Fertilizer | Qty: 10 kg | Cost: ₹30 | Total: ₹300
   ```

5. **Deducts from Raw Materials Inventory:**
   ```
   Rose Seeds: 50 kg → 45 kg (-5 kg)
   Starter Fertilizer: 100 kg → 90 kg (-10 kg)
   ```

6. **Creates Inventory Transactions:**
   ```
   Type: Consumption
   Qty: -5 kg (negative = stock out)
   Batch ID: BCH00001
   Notes: Material requisition: MR000001
   ```

7. **Updates Batch Costs:**
   ```
   Batch BCH00001:
   seed_cost = ₹2,800
   consumable_cost = ₹0
   labor_cost = ₹0
   overhead_cost = ₹0
   total_cost = ₹2,800
   cost_per_plant = ₹2,800 / 1000 = ₹2.80
   ```

8. **Updates Production Order:**
   ```
   Status: In-Progress
   Batch ID: BCH00001
   Actual Start Date: 2025-12-21
   ```

---

### Step 4: Track Growth (Use Existing Batches Module)

**Go to:** Batches → View Batch BCH00001

- Monitor growth stages
- Add labor costs
- Add consumable costs (more fertilizer, pesticides)
- Track mortality
- Move through stages: Seed → Germination → Seedling → Vegetative → Ready for Sale

**Cost accumulates automatically:**
```
Initial: ₹2,800 (seeds)
+ Labor: ₹5,000
+ Consumables: ₹3,200 (fertilizers, pesticides added during growth)
+ Overhead: ₹1,000
= Total Cost: ₹12,000
Cost per Plant: ₹12,000 / 950 plants (50 died) = ₹12.63
```

---

### Step 5: Convert to Finished Goods

**When:** Batch reaches "Ready for Sale" stage

**Go to:** Production → Finished Goods Tab

**See:** Green banner showing "Batches Ready to Convert to Finished Goods"

**Click:** "Convert to FG" button

**Fill Form:**
```
Selling Price: ₹150.00 (suggested: ₹12.63 × 1.5 = ₹18.95 minimum)
Quality Grade: Premium / Standard / Economy
Size: Small / Medium / Large / Extra Large
```

**What Happens:**
```
Creates Finished Goods Record:
- SKU: FG-ROSE-RED-001-BCH00001
- Item Name: Red Rose - Premium (BCH00001)
- Available Quantity: 950 plants
- Cost per Unit: ₹12.63
- Selling Price: ₹150.00
- Profit per Plant: ₹150.00 - ₹12.63 = ₹137.37
- Total Value: 950 × ₹150 = ₹1,42,500
```

**Updates Batch:**
```
Batch BCH00001:
actual_ready_date = 2025-12-21
```

---

### Step 6: Sell Plants (Future - Sales Module)

**Go to:** Sales → Create Sales Order

**Select from:** Finished Goods Inventory (not raw materials!)

**When sold:**
- Deducts from `finished_goods_inventory.available_quantity`
- Adds to `finished_goods_inventory.sold_quantity`
- Creates sales invoice
- Records revenue

---

## 📋 API Endpoints

### Production Orders
```
GET  /api/production/orders
POST /api/production/orders
POST /api/production/orders/start
```

### Bill of Materials
```
GET    /api/production/bom
POST   /api/production/bom
PUT    /api/production/bom/:id
DELETE /api/production/bom/:id
```

### Finished Goods
```
GET  /api/production/finished-goods
POST /api/production/finished-goods/convert
```

### Material Requisitions
```
GET /api/production/requisitions
GET /api/production/requisitions/:requisition_id/items
```

---

## 💡 Key Benefits

### 1. Automated Costing
- ✅ Tracks exact cost per plant
- ✅ Includes seeds, fertilizers, labor, overhead
- ✅ Real-time cost updates as materials are added

### 2. Inventory Accuracy
- ✅ Auto-deducts raw materials when production starts
- ✅ Prevents selling what you don't have
- ✅ Tracks both raw materials and finished goods separately

### 3. Production Planning
- ✅ Check raw material availability before starting
- ✅ BOM shows what materials are needed
- ✅ Plan purchases based on production orders

### 4. Profitability Analysis
- ✅ Know exact cost per plant
- ✅ Set informed selling prices
- ✅ Track profit margins per batch

### 5. Complete Traceability
- ✅ From purchase → consumption → batch → finished goods → sale
- ✅ Material requisitions link materials to batches
- ✅ Finished goods link batches to sales

---

## 🧪 Example Walkthrough

### Scenario: Growing 1000 Rose Plants

**1. Purchase Raw Materials:**
```
Go to Inventory → Add Items:
- Rose Seeds: 50 kg @ ₹100/kg = ₹5,000
- NPK Fertilizer: 100 kg @ ₹30/kg = ₹3,000
- Pesticide: 20 liters @ ₹200/L = ₹4,000
```

**2. Define BOM (One-time):**
```
Go to Production → BOM → Add:
- Red Rose + Rose Seeds: 0.005 kg per plant (Seed stage)
- Red Rose + NPK Fertilizer: 0.02 kg per plant (Vegetative stage)
```

**3. Create Production Order:**
```
Go to Production → Orders → New:
- Variety: Red Rose
- Quantity: 1000 plants
- Start: Today
```

**4. Start Production:**
```
Click "Start" button
✅ Batch BCH00001 created
✅ 5 kg seeds deducted (1000 × 0.005)
✅ ₹500 cost recorded in batch
✅ Material requisition MR000001 created
```

**5. During Growth (120 days):**
```
Go to Batches → BCH00001:
- Week 1: Seed → Germination (10% loss)
- Week 4: Add labor ₹2,000
- Week 8: Germination → Seedling (auto-adds 20kg NPK = ₹600)
- Week 12: Seedling → Vegetative
- Week 16: Add more fertilizer ₹1,000
- Week 20: Ready for Sale (950 plants alive)
Final cost: ₹12,000 / 950 = ₹12.63 per plant
```

**6. Convert to Finished Goods:**
```
Go to Production → Finished Goods → Convert:
- Selling Price: ₹150
- Quality: Premium
- Creates SKU: FG-ROSE-RED-001-BCH00001
- Value: 950 × ₹150 = ₹1,42,500
- Expected Profit: (₹150 - ₹12.63) × 950 = ₹1,30,501
```

**7. Sell Plants:**
```
Go to Sales → Create Order:
- Customer: Retail Buyer
- Item: FG-ROSE-RED-001-BCH00001 (Red Rose - Premium)
- Qty: 100 plants
- Price: ₹150/plant
- Total: ₹15,000
- Profit: (₹150 - ₹12.63) × 100 = ₹13,737
```

---

## 🎯 Best Practices

### 1. Set Up BOM First
- Define recipes for all plant varieties
- Include all materials (seeds, fertilizers, pesticides, pots)
- Specify quantities accurately
- Link to growth stages when materials are used

### 2. Maintain Raw Materials Stock
- Keep minimum stock levels
- Purchase before starting production
- System will check stock before deduction

### 3. Track All Costs
- Add labor costs in batches
- Record consumables as used
- Update overhead costs monthly

### 4. Quality Grading
- Grade plants when converting to FG
- Premium plants = higher price
- Economy plants = lower price

### 5. Regular Stocktaking
- Verify raw materials inventory monthly
- Check finished goods count
- Reconcile with system

---

## 📊 Reports You Can Generate

1. **Production Cost Report** - Cost per plant by variety
2. **Material Consumption Report** - What was used in each batch
3. **Finished Goods Valuation** - Total inventory value
4. **Profit Analysis** - Selling price vs cost
5. **Material Requisition History** - Audit trail of consumption

---

## 🚀 Next Steps

1. ✅ Define BOM for all your plant varieties
2. ✅ Purchase initial raw materials
3. ✅ Create your first production order
4. ✅ Start production and watch automation!
5. ✅ Track batch growth
6. ✅ Convert to finished goods
7. ✅ Start selling!

**Your ERP now handles complete manufacturing workflow from seed to sale! 🌱→🌹→💰**
