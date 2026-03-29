<?php

require_once __DIR__ . "/../bootstrap.php";
require_once __DIR__ . "/mailer.php";

require_method("POST");
initialize_core_schema();

$payload = read_json_body();
$role = strtolower(trim($payload["role"] ?? ""));
$fullName = trim($payload["full_name"] ?? "");
$email = trim($payload["email"] ?? "");
$password = $payload["password"] ?? "";

if (!in_array($role, ["student", "expert"], true)) {
    json_response(400, false, "Invalid role.");
}

if ($fullName === "" || $email === "" || $password === "") {
    json_response(400, false, "Full name, email and password are required.");
}

$studentId = trim($payload["student_id"] ?? "");
$universityId = intval($payload["university_id"] ?? 0);
$facultyId = intval($payload["faculty_id"] ?? 0);
$departmentId = intval($payload["department_id"] ?? 0);
$facultyName = trim((string)($payload["faculty_name"] ?? ""));
$departmentName = trim((string)($payload["department_name"] ?? ""));
$skills = is_array($payload["skills"] ?? null) ? $payload["skills"] : [];

$expertTitle = trim($payload["title"] ?? "");
$expertOrganization = trim($payload["organization"] ?? "");

$normalizedSkills = [];
foreach ($skills as $skillRaw) {
    $skillName = strtolower(trim((string)$skillRaw));
    $skillName = ltrim($skillName, "#");
    if ($skillName === "") {
        continue;
    }
    if (!in_array($skillName, $normalizedSkills, true)) {
        $normalizedSkills[] = $skillName;
    }
}

if ($role === "student") {
    if ($studentId === "" || $universityId <= 0) {
        json_response(400, false, "Student registration requires student ID and university.");
    }

    if (!reference_id_exists("universities", $universityId)) {
        json_response(400, false, "Selected university is invalid.");
    }
    $hasValidFacultyId = $facultyId > 0 && reference_id_exists("faculties", $facultyId);
    $hasValidDepartmentId = $departmentId > 0 && reference_id_exists("departments", $departmentId);

    if (!$hasValidFacultyId && $facultyName === "") {
        json_response(400, false, "Please select a faculty or type a custom faculty name.");
    }

    if (!$hasValidDepartmentId && $departmentName === "") {
        json_response(400, false, "Please select a department or type a custom department name.");
    }

    if (strlen($facultyName) > 150 || strlen($departmentName) > 150) {
        json_response(400, false, "Faculty and department names must be 150 characters or less.");
    }

    $facultyId = $hasValidFacultyId ? $facultyId : 0;
    $departmentId = $hasValidDepartmentId ? $departmentId : 0;
    $facultyName = $hasValidFacultyId ? "" : $facultyName;
    $departmentName = $hasValidDepartmentId ? "" : $departmentName;

    if (count($normalizedSkills) > 5) {
        json_response(400, false, "Maximum 5 skills are allowed.");
    }
}

$connection = null;

try {
    Database::setUpConnection();
    $connection = Database::$connection;
    $connection->begin_transaction();

    $userId = generate_uuid_v4();
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $insertUser = Database::prepare(
        "INSERT INTO users (id, role, full_name, email, password_hash) VALUES (?, ?, ?, ?, ?)"
    );
    $insertUser->bind_param("sssss", $userId, $role, $fullName, $email, $passwordHash);
    if (!$insertUser->execute()) {
        if ($insertUser->errno === 1062) {
            $insertUser->close();
            $connection->rollback();
            json_response(409, false, "Email already registered.");
        }
        throw new Exception("Failed to create user.");
    }
    $insertUser->close();

    if ($role === "student") {
        $insertStudent = Database::prepare(
            "INSERT INTO student_profiles (user_id, student_id, university_id, faculty_id, faculty_name, department_id, department_name)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $insertStudent->bind_param("ssiisis", $userId, $studentId, $universityId, $facultyId, $facultyName, $departmentId, $departmentName);
        if (!$insertStudent->execute()) {
            throw new Exception("Failed to create student profile.");
        }
        $insertStudent->close();

        if (!empty($normalizedSkills)) {
            $insertUserSkill = Database::prepare("INSERT IGNORE INTO user_skills (user_id, skill_id) VALUES (?, ?)");

            foreach ($normalizedSkills as $skillName) {
                $skillId = skill_id_by_name($skillName);
                if ($skillId > 0) {
                    $insertUserSkill->bind_param("si", $userId, $skillId);
                    $insertUserSkill->execute();
                }
            }

            $insertUserSkill->close();
        }
    } else {
        $insertExpert = Database::prepare(
            "INSERT INTO expert_profiles (user_id, title, organization, verification_status) VALUES (?, ?, ?, 'pending')"
        );
        $insertExpert->bind_param("sss", $userId, $expertTitle, $expertOrganization);
        if (!$insertExpert->execute()) {
            throw new Exception("Failed to create expert profile.");
        }
        $insertExpert->close();
    }

    $fetchUser = Database::prepare(
        "SELECT u.id, u.role, u.full_name, u.email, u.profile_image_url, u.cover_image_url, u.bio,
                sp.university_id,
            ep.title AS expert_title,
                ep.organization AS expert_organization
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN expert_profiles ep ON ep.user_id = u.id
         WHERE u.id = ?
         LIMIT 1"
    );
    $fetchUser->bind_param("s", $userId);
    $fetchUser->execute();
    $result = $fetchUser->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $fetchUser->close();

    $connection->commit();

    if (!$user) {
        json_response(500, false, "Account created but user lookup failed.");
    }

    set_authenticated_user($user["id"]);

    try {
        send_welcome_email($user["email"], $user["full_name"], $user["role"]);
    } catch (Exception $mailException) {
        // Do not fail registration if email service is unavailable.
    }

    json_response(201, true, "Account created.", [
        "user" => normalize_user_for_client($user)
    ]);
} catch (Exception $exception) {
    if ($connection) {
        $connection->rollback();
    }

    json_response(500, false, "Unable to complete registration: " . $exception->getMessage());
}
