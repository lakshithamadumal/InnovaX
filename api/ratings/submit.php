<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    if (($authUser["role"] ?? "") !== "expert") {
        json_response(403, false, "Only experts can submit ratings.");
    }

    $payload = read_json_body();
    $postId = trim((string)($payload["post_id"] ?? ""));
    $note = trim((string)($payload["note"] ?? ""));
    $scoreRaw = $payload["score"] ?? null;

    if ($postId === "") {
        json_response(400, false, "Post ID is required.");
    }

    if (!is_numeric($scoreRaw)) {
        json_response(400, false, "A valid numeric score is required.");
    }

    $score = round(floatval($scoreRaw), 1);
    if ($score < 0 || $score > 10) {
        json_response(400, false, "Score must be between 0 and 10.");
    }

    if ($note === "") {
        json_response(400, false, "A short note is required.");
    }

    if (strlen($note) > 600) {
        json_response(400, false, "Note cannot exceed 600 characters.");
    }

    $postStmt = Database::prepare("SELECT id, author_id, title FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1");
    $postStmt->bind_param("s", $postId);
    $postStmt->execute();
    $postResult = $postStmt->get_result();
    $post = $postResult ? $postResult->fetch_assoc() : null;
    $postStmt->close();

    if (!$post) {
        json_response(404, false, "Post not found.");
    }

    $expertId = trim((string)($authUser["id"] ?? ""));
    $insert = Database::prepare("INSERT INTO expert_ratings (post_id, expert_id, score, note) VALUES (?, ?, ?, ?)");
    $insert->bind_param("ssds", $postId, $expertId, $score, $note);

    if (!$insert->execute()) {
        $code = intval($insert->errno ?? 0);
        $insert->close();

        if ($code === 1062) {
            json_response(409, false, "You have already submitted a rating for this post.");
        }

        throw new Exception("Unable to submit rating.");
    }

    $ratingId = intval($insert->insert_id ?? 0);
    $insert->close();

    $postOwnerId = trim((string)($post["author_id"] ?? ""));
    if ($postOwnerId !== "" && $postOwnerId !== $expertId) {
        $postTitle = trim((string)($post["title"] ?? "post"));
        $titleSnippet = substr($postTitle, 0, 80);
        create_notification($postOwnerId, "rating", "post", $postId, "Your post received an expert rating: " . $titleSnippet, $expertId);
    }

    json_response(201, true, "Rating submitted.", [
        "rating" => [
            "id" => $ratingId,
            "postId" => $postId,
            "postTitle" => $post["title"] ?: "Untitled post",
            "score" => $score,
            "note" => $note,
            "submittedAt" => date("Y-m-d H:i:s")
        ]
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to submit rating.");
}
