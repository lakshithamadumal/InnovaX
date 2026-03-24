<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $userId = get_authenticated_user_id();
    if ($userId === "") {
        json_response(401, false, "Not authenticated.");
    }

    $user = fetch_user_by_id($userId);
    if (!$user) {
        clear_authenticated_user();
        json_response(401, false, "Session expired.");
    }

    json_response(200, true, "Current user loaded.", [
        "user" => normalize_user_for_client($user)
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load current user.");
}
