const pool = require('../config/database');

// Get all purchase orders
exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const { status, from_date, to_date } = req.query;
        
        let query = 'SELECT * FROM purchase_orders WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (status) {
            query += ` AND status = $${paramCount++}`;
            params.push(status);
        }
        
        if (from_date) {
            query += ` AND po_date >= $${paramCount++}`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND po_date <= $${paramCount++}`;
            params.push(to_date);
        }
        
        query += ' ORDER BY po_date DESC, id DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
};

// Get PO by ID
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get PO header
        const poQuery = 'SELECT * FROM purchase_orders WHERE id = $1';
        const poResult = await pool.query(poQuery, [id]);
        
        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        
        // Get PO items
        const itemsQuery = 'SELECT * FROM purchase_order_items WHERE po_id = $1';
        const itemsResult = await pool.query(itemsQuery, [id]);
        
        const po = poResult.rows[0];
        po.items = itemsResult.rows;
        
        res.json(po);
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
};

// Create PO
exports.createPurchaseOrder = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            po_date,
            vendor_id,
            vendor_name,
            vendor_gstin,
            delivery_address,
            delivery_date,
            payment_terms,
            items,
            remarks
        } = req.body;
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount), 0);
        const taxAmount = items.reduce((sum, item) => 
            sum + parseFloat(item.cgst_amount || 0) + parseFloat(item.sgst_amount || 0) + parseFloat(item.igst_amount || 0), 0);
        const totalAmount = subtotal + taxAmount;
        
        // Create PO header
        const poQuery = `
            INSERT INTO purchase_orders (
                po_date, vendor_id, vendor_name, vendor_gstin,
                delivery_address, delivery_date, payment_terms,
                subtotal, tax_amount, total_amount, remarks, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Draft')
            RETURNING *
        `;
        
        const poResult = await client.query(poQuery, [
            po_date || new Date(),
            vendor_id,
            vendor_name,
            vendor_gstin,
            delivery_address,
            delivery_date,
            payment_terms,
            subtotal,
            taxAmount,
            totalAmount,
            remarks
        ]);
        
        const po = poResult.rows[0];
        
        // Insert PO items
        for (const item of items) {
            const itemQuery = `
                INSERT INTO purchase_order_items (
                    po_id, item_name, item_description, hsn_code,
                    ordered_quantity, pending_quantity, unit, unit_price,
                    discount_percentage, discount_amount, taxable_amount,
                    gst_rate, cgst_amount, sgst_amount, igst_amount,
                    total_amount, expected_delivery_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `;
            
            await client.query(itemQuery, [
                po.id,
                item.item_name,
                item.item_description,
                item.hsn_code,
                item.ordered_quantity,
                item.ordered_quantity, // pending_quantity = ordered_quantity initially
                item.unit,
                item.unit_price,
                item.discount_percentage || 0,
                item.discount_amount || 0,
                item.taxable_amount,
                item.gst_rate || 0,
                item.cgst_amount || 0,
                item.sgst_amount || 0,
                item.igst_amount || 0,
                item.total_amount,
                item.expected_delivery_date
            ]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(po);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating purchase order:', error);
        res.status(500).json({ error: 'Failed to create purchase order' });
    } finally {
        client.release();
    }
};

// Update PO
exports.updatePurchaseOrder = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const {
            po_date,
            vendor_name,
            delivery_address,
            delivery_date,
            payment_terms,
            status,
            remarks
        } = req.body;
        
        const query = `
            UPDATE purchase_orders
            SET po_date = $1, vendor_name = $2, delivery_address = $3,
                delivery_date = $4, payment_terms = $5, status = $6,
                remarks = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        
        const result = await client.query(query, [
            po_date, vendor_name, delivery_address, delivery_date,
            payment_terms, status, remarks, id
        ]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating purchase order:', error);
        res.status(500).json({ error: 'Failed to update purchase order' });
    } finally {
        client.release();
    }
};

// Delete PO
exports.deletePurchaseOrder = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        
        const result = await client.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting purchase order:', error);
        res.status(500).json({ error: 'Failed to delete purchase order' });
    } finally {
        client.release();
    }
};

