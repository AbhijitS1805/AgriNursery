const db = require('../config/database');

// Get all payment/receipt vouchers
exports.getAllPayments = async (req, res) => {
    try {
        const { type, status, from_date, to_date } = req.query;
        
        let query = 'SELECT * FROM payment_receipts WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (type) {
            query += ` AND payment_type = $${paramCount++}`;
            params.push(type);
        }
        
        if (status) {
            query += ` AND cheque_status = $${paramCount++}`;
            params.push(status);
        }
        
        if (from_date) {
            query += ` AND payment_date >= $${paramCount++}`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND payment_date <= $${paramCount++}`;
            params.push(to_date);
        }
        
        query += ' ORDER BY payment_date DESC, id DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get payment header
        const paymentQuery = 'SELECT * FROM payment_receipts WHERE id = $1';
        const paymentResult = await db.query(paymentQuery, [id]);
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Get allocations
        const allocationsQuery = `
            SELECT pa.*, s.invoice_number, s.invoice_date, s.total_amount as invoice_total
            FROM payment_allocations pa
            LEFT JOIN sales s ON pa.invoice_id = s.id AND pa.invoice_type = 'Sales'
            WHERE pa.payment_id = $1
        `;
        const allocationsResult = await db.query(allocationsQuery, [id]);
        
        const payment = paymentResult.rows[0];
        payment.allocations = allocationsResult.rows;
        
        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
};

// Create new payment/receipt
exports.createPayment = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            voucher_type,
            voucher_date,
            party_type,
            party_id,
            party_name,
            amount,
            payment_mode,
            bank_account_id,
            cheque_number,
            cheque_date,
            upi_ref,
            card_ref,
            narration,
            reference_type,
            reference_id,
            allocations
        } = req.body;
        
        // Insert payment header
        const paymentQuery = `
            INSERT INTO payment_receipts (
                voucher_type, voucher_date, party_type, party_id, party_name,
                amount, payment_mode, bank_account_id, cheque_number, cheque_date,
                upi_ref, card_ref, narration, reference_type, reference_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;
        
        const paymentValues = [
            voucher_type,
            voucher_date || new Date(),
            party_type,
            party_id,
            party_name,
            amount,
            payment_mode,
            bank_account_id,
            cheque_number,
            cheque_date,
            upi_ref,
            card_ref,
            narration,
            reference_type,
            reference_id,
            payment_mode === 'Cheque' ? 'Pending' : 'Cleared'
        ];
        
        const paymentResult = await client.query(paymentQuery, paymentValues);
        const payment = paymentResult.rows[0];
        
        // Insert allocations if provided
        if (allocations && allocations.length > 0) {
            for (const allocation of allocations) {
                const allocationQuery = `
                    INSERT INTO payment_allocations (
                        payment_id, invoice_type, invoice_id, allocated_amount
                    ) VALUES ($1, $2, $3, $4)
                `;
                
                await client.query(allocationQuery, [
                    payment.id,
                    allocation.invoice_type,
                    allocation.invoice_id,
                    allocation.allocated_amount
                ]);
            }
        }
        
        // If cheque payment, add to cheque register
        if (payment_mode === 'Cheque') {
            const chequeQuery = `
                INSERT INTO cheque_register (
                    payment_id, cheque_number, cheque_date, amount,
                    bank_account_id, party_name, status
                ) VALUES ($1, $2, $3, $4, $5, $6, 'Issued')
            `;
            
            await client.query(chequeQuery, [
                payment.id,
                cheque_number,
                cheque_date,
                amount,
                bank_account_id,
                party_name
            ]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(payment);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    } finally {
        client.release();
    }
};

// Update payment
exports.updatePayment = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const {
            voucher_date,
            party_name,
            amount,
            payment_mode,
            bank_account_id,
            cheque_number,
            cheque_date,
            narration,
            status
        } = req.body;
        
        const query = `
            UPDATE payment_receipts
            SET voucher_date = $1, party_name = $2, amount = $3,
                payment_mode = $4, bank_account_id = $5, cheque_number = $6,
                cheque_date = $7, narration = $8, status = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;
        
        const values = [
            voucher_date,
            party_name,
            amount,
            payment_mode,
            bank_account_id,
            cheque_number,
            cheque_date,
            narration,
            status,
            id
        ];
        
        const result = await client.query(query, values);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    } finally {
        client.release();
    }
};

// Delete payment
exports.deletePayment = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        // Delete allocations first
        await client.query('DELETE FROM payment_allocations WHERE payment_id = $1', [id]);
        
        // Delete from cheque register
        await client.query('DELETE FROM cheque_register WHERE payment_id = $1', [id]);
        
        // Delete payment
        const result = await client.query('DELETE FROM payment_receipts WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    } finally {
        client.release();
    }
};

// Get bank accounts
exports.getBankAccounts = async (req, res) => {
    try {
        const query = 'SELECT * FROM bank_accounts WHERE is_active = true ORDER BY account_name';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bank accounts:', error);
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
};

// Get outstanding invoices for a party
exports.getOutstandingInvoices = async (req, res) => {
    try {
        const { party_type, party_id } = req.query;
        
        const query = `
            SELECT * FROM outstanding_invoices
            WHERE party_type = $1 AND party_id = $2 AND outstanding_amount > 0
            ORDER BY invoice_date
        `;
        
        const result = await db.query(query, [party_type, party_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching outstanding invoices:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding invoices' });
    }
};

// Get payment summary
exports.getPaymentSummary = async (req, res) => {
    try {
        const { from_date, to_date } = req.query;
        
        let query = 'SELECT * FROM v_payment_summary WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (from_date) {
            query += ` AND payment_date >= $${paramCount++}`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND payment_date <= $${paramCount++}`;
            params.push(to_date);
        }
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payment summary:', error);
        res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
};

// Clear cheque (update status)
exports.clearCheque = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { clearance_date, status } = req.body;
        
        // Update cheque register
        const chequeQuery = `
            UPDATE cheque_register
            SET status = $1, clearance_date = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING payment_id
        `;
        
        const chequeResult = await client.query(chequeQuery, [status, clearance_date, id]);
        
        if (chequeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cheque not found' });
        }
        
        // Update payment status
        const paymentQuery = `
            UPDATE payment_receipts
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;
        
        await client.query(paymentQuery, [status, chequeResult.rows[0].payment_id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Cheque status updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error clearing cheque:', error);
        res.status(500).json({ error: 'Failed to clear cheque' });
    } finally {
        client.release();
    }
};
