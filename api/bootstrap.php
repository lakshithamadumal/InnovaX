<?php

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../database/connection.php";

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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
    $universityName = trim((string)($row["university_name"] ?? ""));
    if ($universityName === "") {
        $universityName = reference_name_by_id("universities", intval($row["university_id"] ?? 0));
    }

    return [
        "id" => $row["id"],
        "name" => $row["full_name"],
        "email" => $row["email"],
        "role" => $row["role"],
        "university" => $universityName,
        "bio" => $row["bio"] ?? "",
        "title" => $row["expert_title"] ?? "",
        "organization" => $row["expert_organization"] ?? "",
        "profileImageUrl" => $row["profile_image_url"] ?? "",
        "coverImageUrl" => $row["cover_image_url"] ?? ""
    ];
}

function read_reference_rows($fileName)
{
    static $cache = [];

    if (array_key_exists($fileName, $cache)) {
        return $cache[$fileName];
    }

    $filePath = realpath(__DIR__ . "/../data/" . $fileName);
    if (!$filePath || !is_file($filePath)) {
        $cache[$fileName] = [];
        return $cache[$fileName];
    }

    $raw = file_get_contents($filePath);
    $decoded = json_decode($raw, true);
    $cache[$fileName] = is_array($decoded) ? $decoded : [];
    return $cache[$fileName];
}

function get_reference_file($table)
{
    $map = [
        "universities" => "universities.json",
        "faculties" => "faculties.json",
        "departments" => "departments.json",
        "skills" => "skills.json"
    ];

    return $map[$table] ?? "";
}

function find_reference_by_id($table, $id)
{
    $fileName = get_reference_file($table);
    if ($fileName === "" || $id <= 0) {
        return null;
    }

    $rows = read_reference_rows($fileName);
    foreach ($rows as $row) {
        if (intval($row["id"] ?? 0) === intval($id)) {
            return $row;
        }
    }

    return null;
}

function reference_name_by_id($table, $id)
{
    $row = find_reference_by_id($table, $id);
    if (!$row) {
        return "";
    }
    return trim((string)($row["name"] ?? ""));
}

function skill_id_by_name($skillName)
{
    $needle = strtolower(trim((string)$skillName));
    $needle = ltrim($needle, "#");
    if ($needle === "") {
        return 0;
    }

    $rows = read_reference_rows("skills.json");
    foreach ($rows as $index => $row) {
        $name = "";
        $id = 0;

        if (is_array($row)) {
            $name = strtolower(trim((string)($row["name"] ?? "")));
            $id = intval($row["id"] ?? 0);
        } elseif (is_string($row)) {
            $name = strtolower(trim($row));
            $id = $index + 1;
        }

        if ($name === $needle) {
            return $id;
        }
    }

    return 0;
}

function skill_name_by_id($skillId)
{
    $targetId = intval($skillId);
    if ($targetId <= 0) {
        return "";
    }

    $rows = read_reference_rows("skills.json");
    foreach ($rows as $index => $row) {
        if (is_array($row)) {
            $id = intval($row["id"] ?? 0);
            if ($id === $targetId) {
                return trim((string)($row["name"] ?? ""));
            }
            continue;
        }

        if (is_string($row) && ($index + 1) === $targetId) {
            return trim($row);
        }
    }

    return "";
}

function create_notification($userId, $type, $entityType, $entityId, $message, $actorUserId = null)
{
    $targetUserId = trim((string)$userId);
    $notificationType = trim((string)$type);
    $messageText = trim((string)$message);

    if ($targetUserId === "" || $notificationType === "" || $messageText === "") {
        return false;
    }

    $entityTypeValue = trim((string)$entityType);
    $entityIdValue = trim((string)$entityId);

    $insert = Database::prepare(
        "INSERT INTO notifications (user_id, actor_user_id, type, entity_type, entity_id, message, is_read)
         VALUES (?, NULL, ?, ?, ?, ?, 0)"
    );
    $insert->bind_param("sssss", $targetUserId, $notificationType, $entityTypeValue, $entityIdValue, $messageText);
    $ok = $insert->execute();
    $insert->close();

    return $ok;
}

function set_authenticated_user($userId)
{
    $_SESSION["auth_user_id"] = $userId;
}

