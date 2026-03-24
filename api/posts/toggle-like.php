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

    $checkPost = Database::prepare("SELECT id, author_id, title FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $checkPost->bind_param("s", $postId);
    $checkPost->execute();
    $postResult = $checkPost->get_result();
    $post = $postResult ? $postResult->fetch_assoc() : null;
    $checkPost->close();

    if (!$post) {
        json_response(404, false, "Post not found.");
    }

    $checkLike = Database::prepare("SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1");
    $checkLike->bind_param("ss", $postId, $authUser["id"]);
    $checkLike->execute();
    $likeResult = $checkLike->get_result();
    $likeRow = $likeResult ? $likeResult->fetch_assoc() : null;
    $checkLike->close();

    $liked = false;

    if ($likeRow) {
        $deleteLike = Database::prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?");
        $deleteLike->bind_param("ss", $postId, $authUser["id"]);
        $deleteLike->execute();
        $deleteLike->close();
        $liked = false;
    } else {
        $insertLike = Database::prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)");
        $insertLike->bind_param("ss", $postId, $authUser["id"]);
        $insertLike->execute();
        $insertLike->close();
        $liked = true;

        $postOwnerId = trim((string)($post["author_id"] ?? ""));
        $actorId = trim((string)($authUser["id"] ?? ""));
        if ($postOwnerId !== "" && $postOwnerId !== $actorId) {
            create_notification($postOwnerId, "like", "post", $postId, "Your post received a new like.", null);
        }

        if (strtolower(trim((string)($authUser["role"] ?? ""))) === "expert") {
            $titleSnippet = substr(trim((string)($post["title"] ?? "post")), 0, 80);
            create_notification($actorId, "like", "post", $postId, "You liked a post: " . $titleSnippet, null);
        }
    }

    $countLike = Database::prepare("SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?");
    $countLike->bind_param("s", $postId);
    $countLike->execute();
    $countResult = $countLike->get_result();
    $countRow = $countResult ? $countResult->fetch_assoc() : ["total" => 0];
    $countLike->close();

    json_response(200, true, "Like status updated.", [
        "postId" => $postId,
        "liked" => $liked,
        "likes" => intval($countRow["total"] ?? 0)
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to update like status.");
}
