<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    $payload = read_json_body();
    $postId = trim((string)($payload["post_id"] ?? ""));

    if ($postId === "") {
        json_response(400, false, "Post ID is required.");
    }

    $checkPost = Database::prepare("SELECT id, title FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $checkPost->bind_param("s", $postId);
    $checkPost->execute();
    $postResult = $checkPost->get_result();
    $post = $postResult ? $postResult->fetch_assoc() : null;
    $checkPost->close();

    if (!$post) {
        json_response(404, false, "Post not found.");
    }

    $checkSaved = Database::prepare("SELECT post_id FROM saved_posts WHERE post_id = ? AND user_id = ? LIMIT 1");
    $checkSaved->bind_param("ss", $postId, $authUser["id"]);
    $checkSaved->execute();
    $savedResult = $checkSaved->get_result();
    $savedRow = $savedResult ? $savedResult->fetch_assoc() : null;
    $checkSaved->close();

    $saved = false;

    if ($savedRow) {
        $deleteSaved = Database::prepare("DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?");
        $deleteSaved->bind_param("ss", $postId, $authUser["id"]);
        $deleteSaved->execute();
        $deleteSaved->close();
        $saved = false;
    } else {
        $insertSaved = Database::prepare("INSERT INTO saved_posts (post_id, user_id) VALUES (?, ?)");
        $insertSaved->bind_param("ss", $postId, $authUser["id"]);
        $insertSaved->execute();
        $insertSaved->close();
        $saved = true;

        if (strtolower(trim((string)($authUser["role"] ?? ""))) === "expert") {
            $titleSnippet = substr(trim((string)($post["title"] ?? "post")), 0, 80);
            create_notification($authUser["id"], "system", "post", $postId, "You saved a post: " . $titleSnippet, null);
        }
    }

    json_response(200, true, "Saved status updated.", [
        "postId" => $postId,
        "saved" => $saved
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to update saved status.");
}
