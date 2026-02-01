const db = require('../config/database');

class PolyhouseController {
  async getSites(req, res) {
    try {
      const result = await db.query('SELECT * FROM nursery_sites WHERE is_active = true ORDER BY site_name');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching sites:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPolyhouses(req, res) {
    try {
      const { site_id } = req.query;
      
      let query = `
        SELECT p.*, ns.site_name
        FROM polyhouses p
        JOIN nursery_sites ns ON p.site_id = ns.id
        WHERE p.is_active = true
      `;
      const params = [];
      
      if (site_id) {
        query += ` AND p.site_id = $1`;
        params.push(site_id);
      }
      
      query += ` ORDER BY p.polyhouse_name`;
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching polyhouses:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getUtilization(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_polyhouse_utilization');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching utilization:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPolyhouse(req, res) {
    try {
      const { 
        site_id, 
        polyhouse_code, 
        polyhouse_name, 
        structure_type, 
        environment_type,
        area, 
        area_sqm,
        location 
      } = req.body;

      console.log('Create polyhouse request:', req.body);

      // Auto-generate polyhouse_code if not provided
      let code = polyhouse_code;
      if (!code) {
        const result = await db.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(polyhouse_code FROM 'PH-(\\d+)') AS INTEGER)), 0) + 1 as next_num 
           FROM polyhouses WHERE polyhouse_code LIKE 'PH-%'`
        );
        const nextNum = result.rows[0]?.next_num || 1;
        code = `PH-${String(nextNum).padStart(3, '0')}`;
        console.log('Generated polyhouse_code:', code);
      }

      // Use site_id from request or default to first active site
      let siteId = site_id;
      if (!siteId) {
        const siteResult = await db.query(
          'SELECT id FROM nursery_sites WHERE is_active = true ORDER BY id LIMIT 1'
        );
        if (siteResult.rows.length > 0) {
          siteId = siteResult.rows[0].id;
          console.log('Using default site_id:', siteId);
        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'No active nursery site found. Please create a site first.' 
          });
        }
      }

      // Map area_sqm to area if provided
      const areaValue = area || area_sqm;

      // Map environment_type or structure_type
      const structureValue = structure_type || environment_type;

      console.log('Inserting polyhouse:', { siteId, code, polyhouse_name, structureValue, areaValue });

      const insertResult = await db.query(`
        INSERT INTO polyhouses (site_id, polyhouse_code, polyhouse_name, structure_type, area)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [siteId, code, polyhouse_name, structureValue || null, areaValue || null]);

      res.status(201).json({ success: true, data: insertResult.rows[0] });
    } catch (error) {
      console.error('Error creating polyhouse:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePolyhouse(req, res) {
    try {
      const { id } = req.params;
      const { site_id, polyhouse_code, polyhouse_name, structure_type, area } = req.body;

      const result = await db.query(`
        UPDATE polyhouses SET
          site_id = $1,
          polyhouse_code = $2,
          polyhouse_name = $3,
          structure_type = $4,
          area = $5
        WHERE id = $6
        RETURNING *
      `, [site_id, polyhouse_code, polyhouse_name, structure_type, area, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Polyhouse not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating polyhouse:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deletePolyhouse(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        UPDATE polyhouses SET is_active = false
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Polyhouse not found' });
      }

      res.json({ success: true, message: 'Polyhouse deleted successfully' });
    } catch (error) {
      console.error('Error deleting polyhouse:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllSections(req, res) {
    try {
      const result = await db.query(`
        SELECT ps.*, ph.polyhouse_name, ph.polyhouse_code
        FROM polyhouse_sections ps
        JOIN polyhouses ph ON ps.polyhouse_id = ph.id
        WHERE ps.is_active = true
        ORDER BY ph.polyhouse_name, ps.section_name
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSectionsByPolyhouse(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`
        SELECT * FROM polyhouse_sections
        WHERE polyhouse_id = $1 AND is_active = true
        ORDER BY section_name
      `, [id]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createSection(req, res) {
    try {
      const {
        polyhouse_id, section_name, section_code, total_capacity, has_climate_control
      } = req.body;

      const result = await db.query(`
        INSERT INTO polyhouse_sections (
          polyhouse_id, section_name, section_code, total_capacity, has_climate_control
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [polyhouse_id, section_name, section_code, total_capacity, has_climate_control || false]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getEnvironmentalLogs(req, res) {
    try {
      const { id } = req.params;
      const { start_date, end_date, limit = 100 } = req.query;
      
      let query = `
        SELECT el.*, u.full_name as recorded_by_name
        FROM environmental_logs el
        LEFT JOIN users u ON el.recorded_by = u.id
        WHERE el.polyhouse_section_id = $1
      `;
      const params = [id];
      let paramCount = 2;
      
      if (start_date) {
        query += ` AND el.log_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND el.log_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY el.log_date DESC, el.log_time DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching environmental logs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createEnvironmentalLog(req, res) {
    try {
      const { id } = req.params;
      const { log_date, log_time, temperature, humidity, light_intensity, recorded_by } = req.body;

      const result = await db.query(`
        INSERT INTO environmental_logs (
          polyhouse_section_id, log_date, log_time, temperature, humidity, light_intensity, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [id, log_date, log_time, temperature || null, humidity || null, light_intensity || null, recorded_by]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating environmental log:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PolyhouseController();
