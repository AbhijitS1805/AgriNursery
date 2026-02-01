const db = require('../config/database');

class ReportController {
  async getProfitByVariety(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_profit_by_variety ORDER BY gross_profit DESC');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching profit by variety:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getBatchCosting(req, res) {
    try {
      const { variety_id, start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          b.id,
          b.batch_code,
          pv.common_name,
          b.initial_quantity,
          b.current_quantity,
          b.seed_cost,
          b.consumable_cost,
          b.labor_cost,
          b.overhead_cost,
          b.total_cost,
          b.cost_per_plant,
          b.current_value,
          (b.current_value - b.total_cost) as value_appreciation
        FROM batches b
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        WHERE b.status = 'active'
      `;
      const params = [];
      let paramCount = 1;
      
      if (variety_id) {
        query += ` AND b.plant_variety_id = $${paramCount}`;
        params.push(variety_id);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND b.propagation_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND b.propagation_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY b.propagation_date DESC`;
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching batch costing:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStockStatus(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          ii.id,
          ii.sku_code,
          ii.item_name,
          ic.category_name,
          ii.current_stock,
          ii.minimum_stock,
          ii.maximum_stock,
          ii.unit_of_measure,
          ii.unit_cost,
          (ii.current_stock * ii.unit_cost) as stock_value,
          CASE 
            WHEN ii.current_stock <= ii.minimum_stock THEN 'Low Stock'
            WHEN ii.current_stock >= ii.maximum_stock THEN 'Overstocked'
            ELSE 'Normal'
          END as stock_status
        FROM inventory_items ii
        JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.is_active = true
        ORDER BY ic.category_name, ii.item_name
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching stock status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getBatchSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          gs.stage_name,
          COUNT(b.id) as batch_count,
          SUM(b.current_quantity) as total_plants,
          SUM(b.total_cost) as total_cost,
          SUM(b.current_value) as total_value
        FROM batches b
        JOIN growth_stages gs ON b.current_stage_id = gs.id
        WHERE b.status = 'active'
      `;
      const params = [];
      let paramCount = 1;
      
      if (start_date) {
        query += ` AND b.propagation_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND b.propagation_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` GROUP BY gs.stage_name, gs.stage_order ORDER BY gs.stage_order`;
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching batch summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMortalityAnalysis(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          mr.loss_reason,
          COUNT(mr.id) as incident_count,
          SUM(mr.quantity_lost) as total_quantity_lost,
          SUM(mr.financial_loss) as total_financial_loss,
          AVG(mr.financial_loss) as avg_loss_per_incident
        FROM mortality_records mr
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (start_date) {
        query += ` AND mr.loss_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND mr.loss_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` GROUP BY mr.loss_reason ORDER BY total_financial_loss DESC`;
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching mortality analysis:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReportController();
