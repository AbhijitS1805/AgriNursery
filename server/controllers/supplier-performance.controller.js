const db = require('../config/database');

class SupplierPerformanceController {
  // Get supplier scorecards
  async getSupplierScorecards(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_supplier_scorecards ORDER BY overall_score DESC NULLS LAST');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching supplier scorecards:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get top performing suppliers
  async getTopSuppliers(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_top_suppliers');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching top suppliers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get underperforming suppliers
  async getUnderperformingSuppliers(req, res) {
    try {
      const result = await db.query('SELECT * FROM v_underperforming_suppliers');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching underperforming suppliers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get supplier performance metrics
  async getSupplierMetrics(req, res) {
    try {
      const { supplier_id } = req.params;
      const result = await db.query(`
        SELECT * FROM supplier_performance_metrics
        WHERE supplier_id = $1
        ORDER BY period_start DESC
        LIMIT 12
      `, [supplier_id]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching supplier metrics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Record delivery performance
  async recordDeliveryPerformance(req, res) {
    try {
      const {
        supplier_id,
        purchase_order_id,
        order_date,
        expected_delivery_date,
        actual_delivery_date,
        delivery_status,
        delivery_notes,
        recorded_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO delivery_performance (
          supplier_id, purchase_order_id, order_date, expected_delivery_date,
          actual_delivery_date, delivery_status, delivery_notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        supplier_id, purchase_order_id, order_date, expected_delivery_date,
        actual_delivery_date, delivery_status || 'on_time', delivery_notes, recorded_by
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error recording delivery performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Record seed germination
  async recordGermination(req, res) {
    try {
      const {
        supplier_id,
        item_id,
        batch_id,
        seed_variety,
        supplier_batch_number,
        seeds_ordered,
        seeds_sown,
        seeds_germinated,
        order_date,
        sow_date,
        germination_test_date,
        germination_quality,
        notes,
        recorded_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO seed_germination_tracking (
          supplier_id, item_id, batch_id, seed_variety, supplier_batch_number,
          seeds_ordered, seeds_sown, seeds_germinated, order_date, sow_date,
          germination_test_date, germination_quality, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        supplier_id, item_id, batch_id || null, seed_variety, supplier_batch_number,
        seeds_ordered, seeds_sown, seeds_germinated, order_date, sow_date,
        germination_test_date, germination_quality, notes, recorded_by
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error recording germination:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get germination history for supplier
  async getGerminationHistory(req, res) {
    try {
      const { supplier_id } = req.params;
      const result = await db.query(`
        SELECT 
          sgt.*,
          ii.item_name,
          b.batch_code
        FROM seed_germination_tracking sgt
        LEFT JOIN inventory_items ii ON sgt.item_id = ii.id
        LEFT JOIN batches b ON sgt.batch_id = b.id
        WHERE sgt.supplier_id = $1
        ORDER BY sgt.sow_date DESC
      `, [supplier_id]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching germination history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create supplier rating
  async createSupplierRating(req, res) {
    try {
      const {
        supplier_id,
        rating_type,
        reference_id,
        quality_rating,
        delivery_rating,
        price_rating,
        communication_rating,
        review_text,
        reviewer_name,
        would_recommend,
        rated_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO supplier_ratings (
          supplier_id, rating_type, reference_id, quality_rating, delivery_rating,
          price_rating, communication_rating, review_text, reviewer_name,
          would_recommend, rated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        supplier_id, rating_type, reference_id || null, quality_rating, delivery_rating,
        price_rating, communication_rating, review_text, reviewer_name,
        would_recommend, rated_by
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating supplier rating:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get supplier ratings
  async getSupplierRatings(req, res) {
    try {
      const { supplier_id } = req.params;
      const result = await db.query(`
        SELECT sr.*, u.full_name as rater_name
        FROM supplier_ratings sr
        LEFT JOIN users u ON sr.rated_by = u.id
        WHERE sr.supplier_id = $1
        ORDER BY sr.rated_at DESC
      `, [supplier_id]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching supplier ratings:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update monthly performance metrics (to be run via cron/scheduled job)
  async updateMonthlyMetrics(req, res) {
    try {
      const { supplier_id, period_start, period_end } = req.body;

      // Calculate metrics for the period
      const deliveryStats = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN is_on_time = TRUE THEN 1 ELSE 0 END) as on_time_deliveries,
          SUM(CASE WHEN is_on_time = FALSE THEN 1 ELSE 0 END) as late_deliveries,
          AVG(CASE WHEN delay_days > 0 THEN delay_days ELSE 0 END) as average_delay_days
        FROM delivery_performance
        WHERE supplier_id = $1 
          AND order_date BETWEEN $2 AND $3
      `, [supplier_id, period_start, period_end]);

      const germinationStats = await db.query(`
        SELECT 
          COUNT(*) as total_seed_batches,
          SUM(seeds_ordered) as total_seeds_ordered,
          SUM(seeds_germinated) as total_seeds_germinated
        FROM seed_germination_tracking
        WHERE supplier_id = $1 
          AND sow_date BETWEEN $2 AND $3
      `, [supplier_id, period_start, period_end]);

      const deliveryData = deliveryStats.rows[0];
      const germinationData = germinationStats.rows[0];

      // Calculate scores (0-100)
      const deliveryScore = deliveryData.total_orders > 0 
        ? (deliveryData.on_time_deliveries / deliveryData.total_orders) * 100 
        : 0;

      const qualityScore = germinationData.total_seeds_ordered > 0
        ? (germinationData.total_seeds_germinated / germinationData.total_seeds_ordered) * 100
        : 0;

      // Insert or update metrics
      const result = await db.query(`
        INSERT INTO supplier_performance_metrics (
          supplier_id, metric_period, period_start, period_end,
          total_orders, on_time_deliveries, late_deliveries, average_delay_days,
          total_seed_batches, total_seeds_ordered, total_seeds_germinated,
          quality_score, delivery_score
        ) VALUES ($1, 'monthly', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (supplier_id, period_start, period_end) 
        DO UPDATE SET
          total_orders = EXCLUDED.total_orders,
          on_time_deliveries = EXCLUDED.on_time_deliveries,
          late_deliveries = EXCLUDED.late_deliveries,
          average_delay_days = EXCLUDED.average_delay_days,
          total_seed_batches = EXCLUDED.total_seed_batches,
          total_seeds_ordered = EXCLUDED.total_seeds_ordered,
          total_seeds_germinated = EXCLUDED.total_seeds_germinated,
          quality_score = EXCLUDED.quality_score,
          delivery_score = EXCLUDED.delivery_score,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        supplier_id, period_start, period_end,
        deliveryData.total_orders, deliveryData.on_time_deliveries,
        deliveryData.late_deliveries, deliveryData.average_delay_days || 0,
        germinationData.total_seed_batches, germinationData.total_seeds_ordered,
        germinationData.total_seeds_germinated, qualityScore, deliveryScore
      ]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error updating monthly metrics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SupplierPerformanceController();
