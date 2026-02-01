const db = require('../config/database');

const salesInvoicesController = {
  // Get all sales invoices
  async getAllInvoices(req, res) {
    try {
      const { farmer_id, status, start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          si.*,
          f.farmer_name,
          f.mobile as farmer_mobile,
          f.address as farmer_address,
          b.booking_number,
          b.booking_date,
          b.required_date
        FROM sales_invoices si
        JOIN farmers f ON si.farmer_id = f.id
        JOIN bookings b ON si.booking_id = b.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (farmer_id) {
        query += ` AND si.farmer_id = $${paramCount}`;
        params.push(farmer_id);
        paramCount++;
      }
      
      if (status) {
        query += ` AND si.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND si.invoice_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND si.invoice_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY si.invoice_date DESC, si.id DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching sales invoices:', error);
      res.status(500).json({ message: 'Error fetching sales invoices', error: error.message });
    }
  },

  // Get single invoice with details
  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;
      
      // Get invoice details
      const invoiceQuery = `
        SELECT 
          si.*,
          f.farmer_name,
          f.mobile as farmer_mobile,
          f.mobile2 as farmer_mobile2,
          f.address as farmer_address,
          s.state_name,
          d.district_name,
          t.taluka_name,
          b.booking_number,
          b.booking_date,
          b.required_date,
          b.notes as booking_notes
        FROM sales_invoices si
        JOIN farmers f ON si.farmer_id = f.id
        JOIN bookings b ON si.booking_id = b.id
        LEFT JOIN states s ON f.state_id = s.id
        LEFT JOIN districts d ON f.district_id = d.id
        LEFT JOIN talukas t ON f.taluka_id = t.id
        WHERE si.id = $1
      `;
      
      const invoiceResult = await db.query(invoiceQuery, [id]);
      
      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Get booking items
      const itemsQuery = `
        SELECT * FROM booking_items WHERE booking_id = $1
      `;
      
      const itemsResult = await db.query(itemsQuery, [invoiceResult.rows[0].booking_id]);
      
      // Get payment history
      const paymentsQuery = `
        SELECT 
          sp.*,
          pm.method_name as payment_method
        FROM sales_payments sp
        LEFT JOIN payment_methods pm ON sp.payment_method_id = pm.id
        WHERE sp.sales_invoice_id = $1
        ORDER BY sp.payment_date DESC
      `;
      
      const paymentsResult = await db.query(paymentsQuery, [id]);
      
      const invoice = {
        ...invoiceResult.rows[0],
        items: itemsResult.rows,
        payments: paymentsResult.rows
      };
      
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ message: 'Error fetching invoice', error: error.message });
    }
  },

  // Generate invoice for a booking
  async generateInvoice(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      
      await client.query('BEGIN');
      
      const { booking_id, due_days = 30, notes, terms_and_conditions, created_by } = req.body;
      
      // Check if invoice already exists for this booking
      const existingInvoiceQuery = `
        SELECT id FROM sales_invoices WHERE booking_id = $1
      `;
      
      const existingInvoice = await client.query(existingInvoiceQuery, [booking_id]);
      
      if (existingInvoice.rows.length > 0) {
        return res.status(400).json({ message: 'Invoice already exists for this booking' });
      }
      
      // Get booking details
      const bookingQuery = `
        SELECT * FROM bookings WHERE id = $1
      `;
      
      const bookingResult = await client.query(bookingQuery, [booking_id]);
      
      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      const booking = bookingResult.rows[0];
      
      // Generate invoice number
      const invoiceNumberResult = await client.query('SELECT generate_sales_invoice_number()');
      const invoice_number = invoiceNumberResult.rows[0].generate_sales_invoice_number;
      
      // Calculate due date
      const due_date = new Date();
      due_date.setDate(due_date.getDate() + due_days);
      
      // Create invoice
      const invoiceQuery = `
        INSERT INTO sales_invoices (
          invoice_number, booking_id, farmer_id, due_date,
          subtotal, discount_amount, tax_amount, total_amount, balance_due,
          notes, terms_and_conditions, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const invoiceResult = await client.query(invoiceQuery, [
        invoice_number,
        booking_id,
        booking.farmer_id,
        due_date,
        booking.subtotal,
        booking.discount_amount,
        booking.tax_amount,
        booking.total_amount,
        booking.total_amount, // Initial balance_due equals total_amount
        notes,
        terms_and_conditions,
        created_by
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json(invoiceResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating invoice:', error);
      res.status(500).json({ message: 'Error generating invoice', error: error.message });
    } finally {
      client.release();
    }
  },

  // Get outstanding invoices
  async getOutstandingInvoices(req, res) {
    try {
      const query = `
        SELECT * FROM v_outstanding_invoices
      `;
      
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
      res.status(500).json({ message: 'Error fetching outstanding invoices', error: error.message });
    }
  },

  // Get invoice statistics
  async getInvoiceStats(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE status = 'Unpaid') as unpaid_invoices,
          COUNT(*) FILTER (WHERE status = 'Partially Paid') as partially_paid_invoices,
          COUNT(*) FILTER (WHERE status = 'Paid') as paid_invoices,
          COUNT(*) FILTER (WHERE status = 'Overdue') as overdue_invoices,
          COALESCE(SUM(total_amount), 0) as total_invoice_amount,
          COALESCE(SUM(paid_amount), 0) as total_paid_amount,
          COALESCE(SUM(balance_due), 0) as total_outstanding
        FROM sales_invoices
        WHERE status != 'Cancelled'
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      res.status(500).json({ message: 'Error fetching invoice stats', error: error.message });
    }
  }
};

module.exports = salesInvoicesController;
