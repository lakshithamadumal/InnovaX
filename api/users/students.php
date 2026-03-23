<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $result = Database::search(
        "SELECT u.id, u.full_name, uni.name AS university_name, fac.name AS faculty_name, dep.name AS department_name
         FROM users u
         INNER JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN universities uni ON uni.id = sp.university_id
         LEFT JOIN faculties fac ON fac.id = sp.faculty_id
         LEFT JOIN departments dep ON dep.id = sp.department_id
         WHERE u.role = 'student'
         ORDER BY u.created_at DESC"
    );

    $students = [];
    while ($row = $result->fetch_assoc()) {
        $titleParts = [];
        if (!empty($row["department_name"])) {
            $titleParts[] = $row["department_name"] . " Student";
        } else {
            $titleParts[] = "Student";
        }
        if (!empty($row["university_name"])) {
            $titleParts[] = $row["university_name"];
        }

        $students[] = [
            "id" => $row["id"],
            "name" => $row["full_name"],
            "title" => implode(" · ", $titleParts),
            "faculty" => $row["faculty_name"] ?: "",
            "department" => $row["department_name"] ?: "",
            "university" => $row["university_name"] ?: ""
        ];
    }

    json_response(200, true, "Students loaded.", ["students" => $students]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load student profiles.");
}