// Get all vendors
exports.getVendors = async (req, res) => {
    try {
        const query = 'SELECT * FROM vendors WHERE status = $1 ORDER BY vendor_name';
        const result = await pool.query(query, ['Active']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

// Create vendor
exports.createVendor = async (req, res) => {
    try {
        const {
            vendor_name,
            contact_person,
            mobile,
            email,
            address,
            city,
            state,
            pincode,
            gstin,
            pan,
            payment_terms,
            vendor_category
        } = req.body;
        
        // Generate vendor code
        const codeQuery = 'SELECT COUNT(*) as count FROM vendors';
        const codeResult = await pool.query(codeQuery);
        const vendorCode = 'VEN-' + String(parseInt(codeResult.rows[0].count) + 1).padStart(5, '0');
        
        const query = `
            INSERT INTO vendors (
                vendor_code, vendor_name, contact_person, mobile, email,
                address, city, state, pincode, gstin, pan,
                payment_terms, vendor_category, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Active')
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            vendorCode, vendor_name, contact_person, mobile, email,
            address, city, state, pincode, gstin, pan,
            payment_terms, vendor_category
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ error: 'Failed to create vendor' });
    }
};

// Get all GRNs
exports.getAllGRNs = async (req, res) => {
    try {
        const { po_id, status, from_date, to_date } = req.query;
        
        let query = 'SELECT * FROM goods_receipt_notes WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (po_id) {
            query += ` AND po_id = $${paramCount++}`;
            params.push(po_id);
        }
        
        if (status) {
            query += ` AND status = $${paramCount++}`;
            params.push(status);
        }
        
        if (from_date) {
            query += ` AND grn_date >= $${paramCount++}`;
            params.push(from_date);
        }
        
        if (to_date) {
            query += ` AND grn_date <= $${paramCount++}`;
            params.push(to_date);
        }
        
        query += ' ORDER BY grn_date DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching GRNs:', error);
        res.status(500).json({ error: 'Failed to fetch GRNs' });
    }
};

// Create GRN
exports.createGRN = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            grn_date,
            po_id,
            po_number,
            vendor_id,
            vendor_name,
            vendor_invoice_number,
            vendor_invoice_date,
            vehicle_number,
            items,
            remarks
        } = req.body;
        
        // Calculate total
        const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
        
        // Create GRN header
        const grnQuery = `
            INSERT INTO goods_receipt_notes (
                grn_date, po_id, po_number, vendor_id, vendor_name,
                vendor_invoice_number, vendor_invoice_date, vehicle_number,
                total_amount, remarks, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft')
            RETURNING *
        `;
        
        const grnResult = await client.query(grnQuery, [
            grn_date || new Date(),
            po_id,
            po_number,
            vendor_id,
            vendor_name,
            vendor_invoice_number,
            vendor_invoice_date,
            vehicle_number,
            totalAmount,
            remarks
        ]);
        
        const grn = grnResult.rows[0];
        
        // Insert GRN items
        for (const item of items) {
            const itemQuery = `
                INSERT INTO grn_items (
                    grn_id, po_item_id, item_name, ordered_quantity,
                    received_quantity, accepted_quantity, rejected_quantity,
                    unit, unit_price, total_amount, qc_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')
            `;
            
            await client.query(itemQuery, [
                grn.id,
                item.po_item_id,
                item.item_name,
                item.ordered_quantity,
                item.received_quantity,
                item.accepted_quantity || item.received_quantity,
                item.rejected_quantity || 0,
                item.unit,
                item.unit_price,
                item.total_amount
            ]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(grn);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating GRN:', error);
        res.status(500).json({ error: 'Failed to create GRN' });
    } finally {
        client.release();
    }
};
