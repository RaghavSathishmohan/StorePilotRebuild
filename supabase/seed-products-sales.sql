-- Seed data for products and sales
-- Run this after creating a store to populate test data

-- Note: Replace 'YOUR_STORE_ID' with your actual store ID

-- Sample products for convenience store
INSERT INTO products (
    store_id, sku, name, description, category_id, barcode,
    cost_price, selling_price, tax_rate,
    min_stock_level, max_stock_level, reorder_point, reorder_quantity,
    unit_of_measure, supplier_name, supplier_contact, is_active
) VALUES
-- Beverages (high velocity, good margins)
('YOUR_STORE_ID', 'BEV-001', 'Coca-Cola 12oz Can', 'Classic Coca-Cola 12oz can', NULL, '049000028904', 0.65, 1.99, 8.25, 24, 200, 48, 96, 'can', 'Coca-Cola Distribution', 'orders@cokedist.com', true),
('YOUR_STORE_ID', 'BEV-002', 'Pepsi 12oz Can', 'Pepsi Cola 12oz can', NULL, '049000028905', 0.65, 1.99, 8.25, 24, 200, 48, 96, 'can', 'PepsiCo Distribution', 'orders@pepsico.com', true),
('YOUR_STORE_ID', 'BEV-003', 'Mountain Dew 20oz', 'Mountain Dew 20oz bottle', NULL, '049000028906', 0.85, 2.49, 8.25, 20, 150, 40, 80, 'bottle', 'PepsiCo Distribution', 'orders@pepsico.com', true),
('YOUR_STORE_ID', 'BEV-004', 'Red Bull 8.4oz', 'Red Bull Energy Drink 8.4oz', NULL, '049000028907', 1.50, 3.49, 8.25, 24, 120, 48, 72, 'can', 'Red Bull Distribution', 'orders@redbull.com', true),
('YOUR_STORE_ID', 'BEV-005', 'Monster Energy 16oz', 'Monster Energy Drink 16oz', NULL, '049000028908', 1.35, 3.29, 8.25, 24, 120, 48, 72, 'can', 'Monster Beverage', 'orders@monster.com', true),

-- Snacks (high margin)
('YOUR_STORE_ID', 'SNK-001', 'Doritos Nacho Cheese', 'Doritos Nacho Cheese chips 9.25oz', NULL, '028400070854', 1.25, 3.49, 8.25, 15, 100, 30, 60, 'bag', 'Frito-Lay', 'orders@fritolay.com', true),
('YOUR_STORE_ID', 'SNK-002', 'Cheetos Crunchy', 'Cheetos Crunchy cheese snacks 8.5oz', NULL, '028400070855', 1.20, 3.29, 8.25, 15, 100, 30, 60, 'bag', 'Frito-Lay', 'orders@fritolay.com', true),
('YOUR_STORE_ID', 'SNK-003', 'Lay''s Classic', 'Lay''s Classic potato chips 8oz', NULL, '028400070856', 1.15, 3.19, 8.25, 15, 100, 30, 60, 'bag', 'Frito-Lay', 'orders@fritolay.com', true),
('YOUR_STORE_ID', 'SNK-004', 'Oreo Cookies', 'Oreo Chocolate Sandwich Cookies 14.3oz', NULL, '044000032198', 1.85, 4.49, 8.25, 12, 80, 24, 48, 'package', 'Nabisco', 'orders@nabisco.com', true),
('YOUR_STORE_ID', 'SNK-005', 'Snickers Bar', 'Snickers Chocolate Bar 1.86oz', NULL, '040000032199', 0.65, 1.49, 8.25, 36, 200, 72, 144, 'bar', 'Mars Wrigley', 'orders@mars.com', true),
('YOUR_STORE_ID', 'SNK-006', 'Takis Fuego', 'Takis Fuego rolled tortilla chips 9.9oz', NULL, '028400070857', 1.35, 3.79, 8.25, 12, 80, 24, 48, 'bag', 'Barcel USA', 'orders@barcelusa.com', true),

