<?php
/**
 * Brew & Bean — Sipariş API
 * POST: Yeni sipariş oluştur
 * GET: Günün siparişlerini listele veya müşteri token ile sorgula
 */
require_once __DIR__ . '/config.php';

setCORS();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGet();
} elseif ($method === 'POST') {
    handlePost();
} else {
    sendJSON(['error' => 'Method not allowed'], 405);
}

// ==========================================
// GET — Siparişleri Listele
// ==========================================
function handleGet() {
    $db = getDB();

    // Müşteri kendi siparişini sorguluyorsa
    if (!empty($_GET['customer_token'])) {
        $token = $db->real_escape_string($_GET['customer_token']);
        $stmt = $db->prepare("SELECT id, order_no, customer_name, table_no, payment_method, status, note, subtotal, created_at FROM orders WHERE customer_token = ? ORDER BY created_at DESC LIMIT 1");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $result = $stmt->get_result();
        $order = $result->fetch_assoc();

        if (!$order) {
            sendJSON(['error' => 'Sipariş bulunamadı'], 404);
        }

        // Sipariş kalemlerini de getir
        $order['items'] = getOrderItems($db, $order['id']);
        sendJSON($order);
    }

    // Tüm günün siparişlerini getir (barista/admin)
    $today = date('Y-m-d');
    $stmt = $db->prepare("SELECT id, order_no, customer_name, phone, table_no, payment_method, status, note, subtotal, created_at, updated_at FROM orders WHERE DATE(created_at) = ? ORDER BY created_at DESC");
    $stmt->bind_param('s', $today);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $row['items'] = getOrderItems($db, $row['id']);
        $orders[] = $row;
    }

    sendJSON($orders);
}

// ==========================================
// POST — Yeni Sipariş Oluştur
// ==========================================
function handlePost() {
    $db = getDB();
    $data = getRequestBody();

    // Validasyon
    if (empty($data['customer_name'])) {
        sendJSON(['error' => 'Müşteri adı gerekli'], 400);
    }
    if (empty($data['items']) || !is_array($data['items'])) {
        sendJSON(['error' => 'Sipariş kalemleri gerekli'], 400);
    }
    if (empty($data['table_no']) || intval($data['table_no']) < 1) {
        sendJSON(['error' => 'Masa numarası gerekli'], 400);
    }

    $orderNo = generateOrderNo();
    $customerName = $db->real_escape_string($data['customer_name']);
    $phone = $db->real_escape_string($data['phone'] ?? '');
    $tableNo = intval($data['table_no']);
    $paymentMethod = in_array($data['payment_method'] ?? '', ['kart', 'nakit', 'yildiz']) ? $data['payment_method'] : 'nakit';
    $note = $db->real_escape_string($data['note'] ?? '');
    $userToken = $db->real_escape_string($data['user_token'] ?? '');
    $usedStars = isset($data['used_stars']) && $data['used_stars'] ? 1 : 0;
    
    // Yildiz kullanimi kontrolu
    if ($usedStars) {
        if (empty($userToken)) {
            sendJSON(['error' => 'Yildiz kullanmak icin oturum acmalisiniz'], 400);
        }
        $checkStmt = $db->prepare("SELECT id, stars FROM users WHERE token = ?");
        $checkStmt->bind_param('s', $userToken);
        $checkStmt->execute();
        $userRow = $checkStmt->get_result()->fetch_assoc();
        
        if (!$userRow || $userRow['stars'] < 10) {
            sendJSON(['error' => 'Yeterli yildiziniz yok (En az 10 gerekli)'], 400);
        }
    }

    $customerToken = bin2hex(random_bytes(16));
    if (!empty($userToken)) {
        // If we have a user token, use it as customer_token so we can track them
        $customerToken = $userToken;
    }

    // Subtotal hesapla
    $subtotal = 0;
    foreach ($data['items'] as $item) {
        $subtotal += floatval($item['price']) * intval($item['qty']);
    }
    
    if ($usedStars) {
        $subtotal = 0; // Bedava kahve
    }

    // Siparis kaydet
    $stmt = $db->prepare("INSERT INTO orders (order_no, customer_name, phone, table_no, payment_method, status, note, subtotal, customer_token, used_stars) VALUES (?, ?, ?, ?, ?, 'alindi', ?, ?, ?, ?)");
    $stmt->bind_param('sssissdsi', $orderNo, $customerName, $phone, $tableNo, $paymentMethod, $note, $subtotal, $customerToken, $usedStars);

    if (!$stmt->execute()) {
        sendJSON(['error' => 'Siparis kaydedilemedi: ' . $db->error], 500);
    }

    $orderId = $db->insert_id;
    
    if ($usedStars) {
        // Yildizlari dus
        $deductStmt = $db->prepare("UPDATE users SET stars = stars - 10 WHERE token = ?");
        $deductStmt->bind_param('s', $userToken);
        $deductStmt->execute();
    }

    // Sipariş kalemlerini kaydet
    $stmtItem = $db->prepare("INSERT INTO order_items (order_id, item_name, emoji, size_label, price, qty) VALUES (?, ?, ?, ?, ?, ?)");

    foreach ($data['items'] as $item) {
        $itemName = $item['name'] ?? '';
        $emoji = $item['emoji'] ?? '';
        $sizeLabel = $item['size_label'] ?? '';
        $price = floatval($item['price']);
        $qty = intval($item['qty']);

        $stmtItem->bind_param('isssdi', $orderId, $itemName, $emoji, $sizeLabel, $price, $qty);
        $stmtItem->execute();
    }

    sendJSON([
        'success' => true,
        'order_no' => $orderNo,
        'order_id' => $orderId,
        'customer_token' => $customerToken,
        'message' => 'Siparişiniz alındı!'
    ], 201);
}

// ==========================================
// Yardımcı: Sipariş Kalemlerini Getir
// ==========================================
function getOrderItems($db, $orderId) {
    $stmt = $db->prepare("SELECT item_name, emoji, size_label, price, qty FROM order_items WHERE order_id = ?");
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    return $items;
}
