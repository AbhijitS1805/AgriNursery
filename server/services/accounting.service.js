const db = require('../config/database');
const pool = db.pool;

/**
 * Accounting Integration Service
 * Automatically creates double-entry journal vouchers from business transactions
 */

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get ledger by code
async function getLedgerByCode(code) {
    const result = await pool.query(
        'SELECT * FROM ledgers WHERE ledger_code = $1 AND is_active = true',
        [code]
    );
    return result.rows[0];
}

// Get voucher type by code
async function getVoucherTypeByCode(code) {
    const result = await pool.query(
        'SELECT * FROM voucher_types WHERE type_code = $1 AND is_active = true',
        [code]
    );
    return result.rows[0];
}

// Generate voucher number
async function generateVoucherNumber(voucherTypeId, financialYear, client) {
    const lastVoucherResult = await client.query(
        `SELECT voucher_number FROM vouchers 
         WHERE voucher_type_id = $1 AND financial_year = $2 
         ORDER BY id DESC LIMIT 1`,
        [voucherTypeId, financialYear]
    );

    const typeResult = await client.query(
        'SELECT * FROM voucher_types WHERE id = $1',
        [voucherTypeId]
    );
    
    const voucherType = typeResult.rows[0];

    if (lastVoucherResult.rows.length > 0) {
        const lastNumber = parseInt(lastVoucherResult.rows[0].voucher_number.replace(/\D/g, ''));
        return `${voucherType.prefix}${lastNumber + 1}`;
    }
    
    return `${voucherType.prefix}${voucherType.starting_number}`;
}

// =====================================================
// SALES TRANSACTION
// =====================================================

/**
 * Create accounting entry for a sale
 * Debit: Customer (Sundry Debtors)
 * Credit: Sales Account, CGST Output, SGST Output
 */
async function createSaleVoucher(saleData, client = null) {
    const shouldCommit = !client;
    if (!client) {
        client = await pool.connect();
        await client.query('BEGIN');
    }

    try {
        const {
            invoice_id,
            invoice_number,
            invoice_date,
            customer_name,
            customer_ledger_id,
            gross_amount,
            cgst_amount = 0,
            sgst_amount = 0,
            igst_amount = 0,
            net_amount,
            created_by,
            financial_year = '2025-26'
        } = saleData;

        // Get ledgers
        const salesLedger = await getLedgerByCode('SALES001');
        const cgstLedger = await getLedgerByCode('CGST_OUT');
        const sgstLedger = await getLedgerByCode('SGST_OUT');
        const igstLedger = await getLedgerByCode('IGST_OUT');
        
        // Get voucher type
        const voucherType = await getVoucherTypeByCode('SALES');
        
        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(voucherType.id, financial_year, client);

        // Create voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'sale', $7, $8, $9, 'Posted', $10)
            RETURNING *`,
            [
                voucherType.id,
                voucherNumber,
                invoice_date,
                invoice_number,
                customer_ledger_id,
                `Sale to ${customer_name} - Invoice ${invoice_number}`,
                invoice_id,
                financial_year,
                net_amount,
                created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Create journal entries
        const entries = [];

        // Debit: Customer Account
        entries.push({
            voucher_id: voucher.id,
            entry_number: 1,
            ledger_id: customer_ledger_id,
            debit_amount: net_amount,
            credit_amount: 0,
            narration: `Sale - Invoice ${invoice_number}`
        });

        let entryNumber = 2;

        // Credit: Sales Account
        entries.push({
            voucher_id: voucher.id,
            entry_number: entryNumber++,
            ledger_id: salesLedger.id,
            debit_amount: 0,
            credit_amount: gross_amount,
            narration: `Sale - Invoice ${invoice_number}`
        });

        // Credit: CGST
        if (cgst_amount > 0 && cgstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: cgstLedger.id,
                debit_amount: 0,
                credit_amount: cgst_amount,
                narration: `CGST on Sale - Invoice ${invoice_number}`
            });
        }

        // Credit: SGST
        if (sgst_amount > 0 && sgstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: sgstLedger.id,
                debit_amount: 0,
                credit_amount: sgst_amount,
                narration: `SGST on Sale - Invoice ${invoice_number}`
            });
        }

        // Credit: IGST
        if (igst_amount > 0 && igstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: igstLedger.id,
                debit_amount: 0,
                credit_amount: igst_amount,
                narration: `IGST on Sale - Invoice ${invoice_number}`
            });
        }

        // Insert all entries
        for (const entry of entries) {
            await client.query(
                `INSERT INTO journal_entries (
                    voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    entry.voucher_id,
                    entry.entry_number,
                    entry.ledger_id,
                    entry.debit_amount,
                    entry.credit_amount,
                    entry.narration
                ]
            );
        }

        if (shouldCommit) {
            await client.query('COMMIT');
        }

        return voucher;
    } catch (error) {
        if (shouldCommit) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldCommit) {
            client.release();
        }
    }
}

