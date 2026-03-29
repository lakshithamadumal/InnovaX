<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("GET");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();

    $statement = Database::prepare(
        "SELECT u.id, u.role, u.full_name, u.email, u.profile_image_url, u.cover_image_url, u.bio,
                sp.student_id,
                                sp.university_id,
                                sp.faculty_id,
                    sp.faculty_name,
                                sp.department_id,
                    sp.department_name,
                ep.title AS expert_title,
                                ep.organization AS expert_organization,
                                COALESCE(GROUP_CONCAT(DISTINCT us.skill_id ORDER BY us.skill_id SEPARATOR ','), '') AS skill_id_list
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN expert_profiles ep ON ep.user_id = u.id
         LEFT JOIN user_skills us ON us.user_id = u.id
         WHERE u.id = ?
         GROUP BY u.id, u.role, u.full_name, u.email, u.profile_image_url, u.cover_image_url, u.bio,
                                    sp.student_id, sp.university_id, sp.faculty_id, sp.faculty_name, sp.department_id, sp.department_name,
                                    ep.title, ep.organization
         LIMIT 1"
    );

    $statement->bind_param("s", $authUser["id"]);
    $statement->execute();
    $result = $statement->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $statement->close();

    if (!$row) {
        json_response(404, false, "Profile not found.");
    }

    $skills = [];
    $rawSkillIdList = trim((string)($row["skill_id_list"] ?? ""));
    if ($rawSkillIdList !== "") {
        $parts = explode(",", $rawSkillIdList);
        foreach ($parts as $part) {
            $skillId = intval(trim((string)$part));
            if ($skillId > 0) {
                $skillName = skill_name_by_id($skillId);
                if ($skillName !== "") {
                    $skills[] = $skillName;
                }
            }
        }
    }

    $row["university_name"] = reference_name_by_id("universities", intval($row["university_id"] ?? 0));
    $facultyName = reference_name_by_id("faculties", intval($row["faculty_id"] ?? 0));
    $departmentName = reference_name_by_id("departments", intval($row["department_id"] ?? 0));
    if ($facultyName === "") {
        $facultyName = trim((string)($row["faculty_name"] ?? ""));
    }
    if ($departmentName === "") {
        $departmentName = trim((string)($row["department_name"] ?? ""));
    }

    json_response(200, true, "Profile loaded.", [
        "user" => normalize_user_for_client($row),
        "profile" => [
            "studentId" => $row["student_id"] ?? "",
            "faculty" => $facultyName,
            "department" => $departmentName,
            "skills" => $skills
        ]
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to load profile.");
}
