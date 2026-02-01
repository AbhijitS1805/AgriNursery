# 🌱 Agriculture Nursery ERP - CRUD Operations Guide

## ✅ What's Included

All pages now have full **Create, Read, Update, Delete** (CRUD) functionality:

### 1. **Batches Page** (`/batches`)
- ✅ **Create**: "New Batch" button - Add new plant batches
- ✅ **Read**: View all active batches with details
- ✅ **Update**: Edit icon to modify batch details
- ✅ **Delete**: Trash icon to remove batches

**Form Fields:**
- Batch Code (unique identifier)
- Plant Variety (e.g., Rose, Tomato)
- Initial Quantity (number of plants)
- Source Type (In-House / Purchased)

---

### 2. **Inventory Page** (`/inventory`)
- ✅ **Create**: "Add Item" button - Add new inventory items
- ✅ **Read**: View all items with stock levels
- ✅ **Update**: Edit icon to modify item details
- ✅ **Delete**: Trash icon to remove items
- ✅ **Stock In**: Green down arrow - Purchase/receive stock
- ✅ **Stock Out**: Orange up arrow - Consume/use stock

**Form Fields:**
- SKU Code (unique stock code)
- Item Name (fertilizer, chemical, etc.)
- Minimum Stock (reorder level)
- Unit of Measure (kg, liters, pieces, etc.)

**Stock Transactions:**
- Purchase: Add stock with unit cost
- Consumption: Deduct stock for batch usage

---

### 3. **Polyhouses Page** (`/polyhouses`)
- ✅ **Create**: "New Polyhouse" button - Add new structures
- ✅ **Read**: View utilization cards with capacity
- ✅ **Update**: Edit icon to modify polyhouse details
- ✅ **Delete**: Trash icon to remove polyhouses

**Form Fields:**
- Polyhouse Name
- Location
- Area (square meters)
- Environment Type (Shade Net, Greenhouse, Mist House, Open)

---

### 4. **Sales Page** (`/sales`)
- ✅ **Create**: "New Sales Order" button - Create customer orders
- ✅ **Read**: View all sales orders
- ✅ **Delete**: Trash icon to cancel orders

**Form Fields:**
- Customer Name
- Customer Phone
- Quantity (number of plants)
- Unit Price
- Discount Amount
- *Auto-calculated Total*

---

### 5. **Tasks Page** (`/tasks`)
- ✅ **Create**: "New Task" button - Schedule work
- ✅ **Read**: View all pending tasks
- ✅ **Complete**: Green checkmark to mark done
- ✅ **Delete**: Trash icon to remove tasks

**Form Fields:**
- Task Name
- Task Type (Watering, Fertilizing, Pruning, etc.)
- Scheduled Date
- Instructions (optional notes)

---

## 🎨 UI Features

### Modal Forms
- All Create/Edit operations use modal popups
- Clean, user-friendly forms with validation
- Cancel option to dismiss without saving

### Action Buttons
| Icon | Action | Color |
|------|--------|-------|
| ➕ Plus | Create New | Green |
| ✏️ Pencil | Edit/Update | Blue |
| 🗑️ Trash | Delete | Red |
| ✅ Check | Complete | Green |
| ⬇️ Down Arrow | Stock In | Green |
| ⬆️ Up Arrow | Stock Out | Orange |

### Visual Feedback
- **Success**: Green badges for normal status
- **Warning**: Yellow badges for low stock/medium utilization
- **Danger**: Red badges for critical alerts
- **Hover Effects**: All rows/buttons highlight on hover

---

## 🚀 Getting Started

### 1. Access the Application
```
http://localhost:3000
```

### 2. Login
- **Username**: `admin`
- **Password**: `admin123`

### 3. Navigate Pages
Use the sidebar to switch between modules

### 4. Start Creating Data!

#### Example Workflow:
1. **Create Polyhouse**: Go to Polyhouses → Click "New Polyhouse"
2. **Add Inventory**: Go to Inventory → Click "Add Item" (e.g., Fertilizer)
3. **Stock In**: Click green down arrow → Enter purchase details
4. **Create Batch**: Go to Batches → Click "New Batch"
5. **Schedule Task**: Go to Tasks → Click "New Task" (e.g., Watering)
6. **Create Sale**: Go to Sales → Click "New Sales Order"

---

## 💡 Tips

### Best Practices
- Always fill required fields (marked with *)
- Use unique Batch Codes and SKU Codes
- Set realistic Minimum Stock levels
- Complete tasks regularly to track progress

### Stock Management
- **Purchase** transactions add stock
- **Consumption** transactions reduce stock
- Low stock items show in yellow/red alerts

### Data Validation
- Numbers must be positive
- Dates must be valid format
- Codes should be unique

---

## 🔧 Troubleshooting

### Modal Won't Close
- Click "Cancel" button
- Or click outside the modal

### Form Not Submitting
- Check all required fields are filled
- Ensure numbers are valid (no letters)
- Check console for error messages

### Data Not Appearing
- Refresh the page
- Check if you're on the correct tab
- Verify database is running

---

## 📊 Dashboard Overview

The Dashboard shows real-time metrics:
- **Active Batches**: Total running batches
- **Total Plants**: Sum of all plants
- **Low Stock Items**: Items below minimum
- **Pending Tasks**: Scheduled work
- **Revenue (30 days)**: Recent sales
- **Polyhouse Utilization**: Capacity usage

All metrics update automatically when you create/update/delete records!

---

## ✨ Next Steps

Explore advanced features:
- View Reports page for profit analysis
- Use filters to find specific records
- Export data (coming soon)
- Set up user roles and permissions

**Enjoy your fully functional Agriculture Nursery ERP! 🌿**
