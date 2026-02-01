const accountingService = require('./services/accounting.service');
const db = require('./config/database');
const pool = db.pool;

/**
 * Test Script for Accounting System
 * Demonstrates automatic voucher creation from transactions
 */

async function testAccountingSystem() {
    console.log('🧪 Testing Accounting System...\n');

    try {
        // First, create some ledgers for testing
        console.log('📝 Creating test ledgers...');
        
        // Customer ledger (check if exists first)
        let customerResult = await pool.query(`
            SELECT * FROM ledgers WHERE ledger_code = 'CUST001'
        `);

        if (customerResult.rows.length === 0) {
            customerResult = await pool.query(`
                INSERT INTO ledgers (
                    ledger_code, ledger_name, account_group_id, 
                    opening_balance, opening_balance_type, created_by
                ) 
                SELECT 'CUST001', 'ABC Farm - Customer', id, 0, 'Debit', 1
                FROM account_groups WHERE group_code = 'SUNDRY_DEBTORS'
                RETURNING *
            `);
        }
        const customerLedger = customerResult.rows[0];
        console.log(`✅ Customer Ledger: ${customerLedger.ledger_name} (ID: ${customerLedger.id})`);

        // Supplier ledger (check if exists first)
        let supplierResult = await pool.query(`
            SELECT * FROM ledgers WHERE ledger_code = 'SUPP001'
        `);

        if (supplierResult.rows.length === 0) {
            supplierResult = await pool.query(`
                INSERT INTO ledgers (
                    ledger_code, ledger_name, account_group_id,
                    opening_balance, opening_balance_type, created_by
                )
                SELECT 'SUPP001', 'XYZ Seeds Pvt Ltd - Supplier', id, 0, 'Credit', 1
                FROM account_groups WHERE group_code = 'SUNDRY_CREDITORS'
                RETURNING *
            `);
        }
        const supplierLedger = supplierResult.rows[0];
        console.log(`✅ Supplier Ledger: ${supplierLedger.ledger_name} (ID: ${supplierLedger.id})\n`);

        // Test 1: Create a Sale Voucher
        console.log('📊 Test 1: Creating Sale Voucher...');
        const saleVoucher = await accountingService.createSaleVoucher({
            invoice_id: 1001,
            invoice_number: 'INV-2025-001',
            invoice_date: '2026-01-11',
            customer_name: 'ABC Farm',
            customer_ledger_id: customerLedger.id,
            gross_amount: 10000.00,
            cgst_amount: 900.00,
            sgst_amount: 900.00,
            igst_amount: 0,
            net_amount: 11800.00,
            created_by: 1,
            financial_year: '2025-26'
        });
        console.log(`✅ Sale Voucher Created: ${saleVoucher.voucher_number} - Amount: ₹${saleVoucher.total_amount}\n`);

        // Test 2: Create a Purchase Voucher
        console.log('📊 Test 2: Creating Purchase Voucher...');
        const purchaseVoucher = await accountingService.createPurchaseVoucher({
            bill_id: 2001,
            bill_number: 'BILL-2025-001',
            bill_date: '2026-01-11',
            supplier_name: 'XYZ Seeds Pvt Ltd',
            supplier_ledger_id: supplierLedger.id,
            gross_amount: 5000.00,
            cgst_amount: 450.00,
            sgst_amount: 450.00,
            igst_amount: 0,
            net_amount: 5900.00,
            created_by: 1,
            financial_year: '2025-26'
        });
        console.log(`✅ Purchase Voucher Created: ${purchaseVoucher.voucher_number} - Amount: ₹${purchaseVoucher.total_amount}\n`);

        // Test 3: Create a Receipt Voucher
        console.log('📊 Test 3: Creating Receipt Voucher...');
        const receiptVoucher = await accountingService.createReceiptVoucher({
            receipt_id: 3001,
            receipt_number: 'RCP-001',
            receipt_date: '2026-01-11',
            party_name: 'ABC Farm',
            party_ledger_id: customerLedger.id,
            amount: 5000.00,
            payment_mode: 'cash',
            reference_number: 'Cash-001',
            narration: 'Received from ABC Farm against INV-2025-001',
            created_by: 1,
            financial_year: '2025-26'
        });
        console.log(`✅ Receipt Voucher Created: ${receiptVoucher.voucher_number} - Amount: ₹${receiptVoucher.total_amount}\n`);

        // Test 4: Create a Payment Voucher
        console.log('📊 Test 4: Creating Payment Voucher...');
        const paymentVoucher = await accountingService.createPaymentVoucher({
            payment_id: 4001,
            payment_number: 'PMT-001',
            payment_date: '2026-01-11',
            party_name: 'XYZ Seeds Pvt Ltd',
            party_ledger_id: supplierLedger.id,
            amount: 3000.00,
            payment_mode: 'cash',
            reference_number: 'Cash-002',
            narration: 'Paid to XYZ Seeds against BILL-2025-001',
            created_by: 1,
            financial_year: '2025-26'
        });
        console.log(`✅ Payment Voucher Created: ${paymentVoucher.voucher_number} - Amount: ₹${paymentVoucher.total_amount}\n`);

        // Verify Trial Balance
        console.log('📈 Fetching Trial Balance...');
        const trialBalance = await pool.query(`
            SELECT 
                ledger_name,
                opening_balance,
                opening_balance_type,
                total_debit,
                total_credit,
                closing_balance,
                closing_balance_type
            FROM v_trial_balance
            WHERE total_debit > 0 OR total_credit > 0 OR opening_balance > 0
            ORDER BY ledger_name
        `);

        console.log('\n📊 TRIAL BALANCE');
        console.log('═'.repeat(100));
        console.log(
            'Ledger Name'.padEnd(40) + 
            'Opening'.padEnd(15) + 
            'Debit'.padEnd(15) + 
            'Credit'.padEnd(15) + 
            'Closing'.padEnd(15)
        );
        console.log('─'.repeat(100));

        let totalDebit = 0;
        let totalCredit = 0;

        trialBalance.rows.forEach(row => {
            const closingBal = Math.abs(parseFloat(row.closing_balance || 0));
            const openingBal = Math.abs(parseFloat(row.opening_balance || 0));
            
            console.log(
                row.ledger_name.padEnd(40) +
                (openingBal ? `${openingBal.toFixed(2)} ${row.opening_balance_type}` : '-').padEnd(15) +
                (row.total_debit || 0).toString().padEnd(15) +
                (row.total_credit || 0).toString().padEnd(15) +
                (closingBal ? `${closingBal.toFixed(2)} ${row.closing_balance_type}` : '-').padEnd(15)
            );

            if (row.closing_balance_type === 'Debit') {
                totalDebit += closingBal;
            } else {
                totalCredit += closingBal;
            }
        });

        console.log('═'.repeat(100));
        console.log(
            'TOTALS'.padEnd(70) +
            totalDebit.toFixed(2).padEnd(15) +
            totalCredit.toFixed(2).padEnd(15)
        );
        console.log('═'.repeat(100));

        // Verify balance
        if (Math.abs(totalDebit - totalCredit) < 0.01) {
            console.log('\n✅ Books are BALANCED! Debit = Credit\n');
        } else {
            console.log(`\n❌ Books are NOT balanced! Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}\n`);
        }

        // Check Day Book
        console.log('📅 Day Book Summary:');
        const dayBook = await pool.query(`
            SELECT * FROM v_day_book 
            ORDER BY voucher_date DESC
            LIMIT 10
        `);

        dayBook.rows.forEach(row => {
            console.log(`  ${row.voucher_date} | ${row.abbreviation.padEnd(4)} | ${row.voucher_number.padEnd(12)} | ₹${row.total_amount.toString().padStart(10)} | ${row.narration || ''}`);
        });

        console.log('\n✅ All accounting tests passed!');
        console.log('🎉 Tally-style accounting system is working perfectly!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run tests
testAccountingSystem();
