# System Architecture Document

## Architecture Overview

The Agri-Nursery ERP follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                      (React Frontend)                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Dashboard │ │ Batches  │ │Inventory │ │  Sales   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                              │
│       ↕ HTTP/REST API (JSON over HTTPS)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│                   (Express.js Backend)                       │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │            Controllers (Request Handlers)       │         │
│  │  • Batch Controller    • Inventory Controller  │         │
│  │  • Sales Controller    • Task Controller       │         │
│  └────────────────────────────────────────────────┘         │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────┐         │
│  │         Business Logic & Validation            │         │
│  │  • Cost Calculation    • Stock Management      │         │
│  │  • Stage Progression   • Capacity Tracking     │         │
│  └────────────────────────────────────────────────┘         │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────┐         │
│  │              Database Access Layer             │         │
│  │              (SQL Query Builder)               │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│                   (PostgreSQL Database)                      │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │  Batches   │ │ Inventory  │ │ Financial  │             │
│  │   Tables   │ │   Tables   │ │   Tables   │             │
│  └────────────┘ └────────────┘ └────────────┘             │
│                                                              │
│  ┌─────────────────────────────────────────────┐           │
│  │  Triggers, Functions, Views, Constraints    │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Module Architecture

### 1. Living Asset Management Module

```
Batch Lifecycle Management
         │
         ├─── Creation (Propagation)
         │     └─ Initial costing (seeds/cuttings)
         │     └─ Capacity allocation
         │
         ├─── Growth Stages
         │     └─ Stage progression
         │     └─ Biological asset revaluation
         │     └─ History tracking
         │
         ├─── Cost Accumulation
         │     ├─ Consumables (inventory transactions)
         │     ├─ Labor (time tracking)
         │     └─ Overhead allocation
         │
         ├─── Mortality Management
         │     └─ Quantity adjustment
         │     └─ Financial loss calculation
         │
         └─── Sale/Completion
               └─ Final valuation
               └─ Profit calculation
```

### 2. Inventory Flow

```
Inventory Management Flow
         │
         ├─── Purchase
         │     ├─ Create PO
         │     ├─ Receive goods
         │     ├─ Stock IN transaction
         │     └─ Batch creation (for expiry items)
         │
         ├─── Consumption
         │     ├─ Stock OUT transaction
         │     ├─ Link to plant batch
         │     ├─ Update batch cost
         │     └─ Check low stock
         │
         ├─── Adjustments
         │     ├─ Stock count
         │     └─ Write-off
         │
         └─── Monitoring
               ├─ Low stock alerts
               ├─ Expiry tracking
               └─ Stock valuation
```

### 3. Financial Accounting Flow

```
Transaction Processing
         │
         ├─── Sales Order
         │     ├─ Order creation
         │     ├─ Fulfillment (reduce batch qty)
         │     ├─ Invoice generation
         │     └─ Journal Entry:
         │          DR: Accounts Receivable
         │          CR: Sales Revenue
         │          DR: COGS
         │          CR: Biological Assets
         │
         ├─── Purchase Order
         │     ├─ PO creation
         │     ├─ Goods receipt
         │     ├─ Invoice
         │     └─ Journal Entry:
         │          DR: Inventory
         │          CR: Accounts Payable
         │
         └─── Payment
               ├─ Payment record
               └─ Journal Entry:
                    DR: Cash/Bank
                    CR: Accounts Receivable
```

## Data Flow Diagrams

### Batch Creation Data Flow

```
User Input → Create Batch API
                  ↓
         Validate Input Data
                  ↓
         Insert into batches table
                  ↓
         Trigger: Update section capacity
                  ↓
         Create batch_history record
                  ↓
         Trigger: Calculate biological value
                  ↓
         Return batch details to UI
```

### Inventory Consumption Flow

```
User Records Consumption
         ↓
Create Transaction (type: consumption)
         ↓
Update inventory_items.current_stock (-)
         ↓
Update batches.consumable_cost (+)
         ↓
Check if stock < minimum_stock
         ↓
Generate low stock alert (if needed)
         ↓
Return updated stock status
```

### Sales Order Fulfillment Flow

```
Create Sales Order
         ↓
User Initiates Fulfillment
         ↓
FOR EACH item:
  ├─ Reduce batch.current_quantity
  ├─ Update sales_order_items.fulfilled_quantity
  └─ Check if batch needs restocking
         ↓
Update order.fulfillment_status
  ├─ pending (0% fulfilled)
  ├─ partial (1-99% fulfilled)
  └─ fulfilled (100% fulfilled)
         ↓
Generate alerts/notifications
```

## Database Schema Architecture

### Entity Relationship Model

```
┌──────────────┐
│plant_varieties│
└──────┬───────┘
       │ 1
       │
       │ N
┌──────┴───────┐        ┌──────────────┐
│   batches    │────────│growth_stages │
└──────┬───────┘   N:1  └──────────────┘
       │
       │ 1:N
       ↓
┌──────────────┐
│batch_history │
└──────────────┘

┌──────────────────┐
│inventory_categories│
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────┴──────────┐        ┌──────────────┐
│inventory_items    │───1:N──│inventory_    │
└────────┬──────────┘        │transactions  │
         │                   └──────────────┘
         │ 1:N
         ↓
┌──────────────────┐
│inventory_batches │
└──────────────────┘

┌──────────────┐
│nursery_sites │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────┴────┐        ┌──────────────────┐
│polyhouses │───1:N──│polyhouse_sections│
└───────────┘        └────────┬─────────┘
                              │ 1
                              │
                              │ N
                        ┌─────┴────┐
                        │ batches  │
                        └──────────┘
```

