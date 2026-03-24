<?php

require_once __DIR__ . "/bootstrap.php";

require_method("GET");
$admin = require_admin_authenticated_user();

json_response(200, true, "Admin session active.", [
    "admin" => $admin
]);
