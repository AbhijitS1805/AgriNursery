const db = require('../config/database');
const pool = db.pool;

// =====================================================
// VOUCHER MANAGEMENT
// =====================================================

// Get all vouchers with filters
exports.getAllVouchers = async (req, res) => {
    try {
        const { 
            voucher_type, 
            from_date, 
            to_date, 
            party_ledger_id, 
            status = 'Posted',
            financial_year,
            page = 1,
            limit = 50
        } = req.query;

        let query = `
            SELECT 
                v.id,
                v.voucher_number,
                v.voucher_date,
                vt.type_name as voucher_type,
                vt.abbreviation,
                v.reference_number,
                v.reference_date,
                pl.ledger_name as party_name,
                v.narration,
                v.total_amount,
                v.status,
                v.financial_year,
                v.created_at
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.id
            LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (voucher_type) {
            query += ` AND vt.type_code = $${paramCount++}`;
            params.push(voucher_type);
        }

        if (from_date) {
            query += ` AND v.voucher_date >= $${paramCount++}`;
            params.push(from_date);
        }

        if (to_date) {
            query += ` AND v.voucher_date <= $${paramCount++}`;
            params.push(to_date);
        }

        if (party_ledger_id) {
            query += ` AND v.party_ledger_id = $${paramCount++}`;
            params.push(party_ledger_id);
        }

        if (status) {
            query += ` AND v.status = $${paramCount++}`;
            params.push(status);
        }

        if (financial_year) {
            query += ` AND v.financial_year = $${paramCount++}`;
            params.push(financial_year);
        }

        query += ` ORDER BY v.voucher_date DESC, v.id DESC`;
        query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, (page - 1) * limit);

        const result = await pool.query(query, params);

        res.json({
            vouchers: result.rows,
            total: result.rows.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Get vouchers error:', error);
        res.status(500).json({ error: 'Failed to fetch vouchers' });
    }
};

// Get voucher by ID with journal entries
exports.getVoucherById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get voucher header
        const voucherQuery = `
            SELECT 
                v.*,
                vt.type_name,
                vt.type_code,
                vt.abbreviation,
                pl.ledger_name as party_name,
                u.full_name as created_by_name
            FROM vouchers v
            JOIN voucher_types vt ON v.voucher_type_id = vt.id
            LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
            LEFT JOIN users u ON v.created_by = u.id
            WHERE v.id = $1
        `;

        const voucherResult = await pool.query(voucherQuery, [id]);

        if (voucherResult.rows.length === 0) {
            return res.status(404).json({ error: 'Voucher not found' });
        }

        // Get journal entries
        const entriesQuery = `
            SELECT 
                je.*,
                l.ledger_name,
                l.ledger_code,
                ag.group_name,
                cc.center_name as cost_center_name
            FROM journal_entries je
            JOIN ledgers l ON je.ledger_id = l.id
            JOIN account_groups ag ON l.account_group_id = ag.id
            LEFT JOIN cost_centers cc ON je.cost_center_id = cc.id
            WHERE je.voucher_id = $1
            ORDER BY je.entry_number
        `;

        const entriesResult = await pool.query(entriesQuery, [id]);

        res.json({
            voucher: voucherResult.rows[0],
            entries: entriesResult.rows
        });
    } catch (error) {
        console.error('Get voucher error:', error);
        res.status(500).json({ error: 'Failed to fetch voucher' });
    }
};

// Create new voucher with journal entries
exports.createVoucher = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const {
            voucher_type_code,
            voucher_date,
            reference_number,
            reference_date,
            party_ledger_id,
            narration,
            financial_year = '2025-26',
            entries,
            source_type,
            source_id,
            created_by
        } = req.body;

        // Get voucher type
        const typeResult = await client.query(
            'SELECT * FROM voucher_types WHERE type_code = $1',
            [voucher_type_code]
        );

        if (typeResult.rows.length === 0) {
            throw new Error('Invalid voucher type');
        }

        const voucherType = typeResult.rows[0];

        // Generate voucher number
        const lastVoucherResult = await client.query(
            `SELECT voucher_number FROM vouchers 
             WHERE voucher_type_id = $1 AND financial_year = $2 
             ORDER BY id DESC LIMIT 1`,
            [voucherType.id, financial_year]
        );

        let voucherNumber;
        if (lastVoucherResult.rows.length > 0) {
            const lastNumber = parseInt(lastVoucherResult.rows[0].voucher_number.replace(/\D/g, ''));
            voucherNumber = `${voucherType.prefix}${lastNumber + 1}`;
        } else {
            voucherNumber = `${voucherType.prefix}${voucherType.starting_number}`;
        }

        // Calculate total amount
        const totalAmount = entries.reduce((sum, entry) => sum + (entry.debit_amount || entry.credit_amount || 0), 0);

        // Insert voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                reference_date, party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Posted', $12)
            RETURNING *`,
            [
                voucherType.id, voucherNumber, voucher_date, reference_number,
                reference_date, party_ledger_id, narration, source_type, source_id,
                financial_year, totalAmount, created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Insert journal entries
        let debitTotal = 0;
        let creditTotal = 0;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            
            await client.query(
                `INSERT INTO journal_entries (
                    voucher_id, entry_number, ledger_id, debit_amount, credit_amount,
                    narration, cost_center_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    voucher.id,
                    i + 1,
                    entry.ledger_id,
                    entry.debit_amount || 0,
                    entry.credit_amount || 0,
                    entry.narration || narration,
                    entry.cost_center_id
                ]
            );

            debitTotal += parseFloat(entry.debit_amount || 0);
            creditTotal += parseFloat(entry.credit_amount || 0);
        }

        // Validate balance
        if (Math.abs(debitTotal - creditTotal) > 0.01) {
            throw new Error(`Journal entries not balanced: Debit=${debitTotal}, Credit=${creditTotal}`);
        }

        await client.query('COMMIT');

        // Fetch complete voucher with entries
        const completeVoucher = await pool.query(
            `SELECT v.*, vt.type_name, vt.abbreviation
             FROM vouchers v
             JOIN voucher_types vt ON v.voucher_type_id = vt.id
             WHERE v.id = $1`,
            [voucher.id]
        );

        res.status(201).json({
            message: 'Voucher created successfully',
            voucher: completeVoucher.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create voucher error:', error);
        res.status(500).json({ error: error.message || 'Failed to create voucher' });
    } finally {
        client.release();
    }
};

// Cancel/Delete voucher
exports.cancelVoucher = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { cancellation_reason, cancelled_by } = req.body;

        // Update voucher status
        await client.query(
            `UPDATE vouchers 
             SET status = 'Cancelled', 
                 cancelled_at = CURRENT_TIMESTAMP,
                 cancelled_by = $1,
                 cancellation_reason = $2
             WHERE id = $3`,
            [cancelled_by, cancellation_reason, id]
        );

        await client.query('COMMIT');

        res.json({ message: 'Voucher cancelled successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel voucher error:', error);
        res.status(500).json({ error: 'Failed to cancel voucher' });
    } finally {
        client.release();
    }
};

// =====================================================
// LEDGER MANAGEMENT
// =====================================================

// Get all ledgers
exports.getAllLedgers = async (req, res) => {
    try {
        const { account_group_id, search, is_active = true } = req.query;

        let query = `
            SELECT 
                l.*,
                ag.group_name,
                ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.account_group_id = ag.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (account_group_id) {
            query += ` AND l.account_group_id = $${paramCount++}`;
            params.push(account_group_id);
        }

        if (search) {
            query += ` AND (l.ledger_name ILIKE $${paramCount} OR l.ledger_code ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (is_active !== undefined) {
            query += ` AND l.is_active = $${paramCount++}`;
            params.push(is_active);
        }

        query += ` ORDER BY l.ledger_name`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get ledgers error:', error);
        res.status(500).json({ error: 'Failed to fetch ledgers' });
    }
};

// Create ledger
exports.createLedger = async (req, res) => {
    try {
        const {
            ledger_code,
            ledger_name,
            account_group_id,
            alias,
            opening_balance = 0,
            opening_balance_type,
            opening_date,
            contact_person,
            mobile,
            email,
            address,
            gstin,
            pan,
            credit_limit,
            credit_days,
            notes,
            created_by
        } = req.body;

        const result = await pool.query(
            `INSERT INTO ledgers (
                ledger_code, ledger_name, account_group_id, alias,
                opening_balance, opening_balance_type, opening_date,
                contact_person, mobile, email, address, gstin, pan,
                credit_limit, credit_days, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
                ledger_code, ledger_name, account_group_id, alias,
                opening_balance, opening_balance_type, opening_date,
                contact_person, mobile, email, address, gstin, pan,
                credit_limit, credit_days, notes, created_by
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create ledger error:', error);
        res.status(500).json({ error: 'Failed to create ledger' });
    }
};

// Get ledger statement
exports.getLedgerStatement = async (req, res) => {
    try {
        const { id } = req.params;
        const { from_date, to_date, financial_year } = req.query;

        // Get ledger details with opening balance
        const ledgerQuery = `
            SELECT 
                l.*,
                ag.group_name,
                ag.nature
            FROM ledgers l
            JOIN account_groups ag ON l.account_group_id = ag.id
            WHERE l.id = $1
        `;

        const ledgerResult = await pool.query(ledgerQuery, [id]);

        if (ledgerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ledger not found' });
        }

        const ledger = ledgerResult.rows[0];

        // Get transactions
        let transQuery = `
            SELECT * FROM v_ledger_statement
            WHERE ledger_id = $1
        `;

        const params = [id];
        let paramCount = 2;

        if (from_date) {
            transQuery += ` AND transaction_date >= $${paramCount++}`;
            params.push(from_date);
        }

        if (to_date) {
            transQuery += ` AND transaction_date <= $${paramCount++}`;
            params.push(to_date);
        }

        if (financial_year) {
            transQuery += ` AND financial_year = $${paramCount++}`;
            params.push(financial_year);
        }

        transQuery += ` ORDER BY transaction_date, voucher_id`;

        const transResult = await pool.query(transQuery, params);

        // Calculate running balance
        let runningBalance = ledger.opening_balance || 0;
        let balanceType = ledger.opening_balance_type || 'Debit';

        const transactions = transResult.rows.map(trans => {
            if (balanceType === 'Debit') {
                runningBalance = runningBalance + trans.debit_amount - trans.credit_amount;
            } else {
                runningBalance = runningBalance + trans.credit_amount - trans.debit_amount;
            }

            balanceType = runningBalance >= 0 ? 'Debit' : 'Credit';

            return {
                ...trans,
                balance: Math.abs(runningBalance),
                balance_type: balanceType
            };
        });

        res.json({
            ledger,
            opening_balance: ledger.opening_balance,
            opening_balance_type: ledger.opening_balance_type,
            transactions,
            closing_balance: Math.abs(runningBalance),
            closing_balance_type: balanceType
        });
    } catch (error) {
        console.error('Get ledger statement error:', error);
        res.status(500).json({ error: 'Failed to fetch ledger statement' });
    }
};

// =====================================================
// REPORTS
// =====================================================

// Get Trial Balance
exports.getTrialBalance = async (req, res) => {
    try {
        const { as_on_date, financial_year } = req.query;

        let query = `SELECT * FROM v_trial_balance`;
        const params = [];
        
        // TODO: Add date filtering if needed
        
        query += ` ORDER BY ledger_name`;

        const result = await pool.query(query, params);

        // Calculate totals
        const totals = result.rows.reduce((acc, row) => {
            const closingBalance = Math.abs(parseFloat(row.closing_balance || 0));
            if (row.closing_balance_type === 'Debit') {
                acc.totalDebit += closingBalance;
            } else {
                acc.totalCredit += closingBalance;
            }
            return acc;
        }, { totalDebit: 0, totalCredit: 0 });

        res.json({
            trial_balance: result.rows,
            totals
        });
    } catch (error) {
        console.error('Get trial balance error:', error);
        res.status(500).json({ error: 'Failed to fetch trial balance' });
    }
};

// Get Day Book
exports.getDayBook = async (req, res) => {
    try {
        const { from_date, to_date, voucher_type, financial_year } = req.query;

        let query = `SELECT * FROM v_day_book WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (from_date) {
            query += ` AND voucher_date >= $${paramCount++}`;
            params.push(from_date);
        }

        if (to_date) {
            query += ` AND voucher_date <= $${paramCount++}`;
            params.push(to_date);
        }

        if (voucher_type) {
            query += ` AND abbreviation = $${paramCount++}`;
            params.push(voucher_type);
        }

        if (financial_year) {
            query += ` AND financial_year = $${paramCount++}`;
            params.push(financial_year);
        }

        query += ` ORDER BY voucher_date DESC, voucher_id DESC`;

        const result = await pool.query(query, params);

        // Calculate total
        const total = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);

        res.json({
            entries: result.rows,
            total
        });
    } catch (error) {
        console.error('Get day book error:', error);
        res.status(500).json({ error: 'Failed to fetch day book' });
    }
};

// Get Cash/Bank Book
exports.getCashBankBook = async (req, res) => {
    try {
        const { ledger_id, from_date, to_date } = req.query;

        let query = `SELECT * FROM v_cash_bank_book WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (ledger_id) {
            query += ` AND ledger_id = $${paramCount++}`;
            params.push(ledger_id);
        }

        if (from_date) {
            query += ` AND transaction_date >= $${paramCount++}`;
            params.push(from_date);
        }

        if (to_date) {
            query += ` AND transaction_date <= $${paramCount++}`;
            params.push(to_date);
        }

        query += ` ORDER BY transaction_date DESC`;

        const result = await pool.query(query, params);

        // Calculate totals
        const totals = result.rows.reduce((acc, row) => {
            acc.totalReceipts += parseFloat(row.receipt || 0);
            acc.totalPayments += parseFloat(row.payment || 0);
            return acc;
        }, { totalReceipts: 0, totalPayments: 0 });

        res.json({
            entries: result.rows,
            totals
        });
    } catch (error) {
        console.error('Get cash/bank book error:', error);
        res.status(500).json({ error: 'Failed to fetch cash/bank book' });
    }
};

// Get Outstanding Receivables
exports.getOutstandingReceivables = async (req, res) => {
    try {
        const { party_ledger_id, ageing_bucket } = req.query;

        let query = `SELECT * FROM v_outstanding_receivables WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (party_ledger_id) {
            query += ` AND party_ledger_id = $${paramCount++}`;
            params.push(party_ledger_id);
        }

        if (ageing_bucket) {
            query += ` AND ageing_bucket = $${paramCount++}`;
            params.push(ageing_bucket);
        }

        query += ` ORDER BY overdue_days DESC`;

        const result = await pool.query(query, params);

        // Calculate total pending
        const totalPending = result.rows.reduce((sum, row) => sum + parseFloat(row.pending_amount || 0), 0);

        res.json({
            receivables: result.rows,
            total_pending: totalPending
        });
    } catch (error) {
        console.error('Get outstanding receivables error:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding receivables' });
    }
};

// Get Outstanding Payables
exports.getOutstandingPayables = async (req, res) => {
    try {
        const { party_ledger_id, ageing_bucket } = req.query;

        let query = `SELECT * FROM v_outstanding_payables WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (party_ledger_id) {
            query += ` AND party_ledger_id = $${paramCount++}`;
            params.push(party_ledger_id);
        }

        if (ageing_bucket) {
            query += ` AND ageing_bucket = $${paramCount++}`;
            params.push(ageing_bucket);
        }

        query += ` ORDER BY overdue_days DESC`;

        const result = await pool.query(query, params);

        // Calculate total pending
        const totalPending = result.rows.reduce((sum, row) => sum + parseFloat(row.pending_amount || 0), 0);

        res.json({
            payables: result.rows,
            total_pending: totalPending
        });
    } catch (error) {
        console.error('Get outstanding payables error:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding payables' });
    }
};

// =====================================================
// ACCOUNT GROUPS
// =====================================================

// Get all account groups
exports.getAllAccountGroups = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ag.*,
                COUNT(l.id) as ledger_count
            FROM account_groups ag
            LEFT JOIN ledgers l ON ag.id = l.account_group_id AND l.is_active = true
            WHERE ag.is_active = true
            GROUP BY ag.id
            ORDER BY ag.display_order
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get account groups error:', error);
        res.status(500).json({ error: 'Failed to fetch account groups' });
    }
};

// =====================================================
// VOUCHER TYPES
// =====================================================

// Get all voucher types
exports.getAllVoucherTypes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM voucher_types 
            WHERE is_active = true 
            ORDER BY type_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get voucher types error:', error);
        res.status(500).json({ error: 'Failed to fetch voucher types' });
    }
};

// =====================================================
// COST CENTERS
// =====================================================

// Get all cost centers
exports.getAllCostCenters = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM cost_centers 
            WHERE is_active = true 
            ORDER BY center_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get cost centers error:', error);
        res.status(500).json({ error: 'Failed to fetch cost centers' });
    }
};