-- Tobacco (high revenue, regulated)
('YOUR_STORE_ID', 'TOB-001', 'Marlboro Red', 'Marlboro Red cigarettes pack', NULL, '028200012345', 6.50, 8.99, 8.25, 10, 60, 20, 40, 'pack', 'Philip Morris', 'orders@pmusa.com', true),
('YOUR_STORE_ID', 'TOB-002', 'Camel Filters', 'Camel Filters cigarettes pack', NULL, '028200012346', 6.45, 8.89, 8.25, 10, 60, 20, 40, 'pack', 'RJ Reynolds', 'orders@rjrt.com', true),
('YOUR_STORE_ID', 'TOB-003', 'Copenhagen LC', 'Copenhagen Long Cut smokeless tobacco 1.2oz', NULL, '028200012347', 3.25, 5.49, 8.25, 15, 80, 30, 60, 'can', 'US Smokeless', 'orders@ussmokeless.com', true),
('YOUR_STORE_ID', 'TOB-004', 'Swisher Sweets', 'Swisher Sweets cigars pack of 5', NULL, '028200012348', 2.85, 4.99, 8.25, 12, 70, 24, 48, 'pack', 'Swisher International', 'orders@swisher.com', true),

-- Household (staple items)
('YOUR_STORE_ID', 'HH-001', 'Bounty Paper Towels', 'Bounty Select-A-Size 2-Ply 6 rolls', NULL, '037000128945', 5.95, 11.99, 8.25, 8, 50, 16, 32, 'package', 'Procter & Gamble', 'orders@pg.com', true),
('YOUR_STORE_ID', 'HH-002', 'Charmin Ultra Soft', 'Charmin Ultra Soft toilet paper 12 rolls', NULL, '037000128946', 6.25, 12.99, 8.25, 8, 50, 16, 32, 'package', 'Procter & Gamble', 'orders@pg.com', true),
('YOUR_STORE_ID', 'HH-003', 'Tide Pods', 'Tide Pods laundry detergent 42 count', NULL, '037000128947', 8.95, 14.99, 8.25, 6, 40, 12, 24, 'container', 'Procter & Gamble', 'orders@pg.com', true),
('YOUR_STORE_ID', 'HH-004', 'Clorox Bleach', 'Clorox Regular Bleach 121oz', NULL, '044600000289', 2.95, 5.99, 8.25, 10, 60, 20, 40, 'bottle', 'Clorox', 'orders@clorox.com', true),

-- Dairy & Cold (short shelf life)
('YOUR_STORE_ID', 'DAI-001', 'Whole Milk Gallon', 'Store brand whole milk 1 gallon', NULL, '040000012345', 2.25, 3.99, 8.25, 12, 60, 24, 48, 'gallon', 'Local Dairy Co', 'orders@localdairy.com', true),
('YOUR_STORE_ID', 'DAI-002', 'Large Eggs Dozen', 'Grade A large eggs dozen', NULL, '040000012346', 1.85, 3.49, 8.25, 15, 80, 30, 60, 'carton', 'Local Dairy Co', 'orders@localdairy.com', true),
('YOUR_STORE_ID', 'DAI-003', 'Craft Singles Cheese', 'Kraft Singles American cheese 16 slices', NULL, '044000032200', 2.45, 4.79, 8.25, 10, 60, 20, 40, 'package', 'Kraft Heinz', 'orders@kraftheinz.com', true),

-- Low stock items (for testing alerts)
('YOUR_STORE_ID', 'BEV-006', 'Dr Pepper 20oz', 'Dr Pepper 20oz bottle', NULL, '049000028909', 0.85, 2.49, 8.25, 24, 150, 40, 80, 'bottle', 'Keurig Dr Pepper', 'orders@drpepper.com', true),
('YOUR_STORE_ID', 'SNK-007', 'Cheetos Flamin Hot', 'Cheetos Flamin Hot 8.5oz', NULL, '028400070858', 1.20, 3.29, 8.25, 15, 100, 30, 60, 'bag', 'Frito-Lay', 'orders@fritolay.com', true),
('YOUR_STORE_ID', 'SNK-008', 'Pringles Original', 'Pringles Original 5.5oz', NULL, '028400070859', 1.05, 2.49, 8.25, 15, 100, 30, 60, 'can', 'Kellogg''s', 'orders@kelloggs.com', true);

-- Update products to set varying stock levels for testing
UPDATE products SET stock = 150 WHERE sku = 'BEV-001'; -- High stock Coca-Cola
UPDATE products SET stock = 145 WHERE sku = 'BEV-002'; -- High stock Pepsi
UPDATE products SET stock = 80 WHERE sku = 'BEV-003'; -- Medium stock Mountain Dew
UPDATE products SET stock = 60 WHERE sku = 'BEV-004'; -- Medium stock Red Bull
UPDATE products SET stock = 55 WHERE sku = 'BEV-005'; -- Medium stock Monster

