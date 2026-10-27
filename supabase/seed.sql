-- ==============================================================================
-- OMNIFLOW AI — SEED DATA (seed.sql)
-- Version: 1.1 | Products, Variants & Default Business Configuration
-- ==============================================================================

-- 1. BUSINESS CONFIGURATION SEED
INSERT INTO business_config (key, value, description) VALUES
('BRAND_NAME', '"TechStore Georgia"', 'ბრენდის ოფიციალური სახელი'),
('BUSINESS_TYPE', '"პრემიუმ ელექტრონიკისა და აქსესუარების ონლაინ მაღაზია"', 'საქმიანობის სფერო'),
('CONTACT_INFO', '"+995 32 2 100 200, info@techstore.ge, თბილისი, ჭავჭავაძის გამზ. 25"', 'ოფიციალური კონტაქტი'),
('WORKING_HOURS', '"ორშაბათი - კვირა: 10:00 - 20:00 (Asia/Tbilisi)"', 'სამუშაო საათები'),
('HUMAN_HANDOFF_POLICY', '"ოპერატორზე გადამისამართება ხდება მომხმარებლის მოთხოვნისას, რთული საჩივრის, გადახდის უზუსტობის ან თაღლითობის ეჭვის დროს."', 'ოპერატორზე გადაცემის წესი'),
('PRODUCT_CATALOG', '"ხელმისაწვდომია LOOKUP_PRODUCT ხელსაწყოთი შიდა ბაზიდან"', 'კატალოგის აღწერა'),
('PRICING_POLICY', '"ყველა ფასი ფიქსირებულია ლარში (₾ GEL), მოიცავს დღგ-ს. თვითნებური ფასდაკლება აკრძალულია."', 'ფასწარმოქმნის პოლიტიკა'),
('ACTIVE_PROMOTIONS', '"უფასო მიწოდება 100 ლარზე მეტ შენაძენზე საქართველოს მასშტაბით."', 'აქტიური აქციები'),
('PAYMENT_METHODS', '["BANK_TRANSFER_TBC", "BANK_TRANSFER_BOG"]', 'მხარდაჭერილი გადახდის მეთოდები (JSON მასივი)'),
('ENABLE_COD', 'false', 'ადგილზე გადახდის (Cash on Delivery) ჩამრთველი'),
('CITY_DELIVERY_POLICY', '"თბილისში სტანდარტული მიწოდება ხორციელდება მეორე დღეს."', 'თბილისის მიწოდება'),
('REGIONAL_DELIVERY_POLICY', '"რეგიონებში მიწოდება საქართველოს ფოსტით ან რეგიონული კურიერით 2-3 სამუშაო დღეში."', 'რეგიონული მიწოდება'),
('EXPRESS_DELIVERY_POLICY', '"თბილისში შეკვეთის 14:00-მდე გაფორმებისას — მიწოდება იმავე დღეს 4-5 საათში."', 'ექსპრეს მიწოდება'),
('DELIVERY_FEE_POLICY', '{"city": 5.00, "regional": 9.00, "express": 10.00}', 'მიწოდების ტარიფები (ლარი)'),
('FREE_SHIPPING_POLICY', '{"threshold": 100.00, "enabled": true}', 'უფასო მიწოდების ზღვარი'),
('DELIVERY_TIMEFRAME', '"თბილისი: 24 საათი; რეგიონები: 48-72 საათი"', 'მიწოდების ვადები'),
('RETURN_AND_WARRANTY_POLICY', '"პროდუქციაზე ვრცელდება 1 წლიანი ოფიციალური გარანტია. დაბრუნება/შეცვლა შესაძლებელია 14 კალენდარულ დღეში ქარხნული შეფუთვისა და ჩეკის შენარჩუნებისას."', 'გარანტიისა და დაბრუნების პირობები'),
('BANK_DETAILS', '{"tbc_iban": "GE00TB0000000000000000", "bog_iban": "GE00BG0000000000000000", "recipient_name": "შპს ტექ სთორ ჯორჯია", "payment_description": "შეკვეთის გადახდა"}', 'საბანკო რეკვიზიტები')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 2. SAMPLE PRODUCTS & VARIANTS
DO $$
DECLARE
    v_prod1 UUID;
    v_prod2 UUID;
    v_prod3 UUID;
    v_prod4 UUID;
