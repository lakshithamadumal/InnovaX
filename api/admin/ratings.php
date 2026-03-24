<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
initialize_core_schema();
require_admin_authenticated_user();

$query = trim((string)($_GET["q"] ?? ""));
$postId = trim((string)($_GET["postId"] ?? ""));
$expertId = trim((string)($_GET["expertId"] ?? ""));
$authorId = trim((string)($_GET["authorId"] ?? ""));

$sql = "SELECT r.id, r.post_id, r.expert_id, r.score, r.note, r.submitted_at,
            p.title AS post_title,
            e.full_name AS expert_name,
            a.id AS author_id,
            a.full_name AS author_name
        FROM expert_ratings r
        INNER JOIN posts p ON p.id = r.post_id
        INNER JOIN users e ON e.id = r.expert_id
        INNER JOIN users a ON a.id = p.author_id
        WHERE p.deleted_at IS NULL";

$types = "";
$params = [];

if ($query !== "") {
    $like = "%" . $query . "%";
    $sql .= " AND (p.title LIKE ? OR e.full_name LIKE ? OR a.full_name LIKE ? OR r.note LIKE ?)";
    $types .= "ssss";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

if ($postId !== "") {
    $sql .= " AND r.post_id = ?";
    $types .= "s";
    $params[] = $postId;
}

if ($expertId !== "") {
    $sql .= " AND r.expert_id = ?";
    $types .= "s";
    $params[] = $expertId;
}

if ($authorId !== "") {
    $sql .= " AND a.id = ?";
    $types .= "s";
    $params[] = $authorId;
}

$sql .= " ORDER BY r.submitted_at DESC";

try {
    $statement = Database::prepare($sql);
    if ($types !== "") {
        $statement->bind_param($types, ...$params);
    }
    $statement->execute();
    $result = $statement->get_result();

    $ratings = [];
    while ($row = $result->fetch_assoc()) {
        $ratings[] = [
            "id" => intval($row["id"] ?? 0),
            "postId" => $row["post_id"],
            "postTitle" => $row["post_title"],
            "expertId" => $row["expert_id"],
            "expertName" => $row["expert_name"],
            "authorId" => $row["author_id"],
            "authorName" => $row["author_name"],
            "score" => round(floatval($row["score"] ?? 0), 1),
            "note" => $row["note"] ?: "",
            "submittedAt" => $row["submitted_at"]
        ];
    }

    $statement->close();

    json_response(200, true, "Ratings loaded.", ["ratings" => $ratings]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load ratings.");
}
