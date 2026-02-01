const db = require('../config/database');

class InventoryController {
  async getAllItems(req, res) {
    try {
      const { category_id, is_active = true } = req.query;
      
      let query = `
        SELECT ii.*, ic.category_name, ic.category_type
        FROM inventory_items ii
        JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.is_active = $1
      `;
      const params = [is_active];
      
      if (category_id) {
        query += ` AND ii.category_id = $2`;
        params.push(category_id);
      }
      
      query += ` ORDER BY ic.category_name, ii.item_name`;
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLowStockItems(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_low_stock_items');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(`
        SELECT ii.*, ic.category_name
        FROM inventory_items ii
        JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createItem(req, res) {
    try {
      const {
        category_id, sku_code, item_name, description, unit_of_measure,
        minimum_stock, maximum_stock, unit_cost, requires_expiry,
        product_type, sub_category, varieties, supplier_id, company,
        expiry_date, hsn_code, opening_stock, selling_price,
        gst_included, gst_percentage, cost_price, current_stock,
        bill_id
      } = req.body;

      // Create inventory item with optional bill linkage
      const result = await db.query(`
        INSERT INTO inventory_items (
          category_id, sku_code, item_name, description, unit_of_measure,
          minimum_stock, maximum_stock, unit_cost, requires_expiry,
          product_type, sub_category, varieties, supplier_id, company,
          expiry_date, hsn_code, opening_stock, current_stock, selling_price,
          gst_included, gst_percentage, cost_price, bill_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        category_id, sku_code, item_name, description || null, unit_of_measure,
        minimum_stock || 0, maximum_stock || null, cost_price || unit_cost || 0, requires_expiry || false,
        product_type || 'product', sub_category || null, varieties || null, 
        supplier_id || null, company || null, expiry_date || null, hsn_code || null,
        opening_stock || 0, current_stock || opening_stock || 0, selling_price || null,
        gst_included !== false, gst_percentage || 18, cost_price || null, bill_id || null
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const {
        category_id, sku_code, item_name, description, unit_of_measure,
        minimum_stock, maximum_stock, unit_cost, requires_expiry,
        product_type, sub_category, varieties, supplier_id, company,
        expiry_date, hsn_code, opening_stock, current_stock, selling_price,
        gst_included, gst_percentage, cost_price, bill_id
      } = req.body;

      const result = await db.query(`
        UPDATE inventory_items
        SET category_id = COALESCE($1, category_id),
            sku_code = COALESCE($2, sku_code),
            item_name = COALESCE($3, item_name),
            description = COALESCE($4, description),
            unit_of_measure = COALESCE($5, unit_of_measure),
            minimum_stock = COALESCE($6, minimum_stock),
            maximum_stock = COALESCE($7, maximum_stock),
            unit_cost = COALESCE($8, unit_cost),
            requires_expiry = COALESCE($9, requires_expiry),
            product_type = COALESCE($10, product_type),
            sub_category = COALESCE($11, sub_category),
            varieties = COALESCE($12, varieties),
            supplier_id = COALESCE($13, supplier_id),
            company = COALESCE($14, company),
            expiry_date = COALESCE($15, expiry_date),
            hsn_code = COALESCE($16, hsn_code),
            opening_stock = COALESCE($17, opening_stock),
            current_stock = COALESCE($18, current_stock),
            selling_price = COALESCE($19, selling_price),
            gst_included = COALESCE($20, gst_included),
            gst_percentage = COALESCE($21, gst_percentage),
            cost_price = COALESCE($22, cost_price),
            bill_id = COALESCE($23, bill_id),
            updated_at = NOW()
        WHERE id = $24 AND is_active = true
        RETURNING *
      `, [
        category_id, sku_code, item_name, description, unit_of_measure,
        minimum_stock, maximum_stock, unit_cost, requires_expiry,
        product_type, sub_category, varieties, supplier_id, company,
        expiry_date, hsn_code, opening_stock, current_stock, selling_price,
        gst_included, gst_percentage, cost_price, bill_id, id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTransactions(req, res) {
    try {
      const { item_id, batch_id, transaction_type, limit = 100 } = req.query;
      
      let query = `
        SELECT it.*, ii.item_name, ii.sku_code, b.batch_code
        FROM inventory_transactions it
        JOIN inventory_items ii ON it.item_id = ii.id
        LEFT JOIN batches b ON it.batch_id = b.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (item_id) {
        query += ` AND it.item_id = $${paramCount}`;
        params.push(item_id);
        paramCount++;
      }
      
      if (batch_id) {
        query += ` AND it.batch_id = $${paramCount}`;
        params.push(batch_id);
        paramCount++;
      }
      
      if (transaction_type) {
        query += ` AND it.transaction_type = $${paramCount}`;
        params.push(transaction_type);
        paramCount++;
      }
      
      query += ` ORDER BY it.transaction_date DESC, it.created_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createTransaction(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        item_id, transaction_type, quantity, unit_cost, batch_id,
        reference_number, transaction_date, notes, created_by,
        inventory_batch_id, expiry_date, supplier_name
      } = req.body;

      const total_cost = quantity * (unit_cost || 0);
      const txnDate = transaction_date || new Date().toISOString().split('T')[0]; // Default to today

      // Create transaction record
      const transactionResult = await client.query(`
        INSERT INTO inventory_transactions (
          item_id, inventory_batch_id, transaction_type, quantity, unit_cost,
          total_cost, batch_id, reference_number, transaction_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        item_id, inventory_batch_id || null, transaction_type, quantity,
        unit_cost || 0, total_cost, batch_id || null, reference_number || null,
        txnDate, notes || null, created_by || null
      ]);

      // Update inventory stock
      const stockChange = transaction_type === 'purchase' ? quantity : -Math.abs(quantity);
      await client.query(`
        UPDATE inventory_items
        SET current_stock = current_stock + $1
        WHERE id = $2
      `, [stockChange, item_id]);

      // If purchase with expiry tracking, create inventory batch
      if (transaction_type === 'purchase' && expiry_date) {
        await client.query(`
          INSERT INTO inventory_batches (item_id, batch_number, quantity, unit_cost, expiry_date, supplier_name, received_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [item_id, reference_number, quantity, unit_cost, expiry_date, supplier_name, transaction_date]);
      }

      // If consumption, update batch costs
      if (transaction_type === 'consumption' && batch_id) {
        await client.query(`
          UPDATE batches
          SET consumable_cost = consumable_cost + $1
          WHERE id = $2
        `, [Math.abs(total_cost), batch_id]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: transactionResult.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  async getExpiredBatches(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_expired_inventory');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching expired batches:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCategories(req, res) {
    try {
      const result = await db.query('SELECT * FROM inventory_categories ORDER BY category_name');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      
      // Soft delete by setting is_active to false
      const result = await db.query(`
        UPDATE inventory_items
        SET is_active = false
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      
      res.json({ success: true, message: 'Item deleted successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InventoryController();
