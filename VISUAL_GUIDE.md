# 🏭 PRODUCTION SYSTEM - VISUAL GUIDE

## 📊 Two Inventory Systems

```
┌────────────────────────────────────────────────────────────────────────┐
│                     AGRICULTURE NURSERY ERP                            │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│   RAW MATERIALS INVENTORY       │────→│   FINISHED GOODS INVENTORY      │
│   (What you BUY)                │     │   (What you MAKE & SELL)        │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ 📦 Rose Seeds (50 kg)           │     │ 🌹 Red Rose Plants (950 pcs)    │
│ 📦 NPK Fertilizer (100 kg)      │     │ 🌼 Marigold Plants (1500 pcs)   │
│ 📦 Pesticides (20 liters)       │     │ 🍅 Tomato Plants (800 pcs)      │
│ 📦 Pots (500 pieces)            │     │ 🌿 Basil Plants (300 pcs)       │
│ 📦 Soil Mix (1000 kg)           │     │                                 │
│                                 │     │ Each with:                      │
│ Page: /inventory                │     │ - SKU Code                      │
│ Table: inventory_items          │     │ - Cost per Plant                │
│ Track: Stock levels, costs      │     │ - Selling Price                 │
│                                 │     │ - Quality Grade                 │
│                                 │     │ - Available Quantity            │
│                                 │     │                                 │
│                                 │     │ Page: /production (FG tab)      │
│                                 │     │ Table: finished_goods_inventory │
│                                 │     │ Track: Ready to sell plants     │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

---

## 🔄 Production Workflow - Detailed

```
STEP 1: PURCHASE                STEP 2: DEFINE BOM
┌──────────────────┐            ┌──────────────────────────┐
│ BUY from Vendors │            │ CREATE Recipe (One-time) │
└────────┬─────────┘            └────────┬─────────────────┘
         │                               │
         ▼                               ▼
    /inventory                      /production
    Add Item Form                   BOM Tab
                                    
    Rose Seeds                      Red Rose needs:
    Qty: 50 kg                      - Seeds: 0.005 kg/plant
    Cost: ₹100/kg                   - Fertilizer: 0.02 kg/plant
    Total: ₹5,000                   - Pesticide: 0.001 L/plant
                                    
                                    (Recipe stored in database)
         │                               │
         └───────────┬───────────────────┘
                     ▼

         STEP 3: CREATE PRODUCTION ORDER
         ┌────────────────────────────────┐
         │ PLAN Production                │
         └────────┬───────────────────────┘
                  │
                  ▼
            /production
            Orders Tab
            
            Plant: Red Rose
            Quantity: 1000 plants
            Start: Today
            Complete: +120 days
            
            Status: PLANNED
            PO Number: PRD00001
                  │
                  ▼
                  
         STEP 4: START PRODUCTION (ONE CLICK!)
         ┌────────────────────────────────┐
         │ Click "Start" Button           │
         └────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────────────────────────────────┐
         │ AUTOMATION HAPPENS:                        │
         │                                            │
         │ 1. Creates Batch BCH00001                  │
         │    - 1000 plants                           │
         │    - Stage: Seed                           │
         │    - Status: Active                        │
         │                                            │
         │ 2. Checks BOM & Calculates:                │
         │    Seeds needed = 1000 × 0.005 = 5 kg      │
         │    Fertilizer = 1000 × 0.02 = 20 kg        │
         │                                            │
         │ 3. Creates Material Requisition MR000001   │
         │    - Item: Rose Seeds, Qty: 5 kg           │
         │    - Item: NPK Fertilizer, Qty: 20 kg      │
         │                                            │
         │ 4. Deducts from Raw Materials Inventory:   │
         │    Rose Seeds: 50 kg → 45 kg               │
         │    NPK Fertilizer: 100 kg → 80 kg          │
         │                                            │
         │ 5. Records Inventory Transactions:         │
         │    Type: Consumption                       │
         │    Qty: -5 kg (negative = out)             │
         │    Batch: BCH00001                         │
         │                                            │
         │ 6. Updates Batch Costs:                    │
         │    seed_cost = ₹500                        │
         │    total_cost = ₹500                       │
         │    cost_per_plant = ₹0.50                  │
         │                                            │
         │ 7. Updates Production Order:               │
         │    Status: IN PROGRESS                     │
         │    Batch: BCH00001                         │
         │    Actual Start: Today                     │
         └────────┬───────────────────────────────────┘
                  │
                  ▼
                  
         STEP 5: GROW PLANTS (120 days)
         ┌────────────────────────────────┐
         │ Track in /batches              │
         └────────┬───────────────────────┘
                  │
                  ▼
            Week 1: Seed → Germination (990 alive)
            Week 2: Add labor ₹2,000
            Week 4: Germination → Seedling
            Week 6: Add fertilizer ₹1,500
            Week 8: Seedling → Vegetative (980 alive)
            Week 12: Add pesticide ₹800
            Week 16: Vegetative → Ready (950 alive)
            
            Final Costs:
            - Seeds: ₹500
            - Consumables: ₹2,300
            - Labor: ₹2,000
            - Overhead: ₹200
            ──────────────
            Total: ₹5,000
            Per Plant: ₹5,000 / 950 = ₹5.26
                  │
                  ▼
                  
         STEP 6: CONVERT TO FINISHED GOODS
         ┌────────────────────────────────┐
         │ /production → Finished Goods   │
         └────────┬───────────────────────┘
                  │
                  ▼
            Click "Convert to FG"
            
            Set:
            - Selling Price: ₹150
            - Quality: Premium
            - Size: Medium
            
            Creates:
            - SKU: FG-ROSE-RED-001-BCH00001
            - Item: Red Rose - Premium (BCH00001)
            - Available: 950 plants
            - Cost: ₹5.26/plant
            - Price: ₹150/plant
            - Value: ₹1,42,500
            - Expected Profit: ₹1,37,513
                  │
                  ▼
                  
         STEP 7: SELL TO CUSTOMERS
         ┌────────────────────────────────┐
         │ /sales → Create Order          │
         └────────┬───────────────────────┘
                  │
                  ▼
            Customer: ABC Nursery
            Item: FG-ROSE-RED-001-BCH00001
            Qty: 100 plants
            Price: ₹150/plant
            Total: ₹15,000
            
            Deducts from Finished Goods:
            Available: 950 → 850
            Sold: 0 → 100
            
            Profit: (₹150 - ₹5.26) × 100 = ₹14,474
