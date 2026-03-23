<?php

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../database/connection.php";

function json_response($statusCode, $success, $message, $data = [])
{
    http_response_code($statusCode);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);
    exit;
}

function require_method($method)
{
    if ($_SERVER["REQUEST_METHOD"] !== $method) {
        json_response(405, false, "Method not allowed.");
    }
}

function read_json_body()
{
    $raw = file_get_contents("php://input");
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(400, false, "Invalid JSON payload.");
    }

    return $decoded;
}

function generate_uuid_v4()
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf("%s%s-%s-%s-%s-%s%s%s", str_split(bin2hex($data), 4));
}

function normalize_role_label($role)
{
    return $role === "expert" ? "Expert" : "Student";
}

function normalize_user_for_client($row)
{
    return [
        "id" => $row["id"],
        "name" => $row["full_name"],
        "email" => $row["email"],
        "role" => $row["role"],
        "university" => $row["university_name"] ?? "",
        "profileImageUrl" => $row["profile_image_url"] ?? "",
        "coverImageUrl" => $row["cover_image_url"] ?? ""
    ];
}

function initialize_reference_data()
{
    static $initialized = false;
    if ($initialized) {
        return;
    }

    Database::setUpConnection();

    $createUniversities = "CREATE TABLE IF NOT EXISTS universities (
        id INT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        short_name VARCHAR(20)
    )";

    $createFaculties = "CREATE TABLE IF NOT EXISTS faculties (
        id INT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
    )";

    $createDepartments = "CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY,
        faculty_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE (faculty_id, name),
        FOREIGN KEY (faculty_id) REFERENCES faculties(id)
    )";

    Database::iud($createUniversities);
    Database::iud($createFaculties);
    Database::iud($createDepartments);

    $dataRoot = realpath(__DIR__ . "/../data");
    if (!$dataRoot) {
        $initialized = true;
        return;
    }

    $universitiesFile = $dataRoot . DIRECTORY_SEPARATOR . "universities.json";
    $facultiesFile = $dataRoot . DIRECTORY_SEPARATOR . "faculties.json";
    $departmentsFile = $dataRoot . DIRECTORY_SEPARATOR . "departments.json";

    if (is_file($universitiesFile)) {
        $raw = file_get_contents($universitiesFile);
        $rows = json_decode($raw, true);
        if (is_array($rows)) {
            $insertUniversity = Database::prepare("INSERT IGNORE INTO universities (id, name, short_name) VALUES (?, ?, ?)");
            foreach ($rows as $row) {
                $id = intval($row["id"] ?? 0);
                $name = trim((string)($row["name"] ?? ""));
                $shortName = trim((string)($row["shortName"] ?? ""));
                if ($id <= 0 || $name === "") {
                    continue;
                }
                $insertUniversity->bind_param("iss", $id, $name, $shortName);
                $insertUniversity->execute();
            }
            $insertUniversity->close();
        }
    }

    if (is_file($facultiesFile)) {
        $raw = file_get_contents($facultiesFile);
        $rows = json_decode($raw, true);
        if (is_array($rows)) {
            $insertFaculty = Database::prepare("INSERT IGNORE INTO faculties (id, name) VALUES (?, ?)");
            foreach ($rows as $row) {
                $id = intval($row["id"] ?? 0);
                $name = trim((string)($row["name"] ?? ""));
                if ($id <= 0 || $name === "") {
                    continue;
                }
                $insertFaculty->bind_param("is", $id, $name);
                $insertFaculty->execute();
            }
            $insertFaculty->close();
        }
    }

    if (is_file($departmentsFile)) {
        $raw = file_get_contents($departmentsFile);
        $rows = json_decode($raw, true);
        if (is_array($rows)) {
            $insertDepartment = Database::prepare("INSERT IGNORE INTO departments (id, faculty_id, name) VALUES (?, ?, ?)");
            foreach ($rows as $row) {
                $id = intval($row["id"] ?? 0);
                $facultyId = intval($row["facultyId"] ?? 0);
                $name = trim((string)($row["name"] ?? ""));
                if ($id <= 0 || $facultyId <= 0 || $name === "") {
                    continue;
                }
                $insertDepartment->bind_param("iis", $id, $facultyId, $name);
                $insertDepartment->execute();
            }
            $insertDepartment->close();
        }
    }

    $initialized = true;
}

function reference_id_exists($table, $id)
{
    $allowed = ["universities", "faculties", "departments"];
    if (!in_array($table, $allowed, true)) {
        return false;
    }

    $sql = "SELECT id FROM {$table} WHERE id = ? LIMIT 1";
    $statement = Database::prepare($sql);
    $statement->bind_param("i", $id);
    $statement->execute();
    $result = $statement->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $statement->close();

    return is_array($row) && isset($row["id"]);
}

function initialize_core_schema()
{
    static $initialized = false;
    if ($initialized) {
        return;
    }

    initialize_reference_data();
    Database::setUpConnection();

    Database::iud("CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        role ENUM('student', 'expert') NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(255),
        cover_image_url VARCHAR(255),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS student_profiles (
        user_id CHAR(36) PRIMARY KEY,
        student_id VARCHAR(50),
        university_id INT,
        faculty_id INT,
        department_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (university_id) REFERENCES universities(id),
        FOREIGN KEY (faculty_id) REFERENCES faculties(id),
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS expert_profiles (
        user_id CHAR(36) PRIMARY KEY,
        title VARCHAR(100),
        organization VARCHAR(255),
        verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS user_skills (
        user_id CHAR(36),
        skill_id INT,
        PRIMARY KEY (user_id, skill_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS posts (
        id CHAR(36) PRIMARY KEY,
        author_id CHAR(36),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        media_type ENUM('image', 'video', 'pdf', 'slides', 'none') DEFAULT 'none',
        media_url VARCHAR(255),
        media_label VARCHAR(100),
        is_company_owned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS post_tags (
        post_id CHAR(36),
        tag VARCHAR(50),
        UNIQUE(post_id, tag),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS post_likes (
        post_id CHAR(36),
        user_id CHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS saved_posts (
        post_id CHAR(36),
        user_id CHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS expert_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id CHAR(36),
        expert_id CHAR(36),
        score DECIMAL(3,1) CHECK (score >= 0 AND score <= 10),
        note TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, expert_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36),
        actor_user_id CHAR(36) NULL,
        type ENUM('like', 'comment', 'rating', 'collab', 'system') NOT NULL,
        entity_type VARCHAR(50),
        entity_id CHAR(36),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    )");

    $initialized = true;
}
