<?php

function load_phpmailer_dependencies()
{
    static $loaded = false;
    if ($loaded) {
        return;
    }

    $candidateSets = [
      [
        __DIR__ . "/../../Exception.php",
        __DIR__ . "/../../PHPMailer.php",
        __DIR__ . "/../../SMTP.php",
        __DIR__ . "/../../OAuth.php"
      ],
      [
        __DIR__ . "/../../PHPMailer/src/Exception.php",
        __DIR__ . "/../../PHPMailer/src/PHPMailer.php",
        __DIR__ . "/../../PHPMailer/src/SMTP.php",
        __DIR__ . "/../../PHPMailer/src/OAuth.php"
      ],
      [
        __DIR__ . "/../PHPMailer/src/Exception.php",
        __DIR__ . "/../PHPMailer/src/PHPMailer.php",
        __DIR__ . "/../PHPMailer/src/SMTP.php",
        __DIR__ . "/../PHPMailer/src/OAuth.php"
      ],
      [
        __DIR__ . "/../../vendor/phpmailer/phpmailer/src/Exception.php",
        __DIR__ . "/../../vendor/phpmailer/phpmailer/src/PHPMailer.php",
        __DIR__ . "/../../vendor/phpmailer/phpmailer/src/SMTP.php",
        __DIR__ . "/../../vendor/phpmailer/phpmailer/src/OAuth.php"
      ],
      [
        __DIR__ . "/../vendor/phpmailer/phpmailer/src/Exception.php",
        __DIR__ . "/../vendor/phpmailer/phpmailer/src/PHPMailer.php",
        __DIR__ . "/../vendor/phpmailer/phpmailer/src/SMTP.php",
        __DIR__ . "/../vendor/phpmailer/phpmailer/src/OAuth.php"
      ]
    ];

    $loadedAny = false;
    foreach ($candidateSets as $candidateFiles) {
      [$exceptionFile, $phpMailerFile, $smtpFile, $oauthFile] = $candidateFiles;

      if (is_file($exceptionFile) && is_file($phpMailerFile) && is_file($smtpFile)) {
        require_once $exceptionFile;
        require_once $phpMailerFile;
        require_once $smtpFile;
        if (is_file($oauthFile)) {
          require_once $oauthFile;
        }
        $loadedAny = true;
        break;
      }
    }

    if (!$loadedAny || !class_exists("PHPMailer\\PHPMailer\\PHPMailer")) {
        throw new RuntimeException("PHPMailer files not found. Add Exception.php, PHPMailer.php and SMTP.php under a supported PHPMailer/src path.");
    }

    $loaded = true;
}

function build_welcome_email_template($recipientName, $role)
{
    $safeName = htmlspecialchars((string)$recipientName, ENT_QUOTES, "UTF-8");
    $roleLabel = strtolower(trim((string)$role)) === "expert" ? "Expert" : "Student";

    return "
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\" />
  <title>Welcome to InnovaX</title>
</head>
<body style=\"margin:0;padding:0;background:#eef3ff;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;\">
  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:28px 12px;\">
    <tr>
      <td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 40px rgba(31,66,140,0.14);\">
          <tr>
            <td style=\"padding:22px 26px;background:linear-gradient(135deg,#2d6cdf,#0a4fb3);color:#ffffff;\">
              <div style=\"font-size:24px;font-weight:800;letter-spacing:0.3px;\">InnovaX</div>
              <div style=\"margin-top:6px;font-size:13px;opacity:0.9;\">Welcome aboard</div>
            </td>
          </tr>
          <tr>
            <td style=\"padding:26px;\">
              <p style=\"margin:0 0 12px 0;font-size:15px;line-height:1.6;\">Hi {$safeName},</p>
              <p style=\"margin:0 0 14px 0;font-size:15px;line-height:1.6;\">Your {$roleLabel} account has been created successfully.</p>
              <p style=\"margin:0 0 14px 0;font-size:15px;line-height:1.6;\">You can now connect with innovators, share ideas, and grow your impact on InnovaX.</p>
              <p style=\"margin:0;font-size:14px;line-height:1.6;color:#4b5563;\">Regards,<br />InnovaX Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
}

function mailer_config()
{
    $username = trim((string)(getenv("SMTP_USERNAME") ?: ""));
    $password = trim((string)(getenv("SMTP_PASSWORD") ?: ""));

    if ($username === "" || $password === "") {
        throw new RuntimeException("SMTP credentials are missing. Set SMTP_USERNAME and SMTP_PASSWORD in your environment.");
    }

    $fromEmail = trim((string)(getenv("SMTP_FROM_EMAIL") ?: $username));
    $fromName = trim((string)(getenv("SMTP_FROM_NAME") ?: "InnovaX Security"));

    return [
        "host" => trim((string)(getenv("SMTP_HOST") ?: "smtp.gmail.com")),
        "port" => intval(getenv("SMTP_PORT") ?: 587),
        "username" => $username,
        "password" => $password,
        "from_email" => $fromEmail,
        "from_name" => $fromName,
        "secure" => trim((string)(getenv("SMTP_SECURE") ?: "tls"))
    ];
}

