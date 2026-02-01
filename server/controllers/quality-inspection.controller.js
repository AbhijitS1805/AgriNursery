const db = require('../config/database');

class QualityInspectionController {
  // Get all inspections
  async getAllInspections(req, res) {
    try {
      const { status, supplier_id } = req.query;
      
      let query = `
        SELECT 
          qi.*,
          s.supplier_name,
          u.full_name as inspector_name
        FROM quality_inspections qi
        JOIN suppliers s ON qi.supplier_id = s.id
        LEFT JOIN users u ON qi.inspector_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND qi.inspection_status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (supplier_id) {
        query += ` AND qi.supplier_id = $${paramCount}`;
        params.push(supplier_id);
        paramCount++;
      }

      query += ` ORDER BY qi.inspection_date DESC LIMIT 100`;

      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching inspections:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get inspection by ID with items
  async getInspectionById(req, res) {
    try {
      const { id } = req.params;

      const inspectionResult = await db.query(`
        SELECT 
          qi.*,
          s.supplier_name,
          s.contact_person,
          s.phone,
          u.full_name as inspector_name
        FROM quality_inspections qi
        JOIN suppliers s ON qi.supplier_id = s.id
        LEFT JOIN users u ON qi.inspector_id = u.id
        WHERE qi.id = $1
      `, [id]);

      if (inspectionResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      const itemsResult = await db.query(`
        SELECT ii.*, inv.item_name as inventory_item_name
        FROM inspection_items ii
        LEFT JOIN inventory_items inv ON ii.item_id = inv.id
        WHERE ii.inspection_id = $1
      `, [id]);

      res.json({
        success: true,
        data: {
          inspection: inspectionResult.rows[0],
          items: itemsResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching inspection:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create new inspection
  async createInspection(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        reference_type,
        reference_id,
        supplier_id,
        po_number,
        bill_number,
        inspection_date,
        inspector_name,
        inspector_id,
        items,
        notes
      } = req.body;

      // Create inspection record
      const inspectionResult = await client.query(`
        INSERT INTO quality_inspections (
          reference_type, reference_id, supplier_id, po_number, bill_number,
          inspection_date, inspector_name, inspector_id, inspection_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        reference_type, reference_id, supplier_id, po_number, bill_number,
        inspection_date || new Date(), inspector_name, inspector_id, notes
      ]);

      const inspection_id = inspectionResult.rows[0].id;

      // Add inspection items
      for (const item of items) {
        await client.query(`
          INSERT INTO inspection_items (
            inspection_id, item_id, item_name, batch_number,
            ordered_quantity, received_quantity, inspected_quantity,
            unit_price, total_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          inspection_id, item.item_id, item.item_name, item.batch_number,
          item.ordered_quantity, item.received_quantity, item.inspected_quantity,
          item.unit_price, item.total_value
        ]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: inspectionResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating inspection:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Update inspection item (approve/reject)
  async updateInspectionItem(req, res) {
    try {
      const { id } = req.params;
      const {
        accepted_quantity,
        rejected_quantity,
        quality_status,
        quality_grade,
        defect_type,
        defect_description,
        defect_percentage,
        germination_test_done,
        germination_rate,
        physical_damage,
        moisture_content,
        pest_infestation,
        inspector_notes
      } = req.body;

      const result = await db.query(`
        UPDATE inspection_items SET
          accepted_quantity = $1,
          rejected_quantity = $2,
          quality_status = $3,
          quality_grade = $4,
          defect_type = $5,
          defect_description = $6,
          defect_percentage = $7,
          germination_test_done = $8,
          germination_rate = $9,
          physical_damage = $10,
          moisture_content = $11,
          pest_infestation = $12,
          inspector_notes = $13,
          rejected_value = rejected_quantity * unit_price
        WHERE id = $14
        RETURNING *
      `, [
        accepted_quantity, rejected_quantity, quality_status, quality_grade,
        defect_type, defect_description, defect_percentage,
        germination_test_done, germination_rate, physical_damage,
        moisture_content, pest_infestation, inspector_notes, id
      ]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating inspection item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Approve inspection
  async approveInspection(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { approved_by, notes } = req.body;

      // Calculate totals
      const itemsResult = await client.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN quality_status = 'passed' THEN 1 ELSE 0 END) as items_passed,
          SUM(CASE WHEN quality_status = 'failed' THEN 1 ELSE 0 END) as items_failed,
          SUM(total_value) as total_value,
          SUM(rejected_value) as rejected_value
        FROM inspection_items
        WHERE inspection_id = $1
      `, [id]);

      const stats = itemsResult.rows[0];

      // Update inspection
      const result = await client.query(`
        UPDATE quality_inspections SET
          inspection_status = 'approved',
          total_items_inspected = $1,
          items_passed = $2,
          items_failed = $3,
          total_value = $4,
          rejected_value = $5,
          approved_by = $6,
          approved_at = CURRENT_TIMESTAMP,
          inspection_notes = COALESCE(inspection_notes || E'\n', '') || $7
        WHERE id = $8
        RETURNING *
      `, [
        stats.total_items, stats.items_passed, stats.items_failed,
        stats.total_value, stats.rejected_value, approved_by,
        notes || 'Approved', id
      ]);

      // If there are rejected items, update inventory to reflect accepted quantity only
      await client.query(`
        UPDATE inventory_items ii
        SET current_stock = current_stock + ins_item.accepted_quantity
        FROM inspection_items ins_item
        WHERE ins_item.inspection_id = $1 
          AND ins_item.item_id = ii.id
          AND ins_item.accepted_quantity > 0
      `, [id]);

      await client.query('COMMIT');
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving inspection:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Reject inspection and create debit note
  async rejectInspection(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { rejection_reason, approved_by, create_debit_note } = req.body;

      // Update inspection status
      await client.query(`
        UPDATE quality_inspections SET
          inspection_status = 'rejected',
          rejection_reason = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [rejection_reason, approved_by, id]);

      // Create debit note if requested
      let debitNoteId = null;
      if (create_debit_note) {
        const inspectionData = await client.query(`
          SELECT qi.*, SUM(ii.rejected_value) as total_rejected_value
          FROM quality_inspections qi
          LEFT JOIN inspection_items ii ON qi.id = ii.inspection_id
          WHERE qi.id = $1
          GROUP BY qi.id
        `, [id]);

        const inspection = inspectionData.rows[0];

        const debitNoteResult = await client.query(`
          INSERT INTO debit_notes (
            inspection_id, supplier_id, reason, description,
            subtotal, total_amount, status
          ) VALUES ($1, $2, 'quality_rejection', $3, $4, $4, 'pending')
          RETURNING *
        `, [
          id, inspection.supplier_id, rejection_reason,
          inspection.total_rejected_value || 0
        ]);

        debitNoteId = debitNoteResult.rows[0].id;

        // Add debit note items
        const rejectedItems = await client.query(`
          SELECT * FROM inspection_items
          WHERE inspection_id = $1 AND rejected_quantity > 0
        `, [id]);

        for (const item of rejectedItems.rows) {
          await client.query(`
            INSERT INTO debit_note_items (
              debit_note_id, item_id, item_name, rejected_quantity,
              unit_price, total_amount, rejection_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            debitNoteId, item.item_id, item.item_name, item.rejected_quantity,
            item.unit_price, item.rejected_value, item.defect_description
          ]);
        }

        // Link debit note to inspection
        await client.query(`
          UPDATE quality_inspections SET
            debit_note_generated = TRUE,
            debit_note_id = $1
          WHERE id = $2
        `, [debitNoteId, id]);
      }

      await client.query('COMMIT');
      res.json({ 
        success: true, 
        message: 'Inspection rejected',
        debit_note_id: debitNoteId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rejecting inspection:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // Get pending inspections
  async getPendingInspections(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_pending_inspections');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching pending inspections:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get rejection summary
  async getRejectionSummary(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_rejection_summary LIMIT 50');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching rejection summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all debit notes
  async getDebitNotes(req, res) {
    try {
      const { status } = req.query;
      
      let query = 'SELECT * FROM v_debit_notes_pending WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      query += ' ORDER BY debit_note_date DESC';

      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching debit notes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get debit note by ID with items
  async getDebitNoteById(req, res) {
    try {
      const { id } = req.params;

      const debitNoteResult = await db.query(`
        SELECT dn.*, s.supplier_name, s.email, s.phone
        FROM debit_notes dn
        JOIN suppliers s ON dn.supplier_id = s.id
        WHERE dn.id = $1
      `, [id]);

      if (debitNoteResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Debit note not found' });
      }

      const itemsResult = await db.query(`
        SELECT * FROM debit_note_items WHERE debit_note_id = $1
      `, [id]);

      res.json({
        success: true,
        data: {
          debit_note: debitNoteResult.rows[0],
          items: itemsResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching debit note:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new QualityInspectionController();
