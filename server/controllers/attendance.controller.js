const db = require('../config/database');

const attendanceController = {
  // Get attendance records
  async getAttendance(req, res) {
    try {
      const { employee_id, start_date, end_date, status, month, year } = req.query;
      
      let query = `
        SELECT 
          ea.*,
          e.employee_code,
          e.full_name,
          d.department_name
        FROM employee_attendance ea
        JOIN employees e ON ea.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (employee_id) {
        query += ` AND ea.employee_id = $${paramCount}`;
        params.push(employee_id);
        paramCount++;
      }
      
      if (start_date) {
        query += ` AND ea.attendance_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }
      
      if (end_date) {
        query += ` AND ea.attendance_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }
      
      if (status) {
        query += ` AND ea.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      if (month && year) {
        query += ` AND EXTRACT(MONTH FROM ea.attendance_date) = $${paramCount}`;
        params.push(month);
        paramCount++;
        query += ` AND EXTRACT(YEAR FROM ea.attendance_date) = $${paramCount}`;
        params.push(year);
        paramCount++;
      }
      
      query += ` ORDER BY ea.attendance_date DESC, e.employee_code`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
  },

  // Mark attendance
  async markAttendance(req, res) {
    try {
      const {
        employee_id,
        attendance_date,
        check_in_time,
        check_out_time,
        status,
        remarks
      } = req.body;
      
      if (!employee_id || !attendance_date) {
        return res.status(400).json({ message: 'employee_id and attendance_date are required' });
      }
      
      const query = `
        INSERT INTO employee_attendance (
          employee_id, attendance_date, check_in_time, check_out_time, status, remarks
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks,
          updated_at = NOW()
        RETURNING *
      `;
      
      const result = await db.query(query, [
        employee_id,
        attendance_date,
        check_in_time || null,
        check_out_time || null,
        status || 'Present',
        remarks || null
      ]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error marking attendance:', error);
      res.status(500).json({ message: 'Error marking attendance', error: error.message });
    }
  },

  // Bulk mark attendance
  async bulkMarkAttendance(req, res) {
    let client;
    
    try {
      client = await db.pool.connect();
      await client.query('BEGIN');
      
      const { attendance_records } = req.body;
      
      if (!attendance_records || !Array.isArray(attendance_records) || attendance_records.length === 0) {
        return res.status(400).json({ message: 'attendance_records array is required' });
      }
      
      const results = [];
      
      for (const record of attendance_records) {
        const query = `
          INSERT INTO employee_attendance (
            employee_id, attendance_date, check_in_time, check_out_time, status, remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (employee_id, attendance_date) 
          DO UPDATE SET
            check_in_time = EXCLUDED.check_in_time,
            check_out_time = EXCLUDED.check_out_time,
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            updated_at = NOW()
          RETURNING *
        `;
        
        const result = await client.query(query, [
          record.employee_id,
          record.attendance_date,
          record.check_in_time || null,
          record.check_out_time || null,
          record.status || 'Present',
          record.remarks || null
        ]);
        
        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      res.status(201).json(results);
      
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Error bulk marking attendance:', error);
      res.status(500).json({ message: 'Error bulk marking attendance', error: error.message });
    } finally {
      if (client) client.release();
    }
  },

  // Get attendance summary
  async getAttendanceSummary(req, res) {
    try {
      const { employee_id, month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ message: 'month and year are required' });
      }
      
      let query = `
        SELECT * FROM v_attendance_summary
        WHERE month = $1 AND year = $2
      `;
      
      const params = [month, year];
      
      if (employee_id) {
        query += ' AND employee_id = $3';
        params.push(employee_id);
      }
      
      query += ' ORDER BY employee_code';
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      res.status(500).json({ message: 'Error fetching attendance summary', error: error.message });
    }
  },

  // Get today's attendance
  async getTodayAttendance(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT 
          e.id as employee_id,
          e.employee_code,
          e.full_name,
          d.department_name,
          TO_CHAR(ea.attendance_date, 'YYYY-MM-DD') as attendance_date,
          ea.check_in_time,
          ea.check_out_time,
          ea.status,
          ea.total_hours
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_attendance ea ON e.id = ea.employee_id AND ea.attendance_date = $1
        WHERE e.status = 'Active'
        ORDER BY e.employee_code
      `;
      
      const result = await db.query(query, [targetDate]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      res.status(500).json({ message: 'Error fetching today attendance', error: error.message });
    }
  },

  // Get attendance stats
  async getAttendanceStats(req, res) {
    try {
      const { month, year } = req.query;
      
      let dateFilter = 'CURRENT_DATE';
      const params = [];
      
      if (month && year) {
        dateFilter = `DATE_TRUNC('month', TO_DATE($1 || '-' || $2 || '-01', 'YYYY-MM-DD'))`;
        params.push(year, month);
      }
      
      const query = `
        SELECT 
          COUNT(DISTINCT employee_id) as total_employees,
          COUNT(*) FILTER (WHERE status = 'Present') as present_count,
          COUNT(*) FILTER (WHERE status = 'Absent') as absent_count,
          COUNT(*) FILTER (WHERE status = 'Half Day') as half_day_count,
          COUNT(*) FILTER (WHERE status = 'On Leave') as on_leave_count,
          COUNT(*) FILTER (WHERE status = 'Late') as late_count,
          ROUND(AVG(total_hours), 2) as avg_hours
        FROM employee_attendance
        WHERE ${month && year ? `EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $1` : `attendance_date = CURRENT_DATE`}
      `;
      
      const result = await db.query(query, params);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      res.status(500).json({ message: 'Error fetching attendance stats', error: error.message });
    }
  }
};

module.exports = attendanceController;
