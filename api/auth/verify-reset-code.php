<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

$payload = read_json_body();
$email = trim((string)($payload["email"] ?? ""));
$code = trim((string)($payload["code"] ?? ""));

if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, false, "A valid email is required.");
}

if (!preg_match('/^\d{6}$/', $code)) {
    json_response(400, false, "A valid 6-digit verification code is required.");
}

try {
    $lookup = Database::prepare(
        "SELECT id, reset_code_hash, reset_code_expires_at
         FROM users
         WHERE email = ?
         LIMIT 1"
    );
    $lookup->bind_param("s", $email);
    $lookup->execute();
    $result = $lookup->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $lookup->close();

    if (!$user || trim((string)($user["reset_code_hash"] ?? "")) === "") {
        json_response(400, false, "Invalid or expired verification code.");
    }

    $expiresAt = strtotime((string)($user["reset_code_expires_at"] ?? ""));
    if ($expiresAt === false || $expiresAt < time()) {
        json_response(400, false, "Verification code has expired. Please request a new one.");
    }

    if (!password_verify($code, (string)$user["reset_code_hash"])) {
        json_response(400, false, "Invalid verification code.");
    }

    json_response(200, true, "Verification successful.");
} catch (Exception $exception) {
    json_response(500, false, "Unable to verify code right now.");
}
