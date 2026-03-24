<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $result = Database::search(
        "SELECT u.id, u.full_name, u.profile_image_url, sp.university_id, sp.faculty_id, sp.department_id
         FROM users u
         INNER JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'student'
         ORDER BY u.created_at DESC"
    );

    $students = [];
    while ($row = $result->fetch_assoc()) {
        $universityName = reference_name_by_id("universities", intval($row["university_id"] ?? 0));
        $facultyName = reference_name_by_id("faculties", intval($row["faculty_id"] ?? 0));
        $departmentName = reference_name_by_id("departments", intval($row["department_id"] ?? 0));

        $titleParts = [];
        if ($departmentName !== "") {
            $titleParts[] = $departmentName . " Student";
        } else {
            $titleParts[] = "Student";
        }
        if ($universityName !== "") {
            $titleParts[] = $universityName;
        }

        $students[] = [
            "id" => $row["id"],
            "name" => $row["full_name"],
            "profileImageUrl" => $row["profile_image_url"] ?: "",
            "title" => implode(" · ", $titleParts),
            "faculty" => $facultyName,
            "department" => $departmentName,
            "university" => $universityName
        ];
    }

    json_response(200, true, "Students loaded.", ["students" => $students]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load student profiles.");
}
