const db = require('../config/database');

const bookingsController = {
  // Get all bookings with filters
  async getAllBookings(req, res) {
    try {
      const { farmer_id, status, start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          b.id,
          b.booking_number,
          b.farmer_id,
          TO_CHAR(b.booking_date, 'YYYY-MM-DD') as booking_date,
          TO_CHAR(b.required_date, 'YYYY-MM-DD') as required_date,
          b.status,
          b.subtotal,
          b.discount_percent,
          b.discount_amount,
          b.tax_percent,
          b.tax_amount,
          b.total_amount,
          b.notes,
          b.internal_notes,
          b.created_by,
          b.created_at,
          b.updated_at,
          b.cancelled_at,
          b.cancelled_by,
          b.cancellation_reason,
          f.farmer_name,
          f.mobile as farmer_mobile,
          f.address as farmer_address,
          (SELECT COUNT(*) FROM booking_items WHERE booking_id = b.id) as item_count,
          (SELECT COALESCE(SUM(quantity), 0) FROM booking_items WHERE booking_id = b.id) as total_quantity,
          si.invoice_number,
          si.paid_amount,
          si.balance_due,
          si.status as invoice_status
        FROM bookings b
        JOIN farmers f ON b.farmer_id = f.id
        LEFT JOIN sales_invoices si ON b.id = si.booking_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (farmer_id) {
        query += ` AND b.farmer_id = $${paramCount}`;
        params.push(farmer_id);
        paramCount++;
      }
      
      if (status) {
        query += ` AND b.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND b.booking_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND b.booking_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY b.booking_date DESC, b.id DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
  },

  // Get single booking with items
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      
      // Get booking details
      const bookingQuery = `
        SELECT 
          b.id,
          b.booking_number,
          b.farmer_id,
          TO_CHAR(b.booking_date, 'YYYY-MM-DD') as booking_date,
          TO_CHAR(b.required_date, 'YYYY-MM-DD') as required_date,
          b.status,
          b.subtotal,
          b.discount_percent,
          b.discount_amount,
          b.tax_percent,
          b.tax_amount,
          b.total_amount,
          b.notes,
          b.internal_notes,
          b.created_by,
          b.created_at,
          b.updated_at,
          b.cancelled_at,
          b.cancelled_by,
          b.cancellation_reason,
          f.farmer_name,
          f.mobile as farmer_mobile,
          f.mobile2 as farmer_mobile2,
          f.address as farmer_address,
          s.state_name,
          d.district_name,
          t.taluka_name
        FROM bookings b
        JOIN farmers f ON b.farmer_id = f.id
        LEFT JOIN states s ON f.state_id = s.id
        LEFT JOIN districts d ON f.district_id = d.id
        LEFT JOIN talukas t ON f.taluka_id = t.id
        WHERE b.id = $1
      `;
      
      const bookingResult = await db.query(bookingQuery, [id]);
      
      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Get booking items
      const itemsQuery = `
        SELECT 
          bi.*,
          p.polyhouse_id,
          p.status as production_status,
          ph.polyhouse_name
        FROM booking_items bi
        LEFT JOIN productions p ON bi.production_id = p.id
        LEFT JOIN polyhouses ph ON p.polyhouse_id = ph.id
        WHERE bi.booking_id = $1
        ORDER BY bi.id
      `;
      
      const itemsResult = await db.query(itemsQuery, [id]);
      
      // Get invoice if exists
      const invoiceQuery = `
        SELECT * FROM sales_invoices WHERE booking_id = $1
      `;
      
      const invoiceResult = await db.query(invoiceQuery, [id]);
      
      const booking = {
        ...bookingResult.rows[0],
        items: itemsResult.rows,
        invoice: invoiceResult.rows[0] || null
      };
      
      res.json(booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ message: 'Error fetching booking', error: error.message });
    }
  },

  // Create new booking
  async createBooking(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      
      await client.query('BEGIN');
      
      const {
        farmer_id,
        required_date,
        items, // Array of { plant_name, production_id, quantity, unit_price }
        discount_percent = 0,
        tax_percent = 0,
        notes,
        internal_notes,
        created_by
      } = req.body;
      
      // Validate required fields
      if (!farmer_id || !required_date || !items || items.length === 0) {
        return res.status(400).json({ 
          message: 'Missing required fields: farmer_id, required_date, and items are required' 
        });
      }
      
      // Generate booking number
      const bookingNumberResult = await client.query('SELECT generate_booking_number()');
      const booking_number = bookingNumberResult.rows[0].generate_booking_number;
      
      // Create booking
      const bookingQuery = `
        INSERT INTO bookings (
          booking_number, farmer_id, required_date, 
          discount_percent, tax_percent, notes, internal_notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const bookingResult = await client.query(bookingQuery, [
        booking_number,
        farmer_id,
        required_date,
        discount_percent,
        tax_percent,
        notes,
        internal_notes,
        created_by
      ]);
      
      const booking = bookingResult.rows[0];
      
      // Insert booking items
      for (const item of items) {
        const line_total = item.quantity * item.unit_price;
        
        const itemQuery = `
          INSERT INTO booking_items (
            booking_id, plant_name, production_id, quantity, unit_price, line_total, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await client.query(itemQuery, [
          booking.id,
          item.plant_name,
          item.production_id || null,
          item.quantity,
          item.unit_price,
          line_total,
          item.notes || null
        ]);
        
        // Reserve inventory if production_id is provided
        if (item.production_id) {
          const reserveQuery = `
            UPDATE productions
            SET quantity = quantity - $1
            WHERE id = $2 AND quantity >= $1
            RETURNING id
          `;
          
          const reserveResult = await client.query(reserveQuery, [item.quantity, item.production_id]);
          
          if (reserveResult.rows.length === 0) {
            throw new Error(`Insufficient quantity for plant: ${item.plant_name}`);
          }
        }
      }
      
      // Fetch complete booking with items
      const completeBookingQuery = `
        SELECT 
          b.*,
          f.farmer_name,
          f.mobile as farmer_mobile
        FROM bookings b
        JOIN farmers f ON b.farmer_id = f.id
        WHERE b.id = $1
      `;
      
      const completeBooking = await client.query(completeBookingQuery, [booking.id]);
      
      const itemsQuery = `SELECT * FROM booking_items WHERE booking_id = $1`;
      const itemsResult = await client.query(itemsQuery, [booking.id]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        ...completeBooking.rows[0],
        items: itemsResult.rows
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Error creating booking', error: error.message });
    } finally {
      client.release();
    }
  },

  // Update booking status
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const validStatuses = ['Pending', 'Confirmed', 'Ready', 'Partially Delivered', 'Delivered', 'Cancelled'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ') 
        });
      }
      
      const query = `
        UPDATE bookings
        SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await db.query(query, [status, notes, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Error updating booking status', error: error.message });
    }
  },

  // Cancel booking
  async cancelBooking(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { cancellation_reason, cancelled_by } = req.body;
      
      // Get booking items to restore inventory
      const itemsQuery = `
        SELECT * FROM booking_items WHERE booking_id = $1
      `;
      
      const itemsResult = await client.query(itemsQuery, [id]);
      
      // Restore inventory for each item with production_id
      for (const item of itemsResult.rows) {
        if (item.production_id) {
          const restoreQuery = `
            UPDATE productions
            SET quantity = quantity + $1
            WHERE id = $2
          `;
          
          await client.query(restoreQuery, [item.quantity - item.delivered_quantity, item.production_id]);
        }
      }
      
      // Cancel the booking
      const cancelQuery = `
        UPDATE bookings
        SET 
          status = 'Cancelled',
          cancelled_at = NOW(),
          cancelled_by = $1,
          cancellation_reason = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await client.query(cancelQuery, [cancelled_by, cancellation_reason, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Booking not found');
      }
      
      await client.query('COMMIT');
      
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cancelling booking:', error);
      res.status(500).json({ message: 'Error cancelling booking', error: error.message });
    } finally {
      client.release();
    }
  },

  // Get booking statistics
  async getBookingStats(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(*) FILTER (WHERE status = 'Pending') as pending_bookings,
          COUNT(*) FILTER (WHERE status = 'Confirmed') as confirmed_bookings,
          COUNT(*) FILTER (WHERE status = 'Ready') as ready_bookings,
          COUNT(*) FILTER (WHERE status = 'Delivered') as delivered_bookings,
          COALESCE(SUM(total_amount), 0) as total_booking_value,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'Delivered'), 0) as delivered_value
        FROM bookings
        WHERE status != 'Cancelled'
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      res.status(500).json({ message: 'Error fetching booking stats', error: error.message });
    }
  },

  // Get available plants for booking (ready crops)
  async getAvailablePlants(req, res) {
    try {
      const query = `
        SELECT 
          p.id,
          p.plant_name,
          p.quantity as available_quantity,
          p.cost_per_plant as suggested_price,
          p.polyhouse_id,
          ph.polyhouse_name,
          p.section as section_name,
          p.moved_date
        FROM productions p
        LEFT JOIN polyhouses ph ON p.polyhouse_id = ph.id
        WHERE p.status = 'In Polyhouse' 
          AND p.is_active = true
          AND p.quantity > 0
        ORDER BY p.plant_name ASC, p.moved_date DESC
      `;
      
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching available plants:', error);
      res.status(500).json({ message: 'Error fetching available plants', error: error.message });
    }
  }
};

module.exports = bookingsController;
