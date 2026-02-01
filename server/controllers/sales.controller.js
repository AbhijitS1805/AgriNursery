const db = require('../config/database');

class SalesController {
  async getCustomers(req, res) {
    try {
      const result = await db.query('SELECT * FROM customers WHERE is_active = true ORDER BY customer_name');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createCustomer(req, res) {
    try {
      const {
        customer_code, customer_name, customer_type, contact_person,
        phone, email, address, gstin, credit_limit
      } = req.body;

      const result = await db.query(`
        INSERT INTO customers (
          customer_code, customer_name, customer_type, contact_person,
          phone, email, address, gstin, credit_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        customer_code, customer_name, customer_type, contact_person || null,
        phone || null, email || null, address || null, gstin || null, credit_limit || 0
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSalesOrders(req, res) {
    try {
      const { customer_id, payment_status, fulfillment_status, limit = 50 } = req.query;
      
      let query = `
        SELECT so.*, c.customer_name, c.customer_type
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (customer_id) {
        query += ` AND so.customer_id = $${paramCount}`;
        params.push(customer_id);
        paramCount++;
      }
      
      if (payment_status) {
        query += ` AND so.payment_status = $${paramCount}`;
        params.push(payment_status);
        paramCount++;
      }
      
      if (fulfillment_status) {
        query += ` AND so.fulfillment_status = $${paramCount}`;
        params.push(fulfillment_status);
        paramCount++;
      }
      
      query += ` ORDER BY so.order_date DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSalesOrderById(req, res) {
    try {
      const { id } = req.params;
      
      const orderResult = await db.query(`
        SELECT so.*, c.customer_name, c.customer_type, c.phone, c.email, c.address
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.id = $1
      `, [id]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      
      const itemsResult = await db.query(`
        SELECT soi.*, pv.common_name, pv.variety_code, b.batch_code
        FROM sales_order_items soi
        JOIN plant_varieties pv ON soi.plant_variety_id = pv.id
        LEFT JOIN batches b ON soi.batch_id = b.id
        WHERE soi.so_id = $1
      `, [id]);
      
      const order = orderResult.rows[0];
      order.items = itemsResult.rows;
      
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error fetching sales order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSalesOrder(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        so_number, customer_id, order_date, delivery_date,
        items, discount_amount, notes, created_by
      } = req.body;

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity * item.unit_price;
      }
      
      const discount = discount_amount || 0;
      const tax_amount = (subtotal - discount) * 0.18; // 18% GST example
      const grand_total = subtotal - discount + tax_amount;

      // Create sales order
      const orderResult = await client.query(`
        INSERT INTO sales_orders (
          so_number, customer_id, order_date, delivery_date,
          subtotal, discount_amount, tax_amount, grand_total, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        so_number, customer_id, order_date, delivery_date || null,
        subtotal, discount, tax_amount, grand_total, notes || null, created_by
      ]);

      const so_id = orderResult.rows[0].id;

      // Create order items
      for (const item of items) {
        const total_price = item.quantity * item.unit_price;
        
        // Get cost price from batch if available
        let cost_price = 0;
        if (item.batch_id) {
          const batchResult = await client.query(
            'SELECT cost_per_plant FROM batches WHERE id = $1',
            [item.batch_id]
          );
          if (batchResult.rows.length > 0) {
            cost_price = batchResult.rows[0].cost_per_plant;
          }
        }

        await client.query(`
          INSERT INTO sales_order_items (
            so_id, batch_id, plant_variety_id, quantity, unit_price, total_price, cost_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [so_id, item.batch_id || null, item.plant_variety_id, item.quantity, item.unit_price, total_price, cost_price]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: orderResult.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating sales order:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  async fulfillOrder(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { items } = req.body; // Array of {item_id, quantity_fulfilled, batch_id}

      for (const item of items) {
        // Update fulfilled quantity
        await client.query(`
          UPDATE sales_order_items
          SET fulfilled_quantity = fulfilled_quantity + $1
          WHERE id = $2
        `, [item.quantity_fulfilled, item.item_id]);

        // Reduce batch quantity
        if (item.batch_id) {
          await client.query(`
            UPDATE batches
            SET current_quantity = current_quantity - $1
            WHERE id = $2
          `, [item.quantity_fulfilled, item.batch_id]);
        }
      }

      // Update order fulfillment status
      const checkResult = await client.query(`
        SELECT 
          SUM(quantity) as total_quantity,
          SUM(fulfilled_quantity) as total_fulfilled
        FROM sales_order_items
        WHERE so_id = $1
      `, [id]);

      const { total_quantity, total_fulfilled } = checkResult.rows[0];
      let fulfillment_status = 'pending';
      if (total_fulfilled >= total_quantity) {
        fulfillment_status = 'fulfilled';
      } else if (total_fulfilled > 0) {
        fulfillment_status = 'partial';
      }

      await client.query(`
        UPDATE sales_orders
        SET fulfillment_status = $1
        WHERE id = $2
      `, [fulfillment_status, id]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Order fulfilled successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error fulfilling order:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  async getInvoices(req, res) {
    try {
      const { invoice_type = 'sales', customer_id, payment_status, limit = 50 } = req.query;
      
      let query = `
        SELECT i.*, c.customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.invoice_type = $1
      `;
      const params = [invoice_type];
      let paramCount = 2;
      
      if (customer_id) {
        query += ` AND i.customer_id = $${paramCount}`;
        params.push(customer_id);
        paramCount++;
      }
      
      if (payment_status) {
        query += ` AND i.payment_status = $${paramCount}`;
        params.push(payment_status);
        paramCount++;
      }
      
      query += ` ORDER BY i.invoice_date DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createInvoice(req, res) {
    try {
      const {
        invoice_number, customer_id, so_id, invoice_date, due_date,
        subtotal, discount_amount, tax_amount, grand_total, created_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO invoices (
          invoice_number, invoice_type, customer_id, so_id, invoice_date, due_date,
          subtotal, discount_amount, tax_amount, grand_total, balance_amount, created_by
        ) VALUES ($1, 'sales', $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
        RETURNING *
      `, [
        invoice_number, customer_id, so_id || null, invoice_date, due_date || null,
        subtotal, discount_amount || 0, tax_amount || 0, grand_total, created_by
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SalesController();
