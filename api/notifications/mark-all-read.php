<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();

    $statement = Database::prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
    $statement->bind_param("s", $authUser["id"]);
    $statement->execute();
    $affected = intval($statement->affected_rows);
    $statement->close();

    json_response(200, true, "Notifications marked as read.", [
        "updated" => $affected
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to update notifications.");
}
