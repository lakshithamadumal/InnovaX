<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

clear_authenticated_user();
session_regenerate_id(true);

json_response(200, true, "Logout successful.");
