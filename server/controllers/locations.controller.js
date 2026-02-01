const db = require('../config/database');

const locationsController = {
  // Get all states
  async getStates(req, res) {
    try {
      const result = await db.query('SELECT * FROM states ORDER BY state_name');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching states:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get districts by state
  async getDistrictsByState(req, res) {
    try {
      const { stateId } = req.params;
      const result = await db.query(
        'SELECT * FROM districts WHERE state_id = $1 ORDER BY district_name',
        [stateId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching districts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get talukas by district
  async getTalukasByDistrict(req, res) {
    try {
      const { districtId } = req.params;
      const result = await db.query(
        'SELECT * FROM talukas WHERE district_id = $1 ORDER BY taluka_name',
        [districtId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching talukas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get villages by taluka
  async getVillagesByTaluka(req, res) {
    try {
      const { talukaId } = req.params;
      const result = await db.query(
        'SELECT * FROM villages WHERE taluka_id = $1 ORDER BY village_name',
        [talukaId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching villages:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Add new village (for admin)
  async createVillage(req, res) {
    try {
      const { taluka_id, village_name } = req.body;
      
      if (!taluka_id || !village_name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Taluka ID and village name are required' 
        });
      }

      const result = await db.query(
        'INSERT INTO villages (taluka_id, village_name) VALUES ($1, $2) RETURNING *',
        [taluka_id, village_name]
      );

      res.status(201).json({ 
        success: true, 
        data: result.rows[0],
        message: 'Village created successfully'
      });
    } catch (error) {
      console.error('Error creating village:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = locationsController;
