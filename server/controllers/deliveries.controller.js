const db = require('../config/database');

const deliveriesController = {
  // Get all deliveries
  getAllDeliveries: async (req, res) => {
    try {
      const { status, booking_id, vehicle_id, driver_id, start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          d.id,
          d.delivery_number,
          d.booking_id,
          b.booking_number,
          d.sales_invoice_id,
          si.invoice_number,
          d.vehicle_id,
          v.vehicle_number,
          v.vehicle_type,
          d.driver_id,
          driver.full_name as driver_name,
          driver.mobile as driver_mobile,
          driver.employee_code as driver_code,
          d.helper_id,
          helper.full_name as helper_name,
          helper.mobile as helper_mobile,
          helper.employee_code as helper_code,
          d.delivery_date,
          d.scheduled_time,
          d.actual_start_time,
          d.actual_end_time,
          d.delivery_address,
          d.customer_name,
          d.customer_mobile,
          d.status,
          d.distance_km,
          d.total_expense,
          d.rating,
          d.created_at
        FROM deliveries d
        LEFT JOIN bookings b ON d.booking_id = b.id
        LEFT JOIN sales_invoices si ON d.sales_invoice_id = si.id
        LEFT JOIN vehicles v ON d.vehicle_id = v.id
        LEFT JOIN employees driver ON d.driver_id = driver.id
        LEFT JOIN employees helper ON d.helper_id = helper.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND d.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (booking_id) {
        query += ` AND b.booking_number LIKE $${paramCount}`;
        params.push(`%${booking_id}%`);
        paramCount++;
      }
      
      if (vehicle_id) {
        query += ` AND v.vehicle_number LIKE $${paramCount}`;
        params.push(`%${vehicle_id}%`);
        paramCount++;
      }
      
      if (driver_id) {
        query += ` AND driver.full_name LIKE $${paramCount}`;
        params.push(`%${driver_id}%`);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND d.delivery_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND d.delivery_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY d.delivery_date DESC, d.id DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      res.status(500).json({ message: 'Error fetching deliveries', error: error.message });
    }
  },

  // Get delivery by ID
  getDeliveryById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const deliveryQuery = `
        SELECT 
          d.*,
          b.booking_number,
          b.farmer_id,
          f.farmer_name,
          f.mobile as farmer_mobile,
          si.invoice_number,
          v.vehicle_number,
          v.vehicle_type,
          dp.full_name as driver_name,
          dp.mobile as driver_mobile,
          dp.employee_code as driver_code,
          h.full_name as helper_name,
          h.mobile as helper_mobile,
          h.employee_code as helper_code
        FROM deliveries d
        LEFT JOIN bookings b ON d.booking_id = b.id
        LEFT JOIN farmers f ON b.farmer_id = f.id
        LEFT JOIN sales_invoices si ON d.sales_invoice_id = si.id
        LEFT JOIN vehicles v ON d.vehicle_id = v.id
        LEFT JOIN employees dp ON d.driver_id = dp.id
        LEFT JOIN employees h ON d.helper_id = h.id
        WHERE d.id = $1
      `;
      
      const result = await db.query(deliveryQuery, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      // Get delivery items
      const itemsQuery = `
        SELECT 
          di.*,
          p.plant_name as production_plant_name,
          ph.polyhouse_name
        FROM delivery_items di
        LEFT JOIN productions p ON di.production_id = p.id
        LEFT JOIN polyhouses ph ON p.polyhouse_id = ph.id
        WHERE di.delivery_id = $1
        ORDER BY di.id
      `;
      
      const itemsResult = await db.query(itemsQuery, [id]);
      
      const delivery = {
        ...result.rows[0],
        items: itemsResult.rows
      };
      
      res.json(delivery);
    } catch (error) {
      console.error('Error fetching delivery:', error);
      res.status(500).json({ message: 'Error fetching delivery', error: error.message });
    }
  },

  // Create new delivery (schedule delivery)
  createDelivery: async (req, res) => {
    let client;
    try {
      const {
        booking_id,
        sales_invoice_id,
        vehicle_id,
        driver_id,
        helper_id,
        delivery_date,
        scheduled_time,
        delivery_address,
        customer_name,
        customer_mobile,
        delivery_notes,
        items
      } = req.body;
      
      // Validate required fields
      if (!booking_id || !delivery_date) {
        return res.status(400).json({ message: 'Booking ID and delivery date are required' });
      }
      
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      // Insert delivery
      const deliveryQuery = `
        INSERT INTO deliveries (
          booking_id, sales_invoice_id, vehicle_id, driver_id, helper_id,
          delivery_date, scheduled_time, delivery_address, customer_name,
          customer_mobile, delivery_notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Scheduled')
        RETURNING *
      `;
      
      const deliveryValues = [
        booking_id,
        sales_invoice_id || null,
        vehicle_id || null,
        driver_id || null,
        helper_id || null,
        delivery_date,
        scheduled_time || null,
        delivery_address,
        customer_name,
        customer_mobile || null,
        delivery_notes || null
      ];
      
      const deliveryResult = await client.query(deliveryQuery, deliveryValues);
      const delivery_id = deliveryResult.rows[0].id;
      
      // Insert delivery items
      if (items && items.length > 0) {
        for (const item of items) {
          const itemQuery = `
            INSERT INTO delivery_items (
              delivery_id, booking_item_id, plant_name, production_id,
              quantity, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `;
          
          await client.query(itemQuery, [
            delivery_id,
            item.booking_item_id || null,
            item.plant_name,
            item.production_id || null,
            item.quantity,
            item.remarks || null
          ]);
        }
      }
      
      // Update vehicle status if assigned
      if (vehicle_id) {
        await client.query(
          `UPDATE vehicles SET status = 'In Use' WHERE id = $1`,
          [vehicle_id]
        );
      }
      
      await client.query('COMMIT');
      
      // Fetch and return the complete delivery
      const completeDelivery = await db.query(
        `SELECT * FROM deliveries WHERE id = $1`,
        [delivery_id]
      );
      
      res.status(201).json(completeDelivery.rows[0]);
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error creating delivery:', error);
      res.status(500).json({ message: 'Error creating delivery', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Update delivery
  updateDelivery: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        vehicle_id,
        driver_id,
        helper_id,
        delivery_date,
        scheduled_time,
        actual_start_time,
        actual_end_time,
        delivery_address,
        customer_name,
        customer_mobile,
        status,
        distance_km,
        fuel_cost,
        toll_charges,
        other_expenses,
        delivery_notes,
        customer_feedback,
        rating,
        cancelled_reason,
        failed_reason,
        rescheduled_to
      } = req.body;
      
      const query = `
        UPDATE deliveries SET
          vehicle_id = COALESCE($1, vehicle_id),
          driver_id = COALESCE($2, driver_id),
          helper_id = $3,
          delivery_date = COALESCE($4, delivery_date),
          scheduled_time = $5,
          actual_start_time = $6,
          actual_end_time = $7,
          delivery_address = COALESCE($8, delivery_address),
          customer_name = COALESCE($9, customer_name),
          customer_mobile = $10,
          status = COALESCE($11, status),
          distance_km = $12,
          fuel_cost = $13,
          toll_charges = $14,
          other_expenses = $15,
          delivery_notes = $16,
          customer_feedback = $17,
          rating = $18,
          cancelled_reason = $19,
          failed_reason = $20,
          rescheduled_to = $21,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $22
        RETURNING *
      `;
      
      const values = [
        vehicle_id,
        driver_id,
        helper_id,
        delivery_date,
        scheduled_time,
        actual_start_time,
        actual_end_time,
        delivery_address,
        customer_name,
        customer_mobile,
        status,
        distance_km,
        fuel_cost,
        toll_charges,
        other_expenses,
        delivery_notes,
        customer_feedback,
        rating,
        cancelled_reason,
        failed_reason,
        rescheduled_to,
        id
      ];
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating delivery:', error);
      res.status(500).json({ message: 'Error updating delivery', error: error.message });
    }
  },

  // Update delivery status
  updateDeliveryStatus: async (req, res) => {
    let client;
    try {
      const { id } = req.params;
      const { status, delivered_items } = req.body;
      
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      // Update delivery status
      await client.query(
        `UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, id]
      );
      
      // If status is Delivered, update delivered quantities
      if (status === 'Delivered' && delivered_items && delivered_items.length > 0) {
        for (const item of delivered_items) {
          await client.query(
            `UPDATE delivery_items SET 
              delivered_quantity = $1,
              damaged_quantity = $2,
              returned_quantity = $3
            WHERE id = $4`,
            [
              item.delivered_quantity || 0,
              item.damaged_quantity || 0,
              item.returned_quantity || 0,
              item.id
            ]
          );
        }
        
        // Set actual end time to now
        await client.query(
          `UPDATE deliveries SET actual_end_time = CURRENT_TIMESTAMP WHERE id = $1`,
          [id]
        );
      }
      
      // If delivery is completed or cancelled, free up the vehicle
      if (status === 'Delivered' || status === 'Cancelled') {
        const vehicleResult = await client.query(
          `SELECT vehicle_id FROM deliveries WHERE id = $1`,
          [id]
        );
        
        if (vehicleResult.rows[0].vehicle_id) {
          await client.query(
            `UPDATE vehicles SET status = 'Available' WHERE id = $1`,
            [vehicleResult.rows[0].vehicle_id]
          );
        }
      }
      
      await client.query('COMMIT');
      
      const result = await db.query(`SELECT * FROM deliveries WHERE id = $1`, [id]);
      res.json(result.rows[0]);
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error updating delivery status:', error);
      res.status(500).json({ message: 'Error updating delivery status', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Delete delivery
  deleteDelivery: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if delivery is already in progress
      const checkQuery = `SELECT status FROM deliveries WHERE id = $1`;
      const checkResult = await db.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: 'Delivery not found' });
      }
      
      if (checkResult.rows[0].status === 'In Transit' || checkResult.rows[0].status === 'Delivered') {
        return res.status(400).json({ 
          message: 'Cannot delete delivery that is in transit or already delivered. Cancel it instead.' 
        });
      }
      
      const query = `DELETE FROM deliveries WHERE id = $1 RETURNING *`;
      const result = await db.query(query, [id]);
      
      res.json({ message: 'Delivery deleted successfully', delivery: result.rows[0] });
    } catch (error) {
      console.error('Error deleting delivery:', error);
      res.status(500).json({ message: 'Error deleting delivery', error: error.message });
    }
  },

  // Get delivery statistics
  getDeliveryStats: async (req, res) => {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(*) FILTER (WHERE status = 'Scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'In Transit') as in_transit,
          COUNT(*) FILTER (WHERE status = 'Delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'Failed') as failed,
          SUM(total_expense) FILTER (WHERE status = 'Delivered') as total_expenses,
          SUM(distance_km) FILTER (WHERE status = 'Delivered') as total_distance,
          AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating
        FROM deliveries
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
  }
};

module.exports = deliveriesController;