// =====================================================
// PURCHASE TRANSACTION
// =====================================================

/**
 * Create accounting entry for a purchase
 * Debit: Purchase Account, CGST Input, SGST Input
 * Credit: Supplier (Sundry Creditors)
 */
async function createPurchaseVoucher(purchaseData, client = null) {
    const shouldCommit = !client;
    if (!client) {
        client = await pool.connect();
        await client.query('BEGIN');
    }

    try {
        const {
            bill_id,
            bill_number,
            bill_date,
            supplier_name,
            supplier_ledger_id,
            gross_amount,
            cgst_amount = 0,
            sgst_amount = 0,
            igst_amount = 0,
            net_amount,
            created_by,
            financial_year = '2025-26'
        } = purchaseData;

        // Get ledgers
        const purchaseLedger = await getLedgerByCode('PURCHASE001');
        const cgstLedger = await getLedgerByCode('CGST_IN');
        const sgstLedger = await getLedgerByCode('SGST_IN');
        const igstLedger = await getLedgerByCode('IGST_IN');
        
        // Get voucher type
        const voucherType = await getVoucherTypeByCode('PURCHASE');
        
        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(voucherType.id, financial_year, client);

        // Create voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'purchase', $7, $8, $9, 'Posted', $10)
            RETURNING *`,
            [
                voucherType.id,
                voucherNumber,
                bill_date,
                bill_number,
                supplier_ledger_id,
                `Purchase from ${supplier_name} - Bill ${bill_number}`,
                bill_id,
                financial_year,
                net_amount,
                created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Create journal entries
        const entries = [];
        let entryNumber = 1;

        // Debit: Purchase Account
        entries.push({
            voucher_id: voucher.id,
            entry_number: entryNumber++,
            ledger_id: purchaseLedger.id,
            debit_amount: gross_amount,
            credit_amount: 0,
            narration: `Purchase - Bill ${bill_number}`
        });

        // Debit: CGST
        if (cgst_amount > 0 && cgstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: cgstLedger.id,
                debit_amount: cgst_amount,
                credit_amount: 0,
                narration: `CGST on Purchase - Bill ${bill_number}`
            });
        }

        // Debit: SGST
        if (sgst_amount > 0 && sgstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: sgstLedger.id,
                debit_amount: sgst_amount,
                credit_amount: 0,
                narration: `SGST on Purchase - Bill ${bill_number}`
            });
        }

        // Debit: IGST
        if (igst_amount > 0 && igstLedger) {
            entries.push({
                voucher_id: voucher.id,
                entry_number: entryNumber++,
                ledger_id: igstLedger.id,
                debit_amount: igst_amount,
                credit_amount: 0,
                narration: `IGST on Purchase - Bill ${bill_number}`
            });
        }

        // Credit: Supplier Account
        entries.push({
            voucher_id: voucher.id,
            entry_number: entryNumber++,
            ledger_id: supplier_ledger_id,
            debit_amount: 0,
            credit_amount: net_amount,
            narration: `Purchase - Bill ${bill_number}`
        });

        // Insert all entries
        for (const entry of entries) {
            await client.query(
                `INSERT INTO journal_entries (
                    voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    entry.voucher_id,
                    entry.entry_number,
                    entry.ledger_id,
                    entry.debit_amount,
                    entry.credit_amount,
                    entry.narration
                ]
            );
        }

        if (shouldCommit) {
            await client.query('COMMIT');
        }

        return voucher;
    } catch (error) {
        if (shouldCommit) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldCommit) {
            client.release();
        }
    }
}