function build_reset_email_template($recipientName, $code)
{
    $safeName = htmlspecialchars((string)$recipientName, ENT_QUOTES, "UTF-8");
    $safeCode = htmlspecialchars((string)$code, ENT_QUOTES, "UTF-8");

    return "
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\" />
  <title>InnovaX Password Reset</title>
</head>
<body style=\"margin:0;padding:0;background:#eef3ff;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;\">
  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:28px 12px;\">
    <tr>
      <td align=\"center\">
        <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 40px rgba(31,66,140,0.14);\">
          <tr>
            <td style=\"padding:22px 26px;background:linear-gradient(135deg,#2d6cdf,#0a4fb3);color:#ffffff;\">
              <div style=\"font-size:24px;font-weight:800;letter-spacing:0.3px;\">InnovaX</div>
              <div style=\"margin-top:6px;font-size:13px;opacity:0.9;\">Password Recovery Verification</div>
            </td>
          </tr>
          <tr>
            <td style=\"padding:26px;\">
              <p style=\"margin:0 0 12px 0;font-size:15px;line-height:1.6;\">Hi {$safeName},</p>
              <p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.6;\">Use this verification code to reset your password. This code expires in <strong>15 minutes</strong>.</p>
              <div style=\"margin:16px 0 18px 0;padding:16px;border-radius:14px;background:#f2f7ff;border:1px solid #d7e5ff;text-align:center;\">
                <div style=\"font-size:13px;color:#4b5563;margin-bottom:6px;\">Your verification code</div>
                <div style=\"font-size:32px;letter-spacing:6px;font-weight:800;color:#1f4db3;\">{$safeCode}</div>
              </div>
              <p style=\"margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#4b5563;\">If you did not request this change, you can safely ignore this email.</p>
              <p style=\"margin:0;font-size:14px;line-height:1.6;color:#4b5563;\">Regards,<br />InnovaX Security Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
}

function send_reset_code_email($recipientEmail, $recipientName, $code)
{
    load_phpmailer_dependencies();
    $config = mailer_config();

  $mailerClass = "\\PHPMailer\\PHPMailer\\PHPMailer";
  $mail = new $mailerClass(true);
    $mail->isSMTP();
    $mail->Host = $config["host"];
    $mail->SMTPAuth = true;
    $mail->Username = $config["username"];
    $mail->Password = $config["password"];
    $mail->Port = $config["port"];

    if (strtolower($config["secure"]) === "ssl") {
      $mail->SMTPSecure = $mailerClass::ENCRYPTION_SMTPS;
    } else {
      $mail->SMTPSecure = $mailerClass::ENCRYPTION_STARTTLS;
    }

    $mail->setFrom($config["from_email"], $config["from_name"]);
    $mail->addAddress($recipientEmail, $recipientName ?: "InnovaX User");
    $mail->isHTML(true);
    $mail->Subject = "InnovaX Password Reset Code";
    $mail->Body = build_reset_email_template($recipientName ?: "InnovaX User", $code);
    $mail->AltBody = "Your InnovaX password reset code is {$code}. It expires in 15 minutes.";

    $mail->send();
}

function send_welcome_email($recipientEmail, $recipientName, $role)
{
  load_phpmailer_dependencies();
  $config = mailer_config();

  $mailerClass = "\\PHPMailer\\PHPMailer\\PHPMailer";
  $mail = new $mailerClass(true);
  $mail->isSMTP();
  $mail->Host = $config["host"];
  $mail->SMTPAuth = true;
  $mail->Username = $config["username"];
  $mail->Password = $config["password"];
  $mail->Port = $config["port"];

  if (strtolower($config["secure"]) === "ssl") {
    $mail->SMTPSecure = $mailerClass::ENCRYPTION_SMTPS;
  } else {
    $mail->SMTPSecure = $mailerClass::ENCRYPTION_STARTTLS;
  }

  $mail->setFrom($config["from_email"], $config["from_name"]);
  $mail->addAddress($recipientEmail, $recipientName ?: "InnovaX User");
  $mail->isHTML(true);
  $mail->Subject = "Welcome to InnovaX";
  $mail->Body = build_welcome_email_template($recipientName ?: "InnovaX User", $role);
  $mail->AltBody = "Welcome to InnovaX. Your account has been created successfully.";
  $mail->send();
}
