<?php
require_once 'config.php';
setCORS();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'can_play') {
    handleCanPlay();
} elseif ($action === 'submit_score') {
    handleSubmitScore();
} else {
    sendJSON(['error' => 'Geçersiz action'], 400);
}

function handleCanPlay() {
    $token = $_GET['token'] ?? '';
    if (!$token) {
        sendJSON(['error' => 'Token gerekli'], 401);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT star_dust, last_play_date FROM users WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        // Token yoksa kullanıcı oluştur
        $guestId = uniqid('guest_');
        $guestEmail = $guestId . '@brew.com';
        $insertStmt = $db->prepare("INSERT INTO users (full_name, username, email, password_hash, token, stars, star_dust) VALUES ('Misafir', ?, ?, '', ?, 0, 0)");
        $insertStmt->bind_param('sss', $guestId, $guestEmail, $token);
        $insertStmt->execute();
        sendJSON(['can_play' => true, 'star_dust' => 0]);
    }

    $today = date('Y-m-d');
    $canPlay = ($user['last_play_date'] !== $today);

    sendJSON([
        'can_play' => $canPlay,
        'star_dust' => intval($user['star_dust'])
    ]);
}

function handleSubmitScore() {
    $data = getRequestBody();
    $token = $data['token'] ?? '';
    $score = intval($data['score'] ?? 0);

    if (!$token) {
        sendJSON(['error' => 'Token gerekli'], 401);
    }
    if ($score < 0 || $score > 500) {
        sendJSON(['error' => 'Geçersiz skor'], 400);
    }

    $db = getDB();
    $today = date('Y-m-d');

    // Bugün zaten oynadı mı kontrol et (güvenlik)
    $checkStmt = $db->prepare("SELECT last_play_date FROM users WHERE token = ?");
    $checkStmt->bind_param('s', $token);
    $checkStmt->execute();
    $user = $checkStmt->get_result()->fetch_assoc();

    if ($user && $user['last_play_date'] === $today) {
        sendJSON(['error' => 'Bugün zaten oynadınız'], 403);
    }

    // Skoru kaydet
    $stmt = $db->prepare("UPDATE users SET star_dust = star_dust + ?, last_play_date = ? WHERE token = ?");
    $stmt->bind_param('iss', $score, $today, $token);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        // Kullanıcı yoksa oluştur
        $guestId = uniqid('guest_');
        $guestEmail = $guestId . '@brew.com';
        $insertStmt = $db->prepare("INSERT INTO users (full_name, username, email, password_hash, token, star_dust, last_play_date) VALUES ('Misafir', ?, ?, '', ?, ?, ?)");
        $insertStmt->bind_param('sssis', $guestId, $guestEmail, $token, $score, $today);
        $insertStmt->execute();
    }

    // Geçmişe kaydet
    $histStmt = $db->prepare("INSERT INTO game_history (user_token, score) VALUES (?, ?)");
    $histStmt->bind_param('si', $token, $score);
    $histStmt->execute();

    // Güncel star_dust'ı döndür
    $getStmt = $db->prepare("SELECT star_dust FROM users WHERE token = ?");
    $getStmt->bind_param('s', $token);
    $getStmt->execute();
    $updated = $getStmt->get_result()->fetch_assoc();

    sendJSON([
        'success' => true,
        'earned' => $score,
        'total_star_dust' => intval($updated['star_dust'])
    ]);
}
