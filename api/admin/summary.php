<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
initialize_core_schema();
require_admin_authenticated_user();

try {
    $counts = [
        "usersTotal" => 0,
        "studentsTotal" => 0,
        "expertsTotal" => 0,
        "postsTotal" => 0,
        "ratingsTotal" => 0,
        "notificationsTotal" => 0,
        "unreadNotifications" => 0
    ];

    $result = Database::search("SELECT COUNT(*) AS total FROM users");
    $counts["usersTotal"] = intval(($result->fetch_assoc()["total"] ?? 0));

    $result = Database::search("SELECT role, COUNT(*) AS total FROM users GROUP BY role");
    while ($row = $result->fetch_assoc()) {
        if (($row["role"] ?? "") === "student") {
            $counts["studentsTotal"] = intval($row["total"] ?? 0);
        }
        if (($row["role"] ?? "") === "expert") {
            $counts["expertsTotal"] = intval($row["total"] ?? 0);
        }
    }

    $result = Database::search("SELECT COUNT(*) AS total FROM posts WHERE deleted_at IS NULL");
    $counts["postsTotal"] = intval(($result->fetch_assoc()["total"] ?? 0));

    $result = Database::search("SELECT COUNT(*) AS total FROM expert_ratings");
    $counts["ratingsTotal"] = intval(($result->fetch_assoc()["total"] ?? 0));

    $result = Database::search("SELECT COUNT(*) AS total FROM notifications");
    $counts["notificationsTotal"] = intval(($result->fetch_assoc()["total"] ?? 0));

    $result = Database::search("SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0");
    $counts["unreadNotifications"] = intval(($result->fetch_assoc()["total"] ?? 0));

    json_response(200, true, "Summary loaded.", ["summary" => $counts]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load dashboard summary.");
}
