<?php
require_once 'config.php';

header('Content-Type: application/json');

\ = \['token'] ?? '';
if (!\) {
    echo json_encode(['stars' => 0]);
    exit;
}

\ = getDB();
\ = \->prepare("SELECT stars FROM users WHERE token = ?");
\->bind_param('s', \);
\->execute();
\ = \->get_result()->fetch_assoc();

if (\) {
    echo json_encode(['stars' => intval(\['stars'])]);
} else {
    echo json_encode(['stars' => 0]);
}
