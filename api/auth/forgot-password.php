<?php

require_once __DIR__ . "/../bootstrap.php";
require_once __DIR__ . "/mailer.php";

require_method("POST");
initialize_core_schema();

$payload = read_json_body();
$email = trim((string)($payload["email"] ?? ""));

if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, false, "A valid email is required.");
}

try {
    $lookup = Database::prepare(
        "SELECT id, full_name, email, reset_code_sent_at
         FROM users
         WHERE email = ?
         LIMIT 1"
    );
    $lookup->bind_param("s", $email);
    $lookup->execute();
    $result = $lookup->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $lookup->close();

    if (!$user) {
        json_response(404, false, "No account found for this email.");
    }

    $sentAtRaw = trim((string)($user["reset_code_sent_at"] ?? ""));
    if ($sentAtRaw !== "") {
        $sentAt = strtotime($sentAtRaw);
        if ($sentAt !== false && (time() - $sentAt) < 45) {
            json_response(429, false, "Please wait a few seconds before requesting another code.");
        }
    }

    $code = str_pad((string)random_int(0, 999999), 6, "0", STR_PAD_LEFT);
    $codeHash = password_hash($code, PASSWORD_DEFAULT);
    $expiresAt = date("Y-m-d H:i:s", time() + (15 * 60));

    $update = Database::prepare(
        "UPDATE users
         SET reset_code_hash = ?,
             reset_code_expires_at = ?,
             reset_code_sent_at = NOW()
         WHERE id = ?"
    );
    $update->bind_param("sss", $codeHash, $expiresAt, $user["id"]);
    $update->execute();
    $update->close();

    send_reset_code_email($user["email"], $user["full_name"], $code);

    json_response(200, true, "Verification code has been sent to your email.");
} catch (Exception $exception) {
    json_response(500, false, "Unable to send verification code right now.");
}
