<?php

require_once __DIR__ . "/../bootstrap.php";

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
$skills = is_array($payload["skills"] ?? null) ? $payload["skills"] : [];

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
    if ($studentId === "" || $universityId <= 0 || $facultyId <= 0 || $departmentId <= 0) {
        json_response(400, false, "Student registration requires student ID, university, faculty and department.");
    }

    if (!reference_id_exists("universities", $universityId)) {
        json_response(400, false, "Selected university is invalid.");
    }
    if (!reference_id_exists("faculties", $facultyId)) {
        json_response(400, false, "Selected faculty is invalid.");
    }
    if (!reference_id_exists("departments", $departmentId)) {
        json_response(400, false, "Selected department is invalid.");
    }

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
            "INSERT INTO student_profiles (user_id, student_id, university_id, faculty_id, department_id)
             VALUES (?, ?, ?, ?, ?)"
        );
        $insertStudent->bind_param("ssiii", $userId, $studentId, $universityId, $facultyId, $departmentId);
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
            "INSERT INTO expert_profiles (user_id, verification_status) VALUES (?, 'pending')"
        );
        $insertExpert->bind_param("s", $userId);
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

    json_response(201, true, "Account created.", [
        "user" => normalize_user_for_client($user)
    ]);
} catch (Exception $exception) {
    if ($connection) {
        $connection->rollback();
    }

    json_response(500, false, "Unable to complete registration: " . $exception->getMessage());
}
