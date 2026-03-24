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

    $content = "
      <p class=\"lead\">Hi {$safeName},</p>
      <p class=\"lead\">Your {$roleLabel} account has been created successfully.</p>
      <p class=\"lead\">You can now connect with innovators, share ideas, and grow your impact on InnovaX.</p>
      <div class=\"info-box\">
        <div class=\"info-label\">Account Type</div>
        <div class=\"info-value\">{$roleLabel}</div>
      </div>
      <p class=\"muted\">Regards,<br />InnovaX Team</p>
    ";

    return build_innovax_email_layout("Welcome to InnovaX", "Your account is now active", $content, "InnovaX Team");
}

function mailer_config()
{
    $username = trim((string)(getenv("SMTP_USERNAME") ?: "noreply@innovax.works"));
    $password = trim((string)(getenv("SMTP_PASSWORD") ?: "UU68On8u.8;Yfl"));
    $fromEmail = trim((string)(getenv("SMTP_FROM_EMAIL") ?: "noreply@innovax.works"));
    $fromName = trim((string)(getenv("SMTP_FROM_NAME") ?: "InnovaX"));

    return [
        "host" => trim((string)(getenv("SMTP_HOST") ?: "mail.innovax.works")),
        "port" => intval(getenv("SMTP_PORT") ?: 587),
        "username" => $username,
        "password" => $password,
        "from_email" => $fromEmail,
        "from_name" => $fromName,
        "secure" => trim((string)(getenv("SMTP_SECURE") ?: "tls"))
    ];
}

function build_innovax_email_layout($headerTitle, $headerSubtitle, $contentHtml, $footerHeading = "InnovaX")
{
    $safeHeaderTitle = htmlspecialchars((string)$headerTitle, ENT_QUOTES, "UTF-8");
    $safeHeaderSubtitle = htmlspecialchars((string)$headerSubtitle, ENT_QUOTES, "UTF-8");
    $safeFooterHeading = htmlspecialchars((string)$footerHeading, ENT_QUOTES, "UTF-8");
    $year = date("Y");

    return "
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{$safeHeaderTitle}</title>
  <style>
    body { font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #edf2ff 0%, #d8e5ff 100%); padding: 20px; margin: 0; }
    .email-container { max-width: 620px; background: #ffffff; margin: 0 auto; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.14); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0d4cb6 0%, #2d6cdf 100%); color: #ffffff; padding: 28px 22px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.4px; }
    .header p { margin: 8px 0 0 0; font-size: 13px; opacity: 0.92; }
    .content { padding: 28px 24px; }
    .lead { font-size: 15px; color: #273043; margin: 0 0 14px 0; line-height: 1.7; }
    .info-box { background: #f3f7ff; border-left: 4px solid #1f5cc4; padding: 14px 18px; margin: 14px 0; border-radius: 4px; }
    .info-label { font-size: 12px; color: #1f5cc4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0; }
    .info-value { font-size: 15px; color: #1f2937; margin: 0; word-break: break-word; }
    .code-box { margin: 16px 0 18px 0; padding: 16px; border-radius: 14px; background: #eef4ff; border: 1px solid #d2e2ff; text-align: center; }
    .code-text { font-size: 32px; letter-spacing: 6px; font-weight: 800; color: #1f4db3; margin: 0; }
    .muted { font-size: 14px; line-height: 1.6; color: #55627a; margin: 0; }
    .footer { background: #f5f7fb; padding: 20px 24px; text-align: center; border-top: 1px solid #e1e8f5; }
    .footer-text { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.7; }
  </style>
</head>
<body>
  <div class=\"email-container\">
    <div class=\"header\">
      <h1>{$safeHeaderTitle}</h1>
      <p>{$safeHeaderSubtitle}</p>
    </div>
    <div class=\"content\">{$contentHtml}</div>
    <div class=\"footer\">
      <p class=\"footer-text\"><strong>{$safeFooterHeading}</strong><br />innovax.works<br /><small>&copy; {$year} InnovaX. All Rights Reserved.</small></p>
    </div>
  </div>
</body>
</html>";
}

function create_configured_mailer()
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
    $mail->Port = intval($config["port"]);

    if (strtolower($config["secure"]) === "ssl") {
        $mail->SMTPSecure = $mailerClass::ENCRYPTION_SMTPS;
    } else {
        $mail->SMTPSecure = $mailerClass::ENCRYPTION_STARTTLS;
    }

    $mail->setFrom($config["from_email"], $config["from_name"] ?: "InnovaX");
    return $mail;
}

function send_smtp_html_email($recipientEmail, $recipientName, $subject, $htmlBody, $altBody = "")
{
    $mail = create_configured_mailer();
    $mail->addAddress($recipientEmail, $recipientName ?: "InnovaX User");
    $mail->isHTML(true);
    $mail->Subject = (string)$subject;
    $mail->Body = (string)$htmlBody;
    $mail->AltBody = (string)$altBody;
    $mail->send();
}

function build_reset_email_template($recipientName, $code)
{
    $safeName = htmlspecialchars((string)$recipientName, ENT_QUOTES, "UTF-8");
    $safeCode = htmlspecialchars((string)$code, ENT_QUOTES, "UTF-8");

    $content = "
      <p class=\"lead\">Hi {$safeName},</p>
      <p class=\"lead\">Use this verification code to reset your password. This code expires in <strong>15 minutes</strong>.</p>
      <div class=\"code-box\">
        <div class=\"info-label\" style=\"text-align:center;\">Your verification code</div>
        <p class=\"code-text\">{$safeCode}</p>
      </div>
      <p class=\"muted\">If you did not request this change, you can safely ignore this email.</p>
      <p class=\"muted\">Regards,<br />InnovaX Security Team</p>
    ";

    return build_innovax_email_layout("InnovaX Password Reset", "Password Recovery Verification", $content, "InnovaX Security");
}

function send_reset_code_email($recipientEmail, $recipientName, $code)
{
    send_smtp_html_email(
        $recipientEmail,
        $recipientName ?: "InnovaX User",
        "InnovaX Password Reset Code",
        build_reset_email_template($recipientName ?: "InnovaX User", $code),
        "Your InnovaX password reset code is {$code}. It expires in 15 minutes."
    );
}

function send_welcome_email($recipientEmail, $recipientName, $role)
{
    send_smtp_html_email(
        $recipientEmail,
        $recipientName ?: "InnovaX User",
        "Welcome to InnovaX",
        build_welcome_email_template($recipientName ?: "InnovaX User", $role),
        "Welcome to InnovaX. Your account has been created successfully."
    );
}
