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

    return "
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\" />
  <title>{$safeTitle}</title>
</head>
<body style=\"margin:0;padding:0;background:#eef3ff;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;\">
  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:28px 12px;\">
    <tr>
      <td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 40px rgba(31,66,140,0.14);\">
          <tr>
            <td style=\"padding:22px 26px;background:linear-gradient(135deg,#2d6cdf,#0a4fb3);color:#ffffff;\">
              <div style=\"font-size:24px;font-weight:800;letter-spacing:0.3px;\">InnovaX</div>
              <div style=\"margin-top:6px;font-size:13px;opacity:0.9;\">Student Broadcast Update</div>
            </td>
          </tr>
          <tr>
            <td style=\"padding:26px;\">
              <p style=\"margin:0 0 12px 0;font-size:15px;line-height:1.6;\">Hi {$safeName},</p>
              <h2 style=\"margin:0 0 10px 0;font-size:21px;color:#1f4db3;\">{$safeTitle}</h2>
              <p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#374151;\">{$safeDescription}</p>
              <div style=\"margin:12px 0 18px 0;padding:14px;border-radius:14px;background:#f2f7ff;border:1px solid #d7e5ff;\">
                <p style=\"margin:0;font-size:13px;color:#334155;line-height:1.6;\">This message was sent by the InnovaX Admin team for all student accounts.</p>
              </div>
              <p style=\"margin:0;font-size:14px;line-height:1.6;color:#4b5563;\">Regards,<br />InnovaX Admin Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
}

try {
    $students = Database::search("SELECT email, full_name FROM users WHERE role = 'student' ORDER BY created_at DESC");

    load_phpmailer_dependencies();
    $config = mailer_config();
    $mailerClass = "\\PHPMailer\\PHPMailer\\PHPMailer";

    $sent = 0;
    $failed = 0;

    while ($row = $students->fetch_assoc()) {
        $recipientEmail = trim((string)($row["email"] ?? ""));
        $recipientName = trim((string)($row["full_name"] ?? "Student"));

        if ($recipientEmail === "") {
            continue;
        }

        try {
            $mail = new $mailerClass(true);
            $mail->isSMTP();
            $mail->Host = $config["host"];
            $mail->SMTPAuth = true;
            $mail->Username = $config["username"];
            $mail->Password = $config["password"];
            $mail->Port = intval($config["port"]);

            if (strtolower($config["secure"]) === "ssl") {
                $mail->SMTPSecure = $mailerClass::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = $mailerClass::ENCRYPTION_STARTTLS;
            }

            $mail->setFrom($config["from_email"], $config["from_name"] ?: "InnovaX Admin");
            $mail->addAddress($recipientEmail, $recipientName);
            $mail->isHTML(true);
            $mail->Subject = $title;
            $mail->Body = build_admin_student_broadcast_template($recipientName, $title, $description);
            $mail->AltBody = $title . "\n\n" . $description;
            $mail->send();
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
