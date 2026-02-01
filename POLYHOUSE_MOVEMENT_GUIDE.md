# 🏢 Polyhouse Movement Integration - Complete Guide

## 🎯 Overview

Your ERP now has **intelligent polyhouse space management** integrated with batch tracking. When seeds germinate and plants grow, you can easily move them between polyhouse sections with **automatic capacity tracking**.

---

## 🌱 The Complete Plant Journey

```
STEP 1: SEEDS PLANTED
┌──────────────────────────────────────────┐
│ Production Order Started                 │
│ - Batch Created: BCH00001                │
│ - Stage: Seed                            │
│ - Quantity: 1000 plants                  │
│ - Location: Not Assigned                 │
└──────────────┬───────────────────────────┘
               │
               ▼
STEP 2: GERMINATION (1-2 weeks)
┌──────────────────────────────────────────┐
│ Move to Germination Zone                │
│                                          │
│ Click → icon on batch                   │
│ Select: Greenhouse A - Germination Zone │
│ Reason: Germination Complete             │
│                                          │
│ AUTO-MAGIC HAPPENS:                      │
│ ✅ Batch moved to GH-A-GERM             │
│ ✅ Occupied: 0 → 1000 plants            │
│ ✅ Available: 10,000 → 9,000            │
│ ✅ Movement logged in history           │
└──────────────┬───────────────────────────┘
               │
               ▼
STEP 3: SEEDLING (2-4 weeks)
┌──────────────────────────────────────────┐
│ Move to Seedling Area                   │
│                                          │
│ Select: Greenhouse A - Seedling Area    │
│ Reason: Growth Stage Change              │
│                                          │
│ AUTO-MAGIC:                              │
│ ✅ GH-A-GERM: 1000 → 0 (freed)          │
│ ✅ GH-A-SEED: 0 → 980 (20 died)         │
│ ✅ Capacity auto-adjusted                │
└──────────────┬───────────────────────────┘
               │
               ▼
STEP 4: VEGETATIVE (4-8 weeks)
┌──────────────────────────────────────────┐
│ Move to Vegetative Growth                │
│                                          │
│ Select: Shadehouse B - Vegetative Growth│
│ Reason: Growth Stage Change              │
│                                          │
│ AUTO-MAGIC:                              │
│ ✅ GH-A-SEED freed (capacity restored)   │
│ ✅ SH-B-VEG occupied (capacity reduced)  │
│ ✅ Different environment (shadehouse)    │
└──────────────┬───────────────────────────┘
               │
               ▼
STEP 5: HARDENING (2 weeks)
┌──────────────────────────────────────────┐
│ Move to Hardening Zone                  │
│                                          │
│ Select: Open Field C - Hardening Zone   │
│ Reason: Ready for Hardening              │
│                                          │
│ AUTO-MAGIC:                              │
│ ✅ Plants adapted to outdoor conditions  │
│ ✅ Capacity tracking continues           │
└──────────────┬───────────────────────────┘
               │
               ▼
STEP 6: READY FOR SALE
┌──────────────────────────────────────────┐
│ Move to Ready Zone                      │
│                                          │
│ Select: Shadehouse B - Ready for Sale   │
│ Reason: Growth Stage Change              │
│                                          │
│ ✅ Plants ready for customers            │
│ ✅ Can convert to Finished Goods         │
└──────────────────────────────────────────┘
```

---

## 🏗️ Polyhouse Structure

### Pre-Configured Polyhouses

```
┌─────────────────────────────────────────────────────┐
│              MAIN NURSERY                           │
│         (5000 sq meters total area)                 │
└─────────────────────────────────────────────────────┘

1. GREENHOUSE A (500 sq meters - Climate Controlled)
   ├─ Germination Zone (GH-A-GERM)
   │  - Capacity: 10,000 plants
   │  - Climate Control: ✅ Yes
   │  - Perfect for: Seeds, Early germination
   │
   └─ Seedling Area (GH-A-SEED)
      - Capacity: 5,000 plants
      - Climate Control: ✅ Yes
      - Perfect for: Young seedlings

2. SHADEHOUSE B (300 sq meters - Partial Shade)
   ├─ Vegetative Growth (SH-B-VEG)
   │  - Capacity: 3,000 plants
   │  - Climate Control: ❌ No
   │  - Perfect for: Active growth phase
   │
   └─ Ready for Sale (SH-B-READY)
      - Capacity: 2,000 plants
      - Climate Control: ❌ No
      - Perfect for: Mature plants waiting for sale

3. OPEN FIELD C (1000 sq meters - Outdoor)
   └─ Hardening Zone (OF-C-HARD)
      - Capacity: 5,000 plants
      - Climate Control: ❌ No
      - Perfect for: Hardening plants before sale
```

---

## 🔄 How to Move Batches

### Step 1: Find Your Batch

Go to: **Batches** page

You'll see all active batches with:
- Batch Code
- Plant Variety
- Current Stage
- Current Quantity
- Current Location (or "Not assigned")
- Cost per Plant
- Total Value