```

---

## 🗄️ Database Relationships

```
┌────────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                                 │
└────────────────────────────────────────────────────────────────────┘

MASTER DATA:
┌─────────────────┐       ┌──────────────────┐
│ plant_varieties │       │ inventory_items  │
│                 │       │ (Raw Materials)  │
│ - Red Rose      │       │ - Rose Seeds     │
│ - Marigold      │       │ - NPK Fertilizer │
└────────┬────────┘       └────────┬─────────┘
         │                         │
         │ ┌───────────────────────┘
         │ │
         ▼ ▼
┌─────────────────┐       ┌──────────────────────────┐
│ production_bom  │       │ production_orders        │
│ (Recipes)       │       │                          │
│                 │       │ PRD00001 → BCH00001      │
│ Rose + Seeds    │◄──────│ Status: In Progress      │
│ 0.005 kg/plant  │       │                          │
└─────────────────┘       └──────────┬───────────────┘
                                     │
                                     ▼
┌─────────────────────────┐    ┌─────────────────────┐
│ material_requisitions   │    │ batches             │
│                         │    │                     │
│ MR000001 → BCH00001     │◄───│ BCH00001            │
│ Status: Issued          │    │ - Rose Plants       │
└────────┬────────────────┘    │ - 950 alive         │
         │                     │ - Cost: ₹5,000      │
         ▼                     └──────────┬──────────┘
┌─────────────────────────────┐          │
│ material_requisition_items  │          │
│                             │          │
│ - Seeds: 5 kg, ₹500         │          │
│ - Fertilizer: 20 kg, ₹600   │          │
└─────────────────────────────┘          │
                                         ▼
┌─────────────────────────────────────────────────┐
│ inventory_transactions                          │
│                                                 │
│ Type: Consumption                               │
│ Item: Rose Seeds                                │
│ Qty: -5 kg (negative = stock out)               │
│ Batch: BCH00001                                 │
│ Cost: ₹500                                      │
│                                                 │
│ (Auto-updates inventory_items.current_stock)   │
└─────────────────────────────────────────────────┘
                                         │
                                         ▼
                        ┌────────────────────────────────┐
                        │ finished_goods_inventory       │
                        │                                │
                        │ SKU: FG-ROSE-RED-001-BCH00001  │
                        │ Batch: BCH00001 (UNIQUE)       │
                        │ Available: 950                 │
                        │ Cost: ₹5.26/plant              │
                        │ Price: ₹150/plant              │
                        │ Value: ₹1,42,500               │
                        └────────────────────────────────┘
