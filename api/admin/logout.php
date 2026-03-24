<?php

require_once __DIR__ . "/bootstrap.php";

require_method("POST");
clear_admin_authenticated_user();

json_response(200, true, "Admin logged out.");
