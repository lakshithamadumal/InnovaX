<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    if (($authUser["role"] ?? "") !== "student") {
        json_response(403, false, "Only students can create posts.");
    }

    $payload = read_json_body();
    $title = trim((string)($payload["title"] ?? ""));
    $description = trim((string)($payload["description"] ?? ""));
    $mediaType = strtolower(trim((string)($payload["media_type"] ?? "none")));
    $mediaLabel = trim((string)($payload["media_label"] ?? ""));
    $mediaDataUrl = trim((string)($payload["media_data_url"] ?? ""));
    $documentDataUrl = trim((string)($payload["document_data_url"] ?? ""));
    $documentLabel = trim((string)($payload["document_label"] ?? ""));
    $tags = is_array($payload["tags"] ?? null) ? $payload["tags"] : [];

    if ($title === "") {
        json_response(400, false, "Title is required.");
    }

    $titleWordParts = preg_split('/\s+/', trim($title));
    $titleWordParts = is_array($titleWordParts) ? array_values(array_filter($titleWordParts, function ($part) {
        return trim((string)$part) !== "";
    })) : [];
    $titleWordCount = count($titleWordParts);
    if ($titleWordCount < 2 || $titleWordCount > 20) {
        json_response(400, false, "Title should be between 2 and 20 words.");
    }

    $allowedMediaTypes = ["none", "image", "pdf"];
    if (!in_array($mediaType, $allowedMediaTypes, true)) {
        json_response(400, false, "Only image and PDF media are supported.");
    }

    $hasImageUpload = $mediaDataUrl !== "";
    $hasDocumentUpload = $documentDataUrl !== "";

    if ($hasDocumentUpload && !$hasImageUpload) {
        json_response(400, false, "Image is required when attaching a document.");
    }

    if ($mediaType === "image" && !$hasImageUpload) {
        json_response(400, false, "Image data is required for image posts.");
    }

    if ($mediaType === "pdf" && !$hasDocumentUpload) {
        json_response(400, false, "Document data is required for document posts.");
    }

    $mediaUrl = null;
    $documentUrl = null;

    if ($hasImageUpload) {
        $mediaUrl = upload_image_to_imgbb($mediaDataUrl, "post_" . $authUser["id"]);
        if ($mediaLabel === "") {
            $mediaLabel = "Post Image";
        }
        $mediaType = "image";
    } else {
        $mediaType = "none";
        $mediaLabel = "";
    }

    if ($hasDocumentUpload) {
        $documentUrl = upload_document_locally($documentDataUrl, "post_" . $authUser["id"]);
        if ($documentLabel === "") {
            $documentLabel = "Post Document";
        }
    }

    $postId = generate_uuid_v4();
    $authorId = $authUser["id"];

    $connection = Database::$connection;
    if (!$connection) {
        Database::setUpConnection();
        $connection = Database::$connection;
    }

    $connection->begin_transaction();

    $insertPost = Database::prepare(
           "INSERT INTO posts (id, author_id, title, description, media_type, media_url, media_label, document_url, document_label, is_company_owned)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"
    );
        $insertPost->bind_param("sssssssss", $postId, $authorId, $title, $description, $mediaType, $mediaUrl, $mediaLabel, $documentUrl, $documentLabel);
    if (!$insertPost->execute()) {
        throw new Exception("Unable to create post.");
    }
    $insertPost->close();

    if (!empty($tags)) {
        $insertTag = Database::prepare("INSERT IGNORE INTO post_tags (post_id, tag) VALUES (?, ?)");
        foreach ($tags as $tagRaw) {
            $cleanTag = trim((string)$tagRaw);
            if ($cleanTag === "") {
                continue;
            }
            if (substr($cleanTag, 0, 1) !== "#") {
                $cleanTag = "#" . $cleanTag;
            }
            $insertTag->bind_param("ss", $postId, $cleanTag);
            $insertTag->execute();
        }
        $insertTag->close();
    }

    $expertList = Database::prepare("SELECT id FROM users WHERE role = 'expert'");
    $expertList->execute();
    $expertResult = $expertList->get_result();

    $titleSnippet = substr($title, 0, 80);
    $message = "A student published a new post: " . $titleSnippet;

    while ($expert = $expertResult ? $expertResult->fetch_assoc() : null) {
        if (!$expert) {
            break;
        }
        $expertId = trim((string)($expert["id"] ?? ""));
        if ($expertId === "") {
            continue;
        }

        create_notification($expertId, "system", "post", $postId, $message, null);
    }
    $expertList->close();

    create_notification($authorId, "system", "post", $postId, "Your post was published successfully.", null);

    $connection->commit();

    json_response(201, true, "Post created.", [
        "post" => [
            "id" => $postId,
            "authorId" => $authorId,
            "title" => $title,
            "desc" => $description,
            "media" => ($mediaType === "image") ? [
                "type" => $mediaType,
                "url" => $mediaUrl,
                "label" => $mediaLabel
            ] : null,
            "document" => $documentUrl ? [
                "type" => "pdf",
                "url" => $documentUrl,
                "label" => $documentLabel
            ] : null,
            "tags" => array_values(array_filter(array_map(function ($tag) {
                $cleanTag = trim((string)$tag);
                if ($cleanTag === "") {
                    return "";
                }
                return substr($cleanTag, 0, 1) === "#" ? $cleanTag : "#" . $cleanTag;
            }, $tags))),
            "likes" => 0,
            "liked" => false,
            "saved" => false,
            "time" => date("Y-m-d H:i:s")
        ]
    ]);
} catch (Exception $exception) {
    if (isset($connection) && $connection) {
        $connection->rollback();
    }
    json_response(500, false, "Unable to create post: " . $exception->getMessage());
}