### Step 2: Click Move Button

Click the **green arrow (→)** icon next to any batch

### Step 3: Fill Move Form

**Modal appears showing:**

```
Current Batch Info:
- Batch: BCH00001
- Current Location: Greenhouse A - Germination Zone
- Quantity: 980 plants
```

**Fill the form:**

1. **Move to Section** (Required)
   - Dropdown shows all available sections
   - Shows capacity: `(9,000/10,000 available)`
   - Example: Select "Greenhouse A - Seedling Area"

2. **Quantity to Move** (Required)
   - Default: Full batch quantity
   - Can move partial batches
   - Max: Current quantity in batch
   - Example: 980 plants

3. **Movement Reason** (Dropdown)
   - Germination Complete
   - Growth Stage Change ← Most common
   - Space Optimization
   - Disease Control
   - Climate Control Needed
   - Ready for Hardening

4. **Notes** (Optional)
   - Free text field
   - Example: "Plants showing good growth, ready for next stage"

### Step 4: Submit

Click **"Move Batch"** button

**What Happens Automatically:**

1. ✅ **Updates Batch Location**
   ```sql
   batches.polyhouse_section_id = new_section_id
   ```

2. ✅ **Frees Previous Section** (if any)
   ```sql
   old_section.occupied_capacity -= quantity_moved
   old_section.available_capacity += quantity_moved
   ```

3. ✅ **Occupies New Section**
   ```sql
   new_section.occupied_capacity += quantity_moved
   new_section.available_capacity -= quantity_moved
   ```

4. ✅ **Records Movement History**
   ```sql
   INSERT INTO batch_movements (
     batch_id, from_section_id, to_section_id, 
     quantity_moved, movement_date, movement_reason, notes
   )
   ```

---

## 📊 Database Tables

### batch_movements Table

```sql
CREATE TABLE batch_movements (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id),
    from_section_id INTEGER REFERENCES polyhouse_sections(id),
    to_section_id INTEGER REFERENCES polyhouse_sections(id),
    quantity_moved INTEGER NOT NULL,
    movement_date DATE NOT NULL,
    movement_reason VARCHAR(100),
    notes TEXT,
    moved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example Records:**

| ID | Batch | From Section | To Section | Qty | Date | Reason |
|----|-------|--------------|------------|-----|------|--------|
| 1 | BCH00001 | NULL | GH-A-GERM | 1000 | 2025-12-21 | Initial Placement |
| 2 | BCH00001 | GH-A-GERM | GH-A-SEED | 980 | 2026-01-05 | Germination Complete |
| 3 | BCH00001 | GH-A-SEED | SH-B-VEG | 970 | 2026-02-15 | Growth Stage Change |
| 4 | BCH00001 | SH-B-VEG | OF-C-HARD | 960 | 2026-04-01 | Ready for Hardening |
| 5 | BCH00001 | OF-C-HARD | SH-B-READY | 950 | 2026-04-15 | Ready for Sale |

---

## 🎯 Smart Features

### 1. Capacity Management

**Prevents Overcrowding:**
```
❌ Cannot move 1000 plants to section with 500 capacity
✅ System checks: available_capacity >= quantity_moved
```

**Auto-Calculates:**
```javascript
available_capacity = total_capacity - occupied_capacity
```

### 2. Movement Reasons

Pre-defined reasons help with:
- ✅ Tracking why plants were moved
- ✅ Analyzing growth patterns
- ✅ Identifying issues (disease control moves)
- ✅ Reporting and analytics

### 3. Partial Moves

Can split batches across sections:
```
Batch BCH00001 (1000 plants)
├─ Move 700 to SH-B-VEG
└─ Keep 300 in GH-A-SEED (slower growing)
```

### 4. Complete Audit Trail

Every movement is logged:
- When was it moved?
- From where to where?
- How many plants?
- Why was it moved?
- Who moved it?

---

## 📍 API Endpoints

```
GET  /api/batches/sections
     → Get all available polyhouse sections with capacity

POST /api/batches/move
     → Move batch to new section
     Body: {
       batch_id: 1,
       to_section_id: 2,
       quantity_moved: 980,
       movement_reason: "Growth Stage Change",
       notes: "Plants ready for next stage"
     }

GET  /api/batches/:batch_id/movements
     → Get movement history for a batch

GET  /api/batches/varieties
     → Get all plant varieties

GET  /api/batches/stages
     → Get all growth stages