function clear_authenticated_user()
{
    unset($_SESSION["auth_user_id"]);
}

function get_authenticated_user_id()
{
    $userId = $_SESSION["auth_user_id"] ?? "";
    if (!is_string($userId)) {
        return "";
    }

    return trim($userId);
}

function fetch_user_by_id($userId)
{
    $cleanId = trim((string)$userId);
    if ($cleanId === "") {
        return null;
    }

    $statement = Database::prepare(
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
    $statement->bind_param("s", $cleanId);
    $statement->execute();
    $result = $statement->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $statement->close();

    return $user ?: null;
}

function require_authenticated_user()
{
    $userId = get_authenticated_user_id();
    if ($userId === "") {
        json_response(401, false, "Authentication required.");
    }

    $user = fetch_user_by_id($userId);
    if (!$user) {
        clear_authenticated_user();
        json_response(401, false, "Session expired.");
    }

    return $user;
}

function parse_data_url_image($dataUrl)
{
    $value = trim((string)$dataUrl);
    if ($value === "") {
        return null;
    }

    if (!preg_match('/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+\/=\s]+)$/i', $value, $matches)) {
        return null;
    }

    $extension = strtolower($matches[1]);
    if ($extension === "jpeg") {
        $extension = "jpg";
    }

    $binary = base64_decode($matches[2], true);
    if ($binary === false || strlen($binary) === 0) {
        return null;
    }

    return [
        "extension" => $extension,
        "binary" => $binary
    ];
}

function get_imgbb_api_key()
{
    $envKey = getenv("IMGBB_API_KEY");
    if (is_string($envKey) && trim($envKey) !== "") {
        return trim($envKey);
    }

    return "6fae24efd891a4125b1ad69565c28208";
}

function upload_image_to_imgbb($imageDataUrl, $namePrefix = "innovax")
{
    $parsed = parse_data_url_image($imageDataUrl);
    if (!$parsed) {
        throw new Exception("Invalid image format.");
    }

    if (strlen($parsed["binary"]) > 8 * 1024 * 1024) {
        throw new Exception("Image is too large. Maximum 8MB allowed.");
    }

    $apiKey = get_imgbb_api_key();
    $imageBase64 = base64_encode($parsed["binary"]);
    $name = preg_replace('/[^a-zA-Z0-9_-]/', '', $namePrefix) . "_" . date("Ymd_His") . "." . $parsed["extension"];

    $postFields = http_build_query([
        "key" => $apiKey,
        "image" => $imageBase64,
        "name" => $name
    ]);

    $rawResponse = "";

    if (function_exists("curl_init")) {
        $ch = curl_init("https://api.imgbb.com/1/upload");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 12);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $rawResponse = curl_exec($ch);
        if ($rawResponse === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new Exception("ImgBB upload failed: " . $error);
        }
        $statusCode = intval(curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);
        if ($statusCode < 200 || $statusCode >= 300) {
            throw new Exception("ImgBB upload failed with status " . $statusCode . ".");
        }
    } else {
        $context = stream_context_create([
            "http" => [
                "method" => "POST",
                "header" => "Content-Type: application/x-www-form-urlencoded\r\n",
                "content" => $postFields,
                "timeout" => 30
            ]
        ]);
        $rawResponse = @file_get_contents("https://api.imgbb.com/1/upload", false, $context);
        if ($rawResponse === false) {
            throw new Exception("ImgBB upload failed.");
        }
    }

    $decoded = json_decode($rawResponse, true);
    if (!is_array($decoded) || !($decoded["success"] ?? false)) {
        $errorMessage = is_array($decoded) ? ($decoded["error"]["message"] ?? "Unknown error") : "Invalid response";
        throw new Exception("ImgBB upload failed: " . $errorMessage);
    }

    $url = trim((string)($decoded["data"]["url"] ?? ""));
    if ($url === "") {
        throw new Exception("ImgBB upload failed: empty URL.");
    }

    return $url;
}

function initialize_reference_data()
{
    static $initialized = false;
    if ($initialized) {
        return;
    }

    $initialized = true;
}

function reference_id_exists($table, $id)
{
    return find_reference_by_id($table, intval($id)) !== null;
}

