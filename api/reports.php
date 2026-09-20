<?php
/**
 * Brew & Bean — Raporlar API
 * GET: Geçmiş günsonu raporlarını listele
 * GET ?id=X: Tekil rapor detayı
 */
require_once __DIR__ . '/config.php';

setCORS();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$db = getDB();

// Tekil rapor detayı
if (!empty($_GET['id'])) {
    $id = intval($_GET['id']);
    $stmt = $db->prepare("SELECT * FROM daily_reports WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $report = $result->fetch_assoc();

    if (!$report) {
        sendJSON(['error' => 'Rapor bulunamadı'], 404);
    }

    // JSON veriyi decode et
    $report['orders_data'] = json_decode($report['orders_data'], true);
    sendJSON($report);
}

// Tüm raporları listele
$result = $db->query("SELECT id, report_date, total_orders, total_revenue, total_items, card_revenue, cash_revenue, created_at FROM daily_reports ORDER BY report_date DESC LIMIT 90");

$reports = [];
while ($row = $result->fetch_assoc()) {
    $reports[] = $row;
}

sendJSON($reports);
