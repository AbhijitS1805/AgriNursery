const db = require('../config/database');

class PurchaseController {
  async getSuppliers(req, res) {
    try {
      const result = await db.query('SELECT * FROM suppliers WHERE is_active = true ORDER BY supplier_name');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSupplier(req, res) {
    try {
      const {
        supplier_code, supplier_name, contact_person, phone, email,
        address, gstin, credit_limit, payment_terms
      } = req.body;

      const result = await db.query(`
        INSERT INTO suppliers (
          supplier_code, supplier_name, contact_person, phone, email,
          address, gstin, credit_limit, payment_terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        supplier_code, supplier_name, contact_person || null, phone || null,
        email || null, address || null, gstin || null, credit_limit || 0, payment_terms || null
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPurchaseOrders(req, res) {
    try {
      const { supplier_id, status, limit = 50 } = req.query;
      
      let query = `
        SELECT po.*, s.supplier_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (supplier_id) {
        query += ` AND po.supplier_id = $${paramCount}`;
        params.push(supplier_id);
        paramCount++;
      }
      
      if (status) {
        query += ` AND po.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += ` ORDER BY po.po_date DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPurchaseOrder(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        po_number, supplier_id, po_date, expected_delivery_date,
        items, notes, created_by
      } = req.body;

      // Calculate totals
      let total_amount = 0;
      for (const item of items) {
        total_amount += item.quantity * item.unit_price;
      }
      
      const tax_amount = total_amount * 0.18; // 18% GST
      const grand_total = total_amount + tax_amount;

      // Create purchase order
      const poResult = await client.query(`
        INSERT INTO purchase_orders (
          po_number, supplier_id, po_date, expected_delivery_date,
          total_amount, tax_amount, grand_total, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        po_number, supplier_id, po_date, expected_delivery_date || null,
        total_amount, tax_amount, grand_total, notes || null, created_by
      ]);

      const po_id = poResult.rows[0].id;

      // Create PO items
      for (const item of items) {
        const total_price = item.quantity * item.unit_price;
        await client.query(`
          INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [po_id, item.item_id, item.quantity, item.unit_price, total_price]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: poResult.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating purchase order:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Purchase Bills
  async getPurchaseBills(req, res) {
    try {
      const result = await db.query(`
        SELECT pb.*, s.supplier_name
        FROM purchase_bills pb
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.is_active = true
        ORDER BY pb.bill_date DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching purchase bills:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPurchaseBillById(req, res) {
    try {
      const { id } = req.params;
      
      // Get bill header
      const billResult = await db.query(`
        SELECT pb.*, s.supplier_name
        FROM purchase_bills pb
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.id = $1
      `, [id]);

      if (billResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bill not found' });
      }

      // Get bill items
      const itemsResult = await db.query(`
        SELECT pbi.*, ii.item_name
        FROM purchase_bill_items pbi
        LEFT JOIN inventory_items ii ON pbi.item_id = ii.id
        WHERE pbi.bill_id = $1
      `, [id]);

      const bill = billResult.rows[0];
      bill.items = itemsResult.rows;

      res.json({ success: true, data: bill });
    } catch (error) {
      console.error('Error fetching bill:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPurchaseBill(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        bill_number, supplier_id, bill_date, receive_date,
        subtotal, tax_percentage, tax_amount, extra_charges,
        extra_charges_description, total_amount, advance_amount,
        balance_amount, payment_mode, payment_status, notes, items
      } = req.body;

      // Create purchase bill
      const billResult = await client.query(`
        INSERT INTO purchase_bills (
          bill_number, supplier_id, bill_date, receive_date,
          subtotal, tax_percentage, tax_amount, extra_charges,
          extra_charges_description, total_amount, advance_amount,
          balance_amount, payment_mode, payment_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        bill_number, supplier_id, bill_date, receive_date || null,
        subtotal, tax_percentage, tax_amount, extra_charges || 0,
        extra_charges_description || null, total_amount, advance_amount || 0,
        balance_amount, payment_mode, payment_status, notes || null
      ]);

      const bill_id = billResult.rows[0].id;

      // Create bill items and update inventory
      for (const item of items) {
        const total_price = parseFloat(item.quantity) * parseFloat(item.unit_price);
        
        // Insert bill item
        await client.query(`
          INSERT INTO purchase_bill_items (bill_id, item_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [bill_id, item.item_id, item.quantity, item.unit_price, total_price]);

        // Update inventory current_stock
        await client.query(`
          UPDATE inventory_items
          SET current_stock = current_stock + $1,
              bill_id = $2
          WHERE id = $3
        `, [item.quantity, bill_id, item.item_id]);

        // Create inventory transaction
        await client.query(`
          INSERT INTO inventory_transactions (
            item_id, transaction_type, quantity, reference_type, reference_id, notes, transaction_date
          ) VALUES ($1, 'purchase', $2, 'bill', $3, $4, $5)
        `, [item.item_id, item.quantity, bill_id, `Bill: ${bill_number}`, bill_date]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: billResult.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating purchase bill:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  async updatePurchaseBill(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        bill_number, supplier_id, bill_date, receive_date,
        subtotal, tax_percentage, tax_amount, extra_charges,
        extra_charges_description, total_amount, advance_amount,
        balance_amount, payment_mode, payment_status, notes, items
      } = req.body;

      // Update purchase bill
      const billResult = await client.query(`
        UPDATE purchase_bills
        SET bill_number = $1,
            supplier_id = $2,
            bill_date = $3,
            receive_date = $4,
            subtotal = $5,
            tax_percentage = $6,
            tax_amount = $7,
            extra_charges = $8,
            extra_charges_description = $9,
            total_amount = $10,
            advance_amount = $11,
            balance_amount = $12,
            payment_mode = $13,
            payment_status = $14,
            notes = $15,
            updated_at = NOW()
        WHERE id = $16
        RETURNING *
      `, [
        bill_number, supplier_id, bill_date, receive_date || null,
        subtotal, tax_percentage, tax_amount, extra_charges || 0,
        extra_charges_description || null, total_amount, advance_amount || 0,
        balance_amount, payment_mode, payment_status, notes || null, id
      ]);

      if (billResult.rows.length === 0) {
        throw new Error('Bill not found');
      }

      // Note: For simplicity, we're not updating bill items here
      // If you need to update items, you'll need to delete old items and insert new ones
      // This would also require reversing inventory changes and applying new ones

      await client.query('COMMIT');
      res.json({ success: true, data: billResult.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating purchase bill:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Get pending bills for a supplier
  async getSupplierPendingBills(req, res) {
    try {
      const { supplier_id } = req.params;
      
      const result = await db.query(`
        SELECT 
          id,
          bill_number,
          bill_date,
          subtotal,
          tax_amount,
          extra_charges,
          total_amount,
          advance_amount,
          balance_amount,
          payment_status,
          notes
        FROM purchase_bills
        WHERE supplier_id = $1 
          AND payment_status IN ('Pending', 'Partial')
          AND balance_amount > 0
        ORDER BY bill_date ASC
      `, [supplier_id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching supplier pending bills:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Allocate payment to supplier bills
  async allocateSupplierPayment(req, res) {
    try {
      const {
        supplier_id,
        payment_amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        bill_allocations  // [{bill_id: 1, amount: 1000}, ...]
      } = req.body;

      const result = await db.query(`
        SELECT * FROM allocate_supplier_payment(
          $1::INTEGER,
          $2::NUMERIC,
          $3::DATE,
          $4::VARCHAR,
          $5::VARCHAR,
          $6::TEXT,
          $7::JSONB
        )
      `, [
        supplier_id,
        payment_amount,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method,
        reference_number || null,
        notes || null,
        JSON.stringify(bill_allocations)
      ]);

      res.status(201).json({ 
        success: true, 
        data: result.rows[0],
        message: `Payment allocated to ${result.rows[0].bills_updated} bill(s)`
      });
    } catch (error) {
      console.error('Error allocating supplier payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get supplier payment history
  async getSupplierPayments(req, res) {
    try {
      const { supplier_id } = req.params;
      
      const result = await db.query(`
        SELECT 
          p.id,
          p.payment_number,
          p.payment_date,
          p.amount,
          p.payment_method,
          p.reference_number,
          p.notes,
          s.supplier_name,
          COUNT(pa.id) as bills_count,
          COALESCE(SUM(pa.allocated_amount), 0) as total_allocated
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN payment_allocations pa ON p.id = pa.payment_receipt_id
        WHERE p.supplier_id = $1 AND p.payment_type = 'payment'
        GROUP BY p.id, p.payment_number, p.payment_date, p.amount, 
                 p.payment_method, p.reference_number, p.notes, s.supplier_name
        ORDER BY p.payment_date DESC, p.id DESC
      `, [supplier_id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching supplier payments:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PurchaseController();
