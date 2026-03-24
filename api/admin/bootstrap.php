<?php

require_once __DIR__ . "/../bootstrap.php";

const ADMIN_SESSION_KEY = "auth_admin_user";

function get_admin_config()
{
    $username = trim((string)(getenv("ADMIN_USERNAME") ?: "admin@innovax.works"));
    $passwordHash = trim((string)(getenv("ADMIN_PASSWORD_HASH") ?: ""));
    $plainPassword = trim((string)(getenv("ADMIN_PASSWORD") ?: "Admin@12345"));

    return [
        "username" => $username,
        "password_hash" => $passwordHash,
        "plain_password" => $plainPassword
    ];
}

function set_admin_authenticated($username)
{
    $_SESSION[ADMIN_SESSION_KEY] = [
        "username" => trim((string)$username),
        "loggedAt" => date("c")
    ];
}

function get_admin_authenticated_user()
{
    $value = $_SESSION[ADMIN_SESSION_KEY] ?? null;
    if (!is_array($value)) {
        return null;
    }

    $username = trim((string)($value["username"] ?? ""));
    if ($username === "") {
        return null;
    }

    return [
        "username" => $username,
        "loggedAt" => $value["loggedAt"] ?? ""
    ];
}

function clear_admin_authenticated_user()
{
    unset($_SESSION[ADMIN_SESSION_KEY]);
}

function require_admin_authenticated_user()
{
    $admin = get_admin_authenticated_user();
    if (!$admin) {
        json_response(401, false, "Admin authentication required.");
    }

    return $admin;
}

function validate_admin_credentials($username, $password)
{
    $config = get_admin_config();
    $cleanUsername = trim((string)$username);
    $cleanPassword = (string)$password;

    if ($cleanUsername === "" || $cleanPassword === "") {
        return false;
    }

    if (!hash_equals(strtolower($config["username"]), strtolower($cleanUsername))) {
        return false;
    }

    if ($config["password_hash"] !== "") {
        return password_verify($cleanPassword, $config["password_hash"]);
    }

    return hash_equals($config["plain_password"], $cleanPassword);
}

function normalize_role_filter($role)
{
    $value = strtolower(trim((string)$role));
    if ($value === "student" || $value === "expert") {
        return $value;
    }
    return "";
}