```

---

## 💡 Use Cases

### Use Case 1: Germinated Seeds

**Scenario:** 1000 rose seeds planted, germinated in 2 weeks

**Steps:**
1. Seeds start with no location (just planted)
2. After 2 weeks, 990 germinated
3. **Click → button** on batch
4. Select: "Greenhouse A - Germination Zone"
5. Reason: "Germination Complete"
6. ✅ Batch moved, capacity updated

### Use Case 2: Slow vs Fast Growers

**Scenario:** Same batch has plants growing at different rates

**Steps:**
1. Batch BCH00001 has 1000 seedlings
2. 700 are ready for vegetative stage
3. 300 need more time
4. **Move 700** to Vegetative section
5. **Keep 300** in Seedling area
6. ✅ Two partial moves, both tracked

### Use Case 3: Disease Control

**Scenario:** Spotted disease in a section

**Steps:**
1. Identify affected section
2. Move healthy batches out
3. Reason: "Disease Control"
4. Notes: "Fungal infection detected, moving healthy plants"
5. ✅ Movement logged for traceability

### Use Case 4: Seasonal Adjustment

**Scenario:** Summer heat, need climate control

**Steps:**
1. Plants in open field suffering
2. Move to climate-controlled greenhouse
3. Reason: "Climate Control Needed"
4. Notes: "Temperature exceeded 40°C"
5. ✅ Plants protected, reason documented

---

## 📊 Capacity Dashboard

### Current Utilization:

```
Greenhouse A - Germination Zone
├─ Total: 10,000
├─ Occupied: 3,500
├─ Available: 6,500
└─ Utilization: 35%

Greenhouse A - Seedling Area
├─ Total: 5,000
├─ Occupied: 4,200
├─ Available: 800
└─ Utilization: 84% ⚠️ High

Shadehouse B - Vegetative Growth
├─ Total: 3,000
├─ Occupied: 1,500
├─ Available: 1,500
└─ Utilization: 50%

Shadehouse B - Ready for Sale
├─ Total: 2,000
├─ Occupied: 950
├─ Available: 1,050
└─ Utilization: 48%

Open Field C - Hardening Zone
├─ Total: 5,000
├─ Occupied: 800
├─ Available: 4,200
└─ Utilization: 16%
```

---

## ✅ Benefits

### 1. Space Optimization
- Know exactly where plants are
- Prevent overcrowding
- Maximize polyhouse utilization

### 2. Growth Tracking
- See plant journey from seed to sale
- Identify bottlenecks in growth stages
- Optimize space allocation

### 3. Environmental Control
- Move plants needing climate control
- Separate by growth requirements
- Hardening zone for outdoor preparation

### 4. Traceability
- Complete movement history
- Audit trail for compliance
- Identify patterns and issues

### 5. Capacity Planning
- Know available space before planting
- Plan production orders based on capacity
- Avoid overcrowding issues

---

## 🚀 Quick Start

### For New Batches:

1. **Create Production Order** → `/production`
2. **Start Production** → Creates batch (no location yet)
3. **Seeds Germinate** (1-2 weeks)
4. **Move to Germination Zone** → Click → icon
5. **Track Growth** → Move between sections as plants grow
6. **Ready for Sale** → Move to Ready section
7. **Convert to Finished Goods** → `/production` FG tab

### For Existing Batches:

1. Go to **Batches** page
2. Find batch without location (shows "-")
3. Click **→ icon**
4. Select appropriate section
5. Reason: "Initial Placement"
6. ✅ Batch now has location!

---

## 🎯 Best Practices

### 1. Move Promptly
- Move batches when growth stage changes
- Don't let plants outgrow their section
- Keep seedlings separate from mature plants

### 2. Use Correct Reasons
- Helps with analytics
- Makes sense for future reference
- Required for compliance/audits

### 3. Add Notes
- Document observations
- Note any issues
- Helpful for team communication

### 4. Monitor Capacity
- Check utilization regularly
- Plan moves in advance
- Don't wait until section is full

### 5. Track Partial Moves
- Separate slow/fast growers
- Better space utilization
- More accurate cost tracking

---

## 📈 Reporting

### Movement Reports You Can Generate:

1. **Batch Movement History**
   - Where has BCH00001 been?
   - How long in each section?
   - Why was it moved?

2. **Section Utilization**
   - Which sections are full?
   - Which have spare capacity?
   - Peak utilization times?

3. **Movement Patterns**
   - Average time in each section?
   - Most common movement reasons?
   - Identify bottlenecks?

4. **Capacity Forecast**
   - Based on current production orders
   - When will sections be full?
   - Need for expansion?

---

## 🎊 Summary

**Your Nursery Now Has:**

✅ **5 Pre-configured Polyhouse Sections**  
✅ **Automatic Capacity Tracking**  
✅ **One-Click Batch Movement**  
✅ **Complete Movement History**  
✅ **Intelligent Space Management**  
✅ **Growth Stage Integration**  

**The system intelligently manages:**
- Where plants are located
- How much space is available
- When to move plants
- Why plants were moved
- Complete audit trail

**From seed to sale, every plant's journey is tracked! 🌱→🏢→🌹**

---

## 🔗 Navigation

- **View Batches:** http://localhost:3000/batches
- **Move Batch:** Click → icon on any batch
- **View Polyhouses:** http://localhost:3000/polyhouses
- **Track Capacity:** Polyhouses page shows utilization

**Your plants now have a home! 🏠🌱**
