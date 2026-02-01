const pool = require('../config/database');

// Get all expenses
exports.getAllExpenses = async (req, res) => {
    try {
        const { category_id, status, from_date, to_date } = req.query;
        
        let query = `
            SELECT e.*, ec.category_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        
        if (category_id) {
            query += ` AND e.category_id = $${paramCount++}`;
            params.push(category_id);
        }
        
        if (status) {
            query += ` AND e.payment_status = $${paramCount++}`;
            params.push(status);
        }
        
        if (from_date) {
            query += ` AND e.expense_date >= $${paramCount++}`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND e.expense_date <= $${paramCount++}`;
            params.push(to_date);
        }
        
        query += ' ORDER BY e.expense_date DESC, e.id DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get expense header
        const expenseQuery = `
            SELECT e.*, ec.category_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.id = $1
        `;
        const expenseResult = await pool.query(expenseQuery, [id]);
        
        if (expenseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        // Get breakup items
        const breakupQuery = `
            SELECT eb.*, ec.category_name
            FROM expense_breakup eb
            LEFT JOIN expense_categories ec ON eb.category_id = ec.id
            WHERE eb.expense_id = $1
        `;
        const breakupResult = await pool.query(breakupQuery, [id]);
        
        const expense = expenseResult.rows[0];
        expense.items = breakupResult.rows;
        
        res.json(expense);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Failed to fetch expense' });
    }
};

// Create expense
exports.createExpense = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            expense_date,
            category_id,
            expense_name,
            vendor_id,
            vendor_name,
            base_amount,
            tax_amount,
            total_amount,
            payment_mode,
            payment_status,
            paid_amount,
            bank_account_id,
            cheque_number,
            bill_number,
            bill_date,
            narration,
            items
        } = req.body;
        
        // Insert expense header
        const expenseQuery = `
            INSERT INTO expenses (
                expense_date, category_id, expense_name, vendor_id, vendor_name,
                base_amount, tax_amount, total_amount, payment_mode, payment_status,
                paid_amount, pending_amount, bank_account_id, cheque_number,
                bill_number, bill_date, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;
        
        const pending_amount = total_amount - (paid_amount || 0);
        
        const expenseValues = [
            expense_date || new Date(),
            category_id,
            expense_name,
            vendor_id,
            vendor_name,
            base_amount,
            tax_amount || 0,
            total_amount,
            payment_mode,
            payment_status || 'Pending',
            paid_amount || 0,
            pending_amount,
            bank_account_id,
            cheque_number,
            bill_number,
            bill_date,
            narration
        ];
        
        const expenseResult = await client.query(expenseQuery, expenseValues);
        const expense = expenseResult.rows[0];
        
        // Insert expense breakup items if provided
        if (items && items.length > 0) {
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO expense_breakup (
                        expense_id, description, category_id, quantity,
                        unit_price, amount, tax_rate, tax_amount, total_amount
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `;
                
                await client.query(itemQuery, [
                    expense.id,
                    item.description,
                    item.category_id,
                    item.quantity || 1,
                    item.unit_price,
                    item.amount,
                    item.tax_rate || 0,
                    item.tax_amount || 0,
                    item.total_amount
                ]);
            }
        }
        
        await client.query('COMMIT');
        res.status(201).json(expense);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    } finally {
        client.release();
    }
};

// Update expense
exports.updateExpense = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const {
            expense_date,
            category_id,
            expense_name,
            vendor_name,
            base_amount,
            tax_amount,
            total_amount,
            payment_mode,
            payment_status,
            paid_amount,
            remarks
        } = req.body;
        
        const pending_amount = total_amount - (paid_amount || 0);
        
        const query = `
            UPDATE expenses
            SET expense_date = $1, category_id = $2, expense_name = $3,
                vendor_name = $4, base_amount = $5, tax_amount = $6,
                total_amount = $7, payment_mode = $8, payment_status = $9,
                paid_amount = $10, pending_amount = $11, remarks = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *
        `;
        
        const values = [
            expense_date,
            category_id,
            expense_name,
            vendor_name,
            base_amount,
            tax_amount,
            total_amount,
            payment_mode,
            payment_status,
            paid_amount,
            pending_amount,
            remarks,
            id
        ];
        
        const result = await client.query(query, values);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    } finally {
        client.release();
    }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        // Delete breakup items first (cascade should handle this)
        const result = await client.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    } finally {
        client.release();
    }
};

// Get expense categories
exports.getExpenseCategories = async (req, res) => {
    try {
        const query = 'SELECT * FROM expense_categories WHERE is_active = true ORDER BY category_name';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ error: 'Failed to fetch expense categories' });
    }
};

// Get expense summary
exports.getExpenseSummary = async (req, res) => {
    try {
        const { from_date, to_date } = req.query;
        
        let query = 'SELECT * FROM v_expense_summary WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (from_date) {
            query += ` AND month >= $${paramCount++}::date`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND month <= $${paramCount++}::date`;
            params.push(to_date);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
};

// Approve expense
exports.approveExpense = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { approved_by, comments } = req.body;
        
        // Update expense approval status
        const expenseQuery = `
            UPDATE expenses
            SET approval_status = 'Approved', approved_by = $1, approved_date = CURRENT_DATE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await client.query(expenseQuery, [approved_by, id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        // Add approval record
        const approvalQuery = `
            INSERT INTO expense_approvals (expense_id, approver_id, status, approval_date, comments)
            VALUES ($1, $2, 'Approved', CURRENT_TIMESTAMP, $3)
        `;
        
        await client.query(approvalQuery, [id, approved_by, comments]);
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving expense:', error);
        res.status(500).json({ error: 'Failed to approve expense' });
    } finally {
        client.release();
    }
};

// Get budget utilization
exports.getBudgetUtilization = async (req, res) => {
    try {
        const { financial_year } = req.query;
        
        let query = 'SELECT * FROM v_budget_utilization WHERE 1=1';
        const params = [];
        
        if (financial_year) {
            query += ' AND financial_year = $1';
            params.push(financial_year);
        }
        
        query += ' ORDER BY variance_percentage DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching budget utilization:', error);
        res.status(500).json({ error: 'Failed to fetch budget utilization' });
    }
};