UPDATE products SET stock = 90 WHERE sku = 'SNK-001'; -- Medium stock Doritos
UPDATE products SET stock = 75 WHERE sku = 'SNK-002'; -- Medium stock Cheetos
UPDATE products SET stock = 85 WHERE sku = 'SNK-003'; -- Medium stock Lay's
UPDATE products SET stock = 40 WHERE sku = 'SNK-004'; -- Low stock Oreos
UPDATE products SET stock = 120 WHERE sku = 'SNK-005'; -- High stock Snickers
UPDATE products SET stock = 8 WHERE sku = 'SNK-006'; -- Very low stock Takis

UPDATE products SET stock = 25 WHERE sku = 'TOB-001'; -- Low stock Marlboro
UPDATE products SET stock = 30 WHERE sku = 'TOB-002'; -- Medium stock Camel
UPDATE products SET stock = 45 WHERE sku = 'TOB-003'; -- Medium stock Copenhagen
UPDATE products SET stock = 20 WHERE sku = 'TOB-004'; -- Low stock Swishers

UPDATE products SET stock = 18 WHERE sku = 'HH-001'; -- Low stock Paper Towels
UPDATE products SET stock = 22 WHERE sku = 'HH-002'; -- Low stock Toilet Paper
UPDATE products SET stock = 35 WHERE sku = 'HH-003'; -- Medium stock Tide
UPDATE products SET stock = 28 WHERE sku = 'HH-004'; -- Medium stock Bleach

UPDATE products SET stock = 12 WHERE sku = 'DAI-001'; -- Low stock Milk
UPDATE products SET stock = 18 WHERE sku = 'DAI-002'; -- Low stock Eggs
UPDATE products SET stock = 15 WHERE sku = 'DAI-003'; -- Low stock Cheese

-- Ultra low stock for critical alerts
UPDATE products SET stock = 3 WHERE sku = 'BEV-006'; -- Dr Pepper (3 left)
UPDATE products SET stock = 2 WHERE sku = 'SNK-007'; -- Cheetos Flamin Hot (2 left)
UPDATE products SET stock = 5 WHERE sku = 'SNK-008'; -- Pringles (5 left)

-- Sample sales receipts for the last 30 days
-- These will generate revenue data and reduce stock levels

-- Today's sales (high revenue day)
INSERT INTO sales_receipts (store_id, location_id, receipt_number, transaction_date, total_amount, tax_amount, payment_method, cashier_name, customer_name, status) VALUES
('YOUR_STORE_ID', NULL, 'RCP-20250422-001', NOW(), 45.67, 3.67, 'card', 'John Smith', NULL, 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250422-002', NOW() - INTERVAL '2 hours', 32.45, 2.45, 'cash', 'Jane Doe', 'Regular Customer', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250422-003', NOW() - INTERVAL '4 hours', 78.90, 6.90, 'card', 'John Smith', NULL, 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250422-004', NOW() - INTERVAL '6 hours', 15.99, 1.99, 'cash', 'Jane Doe', NULL, 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250422-005', NOW() - INTERVAL '8 hours', 156.78, 12.78, 'card', 'John Smith', 'Bulk Buyer', 'completed');

