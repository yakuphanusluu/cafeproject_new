<?php
require_once __DIR__ . '/config.php';

setCORS();

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method !== 'POST') {
    sendJSON(['error' => 'Method not allowed'], 405);
}

$action = $_GET['action'] ?? '';
$db = getDB();
$data = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'register':
        handleRegister($db, $data);
        break;
    case 'verify_email':
        handleVerifyEmail($db, $data);
        break;
    case 'login':
        handleLogin($db, $data);
        break;
    case 'forgot_password':
        handleForgotPassword($db, $data);
        break;
    case 'reset_password':
        handleResetPassword($db, $data);
        break;
    case 'update_profile':
        handleUpdateProfile($db, $data);
        break;
    case 'update_password':
        handleUpdatePassword($db, $data);
        break;
    case 'get_profile':
        handleGetProfile($db, $data);
        break;
    default:
        sendJSON(['error' => 'Geçersiz islem']);
}

function handleGetProfile($db, $data) {
    $token = trim($data['token'] ?? '');
    if (!$token) {
        sendJSON(['error' => 'Token gerekli']);
    }

    $stmt = $db->prepare("SELECT full_name, username, email, stars FROM users WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if ($user) {
        sendJSON([
            'success' => true,
            'user' => [
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'stars' => intval($user['stars'])
            ]
        ]);
    } else {
        sendJSON(['error' => 'Gecersiz oturum']);
    }
}

function sendVerificationEmail($email, $code) {
    $subject = "Brew & Bean - E-Posta Onay Kodunuz";
    $message = "Merhaba,\n\nBrew & Bean uygulamasina hosgeldiniz.\nE-posta onay kodunuz: $code\n\nBu kodu uygulamaya girerek hesabinizi aktif edebilirsiniz.";
    $headers = "From: Brew & Bean <info@brewandbean.com>\r\n";
    $headers .= "Reply-To: info@brewandbean.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // mail() fonksiyonu bazi sunucularda kapali olabilir ama Hostinger'da genellikle aciktir.
    @mail($email, $subject, $message, $headers);
}

function handleRegister($db, $data) {
    $fullName = trim($data['full_name'] ?? '');
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$fullName || !$username || !$email || !$password) {
        sendJSON(['error' => 'Tum alanlari doldurun']);
    }

    // Check if email or username exists
    $stmt = $db->prepare("SELECT id, is_verified FROM users WHERE email = ? OR username = ?");
    $stmt->bind_param('ss', $email, $username);
    $stmt->execute();
    $existingUser = $stmt->get_result()->fetch_assoc();

    if ($existingUser) {
        if ($existingUser['is_verified'] == 1) {
            sendJSON(['error' => 'Bu e-posta veya kullanici adi zaten kullaniliyor']);
        } else {
            // Eger hesap onaylanmamissa (is_verified = 0), eski hatali kaydi silip yeniden yazmasina izin ver.
            $deleteStmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $deleteStmt->bind_param('i', $existingUser['id']);
            $deleteStmt->execute();
        }
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $code = sprintf("%06d", mt_rand(1, 999999));

    $stmt = $db->prepare("INSERT INTO users (full_name, username, email, password_hash, verification_code) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('sssss', $fullName, $username, $email, $hash, $code);
    
    if ($stmt->execute()) {
        sendVerificationEmail($email, $code);
        sendJSON(['success' => true, 'message' => 'Kayit basarili, dogrulama kodu e-postaniza gonderildi.']);
    } else {
        sendJSON(['error' => 'Kayit olusturulamadi']);
    }
}

function handleVerifyEmail($db, $data) {
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');

    if (!$email || !$code) {
        sendJSON(['error' => 'E-posta ve kod gerekli']);
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND verification_code = ?");
    $stmt->bind_param('ss', $email, $code);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        sendJSON(['error' => 'Gecersiz veya hatali dogrulama kodu']);
    }

    // Update to verified and create token
    $token = bin2hex(random_bytes(32));
    $stmt = $db->prepare("UPDATE users SET is_verified = 1, verification_code = NULL, token = ? WHERE id = ?");
    $stmt->bind_param('si', $token, $user['id']);
    
    if ($stmt->execute()) {
        sendJSON([
            'success' => true, 
            'message' => 'Hesabiniz onaylandi',
            'token' => $token
        ]);
    } else {
        sendJSON(['error' => 'Onaylama hatasi']);
    }
}

function handleLogin($db, $data) {
    $login = trim($data['login'] ?? ''); // Email veya username
    $password = $data['password'] ?? '';

    if (!$login || !$password) {
        sendJSON(['error' => 'Kullanici adi/E-posta ve sifre gerekli']);
    }

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
    $stmt->bind_param('ss', $login, $login);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendJSON(['error' => 'Hatali giris bilgileri']);
    }

    if ($user['is_verified'] == 0) {
        // Yeniden kod gonder
        $code = sprintf("%06d", mt_rand(1, 999999));
        $stmt = $db->prepare("UPDATE users SET verification_code = ? WHERE id = ?");
        $stmt->bind_param('si', $code, $user['id']);
        $stmt->execute();
        sendVerificationEmail($user['email'], $code);

        sendJSON([
            'error' => 'Hesabiniz onaylanmamis',
            'needs_verification' => true,
            'email' => $user['email']
        ]);
    }

    $token = bin2hex(random_bytes(32));
    $stmt = $db->prepare("UPDATE users SET token = ? WHERE id = ?");
    $stmt->bind_param('si', $token, $user['id']);
    $stmt->execute();

        sendJSON([
            'success' => true,
            'token' => $token,
            'user' => [
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'stars' => intval($user['stars'])
            ]
        ]);
}

