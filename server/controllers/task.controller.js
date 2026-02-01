const db = require('../config/database');

class TaskController {
  async getTasks(req, res) {
    try {
      const { assigned_to, status, batch_id, limit = 100 } = req.query;
      
      let query = `
        SELECT t.*, u.full_name as worker_name, b.batch_code, ps.section_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN batches b ON t.batch_id = b.id
        LEFT JOIN polyhouse_sections ps ON t.polyhouse_section_id = ps.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (assigned_to) {
        query += ` AND t.assigned_to = $${paramCount}`;
        params.push(assigned_to);
        paramCount++;
      }
      
      if (status) {
        query += ` AND t.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (batch_id) {
        query += ` AND t.batch_id = $${paramCount}`;
        params.push(batch_id);
        paramCount++;
      }
      
      query += ` ORDER BY t.scheduled_date DESC, t.scheduled_time DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPendingTasks(req, res) {
    try {
      const result = await db.query(`
        SELECT t.*, u.full_name as worker_name, b.batch_code, ps.section_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN batches b ON t.batch_id = b.id
        LEFT JOIN polyhouse_sections ps ON t.polyhouse_section_id = ps.id
        WHERE t.status IN ('pending', 'in-progress')
        AND t.scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY t.scheduled_date, t.scheduled_time
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createTask(req, res) {
    try {
      const {
        task_name, task_type, assigned_to, batch_id, polyhouse_section_id,
        scheduled_date, scheduled_time, notes, created_by
      } = req.body;

      const result = await db.query(`
        INSERT INTO tasks (
          task_name, task_type, assigned_to, batch_id, polyhouse_section_id,
          scheduled_date, scheduled_time, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        task_name, task_type, assigned_to || null, batch_id || null,
        polyhouse_section_id || null, scheduled_date, scheduled_time || null,
        notes || null, created_by
      ]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async completeTask(req, res) {
    try {
      const { id } = req.params;
      const { actual_start_time, actual_end_time, notes } = req.body;

      // Calculate duration
      const start = new Date(actual_start_time);
      const end = new Date(actual_end_time);
      const duration_minutes = Math.round((end - start) / (1000 * 60));

      const result = await db.query(`
        UPDATE tasks
        SET status = 'completed',
            actual_start_time = $1,
            actual_end_time = $2,
            duration_minutes = $3,
            notes = COALESCE($4, notes)
        WHERE id = $5
        RETURNING *
      `, [actual_start_time, actual_end_time, duration_minutes, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLaborEntries(req, res) {
    try {
      const { worker_id, batch_id, start_date, end_date, limit = 100 } = req.query;
      
      let query = `
        SELECT le.*, u.full_name as worker_name, t.task_name, b.batch_code
        FROM labor_entries le
        JOIN users u ON le.worker_id = u.id
        LEFT JOIN tasks t ON le.task_id = t.id
        LEFT JOIN batches b ON le.batch_id = b.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;
      
      if (worker_id) {
        query += ` AND le.worker_id = $${paramCount}`;
        params.push(worker_id);
        paramCount++;
      }
      
      if (batch_id) {
        query += ` AND le.batch_id = $${paramCount}`;
        params.push(batch_id);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND le.work_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND le.work_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY le.work_date DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error fetching labor entries:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createLaborEntry(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        worker_id, task_id, batch_id, work_date, start_time, end_time,
        hourly_rate, notes
      } = req.body;

      // Calculate hours
      const start = new Date(`2000-01-01 ${start_time}`);
      const end = new Date(`2000-01-01 ${end_time}`);
      const hours_worked = (end - start) / (1000 * 60 * 60);
      const total_cost = hours_worked * hourly_rate;

      // Create labor entry
      const result = await client.query(`
        INSERT INTO labor_entries (
          worker_id, task_id, batch_id, work_date, start_time, end_time,
          hours_worked, hourly_rate, total_cost, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        worker_id, task_id || null, batch_id || null, work_date, start_time, end_time,
        hours_worked, hourly_rate, total_cost, notes || null
      ]);

      // Update batch labor cost if batch is specified
      if (batch_id) {
        await client.query(`
          UPDATE batches
          SET labor_cost = labor_cost + $1
          WHERE id = $2
        `, [total_cost, batch_id]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: result.rows[0] });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating labor entry:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new TaskController();
