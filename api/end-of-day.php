<?php
/**
 * Brew & Bean — Günsonu API
 * POST: Günün verilerini arşivle ve siparişleri sıfırla
 */
require_once __DIR__ . '/config.php';

setCORS();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$db = getDB();
$today = date('Y-m-d');

// Bugün zaten rapor oluşturulmuş mu kontrol et
$stmt = $db->prepare("SELECT id FROM daily_reports WHERE report_date = ?");
$stmt->bind_param('s', $today);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    sendJSON(['error' => 'Bugün için günsonu raporu zaten oluşturulmuş'], 409);
}

// Günün tüm siparişlerini getir
$stmt = $db->prepare("
    SELECT o.*, GROUP_CONCAT(
        CONCAT(oi.item_name, ' (', oi.size_label, ') x', oi.qty)
        SEPARATOR ', '
    ) as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE DATE(o.created_at) = ?
    GROUP BY o.id
    ORDER BY o.created_at ASC
");
$stmt->bind_param('s', $today);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
$totalRevenue = 0;
$totalItems = 0;
$cardRevenue = 0;
$cashRevenue = 0;
$itemCounts = []; // En çok satılanlar için

while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
    $totalRevenue += floatval($row['subtotal']);

    if ($row['payment_method'] === 'kart') {
        $cardRevenue += floatval($row['subtotal']);
    } else {
        $cashRevenue += floatval($row['subtotal']);
    }

    // Sipariş kalemlerini say
    $stmtItems = $db->prepare("SELECT item_name, qty FROM order_items WHERE order_id = ?");
    $stmtItems->bind_param('i', $row['id']);
    $stmtItems->execute();
    $itemsResult = $stmtItems->get_result();

    while ($item = $itemsResult->fetch_assoc()) {
        $totalItems += intval($item['qty']);
        $name = $item['item_name'];
        $itemCounts[$name] = ($itemCounts[$name] ?? 0) + intval($item['qty']);
    }
}

$totalOrders = count($orders);

if ($totalOrders === 0) {
    sendJSON(['error' => 'Bugün hiç sipariş yok, günsonu yapılamaz'], 400);
}

// En çok satılanları sırala
arsort($itemCounts);
$topItems = array_slice($itemCounts, 0, 5, true);

// Rapor verisini JSON olarak hazırla
$reportData = [
    'orders' => array_map(function($o) {
        return [
            'order_no' => $o['order_no'],
            'customer_name' => $o['customer_name'],
            'table_no' => $o['table_no'],
            'payment_method' => $o['payment_method'],
            'status' => $o['status'],
            'subtotal' => $o['subtotal'],
            'items_summary' => $o['items_summary'],
            'created_at' => $o['created_at']
        ];
    }, $orders),
    'top_items' => $topItems
];

$ordersJson = json_encode($reportData, JSON_UNESCAPED_UNICODE);

// Raporu kaydet
$stmt = $db->prepare("INSERT INTO daily_reports (report_date, total_orders, total_revenue, total_items, card_revenue, cash_revenue, orders_data) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param('sididds', $today, $totalOrders, $totalRevenue, $totalItems, $cardRevenue, $cashRevenue, $ordersJson);

if (!$stmt->execute()) {
    sendJSON(['error' => 'Rapor kaydedilemedi: ' . $db->error], 500);
}

// Sipariş kalemlerini sil (foreign key cascade ile otomatik silinir)
$db->query("DELETE FROM orders WHERE DATE(created_at) = '$today'");

// Başarılı yanıt
sendJSON([
    'success' => true,
    'report' => [
        'date' => $today,
        'total_orders' => $totalOrders,
        'total_revenue' => $totalRevenue,
        'total_items' => $totalItems,
        'card_revenue' => $cardRevenue,
        'cash_revenue' => $cashRevenue,
        'top_items' => $topItems
    ],
    'message' => 'Günsonu raporu oluşturuldu ve siparişler arşivlendi'
]);
