<?php
/**
 * Brew & Bean — Veritabanı Kurulumu
 * Bu dosyayı tarayıcıdan bir kez çalıştırın: https://siteniz.com/api/setup.php
 */
require_once __DIR__ . '/config.php';

setCORS();

$db = getDB();

$queries = [
    // Kullanicilar tablosu (Auth)
    "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_code VARCHAR(6) DEFAULT NULL,
        reset_code VARCHAR(6) DEFAULT NULL,
        token VARCHAR(64) DEFAULT NULL,
        stars INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // Siparişler tablosu
    "CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(20) NOT NULL UNIQUE,
        customer_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) DEFAULT '',
        table_no INT NOT NULL DEFAULT 0,
        payment_method ENUM('kart', 'nakit', 'yildiz') NOT NULL DEFAULT 'nakit',
        status ENUM('alindi', 'hazirlaniyor', 'hazir', 'teslim_edildi') NOT NULL DEFAULT 'alindi',
        note TEXT DEFAULT NULL,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        customer_token VARCHAR(64) DEFAULT NULL,
        stars_awarded TINYINT(1) NOT NULL DEFAULT 0,
        used_stars TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        INDEX idx_token (customer_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // Sipariş kalemleri tablosu
    "CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        emoji VARCHAR(10) DEFAULT '',
        size_label VARCHAR(30) DEFAULT '',
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        qty INT NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // Günsonu raporları tablosu
    "CREATE TABLE IF NOT EXISTS daily_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_date DATE NOT NULL,
        total_orders INT NOT NULL DEFAULT 0,
        total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_items INT NOT NULL DEFAULT 0,
        card_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
        cash_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
        orders_data JSON DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_date (report_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "ALTER TABLE users ADD COLUMN stars INT NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN stars_awarded TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN used_stars TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE orders MODIFY COLUMN payment_method ENUM('kart', 'nakit', 'yildiz') NOT NULL DEFAULT 'nakit'"
];

$results = [];
$allSuccess = true;

foreach ($queries as $i => $sql) {
    if ($db->query($sql)) {
        $results[] = "✅ Tablo " . ($i + 1) . " başarıyla oluşturuldu.";
    } else {
        $results[] = "❌ Tablo " . ($i + 1) . " hatası: " . $db->error;
        $allSuccess = false;
    }
}

$db->close();

// HTML çıktı (tek seferlik kurulum sayfası)
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Brew & Bean — DB Kurulum</title>
    <style>
        body { font-family: system-ui; max-width: 600px; margin: 60px auto; padding: 20px; background: #faf8f5; }
        h1 { color: #1a1a2e; }
        .result { padding: 12px 16px; margin: 8px 0; border-radius: 8px; background: #fff; border: 1px solid #e8e0d8; }
        .success { color: #2d8a4e; border-color: #2d8a4e; background: #f0fdf4; }
        .error { color: #d44b4b; border-color: #d44b4b; background: #fef2f2; }
        .warning { margin-top: 20px; padding: 16px; background: #fff3cd; border-radius: 8px; color: #856404; }
    </style>
</head>
<body>
    <h1>☕ Brew & Bean — Veritabanı Kurulumu</h1>
    <?php foreach ($results as $r): ?>
        <div class="result <?= str_contains($r, '✅') ? 'success' : 'error' ?>"><?= $r ?></div>
    <?php endforeach; ?>

    <?php if ($allSuccess): ?>
        <div class="result success">🎉 Tüm tablolar hazır! Sistemi kullanmaya başlayabilirsiniz.</div>
        <div class="warning">⚠️ Güvenlik için bu dosyayı sunucudan silin veya yeniden adlandırın.</div>
    <?php endif; ?>
</body>
</html>
