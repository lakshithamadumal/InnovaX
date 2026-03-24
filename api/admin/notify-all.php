<?php

require_once __DIR__ . "/bootstrap.php";

require_method("POST");
initialize_core_schema();
$admin = require_admin_authenticated_user();

$body = read_json_body();
$message = trim((string)($body["message"] ?? ""));

if ($message === "") {
    json_response(400, false, "Notification message is required.");
}

try {
    $usersResult = Database::search("SELECT id FROM users");
    $inserted = 0;

    while ($row = $usersResult->fetch_assoc()) {
        $userId = trim((string)($row["id"] ?? ""));
        if ($userId === "") {
            continue;
        }

        $ok = create_notification($userId, "system", "admin_broadcast", "all", $message, null);
        if ($ok) {
            $inserted++;
        }
    }

    json_response(200, true, "Broadcast notification sent.", [
        "admin" => $admin["username"],
        "message" => $message,
        "deliveredCount" => $inserted
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to send notifications.");
}
