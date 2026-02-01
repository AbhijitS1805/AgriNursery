const db = require('../config/database');

class BatchController {
  // Get all batches with filters
  async getAllBatches(req, res) {
    try {
      const { status, variety_id, section_id, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT 
          b.*,
          pv.common_name as variety_name,
          gs.stage_name,
          ps.section_name,
          ph.polyhouse_name
        FROM batches b
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        JOIN growth_stages gs ON b.current_stage_id = gs.id
        LEFT JOIN polyhouse_sections ps ON b.polyhouse_section_id = ps.id
        LEFT JOIN polyhouses ph ON ps.polyhouse_id = ph.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (status) {
        query += ` AND b.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (variety_id) {
        query += ` AND b.plant_variety_id = $${paramCount}`;
        params.push(variety_id);
        paramCount++;
      }
      
      if (section_id) {
        query += ` AND b.polyhouse_section_id = $${paramCount}`;
        params.push(section_id);
        paramCount++;
      }
      
      query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
      
      const result = await db.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get active batches (simplified view)
  async getActiveBatches(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_active_batches ORDER BY propagation_date DESC');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching active batches:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get single batch by ID
  async getBatchById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`
        SELECT 
          b.*,
          pv.common_name as variety_name,
          pv.botanical_name,
          gs.stage_name,
          ps.section_name,
          ph.polyhouse_name,
          mp.plant_code as mother_plant_code
        FROM batches b
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        JOIN growth_stages gs ON b.current_stage_id = gs.id
        LEFT JOIN polyhouse_sections ps ON b.polyhouse_section_id = ps.id
        LEFT JOIN polyhouses ph ON ps.polyhouse_id = ph.id
        LEFT JOIN mother_plants mp ON b.mother_plant_id = mp.id
        WHERE b.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create new batch
  async createBatch(req, res) {
    try {
      const {
        batch_code,
        plant_variety_id,
        mother_plant_id,
        initial_quantity,
        current_stage_id,
        propagation_date,
        expected_ready_date,
        polyhouse_section_id,
        seed_cost,
        notes,
        created_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO batches (
          batch_code, plant_variety_id, mother_plant_id, initial_quantity,
          current_quantity, current_stage_id, propagation_date, expected_ready_date,
          polyhouse_section_id, seed_cost, notes, created_by
        ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        batch_code, plant_variety_id, mother_plant_id || null, initial_quantity,
        current_stage_id, propagation_date, expected_ready_date || null,
        polyhouse_section_id || null, seed_cost || 0, notes || null, created_by
      ]);

      // Log batch creation in history
      await db.query(`
        INSERT INTO batch_history (batch_id, event_type, new_stage_id, event_date, recorded_by)
        VALUES ($1, 'stage_change', $2, $3, $4)
      `, [result.rows[0].id, current_stage_id, propagation_date, created_by]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update batch
  async updateBatch(req, res) {
    try {
      const { id } = req.params;
      const { expected_ready_date, polyhouse_section_id, notes } = req.body;

      const result = await db.query(`
        UPDATE batches
        SET expected_ready_date = COALESCE($1, expected_ready_date),
            polyhouse_section_id = COALESCE($2, polyhouse_section_id),
            notes = COALESCE($3, notes)
        WHERE id = $4
        RETURNING *
      `, [expected_ready_date, polyhouse_section_id, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update batch growth stage
  async updateBatchStage(req, res) {
    try {
      const { id } = req.params;
      const { new_stage_id, event_date, notes, recorded_by } = req.body;

      // Get current stage
      const currentBatch = await db.query('SELECT current_stage_id FROM batches WHERE id = $1', [id]);
      
      if (currentBatch.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      const old_stage_id = currentBatch.rows[0].current_stage_id;

      // Update batch stage
      await db.query('UPDATE batches SET current_stage_id = $1 WHERE id = $2', [new_stage_id, id]);

      // Log history
      await db.query(`
        INSERT INTO batch_history (batch_id, event_type, old_stage_id, new_stage_id, event_date, notes, recorded_by)
        VALUES ($1, 'stage_change', $2, $3, $4, $5, $6)
      `, [id, old_stage_id, new_stage_id, event_date, notes, recorded_by]);

      res.json({ success: true, message: 'Batch stage updated successfully' });
    } catch (error) {
      console.error('Error updating batch stage:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Record mortality
  async recordMortality(req, res) {
    try {
      const { id } = req.params;
      const { quantity_lost, loss_reason, loss_date, description, recorded_by } = req.body;

      // Get current batch details
      const batchResult = await db.query(
        'SELECT current_quantity, cost_per_plant FROM batches WHERE id = $1',
        [id]
      );

      if (batchResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      const { current_quantity, cost_per_plant } = batchResult.rows[0];
      const new_quantity = current_quantity - quantity_lost;
      const financial_loss = cost_per_plant * quantity_lost;

      // Update batch quantity
      await db.query('UPDATE batches SET current_quantity = $1 WHERE id = $2', [new_quantity, id]);

      // Record mortality
      await db.query(`
        INSERT INTO mortality_records (batch_id, quantity_lost, loss_reason, financial_loss, loss_date, description, recorded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, quantity_lost, loss_reason, financial_loss, loss_date, description, recorded_by]);

      // Log in batch history
      await db.query(`
        INSERT INTO batch_history (batch_id, event_type, quantity_change, cost_change, event_date, notes, recorded_by)
        VALUES ($1, 'mortality', $2, $3, $4, $5, $6)
      `, [id, -quantity_lost, -financial_loss, loss_date, `Mortality: ${loss_reason}`, recorded_by]);

      res.json({
        success: true,
        message: 'Mortality recorded successfully',
        new_quantity,
        financial_loss
      });
    } catch (error) {
      console.error('Error recording mortality:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update batch costs
  async updateBatchCost(req, res) {
    try {
      const { id } = req.params;
      const { consumable_cost, labor_cost, overhead_cost, notes, recorded_by } = req.body;

      const result = await db.query(`
        UPDATE batches
        SET consumable_cost = COALESCE(consumable_cost + $1, consumable_cost),
            labor_cost = COALESCE(labor_cost + $2, labor_cost),
            overhead_cost = COALESCE(overhead_cost + $3, overhead_cost)
        WHERE id = $4
        RETURNING total_cost, cost_per_plant
      `, [consumable_cost || 0, labor_cost || 0, overhead_cost || 0, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      // Log cost update
      const total_cost_added = (consumable_cost || 0) + (labor_cost || 0) + (overhead_cost || 0);
      await db.query(`
        INSERT INTO batch_history (batch_id, event_type, cost_change, event_date, notes, recorded_by)
        VALUES ($1, 'cost_update', $2, CURRENT_DATE, $3, $4)
      `, [id, total_cost_added, notes, recorded_by]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating batch cost:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get batch history
  async getBatchHistory(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`
        SELECT 
          bh.*,
          u.full_name as recorded_by_name,
          ogs.stage_name as old_stage,
          ngs.stage_name as new_stage
        FROM batch_history bh
        LEFT JOIN users u ON bh.recorded_by = u.id
        LEFT JOIN growth_stages ogs ON bh.old_stage_id = ogs.id
        LEFT JOIN growth_stages ngs ON bh.new_stage_id = ngs.id
        WHERE bh.batch_id = $1
        ORDER BY bh.created_at DESC
      `, [id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching batch history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ===================================
  // POLYHOUSE MOVEMENT
  // ===================================

  // Move batch to polyhouse section
  async moveBatchToPolyhouse(req, res) {
    try {
      const { batch_id, to_section_id, quantity_moved, movement_reason, notes } = req.body;

      // Get current batch details
      const batchResult = await db.query(
        'SELECT polyhouse_section_id, current_quantity FROM batches WHERE id = $1',
        [batch_id]
      );

      if (batchResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      const batch = batchResult.rows[0];
      const from_section_id = batch.polyhouse_section_id;

      // Validate quantity
      if (quantity_moved > batch.current_quantity) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot move more plants than current quantity' 
        });
      }

      // Check destination capacity
      const sectionResult = await db.query(
        'SELECT available_capacity FROM polyhouse_sections WHERE id = $1',
        [to_section_id]
      );

      if (sectionResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Polyhouse section not found' });
      }

      if (sectionResult.rows[0].available_capacity < quantity_moved) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient capacity in destination section' 
        });
      }

      // Create movement record (trigger will update capacities automatically)
      const result = await db.query(`
        INSERT INTO batch_movements (
          batch_id, from_section_id, to_section_id, quantity_moved, 
          movement_date, movement_reason, notes
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
        RETURNING *
      `, [batch_id, from_section_id, to_section_id, quantity_moved, movement_reason, notes]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error moving batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get batch movements history
  async getBatchMovements(req, res) {
    try {
      const { batch_id } = req.params;
      
      const result = await db.query(`
        SELECT 
          bm.*,
          fs.section_name as from_section_name,
          fs.section_code as from_section_code,
          ts.section_name as to_section_name,
          ts.section_code as to_section_code,
          ph.polyhouse_name as to_polyhouse_name
        FROM batch_movements bm
        LEFT JOIN polyhouse_sections fs ON bm.from_section_id = fs.id
        JOIN polyhouse_sections ts ON bm.to_section_id = ts.id
        JOIN polyhouses ph ON ts.polyhouse_id = ph.id
        WHERE bm.batch_id = $1
        ORDER BY bm.created_at DESC
      `, [batch_id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching batch movements:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get available polyhouse sections
  async getAvailableSections(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          ps.*,
          ph.polyhouse_name,
          ph.polyhouse_code,
          ph.structure_type
        FROM polyhouse_sections ps
        JOIN polyhouses ph ON ps.polyhouse_id = ph.id
        WHERE ps.is_active = true
        ORDER BY ph.polyhouse_name, ps.section_name
      `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching polyhouse sections:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get plant varieties (for dropdown)
  async getVarieties(req, res) {
    try {
      const result = await db.query(
        'SELECT id, variety_code, common_name, botanical_name, category FROM plant_varieties WHERE is_active = true ORDER BY common_name'
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching varieties:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get growth stages (for dropdown)
  async getGrowthStages(req, res) {
    try {
      const result = await db.query(
        'SELECT id, stage_name, stage_order, description FROM growth_stages ORDER BY stage_order'
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching growth stages:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new BatchController();