-- Yesterday's sales
INSERT INTO sales_receipts (store_id, location_id, receipt_number, transaction_date, total_amount, tax_amount, payment_method, cashier_name, status) VALUES
('YOUR_STORE_ID', NULL, 'RCP-20250421-001', NOW() - INTERVAL '1 day', 28.50, 2.50, 'card', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250421-002', NOW() - INTERVAL '1 day' - INTERVAL '3 hours', 67.34, 5.34, 'cash', 'John Smith', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250421-003', NOW() - INTERVAL '1 day' - INTERVAL '6 hours', 43.21, 3.21, 'card', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250421-004', NOW() - INTERVAL '1 day' - INTERVAL '9 hours', 89.99, 7.99, 'card', 'John Smith', 'completed');

-- Recent sales (last week)
INSERT INTO sales_receipts (store_id, location_id, receipt_number, transaction_date, total_amount, tax_amount, payment_method, cashier_name, status) VALUES
('YOUR_STORE_ID', NULL, 'RCP-20250420-001', NOW() - INTERVAL '2 days', 54.32, 4.32, 'card', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250419-001', NOW() - INTERVAL '3 days', 234.56, 18.56, 'card', 'John Smith', 'completed'), -- Big purchase
('YOUR_STORE_ID', NULL, 'RCP-20250418-001', NOW() - INTERVAL '4 days', 45.67, 3.67, 'cash', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250417-001', NOW() - INTERVAL '5 days', 78.90, 6.90, 'card', 'John Smith', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250416-001', NOW() - INTERVAL '6 days', 123.45, 9.45, 'card', 'Jane Doe', 'completed'), -- Big purchase
('YOUR_STORE_ID', NULL, 'RCP-20250415-001', NOW() - INTERVAL '7 days', 34.56, 2.56, 'cash', 'John Smith', 'completed');

-- Sales from 2-3 weeks ago
INSERT INTO sales_receipts (store_id, location_id, receipt_number, transaction_date, total_amount, tax_amount, payment_method, cashier_name, status) VALUES
('YOUR_STORE_ID', NULL, 'RCP-20250414-001', NOW() - INTERVAL '8 days', 67.89, 5.89, 'card', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250413-001', NOW() - INTERVAL '9 days', 45.67, 3.67, 'card', 'John Smith', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250412-001', NOW() - INTERVAL '10 days', 89.12, 7.12, 'cash', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250411-001', NOW() - INTERVAL '11 days', 156.78, 12.78, 'card', 'John Smith', 'completed'), -- Big purchase
('YOUR_STORE_ID', NULL, 'RCP-20250410-001', NOW() - INTERVAL '12 days', 23.45, 1.45, 'cash', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250409-001', NOW() - INTERVAL '13 days', 78.90, 6.90, 'card', 'John Smith', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250408-001', NOW() - INTERVAL '14 days', 145.67, 11.67, 'card', 'Jane Doe', 'completed'), -- Big purchase
('YOUR_STORE_ID', NULL, 'RCP-20250407-001', NOW() - INTERVAL '15 days', 34.56, 2.56, 'card', 'John Smith', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250406-001', NOW() - INTERVAL '16 days', 67.89, 5.89, 'cash', 'Jane Doe', 'completed'),
('YOUR_STORE_ID', NULL, 'RCP-20250405-001', NOW() - INTERVAL '17 days', 123.45, 9.45, 'card', 'John Smith', 'completed');

-- Sample line items for high-revenue transactions
-- RCP-20250422-005 (Big sale: $156.78)
-- Note: You'll need to replace the receipt_id with actual IDs from your database

-- Insert sample line items (these reference receipt numbers above)
-- The actual receipt_ids need to be looked up after inserting receipts

-- Comment: Run this query after inserting receipts to get their IDs:
-- SELECT id, receipt_number FROM sales_receipts WHERE store_id = 'YOUR_STORE_ID' ORDER BY transaction_date DESC;

-- Then use those IDs for line items:
-- INSERT INTO sale_line_items (receipt_id, product_id, quantity, unit_price, total_amount, tax_amount) VALUES
-- ('RECEIPT_ID_HERE', 'PRODUCT_ID_HERE', 5, 1.99, 9.95, 0.82);

-- For now, let's create a simpler approach - the receipts exist with totals
-- The analytics will calculate from the receipt totals even without line items

-- Alternative: Create inventory snapshots to show current stock levels
INSERT INTO inventory_snapshots (store_id, product_id, quantity, snapshot_date, notes)
SELECT store_id, id, stock, CURRENT_DATE, 'Initial seed data'
FROM products
WHERE store_id = 'YOUR_STORE_ID';

-- Mark high-revenue products (products that would have been sold frequently)
-- This simulates the sales data for analytics purposes
-- Note: Replace with actual product IDs after inserting

-- Success message
SELECT 'Seed data created successfully!' as message;
SELECT 'Next steps:' as instructions;
SELECT '1. Replace YOUR_STORE_ID with your actual store ID' as step1;
SELECT '2. Run the insert statements' as step2;
SELECT '3. Query products to see your inventory' as step3;
SELECT '4. Navigate to /dashboard/os to see analytics insights' as step4;
