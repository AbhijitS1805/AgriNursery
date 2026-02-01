const db = require('../config/database');

const leaveController = {
  // Get leave applications
  async getLeaveApplications(req, res) {
    try {
      const { employee_id, status, start_date, end_date } = req.query;
      
      let query = `
        SELECT 
          la.*,
          e.employee_code,
          e.full_name as employee_name,
          lt.leave_type_name,
          lt.leave_code,
          approver.full_name as approved_by_name
        FROM leave_applications la
        JOIN employees e ON la.employee_id = e.id
        JOIN leave_types lt ON la.leave_type_id = lt.id
        LEFT JOIN employees approver ON la.approved_by = approver.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (employee_id) {
        query += ` AND la.employee_id = $${paramCount}`;
        params.push(employee_id);
        paramCount++;
      }
      
      if (status) {
        query += ` AND la.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND la.from_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND la.to_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      query += ` ORDER BY la.applied_on DESC`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      res.status(500).json({ message: 'Error fetching leave applications', error: error.message });
    }
  },

  // Apply for leave
  async applyLeave(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      const {
        employee_id,
        leave_type_id,
        from_date,
        to_date,
        total_days,
        reason
      } = req.body;
      
      if (!employee_id || !leave_type_id || !from_date || !to_date || !total_days || !reason) {
        return res.status(400).json({ 
          message: 'employee_id, leave_type_id, from_date, to_date, total_days, and reason are required' 
        });
      }
      
      // Check leave balance
      const balanceQuery = `
        SELECT balance_days 
        FROM employee_leave_balance 
        WHERE employee_id = $1 
        AND leave_type_id = $2 
        AND year = EXTRACT(YEAR FROM $3::DATE)
      `;
      
      const balanceResult = await client.query(balanceQuery, [employee_id, leave_type_id, from_date]);
      
      if (balanceResult.rows.length === 0) {
        return res.status(400).json({ message: 'Leave balance not found for this year' });
      }
      
      const balance = parseFloat(balanceResult.rows[0].balance_days);
      
      if (balance < total_days) {
        return res.status(400).json({ 
          message: `Insufficient leave balance. Available: ${balance} days, Requested: ${total_days} days` 
        });
      }
      
      // Generate application number
      const appNumberResult = await client.query('SELECT generate_leave_application_number()');
      const application_number = appNumberResult.rows[0].generate_leave_application_number;
      
      // Insert leave application
      const insertQuery = `
        INSERT INTO leave_applications (
          application_number, employee_id, leave_type_id,
          from_date, to_date, total_days, reason, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        application_number,
        employee_id,
        leave_type_id,
        from_date,
        to_date,
        total_days,
        reason
      ]);
      
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error applying leave:', error);
      res.status(500).json({ message: 'Error applying leave', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Approve/Reject leave
  async updateLeaveStatus(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { status, approved_by, rejection_reason } = req.body;
      
      if (!status || !['Approved', 'Rejected', 'Cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Valid status (Approved/Rejected/Cancelled) is required' });
      }
      
      if (status === 'Approved' && !approved_by) {
        return res.status(400).json({ message: 'approved_by is required for approval' });
      }
      
      const query = `
        UPDATE leave_applications
        SET 
          status = $1,
          approved_by = $2,
          approved_on = ${status === 'Approved' ? 'NOW()' : 'NULL'},
          rejection_reason = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await client.query(query, [
        status,
        status === 'Approved' ? approved_by : null,
        status === 'Rejected' ? rejection_reason : null,
        id
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Leave application not found' });
      }
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error updating leave status:', error);
      res.status(500).json({ message: 'Error updating leave status', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Get leave balance
  async getLeaveBalance(req, res) {
    try {
      const { employee_id, year } = req.query;
      
      if (!employee_id) {
        return res.status(400).json({ message: 'employee_id is required' });
      }
      
      const leaveYear = year || new Date().getFullYear();
      
      const query = `
        SELECT * FROM v_leave_balance_summary
        WHERE employee_id = $1 AND year = $2
        ORDER BY leave_type_name
      `;
      
      const result = await db.query(query, [employee_id, leaveYear]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      res.status(500).json({ message: 'Error fetching leave balance', error: error.message });
    }
  },

  // Get leave types
  async getLeaveTypes(req, res) {
    try {
      const query = 'SELECT * FROM leave_types WHERE is_active = true ORDER BY leave_type_name';
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      res.status(500).json({ message: 'Error fetching leave types', error: error.message });
    }
  },

  // Get leave statistics
  async getLeaveStats(req, res) {
    try {
      const { month, year } = req.query;
      
      let query = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          SUM(total_days) FILTER (WHERE status = 'Approved') as total_approved_days
        FROM leave_applications
        WHERE 1=1
      `;
      
      const params = [];
      
      if (month && year) {
        query += ` AND EXTRACT(MONTH FROM from_date) = $1 AND EXTRACT(YEAR FROM from_date) = $2`;
        params.push(month, year);
      }
      
      const result = await db.query(query, params);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching leave stats:', error);
      res.status(500).json({ message: 'Error fetching leave stats', error: error.message });
    }
  }
};

module.exports = leaveController;
