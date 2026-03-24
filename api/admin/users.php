<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
initialize_core_schema();
require_admin_authenticated_user();

$role = normalize_role_filter($_GET["role"] ?? "");
$query = trim((string)($_GET["q"] ?? ""));

$sql = "SELECT u.id, u.role, u.full_name, u.email, u.bio, u.profile_image_url, u.created_at,
            sp.student_id, sp.university_id, sp.faculty_id, sp.department_id,
            ep.title AS expert_title, ep.organization AS expert_organization,
            COALESCE(post_counts.total_posts, 0) AS total_posts
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN expert_profiles ep ON ep.user_id = u.id
        LEFT JOIN (
            SELECT author_id, COUNT(*) AS total_posts
            FROM posts
            WHERE deleted_at IS NULL
            GROUP BY author_id
        ) post_counts ON post_counts.author_id = u.id
        WHERE 1 = 1";

$types = "";
$params = [];

if ($role !== "") {
    $sql .= " AND u.role = ?";
    $types .= "s";
    $params[] = $role;
}

if ($query !== "") {
    $like = "%" . $query . "%";
    $sql .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR ep.title LIKE ? OR ep.organization LIKE ? OR sp.student_id LIKE ?)";
    $types .= "sssss";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql .= " ORDER BY u.created_at DESC";

try {
    $statement = Database::prepare($sql);
    if ($types !== "") {
        $statement->bind_param($types, ...$params);
    }
    $statement->execute();
    $result = $statement->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            "id" => $row["id"],
            "role" => $row["role"],
            "name" => $row["full_name"],
            "email" => $row["email"],
            "bio" => $row["bio"] ?: "",
            "profileImageUrl" => $row["profile_image_url"] ?: "",
            "createdAt" => $row["created_at"],
            "studentId" => $row["student_id"] ?: "",
            "university" => reference_name_by_id("universities", intval($row["university_id"] ?? 0)),
            "faculty" => reference_name_by_id("faculties", intval($row["faculty_id"] ?? 0)),
            "department" => reference_name_by_id("departments", intval($row["department_id"] ?? 0)),
            "expertTitle" => $row["expert_title"] ?: "",
            "expertOrganization" => $row["expert_organization"] ?: "",
            "totalPosts" => intval($row["total_posts"] ?? 0)
        ];
    }

    $statement->close();

    json_response(200, true, "Users loaded.", ["users" => $users]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load users.");
}
