const db = require('../config/database');

const salesPaymentsController = {
  // Get all payments
  async getAllPayments(req, res) {
    try {
      const { farmer_id, start_date, end_date, payment_method_id } = req.query;
      
      let query = `
        SELECT * FROM v_payment_summary
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (farmer_id) {
        query += ` AND farmer_id = $${paramCount}`;
        params.push(farmer_id);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND payment_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND payment_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      if (payment_method_id) {
        query += ` AND payment_method_id = $${paramCount}`;
        params.push(payment_method_id);
        paramCount++;
      }
      
      query += ` ORDER BY payment_date DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
  },

  // Get payment by ID
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          sp.*,
          pm.method_name as payment_method,
          f.farmer_name,
          f.mobile as farmer_mobile,
          b.booking_number,
          si.invoice_number,
          si.total_amount as invoice_total,
          si.balance_due as remaining_balance
        FROM sales_payments sp
        JOIN farmers f ON sp.farmer_id = f.id
        JOIN bookings b ON sp.booking_id = b.id
        JOIN sales_invoices si ON sp.sales_invoice_id = si.id
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE sp.id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(500).json({ message: 'Error fetching payment', error: error.message });
    }
  },

  // Record a new payment
  async recordPayment(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      
      await client.query('BEGIN');
      
      const {
        sales_invoice_id,
        amount,
        payment_method_id,
        payment_date,
        transaction_reference,
        bank_name,
        notes,
        received_by
      } = req.body;
      
      // Validate required fields
      if (!sales_invoice_id || !amount || amount <= 0) {
        return res.status(400).json({ 
          message: 'sales_invoice_id and amount (greater than 0) are required' 
        });
      }
      
      // Get invoice details
      const invoiceQuery = `
        SELECT * FROM sales_invoices WHERE id = $1
      `;
      
      const invoiceResult = await client.query(invoiceQuery, [sales_invoice_id]);
      
      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      const invoice = invoiceResult.rows[0];
      
      // Check if payment amount doesn't exceed balance due
      if (amount > invoice.balance_due) {
        return res.status(400).json({ 
          message: `Payment amount (₹${amount}) exceeds balance due (₹${invoice.balance_due})` 
        });
      }
      
      // Generate receipt number
      const receiptNumberResult = await client.query('SELECT generate_receipt_number()');
      const receipt_number = receiptNumberResult.rows[0].generate_receipt_number;
      
      // Record payment
      const paymentQuery = `
        INSERT INTO sales_payments (
          receipt_number, sales_invoice_id, booking_id, farmer_id,
          payment_date, amount, payment_method_id, transaction_reference, bank_name,
          notes, received_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const paymentResult = await client.query(paymentQuery, [
        receipt_number,
        sales_invoice_id,
        invoice.booking_id,
        invoice.farmer_id,
        payment_date || new Date().toISOString().split('T')[0],
        amount,
        payment_method_id || null,
        transaction_reference || null,
        bank_name || null,
        notes || null,
        received_by || null
      ]);
      
      // The trigger will automatically update the invoice balance
      
      await client.query('COMMIT');
      
      // Return payment with updated invoice details
      const fullPaymentQuery = `
        SELECT 
          sp.*,
          pm.method_name as payment_method,
          si.balance_due as remaining_balance,
          si.status as invoice_status
        FROM sales_payments sp
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        JOIN sales_invoices si ON sp.sales_invoice_id = si.id
        WHERE sp.id = $1
      `;
      
      const fullPayment = await client.query(fullPaymentQuery, [paymentResult.rows[0].id]);
      
      res.status(201).json(fullPayment.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording payment:', error);
      res.status(500).json({ message: 'Error recording payment', error: error.message });
    } finally {
      client.release();
    }
  },

  // Get payment methods
  async getPaymentMethods(req, res) {
    try {
      const query = `
        SELECT * FROM payment_methods WHERE is_active = true ORDER BY method_name
      `;
      
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ message: 'Error fetching payment methods', error: error.message });
    }
  },

  // Get payment statistics
  async getPaymentStats(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount_received,
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as last_30_days,
          COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as last_7_days,
          COALESCE(SUM(amount) FILTER (WHERE payment_date = CURRENT_DATE), 0) as today
        FROM sales_payments
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      res.status(500).json({ message: 'Error fetching payment stats', error: error.message });
    }
  },

  // Get payments by invoice
  async getPaymentsByInvoice(req, res) {
    try {
      const { invoice_id } = req.params;
      
      const query = `
        SELECT 
          sp.*,
          pm.method_name as payment_method
        FROM sales_payments sp
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE sp.sales_invoice_id = $1
        ORDER BY sp.payment_date DESC
      `;
      
      const result = await db.query(query, [invoice_id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching payments by invoice:', error);
      res.status(500).json({ message: 'Error fetching payments by invoice', error: error.message });
    }
  }
};

module.exports = salesPaymentsController;
