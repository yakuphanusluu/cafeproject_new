<?php
require_once 'config.php';
setCORS();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'convert') {
    handleConvert();
} else {
    sendJSON(['error' => 'Geçersiz action'], 400);
}

function handleConvert() {
    $data = getRequestBody();
    $token = $data['token'] ?? '';
    $amount = intval($data['amount'] ?? 100);

    if (!$token) {
        sendJSON(['error' => 'Token gerekli'], 401);
    }

    // amount 100'ün katı olmalı
    if ($amount < 100 || $amount % 100 !== 0) {
        sendJSON(['error' => 'Miktar 100\'ün katı olmalı'], 400);
    }

    $db = getDB();

    // Kullanıcının yeterli yıldız tozu var mı?
    $stmt = $db->prepare("SELECT star_dust, stars FROM users WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        sendJSON(['error' => 'Kullanıcı bulunamadı'], 404);
    }

    if ($user['star_dust'] < $amount) {
        sendJSON(['error' => 'Yetersiz yıldız tozu'], 400);
    }

    $starsToAdd = $amount / 100;

    $updateStmt = $db->prepare("UPDATE users SET star_dust = star_dust - ?, stars = stars + ? WHERE token = ?");
    $updateStmt->bind_param('iis', $amount, $starsToAdd, $token);
    $updateStmt->execute();

    sendJSON([
        'success' => true,
        'stars_added' => $starsToAdd,
        'remaining_dust' => intval($user['star_dust']) - $amount,
        'total_stars' => intval($user['stars']) + $starsToAdd
    ]);
}
