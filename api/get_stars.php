<?php
require_once 'config.php';

header('Content-Type: application/json');

$token = $_GET['token'] ?? '';
if (!$token) {
    echo json_encode(['stars' => 0]);
    exit;
}

$db = getDB();
$stmt = $db->prepare("SELECT stars FROM users WHERE token = ?");
$stmt->bind_param('s', $token);
$stmt->execute();
$res = $stmt->get_result()->fetch_assoc();

if ($res) {
    echo json_encode(['stars' => intval($res['stars'])]);
} else {
    echo json_encode(['stars' => 0]);
}