function handleForgotPassword($db, $data) {
    $email = trim($data['email'] ?? '');
    
    if (!$email) {
        sendJSON(['error' => 'E-posta gerekli']);
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        // Güvenlik icin mail yoksa da basarili don
        sendJSON(['success' => true]);
    }

    $code = sprintf("%06d", mt_rand(1, 999999));
    $stmt = $db->prepare("UPDATE users SET reset_code = ? WHERE email = ?");
    $stmt->bind_param('ss', $code, $email);
    $stmt->execute();

    $subject = "Brew & Bean - Sifre Sifirlama Kodu";
    $message = "Sifre sifirlama kodunuz: $code\n\nBu kodu kimseyle paylasmayin.";
    $headers = "From: Brew & Bean <info@brewandbean.com>\r\n";
    $headers .= "Reply-To: info@brewandbean.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail($email, $subject, $message, $headers);

    sendJSON(['success' => true]);
}

function handleResetPassword($db, $data) {
    $email = trim($data['email'] ?? '');
    $code = trim($data['code'] ?? '');
    $newPassword = $data['new_password'] ?? '';

    if (!$email || !$code || !$newPassword) {
        sendJSON(['error' => 'E-posta, kod ve yeni sifre gerekli'], 400);
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND reset_code = ?");
    $stmt->bind_param('ss', $email, $code);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        sendJSON(['error' => 'Gecersiz veya suresi dolmus kod'], 400);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?");
    $stmt->bind_param('si', $hash, $user['id']);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Sifreniz basariyla guncellendi.']);
    } else {
        sendJSON(['error' => 'Sifre guncellenemedi'], 500);
    }
}

function handleUpdateProfile($db, $data) {
    $token = trim($data['token'] ?? '');
    $fullName = trim($data['full_name'] ?? '');
    $email = trim($data['email'] ?? '');

    if (!$token || !$fullName || !$email) {
        sendJSON(['error' => 'Eksik bilgi gonderildi']);
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        sendJSON(['error' => 'Gecersiz oturum']);
    }

    // Check if new email is used by someone else
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->bind_param('si', $email, $user['id']);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        sendJSON(['error' => 'Bu e-posta baska bir hesaba ait']);
    }

    $stmt = $db->prepare("UPDATE users SET full_name = ?, email = ? WHERE id = ?");
    $stmt->bind_param('ssi', $fullName, $email, $user['id']);
    
    if ($stmt->execute()) {
        // Send back updated user data
        $stmt = $db->prepare("SELECT full_name, username, email, stars FROM users WHERE id = ?");
        $stmt->bind_param('i', $user['id']);
        $stmt->execute();
        $updatedUser = $stmt->get_result()->fetch_assoc();

        sendJSON([
            'success' => true,
            'message' => 'Profil guncellendi',
            'user' => [
                'full_name' => $updatedUser['full_name'],
                'username' => $updatedUser['username'],
                'email' => $updatedUser['email'],
                'stars' => intval($updatedUser['stars'])
            ]
        ]);
    } else {
        sendJSON(['error' => 'Guncelleme basarisiz']);
    }
}

function handleUpdatePassword($db, $data) {
    $token = trim($data['token'] ?? '');
    $currentPass = $data['current_password'] ?? '';
    $newPass = $data['new_password'] ?? '';

    if (!$token || !$currentPass || !$newPass) {
        sendJSON(['error' => 'Eksik bilgi gonderildi']);
    }

    $stmt = $db->prepare("SELECT id, password_hash FROM users WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify($currentPass, $user['password_hash'])) {
        sendJSON(['error' => 'Mevcut sifreniz hatali']);
    }

    $hash = password_hash($newPass, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->bind_param('si', $hash, $user['id']);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Sifreniz basariyla guncellendi']);
    } else {
        sendJSON(['error' => 'Sifre guncellenemedi']);
    }
}
