<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
initialize_core_schema();
require_admin_authenticated_user();

$userId = trim((string)($_GET["userId"] ?? ""));
if ($userId === "") {
    json_response(400, false, "userId is required.");
}

try {
    $statement = Database::prepare(
        "SELECT u.id, u.role, u.full_name, u.email, u.bio, u.profile_image_url, u.cover_image_url, u.created_at,
                sp.student_id, sp.university_id, sp.faculty_id, sp.faculty_name, sp.department_id, sp.department_name,
                ep.title AS expert_title, ep.organization AS expert_organization
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN expert_profiles ep ON ep.user_id = u.id
         WHERE u.id = ?
         LIMIT 1"
    );
    $statement->bind_param("s", $userId);
    $statement->execute();
    $result = $statement->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $statement->close();

    if (!$row) {
        json_response(404, false, "User not found.");
    }

    $postsStmt = Database::prepare(
        "SELECT p.id, p.title, p.description, p.created_at,
                COALESCE(lc.likes_count, 0) AS likes_count
         FROM posts p
         LEFT JOIN (
             SELECT post_id, COUNT(*) AS likes_count
             FROM post_likes
             GROUP BY post_id
         ) lc ON lc.post_id = p.id
         WHERE p.author_id = ? AND p.deleted_at IS NULL
         ORDER BY p.created_at DESC"
    );
    $postsStmt->bind_param("s", $userId);
    $postsStmt->execute();
    $postsResult = $postsStmt->get_result();

    $posts = [];
    while ($postRow = $postsResult->fetch_assoc()) {
        $posts[] = [
            "id" => $postRow["id"],
            "title" => $postRow["title"],
            "description" => $postRow["description"] ?: "",
            "createdAt" => $postRow["created_at"],
            "likes" => intval($postRow["likes_count"] ?? 0)
        ];
    }
    $postsStmt->close();

    $ratingsGiven = 0;
    if (($row["role"] ?? "") === "expert") {
        $ratingStmt = Database::prepare("SELECT COUNT(*) AS total FROM expert_ratings WHERE expert_id = ?");
        $ratingStmt->bind_param("s", $userId);
        $ratingStmt->execute();
        $ratingResult = $ratingStmt->get_result();
        $ratingsGiven = intval(($ratingResult->fetch_assoc()["total"] ?? 0));
        $ratingStmt->close();
    }

    json_response(200, true, "User details loaded.", [
        "user" => [
            "id" => $row["id"],
            "role" => $row["role"],
            "name" => $row["full_name"],
            "email" => $row["email"],
            "bio" => $row["bio"] ?: "",
            "profileImageUrl" => $row["profile_image_url"] ?: "",
            "coverImageUrl" => $row["cover_image_url"] ?: "",
            "createdAt" => $row["created_at"],
            "studentId" => $row["student_id"] ?: "",
            "university" => reference_name_by_id("universities", intval($row["university_id"] ?? 0)),
            "faculty" => (reference_name_by_id("faculties", intval($row["faculty_id"] ?? 0)) ?: trim((string)($row["faculty_name"] ?? ""))),
            "department" => (reference_name_by_id("departments", intval($row["department_id"] ?? 0)) ?: trim((string)($row["department_name"] ?? ""))),
            "expertTitle" => $row["expert_title"] ?: "",
            "expertOrganization" => $row["expert_organization"] ?: "",
            "ratingsGiven" => $ratingsGiven
        ],
        "posts" => $posts
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load user details.");
}
