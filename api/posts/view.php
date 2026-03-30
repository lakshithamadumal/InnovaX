<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

$postId = trim((string)($_GET["postId"] ?? ""));
if ($postId === "") {
    json_response(400, false, "postId is required.");
}

$authUserId = get_authenticated_user_id();

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
    $statement = Database::prepare(
        "SELECT p.id, p.author_id, p.title, p.description, p.media_type, p.media_url, p.media_label,
            p.document_url, p.document_label,
                p.is_company_owned, p.created_at, u.full_name, u.role, u.profile_image_url, sp_author.university_id,
                COALESCE(GROUP_CONCAT(DISTINCT pt.tag ORDER BY pt.tag SEPARATOR ','), '') AS tag_list,
                COUNT(DISTINCT pl.user_id) AS likes_count,
                MAX(CASE WHEN pl.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me,
                MAX(CASE WHEN sp.user_id = ? THEN 1 ELSE 0 END) AS saved_by_me
         FROM posts p
         INNER JOIN users u ON u.id = p.author_id
         LEFT JOIN student_profiles sp_author ON sp_author.user_id = p.author_id
         LEFT JOIN post_tags pt ON pt.post_id = p.id
         LEFT JOIN post_likes pl ON pl.post_id = p.id
         LEFT JOIN saved_posts sp ON sp.post_id = p.id
         WHERE p.deleted_at IS NULL AND p.id = ?
            GROUP BY p.id, p.author_id, p.title, p.description, p.media_type, p.media_url, p.media_label,
                   p.document_url, p.document_label,
                  p.is_company_owned, p.created_at, u.full_name, u.role, u.profile_image_url, sp_author.university_id
         LIMIT 1"
    );

    $statement->bind_param("sss", $authUserId, $authUserId, $postId);
    $statement->execute();
    $result = $statement->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $statement->close();

    if (!$row) {
        json_response(404, false, "Post not found.");
    }

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
    if (!empty($row["media_type"]) && $row["media_type"] === "image" && !empty($row["media_url"])) {
        $media = [
            "type" => "image",
            "url" => $row["media_url"] ?: "",
            "emoji" => "💡",
            "label" => $row["media_label"] ?: "Post image"
        ];
    }

    $document = null;
    if (!empty($row["document_url"])) {
        $document = [
            "type" => "pdf",
            "url" => $row["document_url"],
            "label" => $row["document_label"] ?: "Post document"
        ];
    } elseif (($row["media_type"] ?? "") === "pdf" && !empty($row["media_url"])) {
        $document = [
            "type" => "pdf",
            "url" => $row["media_url"],
            "label" => $row["media_label"] ?: "Post document"
        ];
    }

    $post = [
        "id" => $row["id"],
        "authorId" => $row["author_id"],
        "avatar" => initials_from_name($row["full_name"]),
        "avatarImageUrl" => $row["profile_image_url"] ?: "",
        "avatarColor" => "linear-gradient(135deg,#4E73DF,#6f8ee8)",
        "name" => $row["full_name"],
        "university" => reference_name_by_id("universities", intval($row["university_id"] ?? 0)),
        "role" => normalize_role_label($row["role"]),
        "time" => $row["created_at"],
        "title" => $row["title"],
        "desc" => $row["description"] ?: "",
        "tags" => $tags,
        "media" => $media,
        "document" => $document,
        "likes" => intval($row["likes_count"]),
        "liked" => intval($row["liked_by_me"]) === 1,
        "saved" => intval($row["saved_by_me"]) === 1,
        "companyOwned" => intval($row["is_company_owned"]) === 1
    ];

    json_response(200, true, "Post loaded.", ["post" => $post]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load post.");
}
