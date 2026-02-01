const db = require('../config/database');

const farmersController = {
  // Get all farmers
  async getAllFarmers(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          f.*,
          s.state_name,
          d.district_name,
          t.taluka_name,
          v.village_name
        FROM farmers f
        LEFT JOIN states s ON f.state_id = s.id
        LEFT JOIN districts d ON f.district_id = d.id
        LEFT JOIN talukas t ON f.taluka_id = t.id
        LEFT JOIN villages v ON f.village_id = v.id
        ORDER BY f.created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching farmers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get farmer by ID
  async getFarmerById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`
        SELECT 
          f.*,
          s.state_name,
          d.district_name,
          t.taluka_name,
          v.village_name
        FROM farmers f
        LEFT JOIN states s ON f.state_id = s.id
        LEFT JOIN districts d ON f.district_id = d.id
        LEFT JOIN talukas t ON f.taluka_id = t.id
        LEFT JOIN villages v ON f.village_id = v.id
        WHERE f.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching farmer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create new farmer
  async createFarmer(req, res) {
    try {
      const {
        farmer_name,
        mobile,
        mobile2,
        email,
        date_of_birth,
        gender,
        address,
        village_id,
        taluka_id,
        district_id,
        state_id
      } = req.body;

      // Validate required fields
      if (!farmer_name || !mobile || !state_id || !district_id || !taluka_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Farmer name, mobile, state, district, and taluka are required' 
        });
      }

      const result = await db.query(`
        INSERT INTO farmers (
          farmer_name, mobile, mobile2, email, date_of_birth, gender, address,
          village_id, taluka_id, district_id, state_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        farmer_name, mobile, mobile2, email, date_of_birth, gender, address,
        village_id, taluka_id, district_id, state_id
      ]);

      res.status(201).json({ 
        success: true, 
        data: result.rows[0],
        message: 'Farmer created successfully'
      });
    } catch (error) {
      console.error('Error creating farmer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Update farmer
  async updateFarmer(req, res) {
    try {
      const { id } = req.params;
      const {
        farmer_name,
        mobile,
        mobile2,
        email,
        date_of_birth,
        gender,
        address,
        village_id,
        taluka_id,
        district_id,
        state_id
      } = req.body;

      const result = await db.query(`
        UPDATE farmers SET
          farmer_name = $1,
          mobile = $2,
          mobile2 = $3,
          email = $4,
          date_of_birth = $5,
          gender = $6,
          address = $7,
          village_id = $8,
          taluka_id = $9,
          district_id = $10,
          state_id = $11,
          updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `, [
        farmer_name, mobile, mobile2, email, date_of_birth, gender, address,
        village_id, taluka_id, district_id, state_id, id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      res.json({ 
        success: true, 
        data: result.rows[0],
        message: 'Farmer updated successfully'
      });
    } catch (error) {
      console.error('Error updating farmer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete farmer
  async deleteFarmer(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('DELETE FROM farmers WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Farmer not found' });
      }

      res.json({ 
        success: true, 
        message: 'Farmer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting farmer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = farmersController;