function drop_foreign_key_if_exists($tableName, $constraintName)
{
    $sql = "SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE constraint_schema = DATABASE()
              AND table_name = ?
              AND constraint_name = ?
              AND constraint_type = 'FOREIGN KEY'
            LIMIT 1";

    $check = Database::prepare($sql);
    $check->bind_param("ss", $tableName, $constraintName);
    $check->execute();
    $result = $check->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $check->close();

    if (!$row) {
        return;
    }

    $dropSql = "ALTER TABLE {$tableName} DROP FOREIGN KEY {$constraintName}";
    Database::iud($dropSql);
}

function drop_foreign_keys_for_columns($tableName, $columnNames)
{
    if (!is_array($columnNames) || empty($columnNames)) {
        return;
    }

    $wanted = [];
    foreach ($columnNames as $columnName) {
        $clean = trim((string)$columnName);
        if ($clean !== "") {
            $wanted[] = $clean;
        }
    }

    if (empty($wanted)) {
        return;
    }

    $placeholders = implode(",", array_fill(0, count($wanted), "?"));
    $sql = "SELECT DISTINCT tc.constraint_name
            FROM information_schema.table_constraints tc
            INNER JOIN information_schema.key_column_usage kcu
                ON tc.constraint_schema = kcu.constraint_schema
               AND tc.table_name = kcu.table_name
               AND tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_schema = DATABASE()
              AND tc.table_name = ?
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name IN ({$placeholders})";

    $statement = Database::prepare($sql);
    $types = "s" . str_repeat("s", count($wanted));
    $params = array_merge([$tableName], $wanted);
    $statement->bind_param($types, ...$params);
    $statement->execute();
    $result = $statement->get_result();

    $constraints = [];
    while ($row = $result ? $result->fetch_assoc() : null) {
        if (!$row) {
            break;
        }
        $name = trim((string)($row["constraint_name"] ?? ""));
        if ($name !== "") {
            $constraints[] = $name;
        }
    }
    $statement->close();

    foreach ($constraints as $constraintName) {
        drop_foreign_key_if_exists($tableName, $constraintName);
    }
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

    $userColumns = [];
    $userColumnsQuery = Database::search("SHOW COLUMNS FROM users");
    while ($columnRow = $userColumnsQuery->fetch_assoc()) {
        $columnName = trim((string)($columnRow["Field"] ?? ""));
        if ($columnName !== "") {
            $userColumns[$columnName] = true;
        }
    }

    if (!isset($userColumns["reset_code_hash"])) {
        Database::iud("ALTER TABLE users ADD COLUMN reset_code_hash VARCHAR(255) NULL AFTER password_hash");
    }
    if (!isset($userColumns["reset_code_expires_at"])) {
        Database::iud("ALTER TABLE users ADD COLUMN reset_code_expires_at DATETIME NULL AFTER reset_code_hash");
    }
    if (!isset($userColumns["reset_code_sent_at"])) {
        Database::iud("ALTER TABLE users ADD COLUMN reset_code_sent_at DATETIME NULL AFTER reset_code_expires_at");
    }

    Database::iud("CREATE TABLE IF NOT EXISTS student_profiles (
        user_id CHAR(36) PRIMARY KEY,
        student_id VARCHAR(50),
        university_id INT,
        faculty_id INT,
        department_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS expert_profiles (
        user_id CHAR(36) PRIMARY KEY,
        title VARCHAR(100),
        organization VARCHAR(255),
        verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    Database::iud("CREATE TABLE IF NOT EXISTS user_skills (
        user_id CHAR(36),
        skill_id INT,
        PRIMARY KEY (user_id, skill_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // Clean up legacy constraints from older schema versions where these
    // columns referenced removed master tables.
    drop_foreign_key_if_exists("student_profiles", "student_profiles_ibfk_2");
    drop_foreign_key_if_exists("student_profiles", "student_profiles_ibfk_3");
    drop_foreign_key_if_exists("student_profiles", "student_profiles_ibfk_4");
    drop_foreign_key_if_exists("user_skills", "user_skills_ibfk_2");
    drop_foreign_keys_for_columns("student_profiles", ["university_id", "faculty_id", "department_id"]);
    drop_foreign_keys_for_columns("user_skills", ["skill_id"]);

    $initialized = true;
}
