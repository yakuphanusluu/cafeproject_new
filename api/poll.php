<?php
/**
 * Brew & Bean — Polling API
 * GET: Son güncellenen siparişleri döndür
 * Barista, Admin ve Müşteri panelleri bu endpoint'i 3 saniyede bir çağırır
 */
require_once __DIR__ . '/config.php';

setCORS();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$db = getDB();

// Son kontrol zamanı (ISO 8601 veya MySQL datetime formatı)
$since = $_GET['since'] ?? date('Y-m-d H:i:s', strtotime('-30 seconds'));
$since = $db->real_escape_string($since);

$today = date('Y-m-d');

// Belirtilen zamandan sonra güncellenen siparişleri getir
$stmt = $db->prepare("
    SELECT id, order_no, customer_name, phone, table_no, payment_method, status, note, subtotal, created_at, updated_at 
    FROM orders 
    WHERE DATE(created_at) = ? AND updated_at > ?
    ORDER BY updated_at DESC
");
$stmt->bind_param('ss', $today, $since);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
while ($row = $result->fetch_assoc()) {
    // Sipariş kalemlerini de getir
    $stmtItems = $db->prepare("SELECT item_name, emoji, size_label, price, qty FROM order_items WHERE order_id = ?");
    $stmtItems->bind_param('i', $row['id']);
    $stmtItems->execute();
    $itemsResult = $stmtItems->get_result();

    $row['items'] = [];
    while ($item = $itemsResult->fetch_assoc()) {
        $row['items'][] = $item;
    }

    $orders[] = $row;
}

sendJSON([
    'orders' => $orders,
    'server_time' => date('Y-m-d H:i:s'),
    'count' => count($orders)
]);
