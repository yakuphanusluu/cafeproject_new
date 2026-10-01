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

// Siparisin var oldugunu kontrol et
$stmt = $db->prepare("SELECT id, order_no, status, customer_token, stars_awarded FROM orders WHERE id = ?");
$stmt->bind_param('i', $orderId);
$stmt->execute();
$result = $stmt->get_result();
$order = $result->fetch_assoc();

if (!$order) {
    sendJSON(['error' => 'Siparis bulunamadi'], 404);
}

// Durumu guncelle
$stmt = $db->prepare("UPDATE orders SET status = ? WHERE id = ?");
$stmt->bind_param('si', $newStatus, $orderId);

if ($stmt->execute()) {
    
    // YILDIZ SISTEMI: Eger siparis 'teslim_edildi' yapildiysa ve daha once yildiz verilmediyse
    if ($newStatus === 'teslim_edildi' && $order['stars_awarded'] == 0 && !empty($order['customer_token'])) {
        // Siparisteki toplam urun miktarini (qty) bul
        $qtyStmt = $db->prepare("SELECT SUM(qty) as total_qty FROM order_items WHERE order_id = ?");
        $qtyStmt->bind_param('i', $orderId);
        $qtyStmt->execute();
        $qtyResult = $qtyStmt->get_result()->fetch_assoc();
        $starsEarned = intval($qtyResult['total_qty']);
        
        if ($starsEarned > 0) {
            // Yildizi ver
            $updateUser = $db->prepare("UPDATE users SET stars = stars + ? WHERE token = ?");
            $updateUser->bind_param('is', $starsEarned, $order['customer_token']);
            $updateUser->execute();
            
            if ($updateUser->affected_rows === 0) {
                // Eger bu Firebase token'i users tablosunda yoksa, onu ekle ve yildizi ver!
                // NOT NULL alanlar icin dummy degerler vererek ekleyelim (Google vb. ile giren ama users tablosunda kaydi olmayanlar icin)
                $guestId = uniqid('guest_');
                $guestEmail = $guestId . '@brew.com';
                $insertUser = $db->prepare("INSERT INTO users (full_name, username, email, password_hash, token, stars) VALUES ('Misafir', ?, ?, '', ?, ?)");
                $insertUser->bind_param('sssi', $guestId, $guestEmail, $order['customer_token'], $starsEarned);
                $insertUser->execute();
            }
            
            // Siparisi yildiz verildi olarak isaretle
            $markAwarded = $db->prepare("UPDATE orders SET stars_awarded = 1 WHERE id = ?");
            $markAwarded->bind_param('i', $orderId);
            $markAwarded->execute();
        }
    }

    sendJSON([
        'success' => true,
        'order_id' => $orderId,
        'order_no' => $order['order_no'],
        'old_status' => $order['status'],
        'new_status' => $newStatus,
        'message' => 'Siparis durumu guncellendi'
    ]);
} else {
    sendJSON(['error' => 'Guncelleme basarisiz: ' . $db->error], 500);
}