### Normalization Strategy

- **3rd Normal Form (3NF):** All tables normalized to eliminate redundancy
- **Computed Columns:** Used for frequently calculated values (cost_per_plant, available_capacity)
- **Denormalization:** Strategic denormalization in views for reporting performance

## Security Architecture

### Authentication & Authorization

```
User Login Request
      ↓
Verify credentials (username/password)
      ↓
Generate JWT token
  ├─ Payload: userId, role, username
  ├─ Secret: Server-side secret key
  └─ Expiry: 24 hours
      ↓
Return token to client
      ↓
Client stores token (localStorage)
      ↓
Subsequent requests include token in header
      ↓
Server validates token
  ├─ Verify signature
  ├─ Check expiry
  └─ Extract user info
      ↓
Process request with user context
```

### Role-Based Access Control (RBAC)

```
Roles Hierarchy:
├─ Admin (Full access)
│  └─ All operations on all modules
│
├─ Manager
│  ├─ View all data
│  ├─ Create/Edit batches, orders
│  └─ Generate reports
│
├─ Supervisor
│  ├─ View assigned data
│  ├─ Update batch stages
│  └─ Record transactions
│
└─ Worker
   ├─ View assigned tasks
   ├─ Record labor entries
   └─ Update task status
```

## Scalability Considerations

### Horizontal Scaling Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Client    │     │   Client    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ↓
                  ┌────────────────┐
                  │  Load Balancer │
                  └────────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       ↓                   ↓                   ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  API Server │     │  API Server │     │  API Server │
│   Instance  │     │   Instance  │     │   Instance  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ↓
                  ┌────────────────┐
                  │   PostgreSQL   │
                  │   (Primary)    │
                  └────────┬───────┘
                           │
                  ┌────────┴───────┐
                  │   PostgreSQL   │
                  │   (Replica)    │
                  └────────────────┘
```

### Performance Optimization

1. **Database Level:**
   - Connection pooling (20 max connections)
   - Indexes on foreign keys and frequently queried columns
   - Materialized views for complex reports
   - Query optimization with EXPLAIN ANALYZE

2. **Application Level:**
   - API response caching (Redis)
   - Pagination for large datasets
   - Lazy loading in frontend
   - Debouncing for search inputs

3. **Infrastructure Level:**
   - CDN for static assets
   - Gzip compression
   - HTTP/2
   - Database read replicas

## Deployment Architecture

### Development Environment
```
Developer Machine
├─ Node.js 18+
├─ PostgreSQL 14+ (local)
├─ VSCode/IDE
└─ Git
```

### Production Environment
```
Cloud Infrastructure (AWS/Azure/GCP)
│
├─ Load Balancer (ALB/NLB)
│   └─ SSL/TLS termination
│
├─ Application Servers (EC2/Compute Engine)
│   ├─ Node.js runtime
│   ├─ PM2 process manager
│   └─ Auto-scaling group
│
├─ Database (RDS/Cloud SQL)
│   ├─ PostgreSQL (Primary)
│   ├─ Read Replicas
│   └─ Automated backups
│
├─ File Storage (S3/Cloud Storage)
│   └─ Uploaded documents/images
│
└─ Monitoring & Logging
    ├─ CloudWatch/Stackdriver
    ├─ Error tracking (Sentry)
    └─ Performance monitoring (New Relic)
```

## Integration Points

### External System Integration

```
ERP System
    │
    ├─── IoT Sensors (Future)
    │     └─ Environmental data (temp, humidity)
    │     └─ Real-time monitoring
    │
    ├─── Payment Gateways
    │     └─ Online payment processing
    │
    ├─── SMS/Email Service
    │     └─ Notifications and alerts
    │
    ├─── Accounting Software (Future)
    │     └─ Export journal entries
    │     └─ Financial reporting
    │
    └─── E-commerce Platform (Future)
          └─ Online plant catalog
          └─ Order synchronization
```

## Backup & Disaster Recovery

### Backup Strategy

```
Database Backups
├─ Daily Full Backup (Automated)
│   └─ Retention: 30 days
│
├─ Hourly Incremental Backup
│   └─ Retention: 7 days
│
└─ Transaction Log Backup (Continuous)
    └─ Point-in-time recovery
```

### Disaster Recovery Plan

```
RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 1 hour

Recovery Steps:
1. Identify failure type
2. Failover to standby instance
3. Restore from latest backup
4. Verify data integrity
5. Resume operations
6. Post-mortem analysis
```

## Technology Decisions

### Why PostgreSQL?
- ✅ ACID compliance for financial data
- ✅ Complex queries and joins
- ✅ JSON support for flexible data
- ✅ Triggers and stored procedures
- ✅ Free and open source

### Why Node.js/Express?
- ✅ JavaScript full-stack
- ✅ Fast I/O performance
- ✅ Large ecosystem (npm)
- ✅ Easy to scale
- ✅ Great for REST APIs

### Why React?
- ✅ Component-based architecture
- ✅ Virtual DOM for performance
- ✅ Large community support
- ✅ Rich ecosystem
- ✅ TypeScript support (future)

## Future Enhancements

### Phase 2 Features
- Mobile app (React Native)
- IoT sensor integration
- Advanced analytics & ML
- Multi-location support
- Multi-currency support
- Barcode/QR code scanning
- Photo documentation
- Weather integration
- Automated irrigation control

### Microservices Migration (Future)
```
Monolith → Microservices

Services:
├─ Batch Management Service
├─ Inventory Service
├─ Financial Service
├─ Task Management Service
├─ Notification Service
└─ Reporting Service

Communication: REST + Message Queue (RabbitMQ/Kafka)
```

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team
