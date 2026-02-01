const db = require('../config/database');

class ShippingController {
  // Get all carriers
  async getCarriers(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM shipping_carriers 
        WHERE is_active = TRUE 
        ORDER BY preferred_carrier DESC, carrier_name
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching carriers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create carrier
  async createCarrier(req, res) {
    try {
      const {
        carrier_code,
        carrier_name,
        contact_person,
        phone,
        email,
        website,
        services_offered,
        domestic_service,
        international_service
      } = req.body;

      const result = await db.query(`
        INSERT INTO shipping_carriers (
          carrier_code, carrier_name, contact_person, phone, email,
          website, services_offered, domestic_service, international_service
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        carrier_code, carrier_name, contact_person, phone, email,
        website, services_offered, domestic_service !== false, international_service || false
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating carrier:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Calculate shipping rate
  async calculateRate(req, res) {
    try {
      const {
        carrier_id,
        service_type,
        origin_pincode,
        destination_pincode,
        weight_kg,
        is_fragile
      } = req.body;

      const result = await db.query(`
        SELECT * FROM calculate_shipping_rate($1, $2, $3, $4, $5, $6)
      `, [
        carrier_id, service_type, origin_pincode, destination_pincode,
        weight_kg, is_fragile !== false
      ]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error calculating shipping rate:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all shipments
  async getAllShipments(req, res) {
    try {
      const { status, customer_id } = req.query;

      let query = `
        SELECT s.*, c.customer_name, sc.carrier_name
        FROM shipments s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN shipping_carriers sc ON s.carrier_id = sc.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND s.shipment_status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (customer_id) {
        query += ` AND s.customer_id = $${paramCount}`;
        params.push(customer_id);
        paramCount++;
      }

      query += ` ORDER BY s.shipment_date DESC LIMIT 100`;

      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching shipments:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get shipment by ID
  async getShipmentById(req, res) {
    try {
      const { id } = req.params;

      const shipmentResult = await db.query(`
        SELECT s.*, c.customer_name, sc.carrier_name
        FROM shipments s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN shipping_carriers sc ON s.carrier_id = sc.id
        WHERE s.id = $1
      `, [id]);

      if (shipmentResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Shipment not found' });
      }

      const itemsResult = await db.query(`
        SELECT * FROM shipment_items WHERE shipment_id = $1
      `, [id]);

      const trackingResult = await db.query(`
        SELECT * FROM tracking_updates 
        WHERE shipment_id = $1 
        ORDER BY update_time DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          shipment: shipmentResult.rows[0],
          items: itemsResult.rows,
          tracking: trackingResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching shipment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create shipment
  async createShipment(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        reference_type,
        reference_id,
        reference_number,
        customer_id,
        carrier_id,
        service_type,
        expected_delivery_date,
        destination_name,
        destination_address,
        destination_city,
        destination_state,
        destination_pincode,
        destination_phone,
        number_of_packages,
        total_weight_kg,
        length_cm,
        width_cm,
        height_cm,
        handling_instructions,
        items,
        created_by
      } = req.body;

      // Create shipment
      const shipmentResult = await client.query(`
        INSERT INTO shipments (
          reference_type, reference_id, reference_number, customer_id,
          carrier_id, service_type, expected_delivery_date,
          destination_name, destination_address, destination_city,
          destination_state, destination_pincode, destination_phone,
          number_of_packages, total_weight_kg, length_cm, width_cm, height_cm,
          handling_instructions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        reference_type, reference_id, reference_number, customer_id,
        carrier_id, service_type, expected_delivery_date,
        destination_name, destination_address, destination_city,
        destination_state, destination_pincode, destination_phone,
        number_of_packages || 1, total_weight_kg, length_cm, width_cm, height_cm,
        handling_instructions, created_by
      ]);

      const shipment_id = shipmentResult.rows[0].id;

      // Add shipment items
      for (const item of items) {
        await client.query(`
          INSERT INTO shipment_items (
            shipment_id, item_type, item_id, item_name, sku_code,
            quantity, unit_price, package_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          shipment_id, item.item_type, item.item_id, item.item_name,
          item.sku_code, item.quantity, item.unit_price, item.package_number || 1
        ]);
      }

      // Add initial tracking update
      await client.query(`
        INSERT INTO tracking_updates (
          shipment_id, status, description, updated_by
        ) VALUES ($1, 'created', 'Shipment created', 'system')
      `, [shipment_id]);

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: shipmentResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating shipment:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Update shipment status
  async updateShipmentStatus(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { status, location, description, tracking_number, actual_delivery_date } = req.body;

      // Update shipment
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (status) {
        updateFields.push(`shipment_status = $${paramCount}`);
        updateValues.push(status);
        paramCount++;
      }

      if (tracking_number) {
        updateFields.push(`tracking_number = $${paramCount}`);
        updateValues.push(tracking_number);
        paramCount++;
      }

      if (actual_delivery_date && status === 'delivered') {
        updateFields.push(`actual_delivery_date = $${paramCount}`);
        updateValues.push(actual_delivery_date);
        paramCount++;
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        
        await client.query(`
          UPDATE shipments SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `, updateValues);
      }

      // Add tracking update
      await client.query(`
        INSERT INTO tracking_updates (
          shipment_id, status, location, description, updated_by
        ) VALUES ($1, $2, $3, $4, 'system')
      `, [id, status, location || '', description || '']);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Shipment updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating shipment:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Get active shipments
  async getActiveShipments(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_active_shipments');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching active shipments:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get pending pickups
  async getPendingPickups(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_pending_pickups');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching pending pickups:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get delivery performance
  async getDeliveryPerformance(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_delivery_performance');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching delivery performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Print shipping label (mock - would integrate with carrier API)
  async printLabel(req, res) {
    try {
      const { id } = req.params;

      // In production, this would call the carrier's API to generate label
      // For now, we'll just update the label_printed_at timestamp
      const result = await db.query(`
        UPDATE shipments SET
          label_printed_at = CURRENT_TIMESTAMP,
          shipping_label_url = $1
        WHERE id = $2
        RETURNING *
      `, [`/labels/shipment-${id}.pdf`, id]);

      res.json({ 
        success: true, 
        data: result.rows[0],
        label_url: `/labels/shipment-${id}.pdf`
      });
    } catch (error) {
      console.error('Error printing label:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ShippingController();
