<?php

require_once __DIR__ . "/../bootstrap.php";

require_method("POST");
initialize_core_schema();

try {
    $authUser = require_authenticated_user();
    $payload = read_json_body();

    $fullName = trim((string)($payload["full_name"] ?? ""));
    $bio = trim((string)($payload["bio"] ?? ""));
    $title = trim((string)($payload["title"] ?? ""));
    $organization = trim((string)($payload["organization"] ?? ""));
    $skillsInput = is_array($payload["skills"] ?? null) ? $payload["skills"] : null;

    if ($fullName === "") {
        json_response(400, false, "Display name is required.");
    }

    $userId = $authUser["id"];

    $updateUser = Database::prepare("UPDATE users SET full_name = ?, bio = ? WHERE id = ?");
    $updateUser->bind_param("sss", $fullName, $bio, $userId);
    $updateUser->execute();
    $updateUser->close();

    if (($authUser["role"] ?? "") === "expert") {
        $updateExpert = Database::prepare("UPDATE expert_profiles SET title = ?, organization = ? WHERE user_id = ?");
        $updateExpert->bind_param("sss", $title, $organization, $userId);
        $updateExpert->execute();
        $updateExpert->close();
    } elseif (($authUser["role"] ?? "") === "student" && is_array($skillsInput)) {
        $normalizedSkills = [];
        foreach ($skillsInput as $skillRaw) {
            $skillName = strtolower(trim((string)$skillRaw));
            $skillName = ltrim($skillName, "#");
            if ($skillName === "") {
                continue;
            }

            if (!in_array($skillName, $normalizedSkills, true)) {
                $normalizedSkills[] = $skillName;
            }
        }

        if (count($normalizedSkills) > 5) {
            json_response(400, false, "Maximum 5 skills are allowed.");
        }

        $skillIds = [];
        foreach ($normalizedSkills as $skillName) {
            $skillId = skill_id_by_name($skillName);
            if ($skillId <= 0) {
                json_response(400, false, "Invalid skill: " . $skillName);
            }
            if (!in_array($skillId, $skillIds, true)) {
                $skillIds[] = $skillId;
            }
        }

        $deleteSkills = Database::prepare("DELETE FROM user_skills WHERE user_id = ?");
        $deleteSkills->bind_param("s", $userId);
        $deleteSkills->execute();
        $deleteSkills->close();

        if (!empty($skillIds)) {
            $insertSkill = Database::prepare("INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)");
            foreach ($skillIds as $skillId) {
                $insertSkill->bind_param("si", $userId, $skillId);
                $insertSkill->execute();
            }
            $insertSkill->close();
        }
    }

    $freshUser = fetch_user_by_id($userId);

    json_response(200, true, "Profile updated.", [
        "user" => normalize_user_for_client($freshUser)
    ]);
} catch (Exception $exception) {
    json_response(500, false, "Unable to update profile: " . $exception->getMessage());
}
