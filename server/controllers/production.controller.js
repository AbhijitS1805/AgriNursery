const db = require('../config/database');

class ProductionController {
  // ===================================
  // PRODUCTION ORDERS
  // ===================================
  
  async createProductionOrder(req, res) {
    try {
      const {
        plant_variety_id,
        planned_quantity,
        planned_start_date,
        planned_completion_date
      } = req.body;

      // Generate PO number
      const poResult = await db.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 4) AS INTEGER)), 0) + 1 as next_num 
         FROM production_orders`
      );
      const po_number = `PRD${String(poResult.rows[0].next_num).padStart(5, '0')}`;

      const result = await db.query(`
        INSERT INTO production_orders (
          po_number, plant_variety_id, planned_quantity, order_date,
          planned_start_date, planned_completion_date, status
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'planned')
        RETURNING *
      `, [po_number, plant_variety_id, planned_quantity, planned_start_date, planned_completion_date]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating production order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllProductionOrders(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          po.*,
          pv.common_name as plant_name,
          pv.variety_code,
          b.batch_code,
          b.current_quantity
        FROM production_orders po
        JOIN plant_varieties pv ON po.plant_variety_id = pv.id
        LEFT JOIN batches b ON po.batch_id = b.id
        ORDER BY po.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching production orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async startProduction(req, res) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { production_order_id } = req.body;

      // Get production order details
      const poResult = await client.query(
        'SELECT * FROM production_orders WHERE id = $1',
        [production_order_id]
      );
      const po = poResult.rows[0];

      // Create batch
      const batchCodeResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(batch_code FROM 4) AS INTEGER)), 0) + 1 as next_num 
         FROM batches`
      );
      const batch_code = `BCH${String(batchCodeResult.rows[0].next_num).padStart(5, '0')}`;

      // Get first growth stage
      const stageResult = await client.query(
        'SELECT id FROM growth_stages ORDER BY stage_order LIMIT 1'
      );
      const stage_id = stageResult.rows[0].id;

      const batchResult = await client.query(`
        INSERT INTO batches (
          batch_code, plant_variety_id, initial_quantity, current_quantity,
          current_stage_id, propagation_date, expected_ready_date, status
        ) VALUES ($1, $2, $3, $3, $4, CURRENT_DATE, $5, 'active')
        RETURNING *
      `, [batch_code, po.plant_variety_id, po.planned_quantity, stage_id, po.planned_completion_date]);

      // Update production order
      await client.query(`
        UPDATE production_orders 
        SET batch_id = $1, actual_start_date = CURRENT_DATE, 
            status = 'in-progress', actual_quantity = $2
        WHERE id = $3
      `, [batchResult.rows[0].id, po.planned_quantity, production_order_id]);

      // Create material requisition
      const reqNumResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(requisition_number FROM 3) AS INTEGER)), 0) + 1 as next_num 
         FROM material_requisitions`
      );
      const req_number = `MR${String(reqNumResult.rows[0].next_num).padStart(6, '0')}`;

      const requisition = await client.query(`
        INSERT INTO material_requisitions (
          requisition_number, batch_id, production_order_id,
          requisition_date, status
        ) VALUES ($1, $2, $3, CURRENT_DATE, 'approved')
        RETURNING *
      `, [req_number, batchResult.rows[0].id, production_order_id]);

      // Get BOM for this variety and create requisition items
      const bomResult = await client.query(`
        SELECT pb.*, ii.item_name, ii.unit_of_measure, ii.unit_cost
        FROM production_bom pb
        JOIN inventory_items ii ON pb.item_id = ii.id
        WHERE pb.plant_variety_id = $1 AND (pb.stage_id IS NULL OR pb.stage_id = $2)
      `, [po.plant_variety_id, stage_id]);

      for (const bom of bomResult.rows) {
        const quantity = bom.quantity_per_plant * po.planned_quantity;
        const total_cost = quantity * (bom.unit_cost || 0);

        await client.query(`
          INSERT INTO material_requisition_items (
            requisition_id, item_id, requested_quantity, issued_quantity, unit_cost, total_cost
          ) VALUES ($1, $2, $3, $3, $4, $5)
        `, [requisition.rows[0].id, bom.item_id, quantity, bom.unit_cost, total_cost]);

        // Create inventory transaction (consumption)
        await client.query(`
          INSERT INTO inventory_transactions (
            item_id, transaction_type, quantity, unit_cost, total_cost,
            batch_id, transaction_date, notes
          ) VALUES ($1, 'consumption', $2, $3, $4, $5, CURRENT_DATE, $6)
        `, [bom.item_id, -Math.abs(quantity), bom.unit_cost, -Math.abs(total_cost), 
            batchResult.rows[0].id, `Material requisition: ${req_number}`]);

        // Update inventory stock
        await client.query(
          'UPDATE inventory_items SET current_stock = current_stock - $1 WHERE id = $2',
          [Math.abs(quantity), bom.item_id]
        );

        // Update batch seed cost
        await client.query(
          'UPDATE batches SET seed_cost = seed_cost + $1 WHERE id = $2',
          [Math.abs(total_cost), batchResult.rows[0].id]
        );
      }

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        data: {
          batch: batchResult.rows[0],
          requisition: requisition.rows[0],
          materials_consumed: bomResult.rows.length
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error starting production:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // ===================================
  // BILL OF MATERIALS (BOM)
  // ===================================

  async getBOM(req, res) {
    try {
      const { plant_variety_id } = req.query;
      
      let query = `
        SELECT 
          pb.*,
          pv.common_name as plant_name,
          pv.variety_code,
          ii.item_name,
          ii.unit_of_measure,
          ii.unit_cost,
          ii.current_stock,
          gs.stage_name
        FROM production_bom pb
        JOIN plant_varieties pv ON pb.plant_variety_id = pv.id
        JOIN inventory_items ii ON pb.item_id = ii.id
        LEFT JOIN growth_stages gs ON pb.stage_id = gs.id
      `;

      const params = [];
      if (plant_variety_id) {
        query += ' WHERE pb.plant_variety_id = $1';
        params.push(plant_variety_id);
      }

      query += ' ORDER BY pv.common_name, gs.stage_order, ii.item_name';

      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching BOM:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createBOM(req, res) {
    try {
      const { plant_variety_id, item_id, quantity_per_plant, stage_id, notes } = req.body;

      const result = await db.query(`
        INSERT INTO production_bom (
          plant_variety_id, item_id, quantity_per_plant, stage_id, notes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [plant_variety_id, item_id, quantity_per_plant, stage_id || null, notes]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating BOM:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateBOM(req, res) {
    try {
      const { id } = req.params;
      const { quantity_per_plant, stage_id, notes } = req.body;

      const result = await db.query(`
        UPDATE production_bom 
        SET quantity_per_plant = COALESCE($1, quantity_per_plant),
            stage_id = COALESCE($2, stage_id),
            notes = COALESCE($3, notes)
        WHERE id = $4
        RETURNING *
      `, [quantity_per_plant, stage_id, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'BOM not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating BOM:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteBOM(req, res) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM production_bom WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting BOM:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ===================================
  // FINISHED GOODS INVENTORY
  // ===================================

  async convertBatchToFinishedGoods(req, res) {
    try {
      const { batch_id, selling_price, quality_grade, size } = req.body;

      // Get batch details
      const batchResult = await db.query(`
        SELECT b.*, pv.common_name, pv.variety_code
        FROM batches b
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        WHERE b.id = $1
      `, [batch_id]);

      if (batchResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      const batch = batchResult.rows[0];
      
      // Generate SKU
      const sku_code = `FG-${batch.variety_code}-${batch.batch_code}`;
      const item_name = `${batch.common_name} - ${quality_grade || 'Standard'} (${batch.batch_code})`;

      const result = await db.query(`
        INSERT INTO finished_goods_inventory (
          batch_id, sku_code, item_name, plant_variety_id,
          available_quantity, cost_per_unit, selling_price, quality_grade, size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        batch_id, sku_code, item_name, batch.plant_variety_id,
        batch.current_quantity, batch.cost_per_plant, selling_price,
        quality_grade || 'Standard', size || 'Medium'
      ]);

      // Update batch status
      await db.query(`
        UPDATE batches 
        SET actual_ready_date = CURRENT_DATE
        WHERE id = $1
      `, [batch_id]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error converting to finished goods:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllFinishedGoods(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          fg.*,
          pv.common_name as plant_name,
          pv.botanical_name,
          b.batch_code,
          b.propagation_date,
          (fg.available_quantity * fg.selling_price) as total_value
        FROM finished_goods_inventory fg
        JOIN plant_varieties pv ON fg.plant_variety_id = pv.id
        JOIN batches b ON fg.batch_id = b.id
        WHERE fg.is_active = true
        ORDER BY fg.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching finished goods:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ===================================
  // MATERIAL REQUISITIONS
  // ===================================

  async getMaterialRequisitions(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          mr.*,
          b.batch_code,
          pv.common_name as plant_name,
          COUNT(mri.id) as item_count,
          SUM(mri.total_cost) as total_cost
        FROM material_requisitions mr
        JOIN batches b ON mr.batch_id = b.id
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        LEFT JOIN material_requisition_items mri ON mr.id = mri.requisition_id
        GROUP BY mr.id, b.batch_code, pv.common_name
        ORDER BY mr.created_at DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching material requisitions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMaterialRequisitionItems(req, res) {
    try {
      const { requisition_id } = req.params;
      
      const result = await db.query(`
        SELECT 
          mri.*,
          ii.item_name,
          ii.sku_code,
          ii.unit_of_measure
        FROM material_requisition_items mri
        JOIN inventory_items ii ON mri.item_id = ii.id
        WHERE mri.requisition_id = $1
        ORDER BY ii.item_name
      `, [requisition_id]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching requisition items:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ProductionController();
