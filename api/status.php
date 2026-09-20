<?php
/**
 * Brew & Bean — Sipariş Durum Güncelleme API
 * PUT: Sipariş durumunu güncelle (barista kullanır)
 */
require_once __DIR__ . '/config.php';

setCORS();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$db = getDB();
$data = getRequestBody();

$orderId = intval($data['order_id'] ?? 0);
$newStatus = $data['status'] ?? '';

// Validasyon
if ($orderId < 1) {
    sendJSON(['error' => 'Geçersiz sipariş ID'], 400);
}

$validStatuses = ['alindi', 'hazirlaniyor', 'hazir', 'teslim_edildi'];
if (!in_array($newStatus, $validStatuses)) {
    sendJSON(['error' => 'Geçersiz durum. Geçerli: ' . implode(', ', $validStatuses)], 400);
}

// Siparişin var olduğunu kontrol et
$stmt = $db->prepare("SELECT id, order_no, status FROM orders WHERE id = ?");
$stmt->bind_param('i', $orderId);
$stmt->execute();
$result = $stmt->get_result();
$order = $result->fetch_assoc();

if (!$order) {
    sendJSON(['error' => 'Sipariş bulunamadı'], 404);
}

// Durumu güncelle
$stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
$stmt->bind_param('si', $newStatus, $orderId);

if ($stmt->execute()) {
    sendJSON([
        'success' => true,
        'order_id' => $orderId,
        'order_no' => $order['order_no'],
        'old_status' => $order['status'],
        'new_status' => $newStatus,
        'message' => 'Sipariş durumu güncellendi'
    ]);
} else {
    sendJSON(['error' => 'Güncelleme başarısız: ' . $db->error], 500);
}
