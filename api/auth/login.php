<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

$payload = read_json_body();
$email = trim($payload["email"] ?? "");
$password = $payload["password"] ?? "";

if ($email === "" || $password === "") {
    json_response(400, false, "Email and password are required.");
}

try {
    $statement = Database::prepare(
        "SELECT u.id, u.role, u.full_name, u.email, u.password_hash, u.profile_image_url, u.cover_image_url, u.bio,
                sp.university_id,
            ep.title AS expert_title,
                ep.organization AS expert_organization
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN expert_profiles ep ON ep.user_id = u.id
         WHERE u.email = ?
         LIMIT 1"
    );
    $statement->bind_param("s", $email);
    $statement->execute();
    $result = $statement->get_result();
    $user = $result ? $result->fetch_assoc() : null;
    $statement->close();

    if (!$user || !password_verify($password, $user["password_hash"])) {
        json_response(401, false, "Invalid email or password.");
    }

    set_authenticated_user($user["id"]);
    $roleLabel = strtolower(trim((string)($user["role"] ?? ""))) === "expert" ? "Expert" : "Student";
    create_notification($user["id"], "system", "auth", $user["id"], $roleLabel . " login successful.", null);

    json_response(200, true, "Login successful.", [
        "user" => normalize_user_for_client($user)
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to login right now: " . $exception->getMessage());
}
