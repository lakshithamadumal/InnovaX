<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

$limit = intval($_GET["limit"] ?? 5);
if ($limit <= 0) {
    $limit = 5;
}
if ($limit > 20) {
    $limit = 20;
}

try {
    $statement = Database::prepare(
        "SELECT pt.tag, COUNT(*) AS usage_count
         FROM post_tags pt
         INNER JOIN posts p ON p.id = pt.post_id
         WHERE p.deleted_at IS NULL
         GROUP BY pt.tag
         ORDER BY usage_count DESC, pt.tag ASC
         LIMIT ?"
    );
    $statement->bind_param("i", $limit);
    $statement->execute();
    $result = $statement->get_result();

    $trending = [];
    $rank = 1;
    while ($row = $result ? $result->fetch_assoc() : null) {
        if (!$row) {
            break;
        }

        $tag = trim((string)($row["tag"] ?? ""));
        if ($tag === "") {
            continue;
        }
        if (substr($tag, 0, 1) !== "#") {
            $tag = "#" . $tag;
        }

        $trending[] = [
            "rank" => $rank,
            "tag" => $tag,
            "count" => intval($row["usage_count"] ?? 0)
        ];
        $rank++;
    }

    $statement->close();

    json_response(200, true, "Trending innovations loaded.", [
        "trending" => $trending
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load trending innovations.");
}
