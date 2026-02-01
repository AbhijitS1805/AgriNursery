const db = require('../config/database');

const productionController = {
  // Get all productions
  async getAllProductions(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          p.*,
          ph.polyhouse_name as polyhouse_name
        FROM productions p
        LEFT JOIN polyhouses ph ON p.polyhouse_id = ph.id
        WHERE p.is_active = true
        ORDER BY p.started_date DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching productions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create new production
  async createProduction(req, res) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { plant_name, quantity, seeds_per_plant, items_used, total_cost, cost_per_plant } = req.body;

      // Validate inventory stock
      for (const item of items_used) {
        const stockCheck = await client.query(
          'SELECT current_stock, item_name FROM inventory_items WHERE id = $1',
          [item.item_id]
        );
        
        if (stockCheck.rows.length === 0) {
          throw new Error('Item not found');
        }

        const currentStock = parseFloat(stockCheck.rows[0].current_stock);
        const quantityUsed = parseFloat(item.quantity_used);

        if (currentStock < quantityUsed) {
          throw new Error(
            `Insufficient stock for ${stockCheck.rows[0].item_name}. Available: ${currentStock}, Required: ${quantityUsed}`
          );
        }
      }

      // Create production record
      const productionResult = await client.query(`
        INSERT INTO productions (
          plant_name, quantity, status, started_date, 
          seeds_per_plant, total_cost, cost_per_plant
        )
        VALUES ($1, $2, 'Growing', NOW(), $3, $4, $5)
        RETURNING *
      `, [plant_name, quantity, seeds_per_plant || 1, total_cost || 0, cost_per_plant || 0]);

      const productionId = productionResult.rows[0].id;

      // Deduct inventory and record items used
      for (const item of items_used) {
        // Update inventory stock - deduct the quantity
        const updateResult = await client.query(`
          UPDATE inventory_items 
          SET current_stock = current_stock - $1
          WHERE id = $2
          RETURNING id, item_name, current_stock
        `, [Math.abs(item.quantity_used), item.item_id]);

        if (updateResult.rows.length === 0) {
          throw new Error(`Failed to update inventory for item ${item.item_id}`);
        }

        console.log('Inventory updated:', updateResult.rows[0]); // Debug log

        // Record production items used with cost
        await client.query(`
          INSERT INTO production_items (production_id, item_id, quantity_used, item_cost, item_name)
          VALUES ($1, $2, $3, $4, $5)
        `, [productionId, item.item_id, item.quantity_used, item.item_cost || 0, item.item_name]);

        // Create inventory transaction
        await client.query(`
          INSERT INTO inventory_transactions (
            item_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes
          ) VALUES ($1, 'consumption', $2, 'production', $3, $4, $5)
        `, [item.item_id, -Math.abs(item.quantity_used), productionId, new Date().toISOString().split('T')[0], `Production: ${plant_name}`]);
      }

      await client.query('COMMIT');
      res.status(201).json({ 
        success: true, 
        data: productionResult.rows[0],
        message: `Production started! Cost per plant: ₹${cost_per_plant.toFixed(2)}`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating production:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  },

  // Move production to polyhouse
  async moveToPolyhouse(req, res) {
    try {
      const { id } = req.params;
      const { polyhouse_id, section } = req.body;

      // Update production
      const result = await db.query(`
        UPDATE productions 
        SET polyhouse_id = $1, section = $2, status = 'In Polyhouse', moved_date = NOW()
        WHERE id = $3 AND status = 'Growing'
        RETURNING *
      `, [polyhouse_id, section, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Production not found or already moved' 
        });
      }

      res.json({ 
        success: true, 
        data: result.rows[0],
        message: 'Plants moved to polyhouse successfully'
      });
    } catch (error) {
      console.error('Error moving to polyhouse:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get ready crops (plants in polyhouses ready for sale)
  async getReadyCrops(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          p.id,
          p.plant_name,
          p.quantity,
          p.status,
          p.started_date as production_date,
          p.moved_date,
          p.total_cost,
          p.cost_per_plant,
          p.polyhouse_id,
          p.section as section_name,
          ph.polyhouse_name,
          ph.polyhouse_code
        FROM productions p
        LEFT JOIN polyhouses ph ON p.polyhouse_id = ph.id
        WHERE p.status = 'In Polyhouse' AND p.is_active = true
        ORDER BY p.moved_date DESC, p.plant_name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching ready crops:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = productionController;
