<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$file = __DIR__ . '/location.json';

if ($method === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode(['latitude' => 0.0, 'longitude' => 0.0, 'radius' => 100]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $lat = isset($input['lat']) ? (float)$input['lat'] : (isset($_POST['lat']) ? (float)$_POST['lat'] : 0.0);
    $lng = isset($input['lng']) ? (float)$input['lng'] : (isset($_POST['lng']) ? (float)$_POST['lng'] : 0.0);
    $radius = isset($input['radius']) ? (int)$input['radius'] : (isset($_POST['radius']) ? (int)$_POST['radius'] : 100);
    
    if ($lat === 0.0 && $lng === 0.0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid location data']);
        exit;
    }

    $data = [
        'latitude' => $lat,
        'longitude' => $lng,
        'radius' => $radius
    ];

    file_put_contents($file, json_encode($data));
    echo json_encode(['success' => true, 'message' => 'Location updated successfully']);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
