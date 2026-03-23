<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

function initials_from_name($name)
{
    $trimmed = trim((string)$name);
    if ($trimmed === "") {
        return "IN";
    }

    $parts = preg_split('/\s+/', $trimmed);
    $initials = "";
    foreach ($parts as $part) {
        if ($part === "") {
            continue;
        }
        $initials .= strtoupper(substr($part, 0, 1));
        if (strlen($initials) >= 2) {
            break;
        }
    }

    return $initials === "" ? "IN" : $initials;
}

try {
    $result = Database::search(
        "SELECT p.id, p.author_id, p.title, p.description, p.media_type, p.media_url, p.media_label,
                p.is_company_owned, p.created_at, u.full_name, u.role,
                COALESCE(GROUP_CONCAT(DISTINCT pt.tag ORDER BY pt.tag SEPARATOR ','), '') AS tag_list,
                COUNT(DISTINCT pl.user_id) AS likes_count
         FROM posts p
         INNER JOIN users u ON u.id = p.author_id
         LEFT JOIN post_tags pt ON pt.post_id = p.id
         LEFT JOIN post_likes pl ON pl.post_id = p.id
         WHERE p.deleted_at IS NULL
         GROUP BY p.id, p.author_id, p.title, p.description, p.media_type, p.media_url, p.media_label,
                  p.is_company_owned, p.created_at, u.full_name, u.role
         ORDER BY p.created_at DESC"
    );

    $posts = [];
    while ($row = $result->fetch_assoc()) {
        $tags = [];
        if (!empty($row["tag_list"])) {
            $parts = explode(",", $row["tag_list"]);
            foreach ($parts as $tag) {
                $cleanTag = trim($tag);
                if ($cleanTag !== "") {
                    $tags[] = $cleanTag;
                }
            }
        }

        $media = null;
        if (!empty($row["media_type"]) && $row["media_type"] !== "none") {
            $media = [
                "emoji" => "💡",
                "label" => $row["media_label"] ?: ucfirst($row["media_type"])
            ];
        }

        $posts[] = [
            "id" => $row["id"],
            "authorId" => $row["author_id"],
            "avatar" => initials_from_name($row["full_name"]),
            "avatarColor" => "linear-gradient(135deg,#4E73DF,#6f8ee8)",
            "name" => $row["full_name"],
            "role" => normalize_role_label($row["role"]),
            "time" => $row["created_at"],
            "title" => $row["title"],
            "desc" => $row["description"] ?: "",
            "tags" => $tags,
            "media" => $media,
            "likes" => intval($row["likes_count"]),
            "saved" => false,
            "companyOwned" => intval($row["is_company_owned"]) === 1
        ];
    }

    json_response(200, true, "Posts loaded.", ["posts" => $posts]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load posts.");
}
