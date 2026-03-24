<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();

    $statement = Database::prepare(
        "SELECT n.id, n.type, n.entity_type, n.entity_id, n.message, n.is_read, n.created_at
         FROM notifications n
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 100"
    );
    $statement->bind_param("s", $authUser["id"]);
    $statement->execute();
    $result = $statement->get_result();

    $notifications = [];
    $unreadCount = 0;

    while ($row = $result ? $result->fetch_assoc() : null) {
        if (!$row) {
            break;
        }

        $isRead = intval($row["is_read"] ?? 0) === 1;
        if (!$isRead) {
            $unreadCount++;
        }

        $notifications[] = [
            "id" => intval($row["id"] ?? 0),
            "type" => $row["type"] ?? "system",
            "entityType" => $row["entity_type"] ?? "",
            "entityId" => $row["entity_id"] ?? "",
            "message" => $row["message"] ?? "",
            "isRead" => $isRead,
            "createdAt" => $row["created_at"] ?? ""
        ];
    }

    $statement->close();

    json_response(200, true, "Notifications loaded.", [
        "notifications" => $notifications,
        "unreadCount" => $unreadCount
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load notifications.");
}
