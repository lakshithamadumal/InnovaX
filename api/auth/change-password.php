<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    $payload = read_json_body();

    $currentPassword = (string)($payload["current_password"] ?? "");
    $newPassword = (string)($payload["new_password"] ?? "");

    if ($currentPassword === "" || $newPassword === "") {
        json_response(400, false, "Current password and new password are required.");
    }

    if (strlen($newPassword) < 6) {
        json_response(400, false, "New password must be at least 6 characters.");
    }

    $findUser = Database::prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
    $findUser->bind_param("s", $authUser["id"]);
    $findUser->execute();
    $result = $findUser->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $findUser->close();

    if (!$row || !password_verify($currentPassword, $row["password_hash"])) {
        json_response(401, false, "Current password is incorrect.");
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = Database::prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $update->bind_param("ss", $newHash, $authUser["id"]);
    $update->execute();
    $update->close();

    json_response(200, true, "Password updated.");
} catch (Exception $exception) {
    json_response(500, false, "Unable to update password.");
}