// =====================================================
// PAYMENT TRANSACTION
// =====================================================

/**
 * Create accounting entry for a payment
 * Debit: Party Account (Supplier/Expense)
 * Credit: Cash/Bank Account
 */
async function createPaymentVoucher(paymentData, client = null) {
    const shouldCommit = !client;
    if (!client) {
        client = await pool.connect();
        await client.query('BEGIN');
    }

    try {
        const {
            payment_id,
            payment_number,
            payment_date,
            party_name,
            party_ledger_id,
            amount,
            payment_mode, // 'cash' or 'bank'
            bank_ledger_id,
            reference_number,
            narration,
            created_by,
            financial_year = '2025-26'
        } = paymentData;

        // Get cash/bank ledger
        let cashBankLedger;
        if (payment_mode === 'bank' && bank_ledger_id) {
            const result = await pool.query('SELECT * FROM ledgers WHERE id = $1', [bank_ledger_id]);
            cashBankLedger = result.rows[0];
        } else {
            cashBankLedger = await getLedgerByCode('CASH');
        }
        
        // Get voucher type
        const voucherType = await getVoucherTypeByCode('PAYMENT');
        
        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(voucherType.id, financial_year, client);

        // Create voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'payment', $7, $8, $9, 'Posted', $10)
            RETURNING *`,
            [
                voucherType.id,
                voucherNumber,
                payment_date,
                reference_number || payment_number,
                party_ledger_id,
                narration || `Payment to ${party_name}`,
                payment_id,
                financial_year,
                amount,
                created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Create journal entries
        // Debit: Party Account
        await client.query(
            `INSERT INTO journal_entries (
                voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 1, $2, $3, 0, $4)`,
            [voucher.id, party_ledger_id, amount, `Payment to ${party_name}`]
        );

        // Credit: Cash/Bank
        await client.query(
            `INSERT INTO journal_entries (
                voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 2, $2, 0, $3, $4)`,
            [voucher.id, cashBankLedger.id, amount, `By ${payment_mode === 'bank' ? cashBankLedger.ledger_name : 'Cash'}`]
        );

        if (shouldCommit) {
            await client.query('COMMIT');
        }

        return voucher;
    } catch (error) {
        if (shouldCommit) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldCommit) {
            client.release();
        }
    }
}

// =====================================================
// RECEIPT TRANSACTION
// =====================================================

/**
 * Create accounting entry for a receipt
 * Debit: Cash/Bank Account
 * Credit: Party Account (Customer/Income)
 */
async function createReceiptVoucher(receiptData, client = null) {
    const shouldCommit = !client;
    if (!client) {
        client = await pool.connect();
        await client.query('BEGIN');
    }

    try {
        const {
            receipt_id,
            receipt_number,
            receipt_date,
            party_name,
            party_ledger_id,
            amount,
            payment_mode, // 'cash' or 'bank'
            bank_ledger_id,
            reference_number,
            narration,
            created_by,
            financial_year = '2025-26'
        } = receiptData;

        // Get cash/bank ledger
        let cashBankLedger;
        if (payment_mode === 'bank' && bank_ledger_id) {
            const result = await pool.query('SELECT * FROM ledgers WHERE id = $1', [bank_ledger_id]);
            cashBankLedger = result.rows[0];
        } else {
            cashBankLedger = await getLedgerByCode('CASH');
        }
        
        // Get voucher type
        const voucherType = await getVoucherTypeByCode('RECEIPT');
        
        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(voucherType.id, financial_year, client);

        // Create voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'receipt', $7, $8, $9, 'Posted', $10)
            RETURNING *`,
            [
                voucherType.id,
                voucherNumber,
                receipt_date,
                reference_number || receipt_number,
                party_ledger_id,
                narration || `Receipt from ${party_name}`,
                receipt_id,
                financial_year,
                amount,
                created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Create journal entries
        // Debit: Cash/Bank
        await client.query(
            `INSERT INTO journal_entries (
                voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 1, $2, $3, 0, $4)`,
            [voucher.id, cashBankLedger.id, amount, `By ${payment_mode === 'bank' ? cashBankLedger.ledger_name : 'Cash'}`]
        );

        // Credit: Party Account
        await client.query(
            `INSERT INTO journal_entries (
                voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 2, $2, 0, $3, $4)`,
            [voucher.id, party_ledger_id, amount, `Receipt from ${party_name}`]
        );

        if (shouldCommit) {
            await client.query('COMMIT');
        }

        return voucher;
    } catch (error) {
        if (shouldCommit) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldCommit) {
            client.release();
        }
    }
}

