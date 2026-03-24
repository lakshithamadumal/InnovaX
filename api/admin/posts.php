<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
initialize_core_schema();
require_admin_authenticated_user();

$query = trim((string)($_GET["q"] ?? ""));
$userId = trim((string)($_GET["userId"] ?? ""));
$role = normalize_role_filter($_GET["role"] ?? "");

$sql = "SELECT p.id, p.author_id, p.title, p.description, p.created_at, p.media_type, p.media_url,
            u.full_name, u.role,
            COALESCE(lc.likes_count, 0) AS likes_count,
            COALESCE(rc.ratings_count, 0) AS ratings_count,
            COALESCE(rc.avg_score, 0) AS avg_score
        FROM posts p
        INNER JOIN users u ON u.id = p.author_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS likes_count
            FROM post_likes
            GROUP BY post_id
        ) lc ON lc.post_id = p.id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS ratings_count, AVG(score) AS avg_score
            FROM expert_ratings
            GROUP BY post_id
        ) rc ON rc.post_id = p.id
        WHERE p.deleted_at IS NULL";

$types = "";
$params = [];

if ($query !== "") {
    $like = "%" . $query . "%";
    $sql .= " AND (p.title LIKE ? OR p.description LIKE ? OR u.full_name LIKE ?)";
    $types .= "sss";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

if ($userId !== "") {
    $sql .= " AND p.author_id = ?";
    $types .= "s";
    $params[] = $userId;
}

if ($role !== "") {
    $sql .= " AND u.role = ?";
    $types .= "s";
    $params[] = $role;
}

$sql .= " ORDER BY p.created_at DESC";

try {
    $statement = Database::prepare($sql);
    if ($types !== "") {
        $statement->bind_param($types, ...$params);
    }
    $statement->execute();
    $result = $statement->get_result();

    $posts = [];
    while ($row = $result->fetch_assoc()) {
        $posts[] = [
            "id" => $row["id"],
            "authorId" => $row["author_id"],
            "authorName" => $row["full_name"],
            "authorRole" => $row["role"],
            "title" => $row["title"],
            "description" => $row["description"] ?: "",
            "createdAt" => $row["created_at"],
            "likes" => intval($row["likes_count"] ?? 0),
            "ratingsCount" => intval($row["ratings_count"] ?? 0),
            "averageRating" => round(floatval($row["avg_score"] ?? 0), 1),
            "mediaType" => $row["media_type"] ?: "none",
            "mediaUrl" => $row["media_url"] ?: ""
        ];
    }

    $statement->close();

    json_response(200, true, "Posts loaded.", ["posts" => $posts]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load posts.");
}
