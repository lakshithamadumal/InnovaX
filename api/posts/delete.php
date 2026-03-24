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

    $findPost = Database::prepare("SELECT id, author_id FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $findPost->bind_param("s", $postId);
    $findPost->execute();
    $result = $findPost->get_result();
    $post = $result ? $result->fetch_assoc() : null;
    $findPost->close();

    if (!$post) {
        json_response(404, false, "Post not found.");
    }

    if (($post["author_id"] ?? "") !== ($authUser["id"] ?? "")) {
        json_response(403, false, "You can only delete your own posts.");
    }

    $deletePost = Database::prepare("UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?");
    $deletePost->bind_param("s", $postId);
    $deletePost->execute();
    $deletePost->close();

    json_response(200, true, "Post deleted.", [
        "postId" => $postId
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to delete post.");
}
