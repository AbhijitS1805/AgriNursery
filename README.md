# 🌱 Agri-Nursery ERP System

A comprehensive, production-ready Agriculture Nursery Management ERP system designed specifically for managing living assets (plants) from propagation to sale.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Module Overview](#module-overview)
- [Development](#development)

## ✨ Features

### 1. **Living Asset & Batch Management**
- Track plant batches through complete lifecycle (Seed → Germination → Vegetative → Ready → Sold)
- Mother plant registry for propagation management
- Mortality and waste tracking with financial impact calculation
- Batch history and audit trail
- Biological asset valuation with automatic value appreciation

### 2. **Dual-Stream Inventory System**
- **Biological Inventory:** Track plant batches, growth stages, and health status
- **Consumable Inventory:** Manage seeds, fertilizers, pesticides, pots, soil, etc.
- SKU management with barcode support
- Low-stock alerts and automated reorder points
- Expiry tracking for chemicals and perishables
- Batch-wise inventory for traceability

### 3. **Polyhouse & Spatial Management**
- Hierarchical infrastructure mapping (Site → Polyhouse → Section → Bed)
- Real-time capacity tracking and utilization metrics
- Space optimization with tray-slot occupancy monitoring
- Environmental logging (temperature, humidity, light)
- IoT integration ready

### 4. **Agri-Specific Financials & Accounts**
- **Biological Asset Valuation:** Automatic appreciation as plants grow
- **Bill of Materials (BOM):** Seed Cost + Consumables + Labor + Overhead
- Full double-entry accounting system
- Multi-channel billing (Retail/Wholesale/Dealer)
- GST/Tax handling (India-ready)
- Profit & Loss analysis per plant variety
- Accounts Payable/Receivable management

### 5. **Task & Workforce Management**
- Recurring task generation (watering, fertilization, spraying)
- Task scheduling and assignment to workers
- Labor time tracking with batch-wise allocation
- Accurate cost-per-plant calculation
- Task completion monitoring

## 🛠 Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **Authentication:** JWT
- **Security:** Helmet, CORS

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **Styling:** TailwindCSS
- **Icons:** Heroicons
- **HTTP Client:** Axios
- **Charts:** Recharts

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Dashboard │ Batches │ Inventory │ Sales │ Reports      │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────────┐
│               Backend (Express.js)                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ Controllers → Services → Database Layer        │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│              PostgreSQL Database                         │
│  • 40+ Tables with relationships                        │
│  • Triggers for automation                              │
│  • Views for reporting                                  │
│  • Indexes for performance                              │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AgriNursery
```

2. **Install dependencies**
```bash
npm run setup
```

3. **Configure environment variables**
```bash
cd server
cp .env.example .env
```

Edit `.env` file with your database credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agri_nursery_erp
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

4. **Initialize the database**
```bash
npm run db:init
```

This will:
- Create the database
- Run all schema migrations
- Insert seed data (growth stages, accounts, sample data)
- Create default admin user

5. **Start the development servers**
```bash
# From root directory
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend UI: http://localhost:3000

### Default Login Credentials

- **Username:** admin
- **Password:** admin123
- **⚠️ CHANGE THIS IN PRODUCTION!**

## 📊 Database Schema

### Core Entities

#### Living Asset Management
- `plant_varieties` - Plant species/variety master data
- `mother_plants` - Permanent propagation assets
- `growth_stages` - Lifecycle stages definition
- `batches` - Production batches with costing
- `batch_history` - Complete audit trail
- `mortality_records` - Loss tracking

#### Inventory Management
- `inventory_categories` - Item categorization
- `inventory_items` - Consumables and equipment
- `inventory_batches` - Batch-wise tracking for expiry
- `inventory_transactions` - All stock movements

#### Infrastructure
- `nursery_sites` - Physical locations
- `polyhouses` - Greenhouse structures
- `polyhouse_sections` - Sections within polyhouses
- `environmental_logs` - Climate data

#### Financial
- `accounts` - Chart of accounts
- `suppliers` - Vendor master
- `customers` - Customer master
- `purchase_orders` - PO management
- `sales_orders` - Sales order processing
- `invoices` - Billing
- `payments` - Payment tracking
- `journal_entries` - Double-entry bookkeeping

#### Workforce
- `users` - System users and workers
- `task_templates` - Recurring task definitions
- `tasks` - Scheduled and actual tasks
- `labor_entries` - Time tracking

### Key Features

**Automated Triggers:**
- Capacity updates when batches move
- Biological asset revaluation on stage change
- Timestamp management

**Computed Columns:**
- Total cost calculation (seed + consumable + labor + overhead)
- Cost per plant (total cost / quantity)
- Available capacity (total - occupied)

**Views for Reporting:**
- `v_active_batches` - Current production overview
- `v_low_stock_items` - Inventory alerts
- `v_expired_inventory` - Expiry alerts
- `v_polyhouse_utilization` - Space usage
- `v_profit_by_variety` - P&L by plant type

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All API requests require JWT token (except login):
```
Authorization: Bearer <token>
```

### Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/users` - List users

#### Batches
- `GET /api/batches` - List all batches (with filters)
- `GET /api/batches/active` - Active batches view
- `GET /api/batches/:id` - Get batch details
- `POST /api/batches` - Create new batch
- `PUT /api/batches/:id` - Update batch
- `PUT /api/batches/:id/stage` - Update growth stage
- `POST /api/batches/:id/mortality` - Record plant deaths
- `POST /api/batches/:id/cost` - Update batch costs
- `GET /api/batches/:id/history` - Batch history

#### Inventory
- `GET /api/inventory/items` - List inventory items
- `GET /api/inventory/items/low-stock` - Low stock alerts
- `GET /api/inventory/items/:id` - Item details
- `POST /api/inventory/items` - Create item
- `PUT /api/inventory/items/:id` - Update item
- `GET /api/inventory/transactions` - Transaction history
- `POST /api/inventory/transactions` - Record transaction
- `GET /api/inventory/batches/expired` - Expired items
- `GET /api/inventory/categories` - Item categories

#### Polyhouses
- `GET /api/polyhouses/sites` - List sites
- `GET /api/polyhouses` - List polyhouses
- `GET /api/polyhouses/utilization` - Capacity stats
- `GET /api/polyhouses/sections` - All sections
- `GET /api/polyhouses/:id/sections` - Sections by polyhouse
- `POST /api/polyhouses/sections` - Create section
- `GET /api/polyhouses/sections/:id/environment` - Environmental logs
- `POST /api/polyhouses/sections/:id/environment` - Log environment data

#### Sales
- `GET /api/sales/customers` - List customers
- `POST /api/sales/customers` - Create customer
- `GET /api/sales/orders` - Sales orders
- `GET /api/sales/orders/:id` - Order details
- `POST /api/sales/orders` - Create order
- `PUT /api/sales/orders/:id/fulfill` - Fulfill order
- `GET /api/sales/invoices` - Invoices
- `POST /api/sales/invoices` - Create invoice

#### Purchases
- `GET /api/purchases/suppliers` - List suppliers
- `POST /api/purchases/suppliers` - Create supplier
- `GET /api/purchases/orders` - Purchase orders
- `POST /api/purchases/orders` - Create PO

#### Tasks
- `GET /api/tasks` - List tasks
- `GET /api/tasks/pending` - Pending tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id/complete` - Mark complete
- `GET /api/tasks/labor` - Labor entries
- `POST /api/tasks/labor` - Log labor time

#### Reports
- `GET /api/reports/profit-by-variety` - Profitability report
- `GET /api/reports/batch-costing` - Batch cost analysis
- `GET /api/reports/stock-status` - Inventory status
- `GET /api/reports/batch-summary` - Production summary
- `GET /api/reports/mortality-analysis` - Loss analysis

#### Dashboard
- `GET /api/dashboard/stats` - Key metrics
- `GET /api/dashboard/alerts` - System alerts

### Example Request

```bash
curl -X POST http://localhost:5000/api/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "batch_code": "BAT-2024-001",
    "plant_variety_id": 1,
    "initial_quantity": 500,
    "current_stage_id": 1,
    "propagation_date": "2024-01-15",
    "polyhouse_section_id": 1,
    "seed_cost": 5000,
    "created_by": 1
  }'
```

## 📦 Module Overview

### 1. Living Asset Management

**Key Concepts:**
- **Batch:** A group of plants propagated together
- **Growth Stages:** Predefined lifecycle phases with value multipliers
- **Biological Asset Valuation:** Cost × Stage Multiplier = Current Value
- **Mother Plant:** Permanent asset for propagation

**Costing Formula:**
```
Total Cost = Seed Cost + Consumable Cost + Labor Cost + Overhead Cost
Cost Per Plant = Total Cost ÷ Current Quantity
Current Value = Total Cost × Stage Multiplier
```

### 2. Inventory Management

**Features:**
- Dual tracking: Quantity-based (consumables) + Batch-based (expiry items)
- Automatic stock updates on transactions
- Low-stock alerts based on minimum threshold
- Expiry date tracking for chemicals
- Cost allocation to plant batches

### 3. Polyhouse Management

**Hierarchy:**
```
Nursery Site
  └─ Polyhouse/Greenhouse
      └─ Section
          └─ Bed/Bench (capacity in slots/trays)
```

**Capacity Calculation:**
```
Utilization % = (Occupied Slots / Total Slots) × 100
```

### 4. Financial Accounting

**Double-Entry Bookkeeping:**
Every transaction creates balanced journal entries with debits and credits.

**Account Types:**
- Assets (Biological, Inventory, Receivables, Cash)
- Liabilities (Payables, Wages)
- Equity (Owner's Equity, Retained Earnings)
- Revenue (Plant Sales)
- COGS (Direct Materials, Labor)
- Expenses (Operating Expenses)

### 5. Task & Labor Management

**Task Types:**
- Watering
- Fertilization
- Spraying
- Pruning
- Inspection
- Custom

**Labor Cost Allocation:**
Labor hours are tracked per batch, and costs are automatically added to batch's labor_cost field for accurate cost-per-plant calculation.

## 🔧 Development

### Project Structure

```
AgriNursery/
├── server/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── controllers/             # Request handlers
│   │   ├── auth.controller.js
│   │   ├── batch.controller.js
│   │   ├── inventory.controller.js
│   │   └── ...
│   ├── routes/                  # API routes
│   │   ├── auth.routes.js
│   │   ├── batches.routes.js
│   │   └── ...
│   ├── database/
│   │   └── schema.sql           # Complete database schema
│   ├── scripts/
│   │   └── initDatabase.js      # DB initialization
│   ├── index.js                 # Express app entry
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx       # Main layout
│   │   ├── pages/               # Route components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Batches.jsx
│   │   │   └── ...
│   │   ├── utils/
│   │   │   └── api.js           # Axios instance
│   │   ├── App.jsx              # App router
│   │   └── main.jsx             # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── package.json                 # Root package
```

### Adding New Features

1. **Database:** Add tables/columns in `schema.sql`
2. **Backend:** Create controller → route → register in `index.js`
3. **Frontend:** Create page component → add to router in `App.jsx`

### Database Migrations

For production, use a migration tool like:
- node-pg-migrate
- Knex.js migrations
- Sequelize migrations

Currently using direct SQL for simplicity.

## 🎯 Business Logic Highlights

### Batch Creation Flow
1. User creates batch with initial quantity
2. System assigns to polyhouse section
3. Section's occupied capacity auto-updates (trigger)
4. Batch starts in first growth stage
5. Initial costs recorded (seed cost)

### Stage Progression
1. Update batch stage
2. System recalculates biological asset value (trigger)
3. History record created
4. Alerts generated if ready for harvest

### Mortality Recording
1. Record quantity lost
2. Calculate financial loss (cost_per_plant × quantity)
3. Update current quantity
4. History logged
5. Batch costing automatically recalculated

### Inventory Consumption
1. Create consumption transaction
2. Stock reduced automatically
3. Cost allocated to batch
4. Batch's consumable_cost increased
5. Low-stock alert if below threshold

### Sales Order Fulfillment
1. Create sales order with items
2. Fulfill order (reduce batch quantities)
3. Generate invoice
4. Record payment
5. Journal entries created automatically
6. Profit calculated (selling price - cost price)

## 🔐 Security Notes

### For Production Deployment:

1. **Change Default Credentials**
   - Update admin password
   - Use strong JWT secret

2. **Environment Variables**
   - Never commit `.env` files
   - Use environment-specific configs

3. **Database Security**
   - Use connection pooling limits
   - Enable SSL for DB connections
   - Regular backups

4. **API Security**
   - Implement rate limiting
   - Add input validation
   - Enable HTTPS only
   - CORS whitelist

5. **Authentication**
   - Implement proper password hashing (bcrypt)
   - Add refresh tokens
   - Session management

## 📈 Performance Optimization

- Database indexes on frequently queried columns
- Connection pooling (max 20 connections)
- API response pagination
- Frontend lazy loading
- Caching strategy for static data

## 🧪 Testing

```bash
# Unit tests (to be added)
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 📄 License

MIT License - feel free to use for commercial purposes

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines.

## 📞 Support

For issues and questions:
- Create GitHub issue
- Email: support@example.com

---

**Built with ❤️ for Agriculture Technology**

🌱 Growing Together, Digitally