// =====================================================
// SALARY PAYMENT
// =====================================================

/**
 * Create accounting entry for salary payment
 * Debit: Salary & Wages Account
 * Credit: Employee Account / Cash/Bank
 */
async function createSalaryVoucher(salaryData, client = null) {
    const shouldCommit = !client;
    if (!client) {
        client = await pool.connect();
        await client.query('BEGIN');
    }

    try {
        const {
            payroll_id,
            payment_date,
            employee_name,
            employee_ledger_id,
            gross_salary,
            deductions,
            net_salary,
            payment_mode,
            bank_ledger_id,
            month,
            year,
            created_by,
            financial_year = '2025-26'
        } = salaryData;

        // Get salary ledger
        const salaryLedger = await pool.query(
            `SELECT * FROM ledgers l
             JOIN account_groups ag ON l.account_group_id = ag.id
             WHERE ag.group_code = 'SALARIES_WAGES' AND l.is_default = true
             LIMIT 1`
        );
        
        // Get cash/bank ledger
        let cashBankLedger;
        if (payment_mode === 'bank' && bank_ledger_id) {
            const result = await pool.query('SELECT * FROM ledgers WHERE id = $1', [bank_ledger_id]);
            cashBankLedger = result.rows[0];
        } else {
            cashBankLedger = await getLedgerByCode('CASH');
        }
        
        // Get voucher type
        const voucherType = await getVoucherTypeByCode('PAYMENT');
        
        // Generate voucher number
        const voucherNumber = await generateVoucherNumber(voucherType.id, financial_year, client);

        // Create voucher
        const voucherResult = await client.query(
            `INSERT INTO vouchers (
                voucher_type_id, voucher_number, voucher_date, reference_number,
                party_ledger_id, narration, source_type, source_id,
                financial_year, total_amount, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'payroll', $7, $8, $9, 'Posted', $10)
            RETURNING *`,
            [
                voucherType.id,
                voucherNumber,
                payment_date,
                `SAL-${month}-${year}`,
                employee_ledger_id,
                `Salary for ${employee_name} - ${month}/${year}`,
                payroll_id,
                financial_year,
                net_salary,
                created_by
            ]
        );

        const voucher = voucherResult.rows[0];

        // Create journal entries
        // Debit: Salary & Wages
        if (salaryLedger.rows.length > 0) {
            await client.query(
                `INSERT INTO journal_entries (
                    voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
                ) VALUES ($1, 1, $2, $3, 0, $4)`,
                [voucher.id, salaryLedger.rows[0].id, gross_salary, `Salary - ${month}/${year}`]
            );
        }

        // Credit: Cash/Bank
        await client.query(
            `INSERT INTO journal_entries (
                voucher_id, entry_number, ledger_id, debit_amount, credit_amount, narration
            ) VALUES ($1, 2, $2, 0, $3, $4)`,
            [voucher.id, cashBankLedger.id, net_salary, `Salary paid to ${employee_name}`]
        );

        if (shouldCommit) {
            await client.query('COMMIT');
        }

        return voucher;
    } catch (error) {
        if (shouldCommit) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldCommit) {
            client.release();
        }
    }
}

module.exports = {
    createSaleVoucher,
    createPurchaseVoucher,
    createPaymentVoucher,
    createReceiptVoucher,
    createSalaryVoucher,
    getLedgerByCode,
    getVoucherTypeByCode
};
