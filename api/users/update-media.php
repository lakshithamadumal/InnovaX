<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    $payload = read_json_body();

    $target = strtolower(trim((string)($payload["target"] ?? "")));
    $imageDataUrl = trim((string)($payload["image_data_url"] ?? ""));

    if (!in_array($target, ["avatar", "cover"], true)) {
        json_response(400, false, "Invalid media target.");
    }

    if ($imageDataUrl === "") {
        json_response(400, false, "Image data is required.");
    }

    $uploadedUrl = upload_image_to_imgbb($imageDataUrl, $target . "_" . $authUser["id"]);
    $column = $target === "avatar" ? "profile_image_url" : "cover_image_url";

    $update = Database::prepare("UPDATE users SET {$column} = ? WHERE id = ?");
    $update->bind_param("ss", $uploadedUrl, $authUser["id"]);
    $update->execute();
    $update->close();

    $freshUser = fetch_user_by_id($authUser["id"]);

    json_response(200, true, "Profile media updated.", [
        "user" => normalize_user_for_client($freshUser)
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to update profile media: " . $exception->getMessage());
}