```

---

## 💰 Cost Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              HOW COSTS ACCUMULATE IN BATCH                   │
└──────────────────────────────────────────────────────────────┘

Production Start:
seed_cost = ₹500 (from material requisition)
consumable_cost = ₹0
labor_cost = ₹0
overhead_cost = ₹0
─────────────────
total_cost = ₹500
cost_per_plant = ₹500 / 1000 = ₹0.50

Week 2 - Add Labor:
seed_cost = ₹500
consumable_cost = ₹0
labor_cost = ₹2,000 ← Added
overhead_cost = ₹0
─────────────────
total_cost = ₹2,500
cost_per_plant = ₹2,500 / 990 = ₹2.53

Week 6 - Add Fertilizer:
seed_cost = ₹500
consumable_cost = ₹1,500 ← Added
labor_cost = ₹2,000
overhead_cost = ₹0
─────────────────
total_cost = ₹4,000
cost_per_plant = ₹4,000 / 980 = ₹4.08

Week 12 - Add Pesticide & Overhead:
seed_cost = ₹500
consumable_cost = ₹2,300 ← Updated
labor_cost = ₹2,000
overhead_cost = ₹200 ← Added
─────────────────
total_cost = ₹5,000
cost_per_plant = ₹5,000 / 950 = ₹5.26 ← FINAL COST

Convert to Finished Goods:
cost_per_unit = ₹5.26 (from batch)
selling_price = ₹150.00 (user sets)
profit_per_unit = ₹150.00 - ₹5.26 = ₹144.74
profit_margin = 96.5%
```

---

## 📍 UI Navigation Map

```
┌──────────────────────────────────────────────────────────────┐
│                    LEFT SIDEBAR MENU                         │
└──────────────────────────────────────────────────────────────┘

🏠 Dashboard
   └─> Overview, stats, alerts

🧪 Batches
   └─> Track growing plants
       - View all batches
       - Update growth stages
       - Add labor costs
       - Add consumable costs
       - Monitor current quantity
       - See cost accumulation

📦 Inventory (RAW MATERIALS)
   └─> What you BUY from vendors
       - Add new items
       - Stock In (purchase)
       - Stock Out (consumption)
       - View current stock
       - Low stock alerts
       - Track categories, suppliers

⚙️ Production ← NEW!
   └─> Manufacturing workflow
       │
       ├─> Tab 1: Production Orders
       │   - Create new production order
       │   - Start production (one click)
       │   - View status (planned/in-progress/completed)
       │   - See linked batch codes
       │
       ├─> Tab 2: Bill of Materials (BOM)
       │   - Define recipes (one-time setup)
       │   - Specify materials per plant
       │   - Link to growth stages
       │   - Edit/Delete recipes
       │
       └─> Tab 3: Finished Goods Inventory
           - Convert ready batches
           - Set selling prices
           - View available quantity
           - See total inventory value
           - Track quality grades

🏢 Polyhouses
   └─> Manage growing locations

🛒 Sales
   └─> Sell FINISHED GOODS (not raw materials)

✅ Tasks
   └─> Daily work management

📊 Reports
   └─> Analytics and insights
```

---

## 🎯 Key Concepts Explained

### 1. **Bill of Materials (BOM) = Recipe**

Think of it like a cooking recipe:

```
To make 1 cake, you need:
- 2 eggs
- 200g flour
- 100g sugar

To grow 1 Rose Plant, you need:
- 0.005 kg seeds
- 0.02 kg fertilizer
- 0.001 L pesticide
```

### 2. **Production Order = Plan**

```
Like saying: "I want to bake 100 cakes next week"

Translates to: "Grow 1000 Rose Plants starting today"
```

### 3. **Starting Production = Auto-Magic**

```
When you click "Start":
✅ Creates batch
✅ Calculates materials (100 cakes × 2 eggs = 200 eggs)
✅ Deducts from inventory (200 eggs removed)
✅ Records costs
✅ Creates audit trail

All automatic! No manual work needed.
```

### 4. **Material Requisition = Shopping List**

```
To make 100 cakes, take from pantry:
- 200 eggs
- 20 kg flour
- 10 kg sugar

To grow 1000 roses, take from inventory:
- 5 kg seeds
- 20 kg fertilizer
- 1 L pesticide
```

### 5. **Finished Goods = Ready Products**

```
Raw: Eggs, flour, sugar → Cook → Finished: 100 cakes (sellable)
Raw: Seeds, fertilizer → Grow → Finished: 950 roses (sellable)

Can't sell raw eggs as cakes!
Can't sell raw seeds as plants!
```

---

## ✅ Summary

### Before (What you had):
- ❌ Manual tracking
- ❌ No connection between purchases and batches
- ❌ Unclear costing
- ❌ Mixed inventory

### After (What you have now):
- ✅ Automated material consumption
- ✅ Clear purchase → production → sale flow
- ✅ Accurate per-plant costing
- ✅ Separate raw materials and finished goods
- ✅ Complete traceability
- ✅ One-click production start

---

## 🎊 You're Ready!

**Your nursery now has a world-class manufacturing ERP! 🌍**

Go to: http://localhost:3000/production

Start your first production order! 🚀
```

