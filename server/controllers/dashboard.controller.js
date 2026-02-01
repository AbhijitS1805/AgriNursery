const db = require('../config/database');

class DashboardController {
  async getDashboardStats(req, res) {
    try {
      // Get multiple statistics in parallel
      const [
        activeBatchesResult,
        totalPlantsResult,
        lowStockResult,
        pendingTasksResult,
        revenueResult,
        polyhouseUtilResult
      ] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM batches WHERE status = $1', ['active']),
        db.query('SELECT SUM(current_quantity) as total FROM batches WHERE status = $1', ['active']),
        db.query('SELECT COUNT(*) as count FROM v_low_stock_items'),
        db.query('SELECT COUNT(*) as count FROM tasks WHERE status IN ($1, $2)', ['pending', 'in-progress']),
        db.query(`
          SELECT SUM(grand_total) as total, SUM(paid_amount) as paid
          FROM invoices 
          WHERE invoice_type = 'sales' 
          AND invoice_date >= CURRENT_DATE - INTERVAL '30 days'
        `),
        db.query('SELECT AVG(utilization_percentage) as avg_util FROM v_polyhouse_utilization')
      ]);

      const stats = {
        active_batches: parseInt(activeBatchesResult.rows[0].count) || 0,
        total_plants: parseInt(totalPlantsResult.rows[0].total) || 0,
        low_stock_items: parseInt(lowStockResult.rows[0].count) || 0,
        pending_tasks: parseInt(pendingTasksResult.rows[0].count) || 0,
        monthly_revenue: parseFloat(revenueResult.rows[0].total) || 0,
        monthly_collected: parseFloat(revenueResult.rows[0].paid) || 0,
        avg_polyhouse_utilization: parseFloat(polyhouseUtilResult.rows[0].avg_util) || 0
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAlerts(req, res) {
    try {
      const alerts = [];

      // Low stock alerts
      const lowStockResult = await db.query('SELECT * FROM v_low_stock_items LIMIT 10');
      lowStockResult.rows.forEach(item => {
        alerts.push({
          type: 'low_stock',
          severity: 'warning',
          message: `Low stock: ${item.item_name} (${item.current_stock} ${item.unit_of_measure})`,
          data: item
        });
      });

      // Expired inventory
      const expiredResult = await db.query('SELECT * FROM v_expired_inventory LIMIT 10');
      expiredResult.rows.forEach(item => {
        alerts.push({
          type: 'expired_item',
          severity: 'danger',
          message: `Expired: ${item.item_name} - Batch ${item.batch_number}`,
          data: item
        });
      });

      // Overdue tasks
      const overdueTasksResult = await db.query(`
        SELECT t.*, b.batch_code
        FROM tasks t
        LEFT JOIN batches b ON t.batch_id = b.id
        WHERE t.status IN ('pending', 'in-progress')
        AND t.scheduled_date < CURRENT_DATE
        LIMIT 10
      `);
      overdueTasksResult.rows.forEach(task => {
        alerts.push({
          type: 'overdue_task',
          severity: 'warning',
          message: `Overdue task: ${task.task_name} scheduled for ${task.scheduled_date}`,
          data: task
        });
      });

      // Batches ready for next stage
      const readyBatchesResult = await db.query(`
        SELECT b.*, pv.common_name
        FROM batches b
        JOIN plant_varieties pv ON b.plant_variety_id = pv.id
        WHERE b.expected_ready_date <= CURRENT_DATE
        AND b.status = 'active'
        AND b.current_stage_id != (SELECT id FROM growth_stages WHERE stage_name = 'Sold')
        LIMIT 10
      `);
      readyBatchesResult.rows.forEach(batch => {
        alerts.push({
          type: 'batch_ready',
          severity: 'info',
          message: `Batch ${batch.batch_code} (${batch.common_name}) is ready for next stage`,
          data: batch
        });
      });

      // Sort by severity
      const severityOrder = { danger: 1, warning: 2, info: 3 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new DashboardController();
