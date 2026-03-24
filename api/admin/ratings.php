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
            a.full_name AS author_name,
            COALESCE(post_avg.avg_score, 0) AS post_average_score,
            COALESCE(post_avg.rating_count, 0) AS post_rating_count
        FROM expert_ratings r
        INNER JOIN posts p ON p.id = r.post_id
        INNER JOIN users e ON e.id = r.expert_id
        INNER JOIN users a ON a.id = p.author_id
        LEFT JOIN (
            SELECT post_id, AVG(score) AS avg_score, COUNT(*) AS rating_count
            FROM expert_ratings
            GROUP BY post_id
        ) post_avg ON post_avg.post_id = r.post_id
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

$sql .= " ORDER BY COALESCE(post_avg.avg_score, 0) DESC, COALESCE(post_avg.rating_count, 0) DESC, r.submitted_at DESC";

try {
    $statement = Database::prepare($sql);
    if ($types !== "") {
        $statement->bind_param($types, ...$params);
    }
    $statement->execute();
    $result = $statement->get_result();

    $ratings = [];
    $totalScore = 0.0;
    $topPostTitle = "";
    $topPostAverage = 0.0;
    $topPostRatingsCount = 0;
    while ($row = $result->fetch_assoc()) {
        $score = round(floatval($row["score"] ?? 0), 1);
        $postAverage = round(floatval($row["post_average_score"] ?? 0), 1);
        $postRatingCount = intval($row["post_rating_count"] ?? 0);

        if ($topPostTitle === "" || $postAverage > $topPostAverage) {
            $topPostTitle = (string)($row["post_title"] ?? "");
            $topPostAverage = $postAverage;
            $topPostRatingsCount = $postRatingCount;
        }

        $totalScore += $score;

        $ratings[] = [
            "id" => intval($row["id"] ?? 0),
            "postId" => $row["post_id"],
            "postTitle" => $row["post_title"],
            "expertId" => $row["expert_id"],
            "expertName" => $row["expert_name"],
            "authorId" => $row["author_id"],
            "authorName" => $row["author_name"],
            "score" => $score,
            "postAverageScore" => $postAverage,
            "postRatingCount" => $postRatingCount,
            "note" => $row["note"] ?: "",
            "submittedAt" => $row["submitted_at"]
        ];
    }

    $statement->close();

    $ratingsCount = count($ratings);
    $overallAverage = $ratingsCount > 0 ? round($totalScore / $ratingsCount, 1) : 0.0;

    json_response(200, true, "Ratings loaded.", [
        "summary" => [
            "totalRatings" => $ratingsCount,
            "overallAverageScore" => $overallAverage,
            "topRatedPostTitle" => $topPostTitle,
            "topRatedPostAverage" => $topPostAverage,
            "topRatedPostRatingsCount" => $topPostRatingsCount
        ],
        "ratings" => $ratings
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load ratings.");
}
