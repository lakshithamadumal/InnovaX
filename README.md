# InnovaX Frontend UI

Modern, component-driven multi-page UI built with HTML5, CSS3, and vanilla JavaScript.

## Design Consistency

- Feed design tokens are the baseline and reused across all pages.
- Shared theme variables live in [assets/css/style.css](assets/css/style.css).
- Additive multi-page styles live in [assets/css/layout.css](assets/css/layout.css), [assets/css/components.css](assets/css/components.css), and [assets/css/responsive.css](assets/css/responsive.css).

## Component System

Reusable HTML partials are loaded dynamically with fetch API from [assets/js/app.js](assets/js/app.js):

- [components/navbar.html](components/navbar.html)
- [components/sidebar-left.html](components/sidebar-left.html)
- [components/sidebar-right.html](components/sidebar-right.html)
- [components/post-card.html](components/post-card.html)
- [components/create-post.html](components/create-post.html)
- [components/comment-section.html](components/comment-section.html)
- [components/footer.html](components/footer.html)

## Implemented Pages

Authentication:

- [login.html](login.html)
- [register.html](register.html)

Core Platform:

- [feed.html](feed.html)
- [post-view.html](post-view.html)

Profile System:

- [my-profile.html](my-profile.html)
- [user-profile.html](user-profile.html)

Innovation System:

- [create-post.html](create-post.html)
- [edit-post.html](edit-post.html)
- [saved-posts.html](saved-posts.html)

Network System:

- [network.html](network.html)
- [suggestions.html](suggestions.html)
- [search-results.html](search-results.html)

Communication:

- [messages.html](messages.html)

Notifications:

- [notifications.html](notifications.html)

Company / Professional:

- [company-profile.html](company-profile.html)

Rating System:

- [project-view.html](project-view.html)

Learning / Content:

- [articles.html](articles.html)
- [article-view.html](article-view.html)

Upload System:

- [pitch-upload.html](pitch-upload.html)

Settings:

- [settings.html](settings.html)

Additional:

- [index.html](index.html) (landing/auth entry)
- [profile.html](profile.html) and [course.html](course.html) kept as compatibility routes.

## Frontend Interaction Features

- Like toggle with live count updates.
- Comment system with reply threads.
- Dynamic post creation simulation.
- Follow/connect toggle behavior.
- Notification badge and read-state updates.
- Chat UI simulation with conversation switching.
- Star rating interaction in project view.

## Data Seeds

- [data/posts.json](data/posts.json)
- [data/users.json](data/users.json)

## Responsive Behavior

- Desktop: 3-column layout.
- Tablet: 2-column layout.
- Mobile: single-column stacked layout.

## Backend Setup (PHP + MySQL)

This project now includes real login/register and DB-backed feeds.

1. Import schema:
   - Run [database/innovax_schema.sql](database/innovax_schema.sql)
2. Seed lookup data (universities, faculties, departments, skills):
   - Run [database/lookup_seed.sql](database/lookup_seed.sql)
3. Optional cleanup of temporary seed/test users and posts:
   - Run [database/cleanup_temp_data.sql](database/cleanup_temp_data.sql)
4. Serve project with PHP (XAMPP/WAMP/Laragon or PHP built-in server) so [api/auth/login.php](api/auth/login.php) and [api/auth/register.php](api/auth/register.php) are reachable.

Database connection file:

- [database/connection.php](database/connection.php)

APIs added:

- [api/auth/login.php](api/auth/login.php)
- [api/auth/register.php](api/auth/register.php)
- [api/auth/forgot-password.php](api/auth/forgot-password.php)
- [api/auth/verify-reset-code.php](api/auth/verify-reset-code.php)
- [api/auth/reset-password.php](api/auth/reset-password.php)
- [api/posts/list.php](api/posts/list.php)
- [api/users/students.php](api/users/students.php)

## Forgot Password (Email Code)

The login page now includes a 3-step forgot-password flow:

1. Enter account email
2. Verify 6-digit code sent to email
3. Set a new password

Database updates are auto-applied in [api/bootstrap.php](api/bootstrap.php) with these columns on `users`:

- `reset_code_hash`
- `reset_code_expires_at`
- `reset_code_sent_at`

### SMTP / PHPMailer setup

Place PHPMailer source files (`Exception.php`, `PHPMailer.php`, `SMTP.php`) in one of these folders:

- `PHPMailer/src`
- `api/PHPMailer/src`
- `vendor/phpmailer/phpmailer/src`
- `api/vendor/phpmailer/phpmailer/src`

Set environment variables for SMTP:

- `SMTP_HOST` (default: `smtp.gmail.com`)
- `SMTP_PORT` (default: `587`)
- `SMTP_SECURE` (`tls` or `ssl`)
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL` (optional, defaults to username)
- `SMTP_FROM_NAME` (optional, default: `InnovaX Security`)
