<?php

require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../auth/mailer.php";

require_method("POST");
initialize_core_schema();
$admin = require_admin_authenticated_user();

$body = read_json_body();
$title = trim((string)($body["title"] ?? ""));
$description = trim((string)($body["description"] ?? ""));

if ($title === "" || $description === "") {
    json_response(400, false, "Both title and description are required.");
}

function build_admin_student_broadcast_template($recipientName, $title, $description)
{
    $safeName = htmlspecialchars((string)$recipientName, ENT_QUOTES, "UTF-8");
    $safeTitle = htmlspecialchars((string)$title, ENT_QUOTES, "UTF-8");
    $safeDescription = nl2br(htmlspecialchars((string)$description, ENT_QUOTES, "UTF-8"));

    $content = "
      <p class=\"lead\">Hi {$safeName},</p>
      <h2 style=\"margin:0 0 10px 0;font-size:21px;color:#1f4db3;\">{$safeTitle}</h2>
      <p class=\"lead\" style=\"color:#374151;\">{$safeDescription}</p>
      <div class=\"info-box\">
        <div class=\"info-label\">Admin Broadcast</div>
        <div class=\"info-value\">This message was sent by the InnovaX Admin team for all student accounts.</div>
      </div>
      <p class=\"muted\">Regards,<br />InnovaX Admin Team</p>
    ";

    return build_innovax_email_layout($safeTitle, "Student Broadcast Update", $content, "InnovaX Admin");
}

try {
    $students = Database::search("SELECT email, full_name FROM users WHERE role = 'student' ORDER BY created_at DESC");

    $sent = 0;
    $failed = 0;

    while ($row = $students->fetch_assoc()) {
        $recipientEmail = trim((string)($row["email"] ?? ""));
        $recipientName = trim((string)($row["full_name"] ?? "Student"));

        if ($recipientEmail === "") {
            continue;
        }

        try {
          send_smtp_html_email(
            $recipientEmail,
            $recipientName,
            $title,
            build_admin_student_broadcast_template($recipientName, $title, $description),
            $title . "\n\n" . $description
          );
            $sent++;
        } catch (Exception $mailException) {
            $failed++;
        }
    }

    json_response(200, true, "Student email broadcast completed.", [
        "admin" => $admin["username"],
        "sentCount" => $sent,
        "failedCount" => $failed,
        "title" => $title
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to send student emails.");
}
