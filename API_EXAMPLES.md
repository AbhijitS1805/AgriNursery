# API Examples

## Authentication

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@agrinursery.com",
      "full_name": "System Administrator",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Batch Management

### Create Batch
```bash
curl -X POST http://localhost:5000/api/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "batch_code": "ROSE-2024-001",
    "plant_variety_id": 1,
    "initial_quantity": 500,
    "current_stage_id": 1,
    "propagation_date": "2024-01-15",
    "expected_ready_date": "2024-04-15",
    "polyhouse_section_id": 1,
    "seed_cost": 5000,
    "notes": "Premium rose cuttings from mother plant MP-001",
    "created_by": 1
  }'
```

### Update Growth Stage
```bash
curl -X PUT http://localhost:5000/api/batches/1/stage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "new_stage_id": 2,
    "event_date": "2024-01-25",
    "notes": "Successful germination - 95% success rate",
    "recorded_by": 1
  }'
```

### Record Mortality
```bash
curl -X POST http://localhost:5000/api/batches/1/mortality \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "quantity_lost": 25,
    "loss_reason": "disease",
    "loss_date": "2024-02-01",
    "description": "Fungal infection in section B",
    "recorded_by": 1
  }'
```

## Inventory Management

### Create Inventory Item
```bash
curl -X POST http://localhost:5000/api/inventory/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category_id": 2,
    "sku_code": "FERT-NPK-001",
    "item_name": "NPK 19:19:19 Water Soluble Fertilizer",
    "description": "Premium grade water soluble NPK fertilizer",
    "unit_of_measure": "kg",
    "minimum_stock": 50,
    "maximum_stock": 500,
    "unit_cost": 250,
    "requires_expiry": true
  }'
```

### Record Purchase Transaction
```bash
curl -X POST http://localhost:5000/api/inventory/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "item_id": 1,
    "transaction_type": "purchase",
    "quantity": 100,
    "unit_cost": 250,
    "reference_number": "PO-2024-001",
    "transaction_date": "2024-01-10",
    "expiry_date": "2025-12-31",
    "supplier_name": "AgroTech Solutions",
    "created_by": 1
  }'
```

### Record Consumption
```bash
curl -X POST http://localhost:5000/api/inventory/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "item_id": 1,
    "transaction_type": "consumption",
    "quantity": -5,
    "unit_cost": 250,
    "batch_id": 1,
    "transaction_date": "2024-01-20",
    "notes": "Weekly fertilization - Batch ROSE-2024-001",
    "created_by": 1
  }'
```

## Sales Management

### Create Customer
```bash
curl -X POST http://localhost:5000/api/sales/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customer_code": "CUST-001",
    "customer_name": "Green Gardens Retail",
    "customer_type": "retail",
    "contact_person": "John Smith",
    "phone": "+91-9876543210",
    "email": "john@greengardens.com",
    "address": "123 Garden Street, Mumbai",
    "gstin": "27AABCU9603R1ZM",
    "credit_limit": 100000
  }'
```

### Create Sales Order
```bash
curl -X POST http://localhost:5000/api/sales/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "so_number": "SO-2024-001",
    "customer_id": 1,
    "order_date": "2024-03-01",
    "delivery_date": "2024-03-05",
    "items": [
      {
        "batch_id": 1,
        "plant_variety_id": 1,
        "quantity": 100,
        "unit_price": 50
      }
    ],
    "discount_amount": 500,
    "notes": "Bulk order - 10% discount applied",
    "created_by": 1
  }'
```

## Task Management

### Create Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "task_name": "Weekly Fertilization",
    "task_type": "fertilization",
    "assigned_to": 2,
    "batch_id": 1,
    "scheduled_date": "2024-02-01",
    "scheduled_time": "08:00:00",
    "notes": "Use NPK 19:19:19 @ 2g/L",
    "created_by": 1
  }'
```

### Complete Task
```bash
curl -X PUT http://localhost:5000/api/tasks/1/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "actual_start_time": "2024-02-01T08:15:00",
    "actual_end_time": "2024-02-01T10:30:00",
    "notes": "Completed successfully. Used 5kg fertilizer."
  }'
```

### Log Labor Entry
```bash
curl -X POST http://localhost:5000/api/tasks/labor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "worker_id": 2,
    "batch_id": 1,
    "work_date": "2024-02-01",
    "start_time": "08:00:00",
    "end_time": "12:00:00",
    "hourly_rate": 150,
    "notes": "Watering and fertilization"
  }'
```

## Reports

### Get Profit by Variety
```bash
curl -X GET http://localhost:5000/api/reports/profit-by-variety \
  -H "Authorization: Bearer <token>"
```

### Get Batch Costing Report
```bash
curl -X GET "http://localhost:5000/api/reports/batch-costing?variety_id=1&start_date=2024-01-01" \
  -H "Authorization: Bearer <token>"
```

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "active_batches": 15,
    "total_plants": 7500,
    "low_stock_items": 3,
    "pending_tasks": 8,
    "monthly_revenue": 125000,
    "monthly_collected": 95000,
    "avg_polyhouse_utilization": 78.5
  }
}
```

## Query Parameters

### Batches with Filters
```bash
# Get batches by variety
curl -X GET "http://localhost:5000/api/batches?variety_id=1&status=active" \
  -H "Authorization: Bearer <token>"

# Get batches by section
curl -X GET "http://localhost:5000/api/batches?section_id=2&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Inventory Transactions
```bash
# Get transactions for specific item
curl -X GET "http://localhost:5000/api/inventory/transactions?item_id=1&limit=50" \
  -H "Authorization: Bearer <token>"

# Get consumption transactions for a batch
curl -X GET "http://localhost:5000/api/inventory/transactions?batch_id=1&transaction_type=consumption" \
  -H "Authorization: Bearer <token>"
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error
