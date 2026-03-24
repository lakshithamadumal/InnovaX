<?php

require_once __DIR__ . "/bootstrap.php";

require_method("POST");
initialize_core_schema();

$body = read_json_body();
$username = trim((string)($body["username"] ?? ""));
$password = (string)($body["password"] ?? "");

if (!validate_admin_credentials($username, $password)) {
    json_response(401, false, "Invalid admin credentials.");
}

set_admin_authenticated($username);

json_response(200, true, "Admin login successful.", [
    "admin" => [
        "username" => $username
    ]
]);
