const db = require('../config/database');

const vehiclesController = {
  // Get all vehicles
  getAllVehicles: async (req, res) => {
    try {
      const { status, vehicle_type } = req.query;
      
      let query = `
        SELECT 
          v.*,
          (SELECT COUNT(*) FROM deliveries WHERE vehicle_id = v.id) as total_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE vehicle_id = v.id AND status = 'Delivered') as completed_deliveries,
          (SELECT SUM(distance_km) FROM deliveries WHERE vehicle_id = v.id) as total_distance,
          (SELECT SUM(fuel_cost) FROM deliveries WHERE vehicle_id = v.id) as total_fuel_cost
        FROM vehicles v
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND v.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (vehicle_type) {
        query += ` AND v.vehicle_type = $${paramCount}`;
        params.push(vehicle_type);
        paramCount++;
      }
      
      query += ` ORDER BY v.vehicle_number`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
    }
  },

  // Get vehicle by ID
  getVehicleById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const vehicleQuery = `
        SELECT 
          v.*,
          (SELECT COUNT(*) FROM deliveries WHERE vehicle_id = v.id) as total_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE vehicle_id = v.id AND status = 'Delivered') as completed_deliveries,
          (SELECT SUM(distance_km) FROM deliveries WHERE vehicle_id = v.id) as total_distance,
          (SELECT SUM(fuel_cost) FROM deliveries WHERE vehicle_id = v.id) as total_fuel_cost
        FROM vehicles v
        WHERE v.id = $1
      `;
      
      const result = await db.query(vehicleQuery, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      // Get maintenance history
      const maintenanceQuery = `
        SELECT * FROM vehicle_maintenance
        WHERE vehicle_id = $1
        ORDER BY maintenance_date DESC
        LIMIT 10
      `;
      
      const maintenanceResult = await db.query(maintenanceQuery, [id]);
      
      const vehicle = {
        ...result.rows[0],
        maintenance_history: maintenanceResult.rows
      };
      
      res.json(vehicle);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      res.status(500).json({ message: 'Error fetching vehicle', error: error.message });
    }
  },

  // Create new vehicle
  createVehicle: async (req, res) => {
    try {
      const {
        vehicle_number,
        vehicle_type,
        capacity_kg,
        capacity_cubic_meter,
        driver_name,
        driver_mobile,
        status,
        fuel_type,
        insurance_expiry,
        maintenance_due,
        notes
      } = req.body;
      
      // Validate required fields
      if (!vehicle_number || !vehicle_type) {
        return res.status(400).json({ message: 'Vehicle number and type are required' });
      }
      
      const query = `
        INSERT INTO vehicles (
          vehicle_number, vehicle_type, capacity_kg, capacity_cubic_meter,
          driver_name, driver_mobile, status, fuel_type,
          insurance_expiry, maintenance_due, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        vehicle_number,
        vehicle_type,
        capacity_kg || null,
        capacity_cubic_meter || null,
        driver_name || null,
        driver_mobile || null,
        status || 'Available',
        fuel_type || null,
        insurance_expiry || null,
        maintenance_due || null,
        notes || null
      ];
      
      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      if (error.constraint === 'vehicles_vehicle_number_key') {
        return res.status(400).json({ message: 'Vehicle number already exists' });
      }
      res.status(500).json({ message: 'Error creating vehicle', error: error.message });
    }
  },

  // Update vehicle
  updateVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        vehicle_number,
        vehicle_type,
        capacity_kg,
        capacity_cubic_meter,
        driver_name,
        driver_mobile,
        status,
        fuel_type,
        insurance_expiry,
        maintenance_due,
        notes
      } = req.body;
      
      const query = `
        UPDATE vehicles SET
          vehicle_number = COALESCE($1, vehicle_number),
          vehicle_type = COALESCE($2, vehicle_type),
          capacity_kg = $3,
          capacity_cubic_meter = $4,
          driver_name = $5,
          driver_mobile = $6,
          status = COALESCE($7, status),
          fuel_type = $8,
          insurance_expiry = $9,
          maintenance_due = $10,
          notes = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `;
      
      const values = [
        vehicle_number,
        vehicle_type,
        capacity_kg,
        capacity_cubic_meter,
        driver_name,
        driver_mobile,
        status,
        fuel_type,
        insurance_expiry,
        maintenance_due,
        notes,
        id
      ];
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ message: 'Error updating vehicle', error: error.message });
    }
  },

  // Delete vehicle
  deleteVehicle: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if vehicle has deliveries
      const checkQuery = `
        SELECT COUNT(*) as delivery_count FROM deliveries WHERE vehicle_id = $1
      `;
      const checkResult = await db.query(checkQuery, [id]);
      
      if (parseInt(checkResult.rows[0].delivery_count) > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete vehicle with existing deliveries. Set status to Retired instead.' 
        });
      }
      
      const query = `DELETE FROM vehicles WHERE id = $1 RETURNING *`;
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      res.json({ message: 'Vehicle deleted successfully', vehicle: result.rows[0] });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ message: 'Error deleting vehicle', error: error.message });
    }
  },

  // Add maintenance record
  addMaintenance: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        maintenance_date,
        maintenance_type,
        description,
        cost,
        odometer_reading,
        next_service_km,
        next_service_date,
        vendor_name,
        invoice_number
      } = req.body;
      
      const query = `
        INSERT INTO vehicle_maintenance (
          vehicle_id, maintenance_date, maintenance_type, description,
          cost, odometer_reading, next_service_km, next_service_date,
          vendor_name, invoice_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        id,
        maintenance_date,
        maintenance_type,
        description || null,
        cost || null,
        odometer_reading || null,
        next_service_km || null,
        next_service_date || null,
        vendor_name || null,
        invoice_number || null
      ];
      
      const result = await db.query(query, values);
      
      // Update vehicle's next maintenance date if provided
      if (next_service_date) {
        await db.query(
          `UPDATE vehicles SET maintenance_due = $1 WHERE id = $2`,
          [next_service_date, id]
        );
      }
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      res.status(500).json({ message: 'Error adding maintenance record', error: error.message });
    }
  },

  // Get vehicle statistics
  getVehicleStats: async (req, res) => {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(*) FILTER (WHERE status = 'Available') as available,
          COUNT(*) FILTER (WHERE status = 'In Use') as in_use,
          COUNT(*) FILTER (WHERE status = 'Maintenance') as in_maintenance,
          COUNT(*) FILTER (WHERE status = 'Retired') as retired
        FROM vehicles
      `;
      
      const result = await db.query(query);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching vehicle stats:', error);
      res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
  }
};

module.exports = vehiclesController;
