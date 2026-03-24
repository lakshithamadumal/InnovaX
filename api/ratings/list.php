<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    if (($authUser["role"] ?? "") !== "expert") {
        json_response(403, false, "Only experts can view rating history.");
    }

    $expertId = trim((string)($authUser["id"] ?? ""));

    $statement = Database::prepare(
        "SELECT r.id, r.post_id, r.score, r.note, r.submitted_at, p.title AS post_title
         FROM expert_ratings r
         INNER JOIN posts p ON p.id = r.post_id
         WHERE r.expert_id = ? AND p.deleted_at IS NULL
         ORDER BY r.submitted_at DESC"
    );
    $statement->bind_param("s", $expertId);
    $statement->execute();
    $result = $statement->get_result();

    $ratings = [];
    while ($row = $result->fetch_assoc()) {
        $ratings[] = [
            "id" => intval($row["id"] ?? 0),
            "postId" => $row["post_id"],
            "postTitle" => $row["post_title"] ?: "Untitled post",
            "score" => round(floatval($row["score"] ?? 0), 1),
            "note" => $row["note"] ?: "",
            "submittedAt" => $row["submitted_at"]
        ];
    }

    $statement->close();

    json_response(200, true, "Ratings loaded.", [
        "ratings" => $ratings
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load ratings.");
}