BEGIN
    -- Product 1: Apple AirPods 3
    INSERT INTO products (sku, name, name_ka, description, description_ka, category, base_price, warranty_info)
    VALUES (
        'AIRPODS-3',
        'Apple AirPods 3rd Gen',
        'Apple AirPods 3 (მე-3 თაობა)',
        'Apple AirPods 3 with Lightning Charging Case, Spatial Audio',
        'Apple AirPods 3 უსადენო ყურსასმენები Lightning დამტენი ქეისით, სივრცითი აუდიო',
        'Audio',
        249.00,
        '1 წლიანი ოფიციალური გარანტია'
    ) RETURNING id INTO v_prod1;

    INSERT INTO product_variants (product_id, variant_sku, name, stock_quantity, low_stock_threshold)
    VALUES (v_prod1, 'AIRPODS-3-WHT', 'თეთრი (White)', 18, 5);

    -- Product 2: JBL Flip 6
    INSERT INTO products (sku, name, name_ka, description, description_ka, category, base_price, warranty_info)
    VALUES (
        'JBL-FLIP-6',
        'JBL Flip 6 Portable Bluetooth Speaker',
        'JBL Flip 6 პორტატული დინამიკი',
        'IP67 waterproof and dustproof portable Bluetooth speaker',
        'წყალგაუმტარი (IP67) პორტატული ბლუთუზ დინამიკი, 12 საათიანი ელემენტი',
        'Audio',
        189.00,
        '1 წლიანი ოფიციალური გარანტია'
    ) RETURNING id INTO v_prod2;

    INSERT INTO product_variants (product_id, variant_sku, name, stock_quantity, low_stock_threshold)
    VALUES 
    (v_prod2, 'JBL-FLIP6-BLK', 'შავი (Black)', 9, 3),
    (v_prod2, 'JBL-FLIP6-BLU', 'ლურჯი (Blue)', 6, 2);

    -- Product 3: Apple iPhone 15
    INSERT INTO products (sku, name, name_ka, description, description_ka, category, base_price, warranty_info)
    VALUES (
        'IPHONE-15',
        'Apple iPhone 15',
        'Apple iPhone 15 სმარტფონი',
        'Dynamic Island, 48MP Main camera, USB-C',
        'სმარტფონი Dynamic Island-ით, 48MP მთავარი კამერით და USB-C პორტით',
        'Smartphones',
        2499.00,
        '1 წლიანი ოფიციალური Apple გარანტია'
    ) RETURNING id INTO v_prod3;

    INSERT INTO product_variants (product_id, variant_sku, name, price_override, stock_quantity, low_stock_threshold)
    VALUES 
    (v_prod3, 'IPHONE15-128-BLK', '128GB შავი (Black)', 2499.00, 2, 5), -- Low stock demo
    (v_prod3, 'IPHONE15-256-BLU', '256GB ლურჯი (Blue)', 2849.00, 8, 3);

    -- Product 4: Baseus GaN 65W Fast Charger
    INSERT INTO products (sku, name, name_ka, description, description_ka, category, base_price, warranty_info)
    VALUES (
        'BASEUS-GAN-65W',
        'Baseus GaN 65W Fast Charger',
        'Baseus GaN 65W სწრაფი დამტენი',
        '3-Port Fast Charger (2x USB-C + 1x USB-A)',
        '3-პორტიანი კომპაქტური სწრაფი დამტენი (2x Type-C + 1x USB-A)',
        'Accessories',
        99.00,
        '6 თვიანი გარანტია'
    ) RETURNING id INTO v_prod4;

    INSERT INTO product_variants (product_id, variant_sku, name, stock_quantity, low_stock_threshold)
    VALUES (v_prod4, 'BASEUS-GAN-65W-BLK', 'შავი (Black)', 25, 5);
END $$;
