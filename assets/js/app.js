(() => {
  const templateCache = new Map();
  const EXPERT_RATINGS_STORAGE_KEY = "expertPostRatings";
  const DEFAULT_PROFILE_AVATAR_URL = "assets/images/users/default-avatar.svg";
  const DEFAULT_PROFILE_COVER_URL = "assets/images/users/default-cover.svg";
  const POST_DESC_PREVIEW_LIMIT = 180;
  const POST_TITLE_MIN_WORDS = 2;
  const POST_TITLE_MAX_WORDS = 20;
  const PUBLIC_SITE_ORIGIN = "https://innovax.works";

  const state = {
    isLoggedIn: JSON.parse(localStorage.getItem("isLoggedIn") || "false"),
    userRole: localStorage.getItem("userRole") || null,
    currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
    posts: [],
    studentProfiles: [],
    myProfile: null,
    viewedUserProfile: null,
    postTemplate: "",
    notificationCount: 0,
    notifications: [],
    trendingInnovations: [],
    feedSort: "recent",
    createPostMedia: null
  };

  function normalizeAvatarUrl(urlValue) {
    const raw = String(urlValue || "").trim();
    if (!raw) {
      return "";
    }

    const normalized = raw.replace(/\\/g, "/").toLowerCase();
    const defaultAvatar = DEFAULT_PROFILE_AVATAR_URL.toLowerCase();

    if (normalized === defaultAvatar || normalized.endsWith("/default-avatar.svg") || normalized.endsWith("assets/images/users/default-avatar.svg")) {
      return "";
    }

    return raw;
  }

  if (state.currentUser) {
    state.currentUser.profileImageUrl = normalizeAvatarUrl(state.currentUser.profileImageUrl);
    state.currentUser.coverImageUrl = state.currentUser.coverImageUrl || DEFAULT_PROFILE_COVER_URL;
    localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(isoDate) {
    if (!isoDate) {
      return "Just now";
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return "Just now";
    }

    const now = new Date();
    const timePart = parsed.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });

    const sameDay =
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate();

    if (sameDay) {
      return timePart;
    }

    const sameYear = parsed.getFullYear() === now.getFullYear();
    if (sameYear) {
      const dayPart = parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      });
      return `${dayPart} • ${timePart}`;
    }

    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function countWords(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned) {
      return 0;
    }
    return cleaned.split(/\s+/).filter(Boolean).length;
  }

  function getExpertRatingsStore() {
    try {
      const raw = localStorage.getItem(EXPERT_RATINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveExpertRatingsStore(store) {
    localStorage.setItem(EXPERT_RATINGS_STORAGE_KEY, JSON.stringify(store));
  }

  function getCurrentExpertRatings() {
    if (!state.currentUser?.id) {
      return [];
    }

    const store = getExpertRatingsStore();
    const ratings = Array.isArray(store[state.currentUser.id]) ? store[state.currentUser.id] : [];
    return ratings
      .filter((rating) => rating && rating.postId)
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }

  function setCurrentExpertRatings(ratings) {
    if (!state.currentUser?.id) {
      return;
    }

    const store = getExpertRatingsStore();
    store[state.currentUser.id] = ratings;
    saveExpertRatingsStore(store);
  }

  function findPostById(postId) {
    return state.posts.find((post) => String(post.id) === String(postId)) || null;
  }

  function buildPostViewUrl(postId) {
    return `post-view.html?postId=${encodeURIComponent(String(postId || ""))}`;
  }

  function buildPublicPostViewUrl(postId) {
    return new URL(buildPostViewUrl(postId), `${PUBLIC_SITE_ORIGIN}/`).href;
  }

  function buildEmptyPageUrl(code) {
    const params = new URLSearchParams();
    if (code) {
      params.set("code", String(code));
    }
    const query = params.toString();
    return query ? `empty-page.html?${query}` : "empty-page.html";
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const copied = document.execCommand("copy");
        if (copied) {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
        return;
      } finally {
        document.body.removeChild(textarea);
      }

      reject(new Error("Clipboard copy failed"));
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  function clearLocalAuthState() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUser");
    state.isLoggedIn = false;
    state.userRole = null;
    state.currentUser = null;
  }

  function setLoggedInUser(user, role) {
    const normalizedRole = role || user?.role || null;
    state.isLoggedIn = true;
    state.userRole = normalizedRole;
    state.currentUser = {
      ...user,
      profileImageUrl: normalizeAvatarUrl(user?.profileImageUrl),
      coverImageUrl: user?.coverImageUrl || DEFAULT_PROFILE_COVER_URL
    };
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", normalizedRole || "");
    localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
  }

  function saveCurrentUserState() {
    if (!state.currentUser) {
      return;
    }
    localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
  }

  async function logout() {
    try {
      await postJson("api/auth/logout.php", {});
    } catch (error) {
      // Local cleanup still continues even if API call fails.
    } finally {
      clearLocalAuthState();
      window.location.href = "index.html";
    }
  }

  function showLoginDialog() {
    const dialog = document.createElement("div");
    dialog.className = "auth-dialog-overlay";
    dialog.innerHTML = `
      <div class="auth-dialog-card" role="dialog" aria-modal="true" aria-label="Login required">
        <h2>Login Required</h2>
        <p>Please login to continue this action.</p>
        <div class="auth-dialog-actions">
          <button type="button" class="btn-secondary" data-dialog-close>Cancel</button>
          <a href="login.html" class="btn-primary">Login</a>
          <a href="register.html" class="btn-secondary">Register</a>
        </div>
      </div>
    `;

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-dialog-close]")) {
        dialog.remove();
      }
    });

    document.body.appendChild(dialog);
  }

  function showConfirmDialog(options = {}) {
    const title = String(options.title || "Confirm Action");
    const message = String(options.message || "Are you sure?");
    const confirmLabel = String(options.confirmLabel || "Confirm");
    const cancelLabel = String(options.cancelLabel || "Cancel");

    return new Promise((resolve) => {
      const dialog = document.createElement("div");
      dialog.className = "auth-dialog-overlay";
      dialog.innerHTML = `
        <div class="auth-dialog-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
          <div class="auth-dialog-actions">
            <button type="button" class="btn-secondary" data-dialog-cancel>${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn-secondary confirm-delete-btn" data-dialog-confirm>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      `;

      const keyHandler = (event) => {
        if (event.key === "Escape") {
          finish(false);
        }
      };

      let settled = false;
      const finish = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        document.removeEventListener("keydown", keyHandler);
        dialog.remove();
        resolve(value);
      };

      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target.closest("[data-dialog-cancel]")) {
          finish(false);
          return;
        }
        if (event.target.closest("[data-dialog-confirm]")) {
          finish(true);
        }
      });

      document.addEventListener("keydown", keyHandler);

      document.body.appendChild(dialog);
    });
  }

  function requireAuthAction() {
    if (state.isLoggedIn) {
      return true;
    }
    showLoginDialog();
    return false;
  }

  async function getJson(path) {
    const response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin"
    });
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload || payload.success === false) {
      const message = payload?.message || `Request failed: ${path}`;
      throw new Error(message);
    }

    return payload;
  }

  async function postJson(path, body) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload || payload.success === false) {
      const message = payload?.message || `Request failed: ${path}`;
      throw new Error(message);
    }

    return payload;
  }

  function normalizeApiError(error, fallbackMessage) {
    const message = String(error?.message || "").trim();
    if (!message) {
      return fallbackMessage;
    }

    if (message.toLowerCase().includes("failed to fetch")) {
      return "Cannot reach server API. Open project through localhost (Apache/XAMPP), not file://.";
    }

    return message;
  }

  function setSubmitBusy(button, isBusy, busyLabel) {
    if (!button) {
      return;
    }

    if (!button.dataset.defaultHtml) {
      button.dataset.defaultHtml = button.innerHTML;
    }

    button.disabled = isBusy;
    if (isBusy) {
      button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${escapeHtml(busyLabel)}`;
      button.classList.add("is-loading");
      return;
    }

    button.innerHTML = button.dataset.defaultHtml;
    button.classList.remove("is-loading");
  }

  function logAuthEvent(type, payload) {
    console.log(`[AUTH:${type}]`, payload);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No file selected."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }

  async function fetchText(path) {
    if (templateCache.has(path)) {
      return templateCache.get(path);
    }

    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    const text = await response.text();
    templateCache.set(path, text);
    return text;
  }

  function applyTemplate(template, map) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        return map[key];
      }
      return "";
    });
  }

  async function mountComponents() {
    const placeholders = Array.from(document.querySelectorAll("[data-component]"));
    for (const placeholder of placeholders) {
      const componentName = placeholder.dataset.component;
      const componentPath = `components/${componentName}.html`;

      try {
        const html = await fetchText(componentPath);
        const wrapper = document.createElement("template");
        wrapper.innerHTML = html.trim();
        const nodes = Array.from(wrapper.content.childNodes).filter((node) => {
          return node.nodeType !== Node.TEXT_NODE || node.textContent.trim();
        });

        if (!nodes.length) {
          placeholder.remove();
          continue;
        }
        placeholder.replaceWith(...nodes);
      } catch (error) {
        placeholder.innerHTML = `<div class="card sidebar-section"><p class="section-note">Unable to load ${escapeHtml(componentName)}.</p></div>`;
      }
    }
  }

  async function loadPostTemplate() {
    state.postTemplate = await fetchText("components/post-card.html");
  }

  async function loadPostsData() {
    try {
      const payload = await getJson("api/posts/list.php");
      const data = Array.isArray(payload.data?.posts) ? payload.data.posts : [];
      const normalized = Array.isArray(data) ? data : [];

      state.posts = normalized.map((post, index) => {
        const id = String(post.id || `db-${index + 1}`);
        const parsedOrder = Date.parse(post.time || "");
        return {
          id,
          authorId: post.authorId || "",
          avatar: post.avatar || getInitials(post.name || "InnovaX Member"),
          avatarImageUrl: post.avatarImageUrl || "",
          avatarColor: post.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)",
          name: post.name || "InnovaX Member",
          university: post.university || "",
          role: post.role || "Member",
          time: post.time || "Now",
          title: post.title || "Untitled post",
          desc: post.desc || "",
          tags: Array.isArray(post.tags) ? post.tags : [],
          media: post.media || null,
          likes: Number(post.likes || 0),
          liked: Boolean(post.liked),
          saved: Boolean(post.saved),
          createdOrder: Number.isFinite(parsedOrder) ? parsedOrder : (normalized.length - index)
        };
      });
    } catch (error) {
      state.posts = [];
    }
  }

  async function loadTrendingInnovationsData() {
    try {
      const payload = await getJson("api/posts/trending.php?limit=5");
      const rows = Array.isArray(payload.data?.trending) ? payload.data.trending : [];

      state.trendingInnovations = rows
        .map((row, index) => {
          const count = Number(row.count || 0);
          const tagRaw = String(row.tag || "").trim();
          const tag = tagRaw.startsWith("#") ? tagRaw : `#${tagRaw}`;
          if (tag === "#") {
            return null;
          }

          return {
            rank: Number(row.rank || index + 1),
            tag,
            count
          };
        })
        .filter(Boolean);
    } catch (error) {
      const counts = new Map();
      state.posts.forEach((post) => {
        const tags = Array.isArray(post.tags) ? post.tags : [];
        tags.forEach((tagRaw) => {
          const clean = String(tagRaw || "").trim();
          if (!clean) {
            return;
          }
          const tag = clean.startsWith("#") ? clean : `#${clean}`;
          counts.set(tag, (counts.get(tag) || 0) + 1);
        });
      });

      state.trendingInnovations = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count], index) => ({
          rank: index + 1,
          tag,
          count
        }));
    }
  }

  async function loadNotificationsData() {
    if (!state.isLoggedIn) {
      state.notifications = [];
      state.notificationCount = 0;
      return;
    }

    try {
      const payload = await getJson("api/notifications/list.php");
      const list = Array.isArray(payload.data?.notifications) ? payload.data.notifications : [];
      state.notifications = list.map((entry) => ({
        id: Number(entry.id || 0),
        type: String(entry.type || "system"),
        entityType: String(entry.entityType || ""),
        entityId: String(entry.entityId || ""),
        message: String(entry.message || ""),
        isRead: Boolean(entry.isRead),
        createdAt: String(entry.createdAt || "")
      }));

      const unreadFromServer = Number(payload.data?.unreadCount || 0);
      if (Number.isFinite(unreadFromServer) && unreadFromServer >= 0) {
        state.notificationCount = unreadFromServer;
      } else {
        state.notificationCount = state.notifications.filter((item) => !item.isRead).length;
      }
    } catch (error) {
      state.notifications = [];
      state.notificationCount = 0;
    }
  }

  async function refreshNotificationsUi() {
    try {
      await loadNotificationsData();
      updateNotificationBadge();
      renderNotificationsPage();
    } catch (error) {
      // Ignore refresh failures silently; action results should still proceed.
    }
  }

  async function loadStudentProfilesData() {
    try {
      const payload = await getJson("api/users/students.php");
      const list = Array.isArray(payload.data?.students) ? payload.data.students : [];
      state.studentProfiles = list.map((student) => ({
        id: student.id,
        name: student.name,
        imageUrl: student.profileImageUrl || "",
        title: student.title,
        badge: "Student"
      }));
    } catch (error) {
      state.studentProfiles = [];
    }
  }

  function getInitials(name) {
    return String(name || "IN")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function applyAvatarVisual(node, imageUrl, fallbackText, gradient, useLogoIcon = false) {
    if (!node) {
      return;
    }

    const safeImageUrl = normalizeAvatarUrl(imageUrl);
    const hasImage = Boolean(safeImageUrl);
    if (hasImage) {
      node.removeAttribute("data-guest-logo");
      node.textContent = "";
    } else if (useLogoIcon) {
      node.setAttribute("data-guest-logo", "true");
      node.innerHTML = "<i class=\"fas fa-times\" aria-hidden=\"true\"></i>";
    } else {
      node.removeAttribute("data-guest-logo");
      node.textContent = String(fallbackText || "");
    }
    node.style.background = hasImage ? "#dbe6ff" : (gradient || "linear-gradient(135deg,#4E73DF,#6f8ee8)");
    node.style.backgroundImage = hasImage ? `url('${escapeHtml(String(safeImageUrl))}')` : "";
    node.style.backgroundSize = hasImage ? "cover" : "";
    node.style.backgroundPosition = hasImage ? "center" : "";
    node.style.backgroundRepeat = hasImage ? "no-repeat" : "";
  }

  function isOwnPost(post) {
    return Boolean(state.isLoggedIn && state.currentUser && post.authorId === state.currentUser.id);
  }

  function buildMoreMenu(post) {
    if (!isOwnPost(post)) {
      return "";
    }

    return `
      <div class="post-more-wrap">
        <button class="post-more-btn" type="button" data-post-menu-toggle aria-label="Post options">
          <i class="fas fa-ellipsis-h"></i>
        </button>
        <div class="post-more-menu" data-post-menu>
          <button class="post-menu-item danger" type="button" data-post-menu-action="delete">Delete Post</button>
        </div>
      </div>
    `;
  }

  function buildPostCard(post) {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagsHtml = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    const universityText = String(post.university || "").trim();
    const universityHtml = universityText
      ? `<div class="user-university">${escapeHtml(universityText)}</div>`
      : "";
    const descText = String(post.desc || "").trim();
    const hasLongDesc = descText.length > POST_DESC_PREVIEW_LIMIT;
    const descPreview = hasLongDesc ? `${descText.slice(0, POST_DESC_PREVIEW_LIMIT).trimEnd()}...` : descText;
    const descHtml = hasLongDesc
      ? `
        <span class="post-desc-short" data-post-desc-short>${escapeHtml(descPreview)}</span>
        <span class="post-desc-full" data-post-desc-full style="display:none;">${escapeHtml(descText)}</span>
        <button class="post-desc-toggle" type="button" data-post-desc-toggle data-expanded="false">See more</button>
      `
      : escapeHtml(descText);
    const hasImageMedia = Boolean(post.media && post.media.url);
    const mediaHtml = post.media
      ? `
        <div class="post-media">
          <div class="post-media-inner ${hasImageMedia ? "image-ratio" : ""}">
            ${hasImageMedia
              ? `<img src="${escapeHtml(post.media.url)}" alt="${escapeHtml(post.media.label || "Post image")}" />`
              : `<span style="font-size:3.5rem">${escapeHtml(post.media.emoji || "💡")}</span>`}
            ${hasImageMedia ? "" : `<p>${escapeHtml(post.media.label || "Post asset")}</p>`}
          </div>
        </div>
      `
      : "";

    return applyTemplate(state.postTemplate, {
      id: escapeHtml(post.id),
      authorId: escapeHtml(post.authorId),
      avatarStyle: post.avatarImageUrl
        ? `background-image:url('${escapeHtml(post.avatarImageUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat;`
        : `background:${escapeHtml(post.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)")};`,
      avatar: escapeHtml(post.avatarImageUrl ? "" : (post.avatar || getInitials(post.name))),
      name: escapeHtml(post.name || "InnovaX Member"),
      university: universityHtml,
      role: escapeHtml(post.role || "Member"),
      time: escapeHtml(formatDateTime(post.time)),
      title: escapeHtml(post.title || "Untitled post"),
      desc: descHtml,
      tags: tagsHtml,
      media: mediaHtml,
      likes: escapeHtml(post.likes ?? 0),
      likeClass: post.liked ? "liked" : "",
      saveClass: post.saved ? "saved" : "",
      moreMenu: buildMoreMenu(post)
    });
  }

  async function syncAuthenticatedUser() {
    try {
      const payload = await getJson("api/auth/me.php");
      const user = payload.data?.user;
      if (user && user.id && user.role) {
        setLoggedInUser(user, user.role);
        return true;
      }
    } catch (error) {
      // Ignore here and fallback to local clear below.
    }

    clearLocalAuthState();
    return false;
  }

  async function loadMyProfileData() {
    if (document.body.dataset.page !== "my-profile") {
      return;
    }
    if (!state.isLoggedIn) {
      state.myProfile = null;
      return;
    }

    try {
      const payload = await getJson("api/users/my-profile.php");
      const user = payload.data?.user;
      if (user && user.id && user.role) {
        setLoggedInUser(user, user.role);
      }

      const profile = payload.data?.profile;
      state.myProfile = profile && typeof profile === "object" ? profile : null;
    } catch (error) {
      state.myProfile = null;
    }
  }

  async function loadViewedUserProfileData() {
    if (document.body.dataset.page !== "user-profile") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const userId = String(params.get("userId") || document.body.dataset.profileUserId || "").trim();
    if (!userId) {
      state.viewedUserProfile = null;
      return;
    }

    try {
      const payload = await getJson(`api/users/public-profile.php?userId=${encodeURIComponent(userId)}`);
      const user = payload.data?.user;
      const profile = payload.data?.profile;
      if (!user || !user.id) {
        throw new Error("Invalid user profile response.");
      }

      state.viewedUserProfile = {
        user,
        profile: profile && typeof profile === "object" ? profile : {}
      };

      document.body.dataset.profileUserId = user.id;
      document.body.dataset.profileUserName = user.name || "";
      document.body.dataset.profileUserRole = user.role || "student";
      document.body.dataset.profileUserUniversity = user.university || "";
      document.body.dataset.profileUserAvatar = user.profileImageUrl || "";
      document.body.dataset.profileUserCover = user.coverImageUrl || "";
      document.body.dataset.profileUserBio = user.bio || "";
    } catch (error) {
      state.viewedUserProfile = null;
      showToast(normalizeApiError(error, "Unable to load selected user profile."));
    }
  }

  function renderMyProfileDetails() {
    if (document.body.dataset.page !== "my-profile") {
      return;
    }

    const roleMetaNode = document.querySelector("[data-profile-role-meta]");
    const skillsWrap = document.querySelector("[data-profile-skills]");

    if (roleMetaNode) {
      if (state.userRole === "student") {
        const faculty = String(state.myProfile?.faculty || "").trim();
        const department = String(state.myProfile?.department || "").trim();
        const studentId = String(state.myProfile?.studentId || "").trim();
        const chunks = [];

        if (department) {
          chunks.push(department);
        }
        if (faculty) {
          chunks.push(faculty);
        }
        if (studentId) {
          chunks.push(`ID: ${studentId}`);
        }

        roleMetaNode.textContent = chunks.length ? chunks.join(" • ") : "Student profile";
      } else if (state.userRole === "expert") {
        const title = String(state.currentUser?.title || "").trim();
        const organization = String(state.currentUser?.organization || "").trim();
        const chunks = [];

        if (title) {
          chunks.push(title);
        }
        if (organization) {
          chunks.push(organization);
        }

        roleMetaNode.textContent = chunks.length ? chunks.join(" • ") : "Expert profile";
      } else {
        roleMetaNode.textContent = "";
      }
    }

    if (skillsWrap) {
      const skills = Array.isArray(state.myProfile?.skills) ? state.myProfile.skills : [];
      if (!skills.length) {
        skillsWrap.innerHTML = "<span class=\"section-note\">No skills added yet.</span>";
      } else {
        skillsWrap.innerHTML = skills
          .map((skill) => `#${String(skill || "").trim().replace(/^#/, "")}`)
          .filter((skill) => skill !== "#")
          .map((skill) => `<span class=\"tag\">${escapeHtml(skill)}</span>`)
          .join("");
      }
    }
  }

  function renderUserProfileDetails() {
    if (document.body.dataset.page !== "user-profile") {
      return;
    }

    const roleMetaNode = document.querySelector("[data-profile-role-meta]");
    const skillsWrap = document.querySelector("[data-profile-skills]");
    if (roleMetaNode) {
      const publicRole = String(document.body.dataset.profileUserRole || "student").toLowerCase();
      if (publicRole === "student") {
        const faculty = String(state.viewedUserProfile?.profile?.faculty || "").trim();
        const department = String(state.viewedUserProfile?.profile?.department || "").trim();
        const chunks = [];

        if (faculty) {
          chunks.push(faculty);
        }
        if (department) {
          chunks.push(department);
        }

        roleMetaNode.textContent = chunks.length ? chunks.join(" • ") : "Student profile";
      } else {
        const title = String(state.viewedUserProfile?.user?.title || "").trim();
        const organization = String(state.viewedUserProfile?.user?.organization || "").trim();
        const chunks = [];

        if (title) {
          chunks.push(title);
        }
        if (organization) {
          chunks.push(organization);
        }

        roleMetaNode.textContent = chunks.length ? chunks.join(" • ") : "Expert profile";
      }
    }

    if (!skillsWrap) {
      return;
    }

    const skills = Array.isArray(state.viewedUserProfile?.profile?.skills)
      ? state.viewedUserProfile.profile.skills
      : [];

    if (!skills.length) {
      skillsWrap.innerHTML = "<span class=\"section-note\">No skills added yet.</span>";
      return;
    }

    skillsWrap.innerHTML = skills
      .map((skill) => `#${String(skill || "").trim().replace(/^#/, "")}`)
      .filter((skill) => skill !== "#")
      .map((skill) => `<span class=\"tag\">${escapeHtml(skill)}</span>`)
      .join("");
  }

  function getFeedSortedPosts() {
    const list = [...state.posts];
    if (state.feedSort === "likes") {
      return list.sort((a, b) => b.likes - a.likes);
    }
    return list.sort((a, b) => b.createdOrder - a.createdOrder);
  }

  function getPostsForStream(streamType) {
    const sortedFeed = getFeedSortedPosts();

    switch (streamType) {
      case "saved":
        return sortedFeed.filter((post) => post.saved);
      case "profile": {
        if (!state.currentUser) {
          return [];
        }
        const own = sortedFeed.filter((post) => post.authorId === state.currentUser.id);
        return own;
      }
      case "user":
        if (document.body.dataset.page === "user-profile") {
          const viewedUserId = String(document.body.dataset.profileUserId || "").trim();
          if (viewedUserId) {
            return sortedFeed.filter((post) => String(post.authorId || "") === viewedUserId);
          }
        }
        return sortedFeed.filter((post) => String(post.role || "").toLowerCase().includes("student"));
      default:
        return sortedFeed;
    }
  }

  function renderPostStreams() {
    const streams = Array.from(document.querySelectorAll("[data-post-stream]"));

    streams.forEach((stream) => {
      const streamType = stream.dataset.postStream || "feed";
      const posts = getPostsForStream(streamType);

      if (!posts.length) {
        stream.innerHTML = `
          <div class="card empty-state">
            <i class="fas fa-folder-open"></i>
            <p>No posts available yet.</p>
          </div>
        `;
        return;
      }

      stream.innerHTML = posts.map((post) => buildPostCard(post)).join("");
    });
  }

  function renderMostLikelyPosts() {
    const container = document.querySelector("[data-most-liked-list]");
    if (!container) {
      return;
    }

    const topPosts = [...state.posts]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3)
      .map((post, index) => {
        return `
          <a class="trend-item" href="${buildPostViewUrl(post.id)}">
            <div class="trend-rank">#${index + 1}</div>
            <div class="trend-info">
              <div class="trend-name">${escapeHtml(post.title || "Untitled post")}</div>
              <div class="trend-count">${escapeHtml(post.likes)} likes</div>
            </div>
          </a>
        `;
      })
      .join("");

    container.innerHTML = topPosts;
  }

  function renderTrendingInnovations() {
    const container = document.querySelector("[data-trending-list]");
    if (!container) {
      return;
    }

    const items = Array.isArray(state.trendingInnovations) ? state.trendingInnovations : [];
    if (!items.length) {
      container.innerHTML = "<p class='section-note'>No trending tags yet.</p>";
      return;
    }

    const html = items
      .map((item, index) => {
        const count = Number(item.count || 0);
        const badge = index === 0 ? "hot" : index === 1 ? "new" : "";
        const badgeLabel = index === 0 ? "Hot" : index === 1 ? "New" : "Trend";
        return `
          <button class="trend-item" type="button">
            <div class="trend-rank">#${escapeHtml(item.rank || index + 1)}</div>
            <div class="trend-info">
              <div class="trend-name">${escapeHtml(item.tag || "#innovation")}</div>
              <div class="trend-count">${escapeHtml(count)} posts</div>
            </div>
            <span class="trend-badge ${badge}">${badgeLabel}</span>
          </button>
        `;
      })
      .join("");

    container.innerHTML = html;
  }

  function renderNotificationsPage() {
    if (document.body.dataset.page !== "notifications") {
      return;
    }

    const listNode = document.querySelector("[data-notification-list]");
    const markAllBtn = document.querySelector("[data-mark-all-read]");
    if (!listNode) {
      return;
    }

    if (!state.isLoggedIn) {
      listNode.innerHTML = "<p class='section-note'>Login to view notifications.</p>";
      if (markAllBtn) {
        markAllBtn.disabled = true;
      }
      return;
    }

    const items = Array.isArray(state.notifications) ? state.notifications : [];
    if (!items.length) {
      listNode.innerHTML = "<p class='section-note'>No notifications yet.</p>";
    } else {
      listNode.innerHTML = items
        .map((item) => {
          const icon = item.type === "like" ? "fa-heart" : item.type === "rating" ? "fa-star" : "fa-bell";
          const label = item.type === "like" ? "Like" : item.type === "rating" ? "Rating" : "Alert";
          const iconTypeClass = item.type === "like"
            ? "notification-icon--like"
            : item.type === "rating"
              ? "notification-icon--rating"
              : "notification-icon--alert";

          return `
            <article class="notification-item ${item.isRead ? "read" : ""}">
              <div class="notification-icon ${iconTypeClass}"><i class="fas ${icon}"></i></div>
              <div class="notification-content">
                <div class="notification-meta-row">
                  <span class="notification-type">${escapeHtml(label)}</span>
                  <time class="notification-time">${escapeHtml(formatDateTime(item.createdAt))}</time>
                </div>
                <p class="notification-message">${escapeHtml(item.message || "Notification")}</p>
                ${item.isRead ? "" : "<span class='notification-unread'>New</span>"}
              </div>
            </article>
          `;
        })
        .join("");
    }

    if (markAllBtn) {
      const hasUnread = items.some((item) => !item.isRead);
      markAllBtn.disabled = !hasUnread;
      if (!markAllBtn.dataset.bound) {
        markAllBtn.dataset.bound = "1";
        markAllBtn.addEventListener("click", async () => {
          if (!state.isLoggedIn) {
            return;
          }

          try {
            await postJson("api/notifications/mark-all-read.php", {});
            state.notifications = state.notifications.map((item) => ({ ...item, isRead: true }));
            state.notificationCount = 0;
            updateNotificationBadge();
            renderNotificationsPage();
            showToast("All notifications marked as read.");
          } catch (error) {
            showToast(normalizeApiError(error, "Unable to mark notifications."));
          }
        });
      }
    }
  }

  function updateNotificationBadge() {
    const badges = Array.from(document.querySelectorAll("#notif-badge"));
    const unreadCount = state.isLoggedIn
      ? (Number.isFinite(Number(state.notificationCount))
        ? Number(state.notificationCount)
        : state.notifications.filter((item) => !item.isRead).length)
      : 0;

    badges.forEach((badge) => {
      if (!state.isLoggedIn) {
        badge.style.display = "none";
        return;
      }
      badge.textContent = String(unreadCount);
      badge.style.display = unreadCount > 0 ? "flex" : "none";
    });
  }

  function setActiveNav() {
    const activeNav = document.body.dataset.activeNav || "";
    const links = Array.from(document.querySelectorAll(".nav-link[data-nav]"));
    links.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === activeNav);
    });
  }

  function updateMobileMenuVisibility() {
    const menuItems = Array.from(document.querySelectorAll("#mobile-menu [data-mobile-auth]"));
    if (!menuItems.length) {
      return;
    }

    menuItems.forEach((item) => {
      const authScope = item.dataset.mobileAuth;
      const roleScope = item.dataset.mobileRole;
      const authVisible = authScope === "both" || (authScope === "user" && state.isLoggedIn) || (authScope === "guest" && !state.isLoggedIn);
      const roleVisible = !roleScope || (state.isLoggedIn && state.userRole === roleScope);
      const show = authVisible && roleVisible;
      item.style.display = show ? "" : "none";
    });
  }

  function updateSidebarAndNav() {
    const guestCard = document.getElementById("sidebar-guest-card");
    const userCard = document.getElementById("sidebar-user-card");
    const quickLinks = document.querySelectorAll("[data-requires-login]");

    if (guestCard && userCard) {
      guestCard.style.display = state.isLoggedIn ? "none" : "block";
      userCard.style.display = state.isLoggedIn ? "block" : "none";
    }

    quickLinks.forEach((link) => {
      if (state.isLoggedIn) {
        link.removeAttribute("aria-disabled");
      } else {
        link.setAttribute("aria-disabled", "true");
      }
    });

    updateMobileMenuVisibility();

    const roleScopedLinks = Array.from(document.querySelectorAll("[data-role-scope]"));
    roleScopedLinks.forEach((link) => {
      const requiredRole = link.dataset.roleScope;
      const allowed = state.isLoggedIn && state.userRole === requiredRole;
      link.style.display = allowed ? "" : "none";
    });

    const sidebarName = document.getElementById("sidebar-user-name");
    const sidebarRole = document.getElementById("sidebar-user-role");
    const sidebarCover = document.getElementById("sidebar-user-cover");
    const sidebarAvatar = document.getElementById("sidebar-user-avatar");
    const sidebarGuestAvatar = document.getElementById("sidebar-guest-avatar");
    const sidebarStats = document.getElementById("sidebar-user-stats");
    const sidebarStatValue = document.getElementById("sidebar-user-stat-value");
    const sidebarStatLabel = document.getElementById("sidebar-user-stat-label");
    const navAvatar = document.querySelector(".nav-avatar");

    if (state.isLoggedIn && state.currentUser) {
      const initials = getInitials(state.currentUser.name);
      if (sidebarName) sidebarName.textContent = state.currentUser.name;
      if (sidebarRole) sidebarRole.textContent = state.userRole === "student" ? "Student" : "Expert";
      if (sidebarCover) {
        const coverUrl = String(state.currentUser.coverImageUrl || "").trim();
        sidebarCover.style.backgroundImage = coverUrl
          ? `url(${coverUrl})`
          : "linear-gradient(120deg,#f3f4f6,#d9dde8)";
        sidebarCover.style.backgroundSize = "cover";
        sidebarCover.style.backgroundPosition = "center";
      }
      if (sidebarAvatar) {
        applyAvatarVisual(sidebarAvatar, state.currentUser.profileImageUrl, initials, "linear-gradient(135deg,#4E73DF,#6f8ee8)");
      }

      if (sidebarStats) {
        if (state.userRole === "student") {
          const totalLikes = state.posts
            .filter((post) => post.authorId === state.currentUser.id)
            .reduce((sum, post) => sum + Number(post.likes || 0), 0);
          sidebarStats.style.display = "block";
          if (sidebarStatValue) sidebarStatValue.textContent = String(totalLikes);
          if (sidebarStatLabel) sidebarStatLabel.textContent = "Likes";
        } else {
          sidebarStats.style.display = "none";
        }
      }

      if (navAvatar) {
        applyAvatarVisual(navAvatar, state.currentUser.profileImageUrl, initials, "linear-gradient(135deg,#4E73DF,#6f8ee8)");
        navAvatar.dataset.route = "my-profile.html";
        navAvatar.title = "My Profile";
      }
    } else {
      if (sidebarCover) {
        sidebarCover.style.backgroundImage = "linear-gradient(120deg,#f3f4f6,#d9dde8)";
        sidebarCover.style.backgroundSize = "cover";
        sidebarCover.style.backgroundPosition = "center";
      }

      if (sidebarGuestAvatar) {
        applyAvatarVisual(sidebarGuestAvatar, "", "X", "linear-gradient(135deg,#4E73DF,#6f8ee8)", true);
      }

      if (navAvatar) {
        applyAvatarVisual(navAvatar, "", "X", "linear-gradient(135deg,#4E73DF,#6f8ee8)", true);
        navAvatar.dataset.route = "login.html";
        navAvatar.title = "Login";
      }
    }
  }

  function updateSessionRoleBadges() {
    const badges = Array.from(document.querySelectorAll("[data-session-role-badge]"));
    if (!badges.length || !state.isLoggedIn) {
      return;
    }

    const isExpert = state.userRole === "expert";
    const icon = isExpert ? "fa-chalkboard-user" : "fa-user-graduate";
    const label = isExpert ? "Expert" : "Student";

    badges.forEach((badge) => {
      badge.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    });
  }

  function updatePublicRoleBadges() {
    const badges = Array.from(document.querySelectorAll("[data-public-role-badge]"));
    if (!badges.length) {
      return;
    }

    const publicRole = (document.body.dataset.profileUserRole || "student").toLowerCase();
    const isExpert = publicRole === "expert";
    const icon = isExpert ? "fa-chalkboard-user" : "fa-user-graduate";
    const label = isExpert ? "Expert" : "Student";

    badges.forEach((badge) => {
      badge.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    });
  }

  function updateProfileIdentity() {
    const page = document.body.dataset.page;
    if (page !== "my-profile" && page !== "user-profile") {
      return;
    }

    const nameNodes = Array.from(document.querySelectorAll("[data-profile-name]"));
    const uniNodes = Array.from(document.querySelectorAll("[data-profile-university]"));
    const avatarNodes = Array.from(document.querySelectorAll("[data-profile-avatar]"));
    const coverNodes = Array.from(document.querySelectorAll("[data-profile-cover]"));
    const bioNodes = Array.from(document.querySelectorAll("[data-profile-bio]"));

    let name = "InnovaX Member";
    let role = "student";
    let university = "";
    let avatarUrl = "";
    let coverUrl = "";
    let bio = "";

    if (page === "my-profile") {
      if (state.currentUser?.name) {
        name = state.currentUser.name;
      }
      role = state.userRole || "student";
      university = role === "student" ? String(state.currentUser?.university || "").trim() : "";
      avatarUrl = normalizeAvatarUrl(state.currentUser?.profileImageUrl);
      coverUrl = state.currentUser?.coverImageUrl || DEFAULT_PROFILE_COVER_URL;
      bio = String(state.currentUser?.bio || "").trim();
    } else {
      name = document.body.dataset.profileUserName || name;
      role = (document.body.dataset.profileUserRole || "student").toLowerCase();
      university = role === "student"
        ? String(document.body.dataset.profileUserUniversity || "").trim()
        : "";

      if (document.body.dataset.profileUserAvatar) {
        avatarUrl = normalizeAvatarUrl(document.body.dataset.profileUserAvatar);
      }
      if (document.body.dataset.profileUserCover) {
        coverUrl = document.body.dataset.profileUserCover;
      }
      bio = String(document.body.dataset.profileUserBio || "").trim();
    }

    nameNodes.forEach((node) => {
      node.textContent = name;
    });

    avatarNodes.forEach((node) => {
      const initials = getInitials(name);
      const initialsNode = node.querySelector("[data-profile-avatar-initials]");
      if (initialsNode) {
        initialsNode.textContent = avatarUrl ? "" : initials;
      } else {
        node.textContent = avatarUrl ? "" : initials;
      }
      node.style.backgroundImage = avatarUrl ? `url('${escapeHtml(avatarUrl)}')` : "";
      node.setAttribute("aria-label", name);
    });

    coverNodes.forEach((node) => {
      if (coverUrl) {
        node.style.backgroundImage = `url('${escapeHtml(coverUrl)}')`;
      }
    });

    uniNodes.forEach((node) => {
      if (university) {
        node.textContent = university;
        node.style.display = "block";
      } else {
        node.style.display = "none";
      }
    });

    bioNodes.forEach((node) => {
      if (bio) {
        node.textContent = bio;
      } else {
        node.textContent = "No bio added yet.";
      }
    });
  }

  function initMyProfileMediaEditor() {
    if (document.body.dataset.page !== "my-profile") {
      return;
    }
    if (!state.isLoggedIn || !state.currentUser) {
      return;
    }

    const avatarBtn = document.querySelector("[data-edit-avatar-btn]");
    const coverBtn = document.querySelector("[data-edit-cover-btn]");
    const avatarInput = document.querySelector("[data-avatar-file-input]");
    const coverInput = document.querySelector("[data-cover-file-input]");

    const openPicker = (input) => {
      if (!input) {
        return;
      }
      input.value = "";
      input.click();
    };

    const applyImage = async (file, target, triggerButton) => {
      if (!file) {
        return;
      }
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast("Image must be under 8MB.");
        return;
      }

      setSubmitBusy(triggerButton, true, "Uploading...");
      showToast("Uploading...");

      try {
        const result = await fileToDataUrl(file);
        if (!result) {
          showToast("Unable to read selected image.");
          return;
        }

        const payload = await postJson("api/users/update-media.php", {
          target,
          image_data_url: result
        });

        const user = payload.data?.user;
        if (!user || !user.id || !user.role) {
          throw new Error("Invalid profile update response.");
        }

        setLoggedInUser(user, user.role);
        updateSidebarAndNav();
        updateProfileIdentity();
        showToast(target === "avatar" ? "Profile image updated." : "Cover image updated.");
      } catch (error) {
        showToast(normalizeApiError(error, "Unable to update image."));
      } finally {
        setSubmitBusy(triggerButton, false, "Uploading...");
      }
    };

    if (avatarBtn && avatarInput) {
      avatarBtn.addEventListener("click", () => openPicker(avatarInput));
      avatarInput.addEventListener("change", () => {
        applyImage(avatarInput.files?.[0], "avatar", avatarBtn);
      });
    }

    if (coverBtn && coverInput) {
      coverBtn.addEventListener("click", () => openPicker(coverInput));
      coverInput.addEventListener("change", () => {
        applyImage(coverInput.files?.[0], "cover", coverBtn);
      });
    }
  }

  function getLikesForIdentity(userId, userName) {
    return state.posts
      .filter((post) => {
        const byId = userId && String(post.authorId || "") === String(userId);
        const byName = userName && String(post.name || "").toLowerCase() === String(userName).toLowerCase();
        return byId || byName;
      })
      .reduce((sum, post) => sum + Number(post.likes || 0), 0);
  }

  function updateProfileLikes() {
    const wraps = Array.from(document.querySelectorAll("[data-profile-likes-wrap]"));
    const counters = Array.from(document.querySelectorAll("[data-profile-likes-count]"));
    if (!wraps.length || !counters.length) {
      return;
    }

    const page = document.body.dataset.page;

    if (page === "my-profile") {
      const show = state.isLoggedIn && state.userRole === "student";
      const count = show && state.currentUser
        ? getLikesForIdentity(state.currentUser.id, state.currentUser.name)
        : 0;

      wraps.forEach((wrap) => {
        wrap.style.display = show ? "inline-flex" : "none";
      });
      counters.forEach((counter) => {
        counter.textContent = String(count);
      });
      return;
    }

    if (page === "user-profile") {
      const isExpertProfile = (document.body.dataset.profileUserRole || "student").toLowerCase() === "expert";
      const show = !isExpertProfile;
      const count = show
        ? getLikesForIdentity(document.body.dataset.profileUserId, document.body.dataset.profileUserName)
        : 0;

      wraps.forEach((wrap) => {
        wrap.style.display = show ? "inline-flex" : "none";
      });
      counters.forEach((counter) => {
        counter.textContent = String(count);
      });
    }
  }

  function applyRoleBasedProfileLayout() {
    const page = document.body.dataset.page;
    if (page !== "my-profile" && page !== "user-profile") {
      return;
    }

    const isMyProfileExpert = page === "my-profile" && state.isLoggedIn && state.userRole === "expert";
    const isViewedExpertProfile = page === "user-profile" && (document.body.dataset.profileUserRole || "student").toLowerCase() === "expert";
    const shouldUseExpertLayout = isMyProfileExpert || isViewedExpertProfile;
    const sections = Array.from(document.querySelectorAll("[data-profile-section]"));
    const savedLinkCards = Array.from(document.querySelectorAll("[data-expert-saved-link]"));

    sections.forEach((section) => {
      const key = section.dataset.profileSection;
      const shouldHide = shouldUseExpertLayout && ["skills", "portfolio", "my-posts"].includes(key);
      section.style.display = shouldHide ? "none" : "block";
    });

    savedLinkCards.forEach((card) => {
      card.style.display = shouldUseExpertLayout ? "block" : "none";
    });
  }

  function enforceProfileRestrictions() {
    const requiredRole = document.body.dataset.profileRole;
    if (requiredRole === "expert" && state.userRole === "student") {
      showToast("Students cannot open expert profiles.");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 600);
    }
  }

  function gateMyProfileForGuests() {
    if (document.body.dataset.page !== "my-profile" || state.isLoggedIn) {
      return;
    }

    const contentColumn = document.querySelector(".content-column");
    if (!contentColumn) {
      return;
    }

    contentColumn.innerHTML = `
      <section class="auth-card auth-modern-card" style="max-width:100%;">
        <h1>Login To View My Profile</h1>
        <p>Please login or create an account to access your personal profile area.</p>
        <div class="inline-actions" style="margin-top:14px;">
          <a class="btn-primary" href="login.html">Login</a>
          <a class="btn-secondary" href="register.html">Register</a>
        </div>
      </section>
    `;
  }

  function initNavbar() {
    const navbar = document.getElementById("navbar");
    if (navbar) {
      window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 10);
      });
    }

    const hamburger = document.getElementById("hamburger");
    const menu = document.getElementById("mobile-menu");

    if (hamburger && menu) {
      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("open");
        menu.classList.toggle("open");
      });

      menu.addEventListener("click", (event) => {
        if (!event.target.closest(".nav-link")) {
          return;
        }
        hamburger.classList.remove("open");
        menu.classList.remove("open");
      });
    }

    const navAvatar = document.querySelector(".nav-avatar");
    if (navAvatar) {
      if (!state.isLoggedIn) {
        applyAvatarVisual(navAvatar, "", "X", "linear-gradient(135deg,#4E73DF,#6f8ee8)", true);
        navAvatar.dataset.route = "login.html";
        navAvatar.title = "Login";
      }

      navAvatar.addEventListener("click", () => {
        const route = navAvatar.dataset.route || "index.html";
        if (route === "my-profile.html" && !state.isLoggedIn) {
          showLoginDialog();
          return;
        }
        window.location.href = route;
      });
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
          return;
        }
        const value = searchInput.value.trim();
        if (!value) {
          return;
        }
        window.location.href = `search-results.html?q=${encodeURIComponent(value)}`;
      });
    }
  }

  function initFeedSort() {
    const sortWrap = document.querySelector("[data-expert-sort-wrap]");
    const sortSelect = document.querySelector("[data-feed-sort]");

    if (!sortWrap || !sortSelect) {
      return;
    }

    const isExpert = state.isLoggedIn && state.userRole === "expert";
    sortWrap.style.display = isExpert ? "flex" : "none";

    if (!isExpert) {
      return;
    }

    sortSelect.value = state.feedSort;
    sortSelect.addEventListener("change", () => {
      state.feedSort = sortSelect.value;
      renderPostStreams();
      renderMostLikelyPosts();
    });
  }

  function initCreatePostUploads(composer) {
    const triggerButtons = Array.from(composer.querySelectorAll("[data-upload-trigger]"));
    const uploadInputs = Array.from(composer.querySelectorAll("[data-upload-input]"));
    const triggerInput = composer.querySelector("[data-open-editor]");
    const previewWrap = composer.querySelector("[data-create-upload-preview]");
    const previewImage = composer.querySelector("[data-create-preview-image]");
    const previewLabel = composer.querySelector("[data-create-preview-label]");
    const removeBtn = composer.querySelector("[data-remove-upload]");
    const inputMap = new Map(uploadInputs.map((input) => [input.dataset.uploadInput, input]));

    const clearPreview = () => {
      if (previewWrap) {
        previewWrap.style.display = "none";
      }
      if (previewImage) {
        previewImage.src = "";
      }
      if (previewLabel) {
        previewLabel.textContent = "";
      }
    };

    const renderPreview = () => {
      if (!previewWrap || !previewImage || !previewLabel) {
        return;
      }

      if (!state.createPostMedia?.previewUrl) {
        clearPreview();
        return;
      }

      previewImage.src = state.createPostMedia.previewUrl;
      previewLabel.textContent = state.createPostMedia.label || "Selected image";
      previewWrap.style.display = "grid";
    };

    const updateTriggerLabel = () => {
      if (!triggerInput) {
        return;
      }
      if (state.createPostMedia?.label) {
        triggerInput.value = `Selected: ${state.createPostMedia.label}`;
      } else {
        triggerInput.value = "";
      }
    };

    triggerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!state.isLoggedIn) {
          showLoginDialog();
          return;
        }
        if (state.userRole !== "student") {
          showToast("Experts cannot publish posts.");
          return;
        }

        const type = button.dataset.uploadTrigger;
        const input = inputMap.get(type);
        if (!input) {
          return;
        }

        input.value = "";
        input.click();
      });
    });

    inputMap.forEach((input, type) => {
      input.addEventListener("change", () => {
        const file = input.files?.[0] || null;
        if (!file) {
          return;
        }

        if (type !== "image") {
          return;
        }

        if (!file.type.startsWith("image/")) {
          showToast("Please select an image file.");
          return;
        }

        if (file.size > 8 * 1024 * 1024) {
          showToast("Image must be under 8MB.");
          return;
        }

        if (state.createPostMedia?.previewUrl) {
          URL.revokeObjectURL(state.createPostMedia.previewUrl);
        }

        state.createPostMedia = {
          type: "image",
          file,
          label: file.name || "Post image",
          previewUrl: URL.createObjectURL(file)
        };
        updateTriggerLabel();
        renderPreview();
      });
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        if (state.createPostMedia?.previewUrl) {
          URL.revokeObjectURL(state.createPostMedia.previewUrl);
        }
        state.createPostMedia = null;
        updateTriggerLabel();
        clearPreview();
      });
    }
  }

  async function publishFromComposer(card) {
    if (!state.isLoggedIn) {
      showLoginDialog();
      return;
    }

    if (state.userRole !== "student") {
      showToast("Experts cannot publish posts.");
      return;
    }

    const titleEl = card.querySelector("[data-create-title]");
    const descEl = card.querySelector("[data-create-desc]");
    const tagsEl = card.querySelector("[data-create-tags]");

    const title = (titleEl?.value || "").trim();
    const desc = (descEl?.value || "").trim();
    const tags = (tagsEl?.value || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

    if (!title && !desc) {
      showToast("Add a title or description first.");
      titleEl?.focus();
      return;
    }

    const finalTitle = title || "New student post";
    const titleWordCount = countWords(finalTitle);
    if (titleWordCount < POST_TITLE_MIN_WORDS || titleWordCount > POST_TITLE_MAX_WORDS) {
      showToast(`Title should be ${POST_TITLE_MIN_WORDS}-${POST_TITLE_MAX_WORDS} words.`);
      titleEl?.focus();
      return;
    }

    const publishBtn = card.querySelector("[data-publish-post]");
    setSubmitBusy(publishBtn, true, "Publishing...");

    try {
      let mediaType = "none";
      let mediaDataUrl = "";
      let mediaLabel = "";

      if (state.createPostMedia?.type === "image" && state.createPostMedia.file) {
        mediaType = "image";
        mediaDataUrl = await fileToDataUrl(state.createPostMedia.file);
        mediaLabel = state.createPostMedia.label || "Post image";
      }

      await postJson("api/posts/create.php", {
        title: finalTitle,
        description: desc || "",
        tags,
        media_type: mediaType,
        media_data_url: mediaDataUrl,
        media_label: mediaLabel
      });

      await loadPostsData();
      await loadTrendingInnovationsData();
      renderPostStreams();
      renderTrendingInnovations();
      renderMostLikelyPosts();
      await refreshNotificationsUi();

      if (titleEl) titleEl.value = "";
      if (descEl) descEl.value = "";
      if (tagsEl) tagsEl.value = "";
      if (state.createPostMedia?.previewUrl) {
        URL.revokeObjectURL(state.createPostMedia.previewUrl);
      }
      state.createPostMedia = null;
      const triggerInput = card.querySelector("[data-open-editor]");
      if (triggerInput) {
        triggerInput.value = "";
      }
      const previewWrap = card.querySelector("[data-create-upload-preview]");
      const previewImage = card.querySelector("[data-create-preview-image]");
      const previewLabel = card.querySelector("[data-create-preview-label]");
      if (previewWrap) previewWrap.style.display = "none";
      if (previewImage) previewImage.src = "";
      if (previewLabel) previewLabel.textContent = "";

      showToast("Post published.");
    } catch (error) {
      showToast(normalizeApiError(error, "Unable to publish post."));
    } finally {
      setSubmitBusy(publishBtn, false, "Publishing...");
    }
  }

  function initCreatePostComposer() {
    const composer = document.querySelector("[data-create-post-card]");
    if (!composer) {
      return;
    }

    const feed = document.querySelector("[data-page='feed']");
    if (!feed && document.body.dataset.page !== "feed" && document.body.dataset.page !== "create-post") {
      return;
    }

    const roleNote = composer.querySelector("[data-create-role-note]");
    const editor = composer.querySelector("[data-post-editor]");
    const trigger = composer.querySelector("[data-open-editor]");
    const publishBtn = composer.querySelector("[data-publish-post]");
    const avatar = composer.querySelector(".create-post-top .avatar");

    if (state.isLoggedIn && avatar && state.currentUser?.name) {
      applyAvatarVisual(
        avatar,
        state.currentUser.profileImageUrl,
        getInitials(state.currentUser.name),
        "linear-gradient(135deg,#4E73DF,#6f8ee8)"
      );
    } else if (!state.isLoggedIn && avatar) {
      applyAvatarVisual(avatar, "", "X", "linear-gradient(135deg,#4E73DF,#6f8ee8)", true);
    }

    if (!state.isLoggedIn) {
      composer.classList.add("create-post-disabled");
      if (roleNote) {
        roleNote.textContent = "Login as a student to publish posts.";
      }
    } else if (state.userRole === "expert") {
      composer.classList.add("create-post-disabled");
      if (roleNote) {
        roleNote.textContent = "Expert accounts cannot publish posts.";
      }
    } else {
      composer.classList.remove("create-post-disabled");
      if (roleNote) {
        roleNote.textContent = "Student posts are published immediately.";
      }
    }

    if (trigger && editor) {
      trigger.addEventListener("click", () => {
        if (!state.isLoggedIn) {
          showLoginDialog();
          return;
        }
        if (state.userRole !== "student") {
          showToast("Experts cannot publish posts.");
          return;
        }
        editor.classList.add("open");
      });
    }

    initCreatePostUploads(composer);

    if (publishBtn) {
      publishBtn.addEventListener("click", () => publishFromComposer(composer));
    }
  }

  function closePostMenus(exceptMenu = null) {
    const menus = document.querySelectorAll("[data-post-menu].open");
    menus.forEach((menu) => {
      if (menu !== exceptMenu) {
        menu.classList.remove("open");
      }
    });
  }

  function removePostById(postId) {
    state.posts = state.posts.filter((post) => String(post.id) !== String(postId));
    renderPostStreams();
    renderTrendingInnovations();
    renderMostLikelyPosts();
  }

  function syncLikeState(postId, liked, likes) {
    const normalizedPostId = String(postId || "");
    const normalizedLikes = Number(likes || 0);

    state.posts.forEach((item) => {
      if (String(item.id) === normalizedPostId) {
        item.liked = Boolean(liked);
        item.likes = normalizedLikes;
      }
    });

    const cards = Array.from(document.querySelectorAll("[data-post-id]"));
    cards.forEach((card) => {
      if (String(card.dataset.postId || "") !== normalizedPostId) {
        return;
      }

      const btn = card.querySelector("[data-like-btn]");
      const count = card.querySelector("[data-like-count]");
      if (btn) {
        btn.classList.toggle("liked", Boolean(liked));
      }
      if (count) {
        count.textContent = String(normalizedLikes);
      }
    });

    const looseButtons = Array.from(document.querySelectorAll("[data-like-btn]"));
    looseButtons.forEach((btn) => {
      if (String(btn.dataset.postId || "") === normalizedPostId) {
        btn.classList.toggle("liked", Boolean(liked));
      }
    });

    const looseCounts = Array.from(document.querySelectorAll("[data-like-count]"));
    looseCounts.forEach((count) => {
      const holderPostId = count.closest("[data-post-id]")?.dataset.postId;
      if (String(holderPostId || "") === normalizedPostId) {
        count.textContent = String(normalizedLikes);
      }
    });

    updateProfileLikes();
    updateSidebarAndNav();
    renderMostLikelyPosts();

    if (state.feedSort === "likes") {
      renderPostStreams();
    }

    if (document.body.dataset.page === "search-results") {
      renderSearchResults();
    }
  }

  function initEventDelegation() {
    document.addEventListener("click", (event) => {
      const restrictedLink = event.target.closest("[data-requires-login]");
      if (restrictedLink && !state.isLoggedIn) {
        event.preventDefault();
        showLoginDialog();
        return;
      }

      const menuToggle = event.target.closest("[data-post-menu-toggle]");
      if (menuToggle) {
        const menu = menuToggle.closest(".post-more-wrap")?.querySelector("[data-post-menu]");
        if (menu) {
          const shouldOpen = !menu.classList.contains("open");
          closePostMenus();
          menu.classList.toggle("open", shouldOpen);
        }
        return;
      }

      const menuAction = event.target.closest("[data-post-menu-action]");
      if (menuAction) {
        const action = menuAction.dataset.postMenuAction;
        const card = menuAction.closest("[data-post-id]");
        const postId = card?.dataset.postId;
        closePostMenus();

        if (action === "delete" && postId) {
          showConfirmDialog({
            title: "Delete Post",
            message: "Are you sure you want to delete this post?",
            confirmLabel: "Delete",
            cancelLabel: "Cancel"
          }).then((confirmed) => {
            if (!confirmed) {
              return;
            }

            postJson("api/posts/delete.php", { post_id: postId })
              .then(() => {
                removePostById(postId);
                showToast("Post deleted.");
              })
              .catch((error) => {
                showToast(normalizeApiError(error, "Unable to delete post."));
              });
          });
        }
        return;
      }

      if (!event.target.closest(".post-more-wrap")) {
        closePostMenus();
      }

      const descToggle = event.target.closest("[data-post-desc-toggle]");
      if (descToggle) {
        const isExpanded = descToggle.dataset.expanded === "true";
        const descWrap = descToggle.closest(".post-desc");
        const shortNode = descWrap?.querySelector("[data-post-desc-short]");
        const fullNode = descWrap?.querySelector("[data-post-desc-full]");

        if (shortNode && fullNode) {
          shortNode.style.display = isExpanded ? "inline" : "none";
          fullNode.style.display = isExpanded ? "none" : "inline";
          descToggle.textContent = isExpanded ? "See more" : "See less";
          descToggle.dataset.expanded = isExpanded ? "false" : "true";
        }
        return;
      }

      const likeBtn = event.target.closest("[data-like-btn]");
      if (likeBtn) {
        if (!requireAuthAction()) {
          return;
        }

        const card = likeBtn.closest("[data-post-id]");
        const postId = card?.dataset.postId || likeBtn.dataset.postId;
        if (!postId) {
          return;
        }

        postJson("api/posts/toggle-like.php", { post_id: postId })
          .then(async (payload) => {
            const liked = Boolean(payload.data?.liked);
            const likes = Number(payload.data?.likes || 0);

            syncLikeState(postId, liked, likes);

            await refreshNotificationsUi();

            showToast(liked ? "Liked post." : "Like removed.");
          })
          .catch((error) => {
            showToast(normalizeApiError(error, "Unable to update like."));
          });

        return;
      }

      const saveBtn = event.target.closest("[data-save-btn]");
      if (saveBtn) {
        if (!requireAuthAction()) {
          return;
        }

        const card = saveBtn.closest("[data-post-id]");
        const postId = card?.dataset.postId || saveBtn.dataset.postId;
        if (!postId) {
          return;
        }

        const post = postId ? findPostById(postId) : null;

        postJson("api/posts/toggle-save.php", { post_id: postId })
          .then(async (payload) => {
            const saved = Boolean(payload.data?.saved);
            saveBtn.classList.toggle("saved", saved);

            if (post) {
              post.saved = saved;
            }

            await refreshNotificationsUi();

            showToast(saved ? "Saved post." : "Removed from saved.");
          })
          .catch((error) => {
            showToast(normalizeApiError(error, "Unable to update saved state."));
          });

        return;
      }

      const shareBtn = event.target.closest("[data-share-btn]");
      if (shareBtn) {
        const card = shareBtn.closest("[data-post-id]");
        const postId = card?.dataset.postId || shareBtn.dataset.postId;
        if (!postId) {
          showToast("Unable to copy link.");
          return;
        }

        const postUrl = buildPublicPostViewUrl(postId);
        copyTextToClipboard(postUrl)
          .then(() => {
            showToast("Post link copied.");
          })
          .catch(() => {
            showToast("Unable to copy link.");
          });
      }
    });
  }

  function initSearchForms() {
    const forms = Array.from(document.querySelectorAll("[data-search-form]"));
    forms.forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        const query = (input?.value || "").trim();
        if (!query) {
          return;
        }
        window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
      });
    });
  }

  async function initSettingsPage() {
    if (document.body.dataset.page !== "settings") {
      return;
    }

    if (!state.isLoggedIn || !state.currentUser) {
      showToast("Please login first.");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
      return;
    }

    const profileForm = document.getElementById("settingsProfileForm");
    const passwordForm = document.getElementById("settingsPasswordForm");
    const expertFields = document.querySelector("[data-settings-expert-fields]");
    const studentFields = document.querySelector("[data-settings-student-fields]");

    const skillsSearch = document.getElementById("settingsSkillsSearch");
    const skillsDropdown = document.getElementById("settingsSkillsDropdown");
    const skillsTags = document.getElementById("settingsSelectedSkills");
    const skillsAddBtn = document.getElementById("settingsSkillAddBtn");
    const suggestedSkillsWrap = document.getElementById("settingsSuggestedSkills");

    let currentSkills = [];
    let availableSkills = [];
    let selectedSkills = [];

    if (state.userRole === "student") {
      try {
        const profilePayload = await getJson("api/users/my-profile.php");
        const profileSkills = profilePayload.data?.profile?.skills;
        if (Array.isArray(profileSkills)) {
          currentSkills = profileSkills.map((skill) => String(skill || "").trim()).filter(Boolean).slice(0, 5);
          selectedSkills = [...currentSkills];
        }
      } catch (error) {
        currentSkills = [];
        selectedSkills = [];
      }

      // Load available skills
      try {
        const skillsResponse = await fetch("data/skills.json", { cache: "no-store" });
        const skillsData = await skillsResponse.json();
        availableSkills = Array.isArray(skillsData)
          ? skillsData.map((s) => String(s || "").trim()).filter(Boolean)
          : [];
      } catch (error) {
        availableSkills = [];
      }
    }

    if (expertFields) {
      expertFields.style.display = state.userRole === "expert" ? "block" : "none";
    }
    if (studentFields) {
      studentFields.style.display = state.userRole === "student" ? "block" : "none";
    }

    if (profileForm) {
      const fullNameInput = profileForm.querySelector("input[name='full_name']");
      const bioInput = profileForm.querySelector("textarea[name='bio']");
      const titleInput = profileForm.querySelector("input[name='title']");
      const organizationInput = profileForm.querySelector("input[name='organization']");

      const renderSkillTags = () => {
        if (!skillsTags) return;
        skillsTags.innerHTML = selectedSkills
          .map((skill) => {
            return `
              <span class="skill-tag">
                #${escapeHtml(skill)}
                <button type="button" data-remove-settings-skill="${escapeHtml(skill)}">&times;</button>
              </span>
            `;
          })
          .join("");
      };

      const addSkill = (skillNameRaw) => {
        const skill = String(skillNameRaw || "").trim().replace(/^#/, "");
        if (!skill) return;

        const already = selectedSkills.some((item) => item.toLowerCase() === skill.toLowerCase());
        if (already) return;
        if (selectedSkills.length >= 5) {
          showToast("Maximum 5 skills allowed.");
          return;
        }

        selectedSkills.push(skill);
        renderSkillTags();
      };

      const renderSuggestedSkills = () => {
        if (!suggestedSkillsWrap || !availableSkills.length) return;
        suggestedSkillsWrap.innerHTML = availableSkills.slice(0, 12)
          .map((skill) => `<button type="button" class="suggested-skill" data-suggested-settings-skill="${escapeHtml(skill)}">#${escapeHtml(skill)}</button>`)
          .join("");
      };

      const bindDropdownSelect = (dropdownNode, itemClass, callback) => {
        if (!dropdownNode) return;
        dropdownNode.querySelectorAll(itemClass).forEach((item) => {
          item.addEventListener("click", () => callback(item));
        });
      };

      if (fullNameInput) {
        fullNameInput.value = state.currentUser.name || "";
      }
      if (bioInput) {
        bioInput.value = state.currentUser.bio || "";
      }
      if (titleInput) {
        titleInput.value = state.currentUser.title || "";
      }
      if (organizationInput) {
        organizationInput.value = state.currentUser.organization || "";
      }

      renderSkillTags();
      renderSuggestedSkills();

      if (skillsSearch && skillsAddBtn) {
        skillsAddBtn.addEventListener("click", () => {
          addSkill(skillsSearch.value);
          skillsSearch.value = "";
          if (skillsDropdown) {
            skillsDropdown.style.display = "none";
          }
        });

        skillsSearch.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addSkill(skillsSearch.value);
            skillsSearch.value = "";
            if (skillsDropdown) {
              skillsDropdown.style.display = "none";
            }
          }
        });

        skillsSearch.addEventListener("input", () => {
          if (!skillsDropdown) return;
          const query = String(skillsSearch.value || "").trim().toLowerCase();
          if (!query) {
            skillsDropdown.style.display = "none";
            return;
          }

          const filtered = availableSkills
            .filter((skill) => !selectedSkills.some((entry) => entry.toLowerCase() === skill.toLowerCase()))
            .filter((skill) => skill.toLowerCase().includes(query))
            .slice(0, 8);

          skillsDropdown.innerHTML = filtered
            .map((skill) => `<div class="skills-dropdown-item" data-settings-skill-item="${escapeHtml(skill)}">${escapeHtml(skill)}</div>`)
            .join("");

          bindDropdownSelect(skillsDropdown, "[data-settings-skill-item]", (item) => {
            addSkill(item.dataset.settingsSkillItem || "");
            skillsSearch.value = "";
            skillsDropdown.style.display = "none";
          });

          skillsDropdown.style.display = filtered.length ? "block" : "none";
        });
      }

      profileForm.addEventListener("click", (event) => {
        const removeBtn = event.target.closest("[data-remove-settings-skill]");
        if (removeBtn) {
          const value = String(removeBtn.dataset.removeSettingsSkill || "").trim().toLowerCase();
          selectedSkills = selectedSkills.filter((item) => item.toLowerCase() !== value);
          renderSkillTags();
          return;
        }

        const suggestedBtn = event.target.closest("[data-suggested-settings-skill]");
        if (suggestedBtn) {
          addSkill(String(suggestedBtn.dataset.suggestedSettingsSkill || ""));
          return;
        }
      });

      document.addEventListener("click", (event) => {
        if (skillsDropdown && !event.target.closest("#settingsSkillsSearch") && !event.target.closest("#settingsSkillsDropdown")) {
          skillsDropdown.style.display = "none";
        }
      });

      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = profileForm.querySelector("button[type='submit']");
        const fullName = fullNameInput?.value?.trim() || "";
        const bio = bioInput?.value?.trim() || "";
        const title = titleInput?.value?.trim() || "";
        const organization = organizationInput?.value?.trim() || "";
        const skills = state.userRole === "student" ? selectedSkills : [];

        if (!fullName) {
          showToast("Display name is required.");
          fullNameInput?.focus();
          return;
        }

        if (skills.length > 5) {
          showToast("Maximum 5 skills allowed.");
          skillsSearch?.focus();
          return;
        }

        setSubmitBusy(submitBtn, true, "Saving...");
        try {
          const payload = await postJson("api/users/update-profile.php", {
            full_name: fullName,
            bio,
            title,
            organization,
            skills
          });

          const user = payload.data?.user;
          if (!user || !user.id || !user.role) {
            throw new Error("Invalid profile response.");
          }

          setLoggedInUser(user, user.role);
          updateSidebarAndNav();
          updateProfileIdentity();
          renderMyProfileDetails();
          showToast("Profile updated successfully.");
        } catch (error) {
          showToast(normalizeApiError(error, "Unable to update profile."));
        } finally {
          setSubmitBusy(submitBtn, false, "Saving...");
        }
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const currentPassword = passwordForm.querySelector("input[name='current_password']")?.value || "";
        const newPassword = passwordForm.querySelector("input[name='new_password']")?.value || "";
        const confirmPassword = passwordForm.querySelector("input[name='confirm_password']")?.value || "";
        const submitBtn = passwordForm.querySelector("button[type='submit']");

        if (!currentPassword || !newPassword || !confirmPassword) {
          showToast("Please fill all password fields.");
          return;
        }

        if (newPassword.length < 6) {
          showToast("New password must be at least 6 characters.");
          return;
        }

        if (newPassword !== confirmPassword) {
          showToast("New password and confirm password do not match.");
          return;
        }

        setSubmitBusy(submitBtn, true, "Updating...");
        try {
          await postJson("api/auth/change-password.php", {
            current_password: currentPassword,
            new_password: newPassword
          });

          passwordForm.reset();
          showToast("Password updated successfully.");
        } catch (error) {
          showToast(normalizeApiError(error, "Unable to update password."));
        } finally {
          setSubmitBusy(submitBtn, false, "Updating...");
        }
      });
    }
  }

  function renderPostViewPage() {
    if (document.body.dataset.page !== "post-view") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedPostId = String(params.get("postId") || "").trim();
    if (!requestedPostId) {
      window.location.replace(buildEmptyPageUrl("missing-post-id"));
      return;
    }

    const post = findPostById(requestedPostId);
    if (!post) {
      window.location.replace(buildEmptyPageUrl("post-not-found"));
      return;
    }

    const titleNode = document.querySelector("[data-post-title]");
    const descNode = document.querySelector("[data-post-desc]");
    const timeNode = document.querySelector("[data-post-time]");
    const tagsNode = document.querySelector("[data-post-tags]");
    const mediaWrap = document.querySelector("[data-post-media]");
    const mediaInnerNode = document.querySelector("[data-post-media-inner]");
    const detailCard = document.getElementById("post-detail-card");
    const likeBtn = document.querySelector("[data-like-btn]");
    const saveBtn = document.querySelector("[data-save-btn]");
    const likeCount = document.querySelector("[data-like-count]");

    if (titleNode) titleNode.textContent = post.title || "Untitled post";
    if (descNode) descNode.textContent = post.desc || "No description added for this post.";
    if (timeNode) {
      timeNode.innerHTML = `<i class="fas fa-clock"></i> ${escapeHtml(formatDateTime(post.time))}`;
    }

    if (tagsNode) {
      const tags = Array.isArray(post.tags) ? post.tags : [];
      tagsNode.innerHTML = tags.length
        ? tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")
        : "<span class=\"tag\">#Innovation</span>";
    }

    if (mediaWrap && mediaInnerNode) {
      if (post.media) {
        mediaWrap.style.display = "block";
        if (post.media.url) {
          mediaInnerNode.classList.add("image-ratio");
          mediaInnerNode.innerHTML = `
            <img src="${escapeHtml(post.media.url)}" alt="${escapeHtml(post.media.label || "Post image")}" />
          `;
        } else {
          mediaInnerNode.classList.remove("image-ratio");
          mediaInnerNode.innerHTML = `
            <span style="font-size:3.5rem;" data-post-media-emoji>${escapeHtml(post.media.emoji || "💡")}</span>
            <p data-post-media-label>${escapeHtml(post.media.label || "Post media")}</p>
          `;
        }
      } else {
        mediaWrap.style.display = "none";
        mediaInnerNode.classList.remove("image-ratio");
      }
    }

    if (detailCard) {
      detailCard.dataset.postId = String(post.id);
    }
    if (likeBtn) {
      likeBtn.dataset.postId = String(post.id);
      likeBtn.classList.toggle("liked", Boolean(post.liked));
    }
    if (saveBtn) {
      saveBtn.dataset.postId = String(post.id);
      saveBtn.classList.toggle("saved", Boolean(post.saved));
    }
    if (likeCount) {
      likeCount.textContent = String(Number(post.likes || 0));
    }

    const relatedStream = document.querySelector("[data-post-stream='post-view-related']");
    if (relatedStream) {
      const related = state.posts.filter((item) => String(item.id) !== String(post.id)).slice(0, 3);
      relatedStream.innerHTML = related.length
        ? related.map((item) => buildPostCard(item)).join("")
        : `<div class="card empty-state"><i class="fas fa-folder-open"></i><p>No related posts found.</p></div>`;
    }

    const noteNode = document.querySelector("[data-expert-rating-note]");
    const form = document.querySelector("[data-expert-rating-form]");
    const result = document.querySelector("[data-expert-rating-result]");
    const rateInput = document.getElementById("expert-rate-value");
    const noteInput = document.getElementById("expert-rate-note");

    if (!noteNode || !form || !result) {
      return;
    }

    const isExpert = state.isLoggedIn && state.userRole === "expert";

    if (!state.isLoggedIn) {
      noteNode.textContent = "Login as an expert to submit a rating for this post.";
      form.style.display = "none";
      result.style.display = "none";
      return;
    }

    if (!isExpert) {
      noteNode.textContent = "Only experts can submit ratings for posts.";
      form.style.display = "none";
      result.style.display = "none";
      return;
    }

    const currentRatings = getCurrentExpertRatings();
    const existing = currentRatings.find((entry) => String(entry.postId) === String(post.id));

    if (existing) {
      noteNode.textContent = "You have already submitted your private rating for this post.";
      form.style.display = "none";
      result.style.display = "block";
      result.innerHTML = `
        <h4><i class="fas fa-circle-check"></i> Your Submitted Rating</h4>
        <p><strong>Score:</strong> ${escapeHtml(existing.score)} / 10</p>
        <p><strong>Note:</strong> ${escapeHtml(existing.note)}</p>
        <p><strong>Submitted:</strong> ${escapeHtml(formatDateTime(existing.submittedAt))}</p>
      `;
      return;
    }

    noteNode.textContent = "Submit once per post. Only you can view your rating and note.";
    form.style.display = "grid";
    result.style.display = "none";

    if (rateInput) {
      rateInput.value = "";
    }
    if (noteInput) {
      noteInput.value = "";
    }

    form.onsubmit = (event) => {
      event.preventDefault();

      const score = Number.parseFloat(String(rateInput?.value || ""));
      const expertNote = String(noteInput?.value || "").trim();

      if (!Number.isFinite(score) || score < 0 || score > 10) {
        showToast("Please enter a rating between 0 and 10.");
        rateInput?.focus();
        return;
      }

      if (!expertNote) {
        showToast("Please add a short note.");
        noteInput?.focus();
        return;
      }

      const updatedRatings = [
        ...currentRatings,
        {
          postId: String(post.id),
          postTitle: post.title || "Untitled post",
          score: Number(score.toFixed(1)),
          note: expertNote,
          submittedAt: new Date().toISOString()
        }
      ];

      setCurrentExpertRatings(updatedRatings);
      showToast("Rating submitted.");
      renderPostViewPage();
    };
  }

  function renderExpertRatingsPage() {
    if (document.body.dataset.page !== "expert-ratings") {
      return;
    }

    const list = document.querySelector("[data-expert-ratings-list]");
    if (!list) {
      return;
    }

    if (!state.isLoggedIn) {
      list.innerHTML = `
        <section class="auth-card auth-modern-card" style="max-width:100%;">
          <h1>Login Required</h1>
          <p>Login as an expert to view your private rating history.</p>
          <div class="inline-actions" style="margin-top:14px;">
            <a class="btn-primary" href="login.html">Login</a>
            <a class="btn-secondary" href="register.html">Register</a>
          </div>
        </section>
      `;
      return;
    }

    if (state.userRole !== "expert") {
      list.innerHTML = `<div class="card empty-state"><i class="fas fa-lock"></i><p>This section is available only for expert accounts.</p></div>`;
      return;
    }

    const ratings = getCurrentExpertRatings();
    if (!ratings.length) {
      list.innerHTML = `<div class="card empty-state"><i class="fas fa-star"></i><p>You have not submitted any ratings yet.</p></div>`;
      return;
    }

    list.innerHTML = ratings.map((entry) => {
      const linkedPost = findPostById(entry.postId);
      const title = linkedPost?.title || entry.postTitle || "Untitled post";
      return `
        <article class="expert-rating-item">
          <div class="expert-rating-item-head">
            <a href="${buildPostViewUrl(entry.postId)}" class="expert-rating-title">${escapeHtml(title)}</a>
            <span class="badge-chip"><i class="fas fa-star"></i> ${escapeHtml(entry.score)} / 10</span>
          </div>
          <p class="expert-rating-item-note">${escapeHtml(entry.note)}</p>
          <p class="section-note">Submitted: ${escapeHtml(formatDateTime(entry.submittedAt))}</p>
        </article>
      `;
    }).join("");
  }

  function renderSearchResults() {
    if (document.body.dataset.page !== "search-results") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "innovation").trim();
    const keyword = query.toLowerCase();

    const queryNode = document.querySelector("[data-search-query]");
    if (queryNode) {
      queryNode.textContent = query;
    }

    const resultWrap = document.querySelector("[data-search-results]");
    if (!resultWrap) {
      return;
    }

    const studentHits = state.studentProfiles.filter((profile) => {
      return (
        profile.name.toLowerCase().includes(keyword) ||
        profile.title.toLowerCase().includes(keyword) ||
        profile.badge.toLowerCase().includes(keyword)
      );
    });

    const postHits = state.posts.filter((post) => {
      const title = String(post.title || "").toLowerCase();
      const desc = String(post.desc || "").toLowerCase();
      const tags = Array.isArray(post.tags) ? post.tags.join(" ").toLowerCase() : "";
      return title.includes(keyword) || desc.includes(keyword) || tags.includes(keyword);
    });

    const sortSelect = document.querySelector("[data-search-sort]");
    let sortedPostHits = [...postHits];

    if (sortSelect && state.isLoggedIn && state.userRole === "expert") {
      const sort = sortSelect.value;
      if (sort === "likes") {
        sortedPostHits.sort((a, b) => b.likes - a.likes);
      } else {
        sortedPostHits.sort((a, b) => b.createdOrder - a.createdOrder);
      }
    }

    const studentHtml = studentHits
      .map((profile) => {
        const thumb = profile.imageUrl
          ? `<img class="search-result-thumb" src="${escapeHtml(profile.imageUrl)}" alt="${escapeHtml(profile.name)}" />`
          : `<div class="search-result-thumb search-result-thumb-fallback">${escapeHtml(getInitials(profile.name))}</div>`;
        const subheading = profile.title || "Student profile";
        const tertiary = profile.badge ? `Badge: ${profile.badge}` : "";

        return `
          <a class="article-card search-result-card" href="user-profile.html?userId=${encodeURIComponent(profile.id)}">
            ${thumb}
            <div class="search-result-content">
              <h3>${escapeHtml(profile.name)}</h3>
              <p class="search-result-subheading">${escapeHtml(subheading)}</p>
              <p class="search-result-tertiary">${escapeHtml(tertiary)}</p>
            </div>
          </a>
        `;
      })
      .join("");

    const postHtml = sortedPostHits
      .map((post) => {
        const postThumb = post.media?.url
          ? `<img class="search-result-thumb" src="${escapeHtml(post.media.url)}" alt="${escapeHtml(post.title || "Post image")}" />`
          : post.avatarImageUrl
            ? `<img class="search-result-thumb" src="${escapeHtml(post.avatarImageUrl)}" alt="${escapeHtml(post.name || "Member")}" />`
            : `<div class="search-result-thumb search-result-thumb-fallback"><i class="fas fa-file-lines"></i></div>`;
        const subheading = `By ${post.name || "Member"} · ${post.likes} likes`;
        const descPreview = String(post.desc || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 110);
        const tertiary = descPreview ? `${descPreview}${descPreview.length >= 110 ? "..." : ""}` : "Open post to view details";

        return `
          <a class="article-card search-result-card" href="${buildPostViewUrl(post.id)}">
            ${postThumb}
            <div class="search-result-content">
              <h3>${escapeHtml(post.title || "Untitled")}</h3>
              <p class="search-result-subheading">${escapeHtml(subheading)}</p>
              <p class="search-result-tertiary">${escapeHtml(tertiary)}</p>
            </div>
          </a>
        `;
      })
      .join("");

    const html = `${studentHtml}${postHtml}`;
    resultWrap.innerHTML = html || "<p class='section-note'>No results found.</p>";

    const sortWrap = document.querySelector("[data-search-sort-wrap]");
    if (sortWrap) {
      sortWrap.style.display = state.isLoggedIn && state.userRole === "expert" ? "flex" : "none";
    }

    if (sortSelect) {
      sortSelect.onchange = () => renderSearchResults();
    }
  }

  function initAuthForms() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("[AUTH:LOGIN_SUBMIT_START]");
        const submitBtn = loginForm.querySelector("button[type='submit']");
        const email = loginForm.querySelector("input[type='email']")?.value?.trim();
        const password = loginForm.querySelector("input[type='password']")?.value;

        if (!email || !password) {
          showToast("Please fill all fields.");
          return;
        }

        setSubmitBusy(submitBtn, true, "Signing in...");
        try {
          const payload = await postJson("api/auth/login.php", { email, password });
          const user = payload.data?.user;
          if (!user || !user.role) {
            throw new Error("Invalid login response.");
          }

          setLoggedInUser(user, user.role);
          logAuthEvent("LOGIN_SUCCESS", { role: user.role, user });
          showToast(`Welcome, ${user.name}`);
          setTimeout(() => {
            window.location.href = "index.html";
          }, 450);
        } catch (error) {
          logAuthEvent("LOGIN_FAILED", { message: String(error?.message || "") });
          showToast(normalizeApiError(error, "Invalid credentials."));
        } finally {
          setSubmitBusy(submitBtn, false, "Signing in...");
        }
      });

      const forgotPasswordLink = document.getElementById("forgotPasswordLink");
      const forgotModal = document.getElementById("forgotPasswordModal");
      const forgotCloseBtn = document.getElementById("forgotCloseBtn");
      const forgotStep1Form = document.getElementById("forgotStep1Form");
      const forgotStep2Form = document.getElementById("forgotStep2Form");
      const forgotStep3Form = document.getElementById("forgotStep3Form");
      const forgotEmailInput = document.getElementById("forgotEmailInput");
      const forgotCodeInput = document.getElementById("forgotCodeInput");
      const forgotNewPasswordInput = document.getElementById("forgotNewPasswordInput");
      const forgotConfirmPasswordInput = document.getElementById("forgotConfirmPasswordInput");
      const forgotBackToEmailBtn = document.getElementById("forgotBackToEmailBtn");
      const forgotBackToCodeBtn = document.getElementById("forgotBackToCodeBtn");

      if (
        forgotPasswordLink &&
        forgotModal &&
        forgotStep1Form &&
        forgotStep2Form &&
        forgotStep3Form &&
        forgotEmailInput &&
        forgotCodeInput &&
        forgotNewPasswordInput &&
        forgotConfirmPasswordInput
      ) {
        let resetEmail = "";
        let verifiedCode = "";

        const showForgotStep = (step) => {
          forgotStep1Form.style.display = step === 1 ? "block" : "none";
          forgotStep2Form.style.display = step === 2 ? "block" : "none";
          forgotStep3Form.style.display = step === 3 ? "block" : "none";
        };

        const openForgotModal = () => {
          forgotModal.style.display = "flex";
          resetEmail = "";
          verifiedCode = "";
          forgotStep1Form.reset();
          forgotStep2Form.reset();
          forgotStep3Form.reset();
          showForgotStep(1);
        };

        const closeForgotModal = () => {
          forgotModal.style.display = "none";
        };

        forgotPasswordLink.addEventListener("click", openForgotModal);

        if (forgotCloseBtn) {
          forgotCloseBtn.addEventListener("click", closeForgotModal);
        }

        forgotModal.addEventListener("click", (event) => {
          if (event.target === forgotModal) {
            closeForgotModal();
          }
        });

        if (forgotBackToEmailBtn) {
          forgotBackToEmailBtn.addEventListener("click", () => {
            showForgotStep(1);
            forgotEmailInput.focus();
          });
        }

        if (forgotBackToCodeBtn) {
          forgotBackToCodeBtn.addEventListener("click", () => {
            showForgotStep(2);
            forgotCodeInput.focus();
          });
        }

        forgotStep1Form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submitBtn = forgotStep1Form.querySelector("button[type='submit']");
          const email = String(forgotEmailInput.value || "").trim();
          if (!email) {
            showToast("Please enter your email.");
            return;
          }

          setSubmitBusy(submitBtn, true, "Sending...");
          try {
            await postJson("api/auth/forgot-password.php", { email });
            resetEmail = email;
            showForgotStep(2);
            forgotCodeInput.focus();
            showToast("Verification code sent to your email.");
          } catch (error) {
            showToast(normalizeApiError(error, "Unable to send reset code."));
          } finally {
            setSubmitBusy(submitBtn, false, "Sending...");
          }
        });

        forgotStep2Form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submitBtn = forgotStep2Form.querySelector("button[type='submit']");
          const code = String(forgotCodeInput.value || "").trim();

          if (!resetEmail) {
            showToast("Please request the code again.");
            showForgotStep(1);
            forgotEmailInput.focus();
            return;
          }

          if (!/^\d{6}$/.test(code)) {
            showToast("Enter a valid 6-digit verification code.");
            forgotCodeInput.focus();
            return;
          }

          setSubmitBusy(submitBtn, true, "Verifying...");
          try {
            await postJson("api/auth/verify-reset-code.php", { email: resetEmail, code });
            verifiedCode = code;
            showForgotStep(3);
            forgotNewPasswordInput.focus();
            showToast("Code verified. Set your new password.");
          } catch (error) {
            showToast(normalizeApiError(error, "Invalid or expired verification code."));
          } finally {
            setSubmitBusy(submitBtn, false, "Verifying...");
          }
        });

        forgotStep3Form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submitBtn = forgotStep3Form.querySelector("button[type='submit']");
          const newPassword = String(forgotNewPasswordInput.value || "");
          const confirmPassword = String(forgotConfirmPasswordInput.value || "");

          if (!resetEmail || !verifiedCode) {
            showToast("Please verify your code first.");
            showForgotStep(1);
            return;
          }

          if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters.");
            forgotNewPasswordInput.focus();
            return;
          }

          if (newPassword !== confirmPassword) {
            showToast("Passwords do not match.");
            forgotConfirmPasswordInput.focus();
            return;
          }

          setSubmitBusy(submitBtn, true, "Resetting...");
          try {
            await postJson("api/auth/reset-password.php", {
              email: resetEmail,
              code: verifiedCode,
              new_password: newPassword
            });

            closeForgotModal();
            showToast("Password reset successful. Please sign in.");
            loginForm.querySelector("input[type='email']").value = resetEmail;
            loginForm.querySelector("input[type='password']").value = "";
          } catch (error) {
            showToast(normalizeApiError(error, "Unable to reset password."));
          } finally {
            setSubmitBusy(submitBtn, false, "Resetting...");
          }
        });
      }
    }

    const registerWizardForm = document.getElementById("registerWizardForm");
    if (registerWizardForm) {
      const roleStage = document.getElementById("registerRoleStage");
      const roleButtons = Array.from(document.querySelectorAll("[data-register-role]"));
      const roleInput = document.getElementById("registerRoleInput");
      const roleText = document.getElementById("registerRoleText");
      const stepChips = Array.from(document.querySelectorAll("[data-step-chip]"));
      const steps = Array.from(document.querySelectorAll("[data-register-step]"));
      const studentOnly = Array.from(document.querySelectorAll("[data-student-only='true']"));
      const expertOnly = Array.from(document.querySelectorAll("[data-expert-only='true']"));
      const backBtn = document.getElementById("registerBackBtn");
      const nextBtn = document.getElementById("registerNextBtn");
      const reviewList = document.getElementById("registerReviewList");

      const nameInput = document.getElementById("registerName");
      const emailInput = document.getElementById("registerEmail");
      const passwordInput = document.getElementById("registerPassword");
      const confirmPasswordInput = document.getElementById("registerConfirmPassword");

      const studentIdInput = document.getElementById("registerStudentId");
      const universitySearch = document.getElementById("registerUniversitySearch");
      const universityIdInput = document.getElementById("registerUniversityId");
      const universityDropdown = document.getElementById("registerUniversityDropdown");
      const facultySearch = document.getElementById("registerFacultySearch");
      const facultyIdInput = document.getElementById("registerFacultyId");
      const facultyDropdown = document.getElementById("registerFacultyDropdown");
      const departmentSearch = document.getElementById("registerDepartmentSearch");
      const departmentIdInput = document.getElementById("registerDepartmentId");
      const departmentDropdown = document.getElementById("registerDepartmentDropdown");

      const skillsSearch = document.getElementById("registerSkillsSearch");
      const skillsDropdown = document.getElementById("registerSkillsDropdown");
      const skillsTags = document.getElementById("registerSelectedSkills");
      const skillsAddBtn = document.getElementById("registerSkillAddBtn");
      const suggestedSkillsWrap = document.getElementById("registerSuggestedSkills");

      const titleInput = document.getElementById("registerTitle");
      const organizationInput = document.getElementById("registerOrganization");

      let selectedRole = "";
      let currentStep = 1;
      let maxSteps = 1;
      let selectedFacultyId = 0;
      let universities = [];
      let faculties = [];
      let departments = [];
      let skillNames = [];
      let selectedSkills = [];

      const fetchArray = async (path) => {
        try {
          const response = await fetch(path, { cache: "no-store" });
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          return [];
        }
      };

      const updateStepUi = () => {
        steps.forEach((node) => {
          node.classList.toggle("active", Number(node.dataset.registerStep) === currentStep);
        });
        stepChips.forEach((chip) => {
          chip.classList.toggle("active", Number(chip.dataset.stepChip) === currentStep);
        });

        if (backBtn) {
          backBtn.style.display = currentStep > 1 ? "inline-flex" : "none";
        }
        if (nextBtn) {
          nextBtn.textContent = currentStep === maxSteps ? "Create Account" : "Next";
        }
      };

      const setRole = (role) => {
        selectedRole = role;
        maxSteps = role === "student" ? 3 : 2;
        
        if (roleInput) {
          roleInput.value = role;
        }
        if (roleText) {
          roleText.textContent = role === "expert" ? "Expert" : "Student";
        }

        studentOnly.forEach((node) => {
          node.style.display = role === "student" ? "block" : "none";
        });
        expertOnly.forEach((node) => {
          node.style.display = role === "expert" ? "block" : "none";
        });

        // Update step tracker visibility
        const stepTracker = document.getElementById("registerStepTracker");
        if (stepTracker) {
          if (role === "student") {
            stepTracker.style.display = "flex";
            stepTracker.querySelectorAll("[data-step-chip]").forEach((chip) => {
              chip.style.display = "flex";
            });
          } else {
            stepTracker.style.display = "flex";
            stepTracker.querySelector("[data-step-chip='3']").style.display = "none";
          }
        }

        if (roleStage) {
          roleStage.style.display = "none";
        }
        registerWizardForm.classList.add("active");
        currentStep = 1;
        updateStepUi();
      };

      const validateStep1 = () => {
        const name = String(nameInput?.value || "").trim();
        const email = String(emailInput?.value || "").trim();
        const password = String(passwordInput?.value || "");
        const confirm = String(confirmPasswordInput?.value || "");

        if (!name || !email || !password || !confirm) {
          showToast("Please fill all account fields.");
          return false;
        }
        if (password.length < 6) {
          showToast("Password must be at least 6 characters.");
          passwordInput?.focus();
          return false;
        }
        if (password !== confirm) {
          showToast("Passwords do not match.");
          confirmPasswordInput?.focus();
          return false;
        }
        return true;
      };

      const validateStep2 = () => {
        if (selectedRole === "expert") {
          const title = String(titleInput?.value || "").trim();
          const organization = String(organizationInput?.value || "").trim();
          // Title and organization are optional for experts
          return true;
        }

        if (selectedRole !== "student") {
          return true;
        }

        const studentId = String(studentIdInput?.value || "").trim();
        const universityId = Number(universityIdInput?.value || 0);
        const facultyId = Number(facultyIdInput?.value || 0);
        const departmentId = Number(departmentIdInput?.value || 0);

        if (!studentId) {
          showToast("Student ID is required.");
          studentIdInput?.focus();
          return false;
        }
        if (!universityId || !facultyId || !departmentId) {
          showToast("Please select university, faculty and department.");
          return false;
        }
        return true;
      };

      const validateStep3 = () => {
        if (selectedRole !== "student") {
          return true;
        }
        // Skills are optional, no validation needed
        return true;
      };

      const normalizeSkillList = (items) => {
        return items
          .map((entry) => {
            if (typeof entry === "string") {
              return entry;
            }
            if (entry && typeof entry === "object") {
              return entry.name || "";
            }
            return "";
          })
          .map((entry) => String(entry || "").trim().replace(/^#/, ""))
          .filter(Boolean);
      };

      const renderSkillTags = () => {
        if (!skillsTags) {
          return;
        }

        skillsTags.innerHTML = selectedSkills
          .map((skill) => {
            return `
              <span class="skill-tag">
                #${escapeHtml(skill)}
                <button type="button" data-remove-skill="${escapeHtml(skill)}">&times;</button>
              </span>
            `;
          })
          .join("");
      };

      const addSkill = (skillNameRaw) => {
        const skill = String(skillNameRaw || "").trim().replace(/^#/, "");
        if (!skill) {
          return;
        }

        const already = selectedSkills.some((item) => item.toLowerCase() === skill.toLowerCase());
        if (already) {
          return;
        }
        if (selectedSkills.length >= 5) {
          showToast("Maximum 5 skills allowed.");
          return;
        }

        selectedSkills.push(skill);
        renderSkillTags();
      };

      const renderSuggestedSkills = () => {
        if (!suggestedSkillsWrap) {
          return;
        }
        suggestedSkillsWrap.innerHTML = skillNames.slice(0, 12)
          .map((skill) => `<button type="button" class="suggested-skill-btn" data-suggested-skill="${escapeHtml(skill)}">#${escapeHtml(skill)}</button>`)
          .join("");
      };

      const bindDropdownSelect = (dropdownNode, itemClass, callback) => {
        if (!dropdownNode) {
          return;
        }
        dropdownNode.querySelectorAll(itemClass).forEach((item) => {
          item.addEventListener("click", () => callback(item));
        });
      };

      roleButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const role = String(btn.dataset.registerRole || "").trim();
          if (role === "student" || role === "expert") {
            setRole(role);
          }
        });
      });

      if (backBtn) {
        backBtn.addEventListener("click", () => {
          currentStep = Math.max(1, currentStep - 1);
          updateStepUi();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          if (currentStep === 1 && !validateStep1()) {
            return;
          }
          if (currentStep === 2 && !validateStep2()) {
            return;
          }
          if (currentStep === 3 && !validateStep3()) {
            return;
          }

          if (currentStep < maxSteps) {
            currentStep += 1;
            updateStepUi();
            return;
          }

          registerWizardForm.requestSubmit();
        });
      }

      registerWizardForm.addEventListener("click", (event) => {
        const removeBtn = event.target.closest("[data-remove-skill]");
        if (removeBtn) {
          const value = String(removeBtn.dataset.removeSkill || "").trim().toLowerCase();
          selectedSkills = selectedSkills.filter((item) => item.toLowerCase() !== value);
          renderSkillTags();
          return;
        }

        const suggestedBtn = event.target.closest("[data-suggested-skill]");
        if (suggestedBtn) {
          addSkill(String(suggestedBtn.dataset.suggestedSkill || ""));
          return;
        }
      });

      if (skillsAddBtn && skillsSearch) {
        skillsAddBtn.addEventListener("click", () => {
          addSkill(skillsSearch.value);
          skillsSearch.value = "";
          if (skillsDropdown) {
            skillsDropdown.style.display = "none";
          }
        });

        skillsSearch.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addSkill(skillsSearch.value);
            skillsSearch.value = "";
            if (skillsDropdown) {
              skillsDropdown.style.display = "none";
            }
          }
        });

        skillsSearch.addEventListener("input", () => {
          if (!skillsDropdown) {
            return;
          }
          const query = String(skillsSearch.value || "").trim().toLowerCase();
          if (!query) {
            skillsDropdown.style.display = "none";
            return;
          }

          const filtered = skillNames
            .filter((skill) => !selectedSkills.some((entry) => entry.toLowerCase() === skill.toLowerCase()))
            .filter((skill) => skill.toLowerCase().includes(query))
            .slice(0, 8);

          skillsDropdown.innerHTML = filtered
            .map((skill) => `<div class="skills-dropdown-item" data-skill-item="${escapeHtml(skill)}">${escapeHtml(skill)}</div>`)
            .join("");

          bindDropdownSelect(skillsDropdown, "[data-skill-item]", (item) => {
            addSkill(item.dataset.skillItem || "");
            skillsSearch.value = "";
            skillsDropdown.style.display = "none";
          });

          skillsDropdown.style.display = filtered.length ? "block" : "none";
        });
      }

      if (universitySearch && universityDropdown && universityIdInput) {
        universitySearch.addEventListener("input", () => {
          universityIdInput.value = "";
          const query = String(universitySearch.value || "").trim().toLowerCase();
          if (!query) {
            universityDropdown.style.display = "none";
            return;
          }

          const filtered = universities.filter((item) => String(item.name || "").toLowerCase().includes(query)).slice(0, 8);
          universityDropdown.innerHTML = filtered.map((item) => {
            return `<div class="university-dropdown-item" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>`;
          }).join("");

          bindDropdownSelect(universityDropdown, ".university-dropdown-item", (item) => {
            universitySearch.value = item.dataset.name || "";
            universityIdInput.value = item.dataset.id || "";
            universityDropdown.style.display = "none";
          });

          universityDropdown.style.display = filtered.length ? "block" : "none";
        });
      }

      if (facultySearch && facultyDropdown && facultyIdInput && departmentIdInput && departmentSearch) {
        facultySearch.addEventListener("input", () => {
          selectedFacultyId = 0;
          facultyIdInput.value = "";
          departmentIdInput.value = "";
          departmentSearch.value = "";

          const query = String(facultySearch.value || "").trim().toLowerCase();
          if (!query) {
            facultyDropdown.style.display = "none";
            return;
          }

          const filtered = faculties.filter((item) => String(item.name || "").toLowerCase().includes(query)).slice(0, 8);
          facultyDropdown.innerHTML = filtered.map((item) => {
            return `<div class="faculty-dropdown-item" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>`;
          }).join("");

          bindDropdownSelect(facultyDropdown, ".faculty-dropdown-item", (item) => {
            facultySearch.value = item.dataset.name || "";
            facultyIdInput.value = item.dataset.id || "";
            selectedFacultyId = Number(item.dataset.id || 0);
            facultyDropdown.style.display = "none";
          });

          facultyDropdown.style.display = filtered.length ? "block" : "none";
        });
      }

      if (departmentSearch && departmentDropdown && departmentIdInput) {
        departmentSearch.addEventListener("input", () => {
          departmentIdInput.value = "";
          const query = String(departmentSearch.value || "").trim().toLowerCase();
          if (!query) {
            departmentDropdown.style.display = "none";
            return;
          }

          const source = selectedFacultyId
            ? departments.filter((item) => Number(item.facultyId || 0) === selectedFacultyId)
            : departments;

          const filtered = source.filter((item) => String(item.name || "").toLowerCase().includes(query)).slice(0, 8);
          departmentDropdown.innerHTML = filtered.map((item) => {
            return `<div class="department-dropdown-item" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>`;
          }).join("");

          bindDropdownSelect(departmentDropdown, ".department-dropdown-item", (item) => {
            departmentSearch.value = item.dataset.name || "";
            departmentIdInput.value = item.dataset.id || "";
            departmentDropdown.style.display = "none";
          });

          departmentDropdown.style.display = filtered.length ? "block" : "none";
        });
      }

      document.addEventListener("click", (event) => {
        if (universityDropdown && !event.target.closest("#registerUniversitySearch") && !event.target.closest("#registerUniversityDropdown")) {
          universityDropdown.style.display = "none";
        }
        if (facultyDropdown && !event.target.closest("#registerFacultySearch") && !event.target.closest("#registerFacultyDropdown")) {
          facultyDropdown.style.display = "none";
        }
        if (departmentDropdown && !event.target.closest("#registerDepartmentSearch") && !event.target.closest("#registerDepartmentDropdown")) {
          departmentDropdown.style.display = "none";
        }
        if (skillsDropdown && !event.target.closest("#registerSkillsSearch") && !event.target.closest("#registerSkillsDropdown")) {
          skillsDropdown.style.display = "none";
        }
      });

      registerWizardForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!selectedRole) {
          showToast("Please select a role first.");
          return;
        }
        if (!validateStep1() || !validateStep2() || !validateStep3()) {
          return;
        }

        const payload = {
          role: selectedRole,
          full_name: String(nameInput?.value || "").trim(),
          email: String(emailInput?.value || "").trim(),
          password: String(passwordInput?.value || "")
        };

        if (selectedRole === "student") {
          payload.student_id = String(studentIdInput?.value || "").trim();
          payload.university_id = Number(universityIdInput?.value || 0);
          payload.faculty_id = Number(facultyIdInput?.value || 0);
          payload.department_id = Number(departmentIdInput?.value || 0);
          payload.skills = selectedSkills;
        } else if (selectedRole === "expert") {
          payload.title = String(titleInput?.value || "").trim();
          payload.organization = String(organizationInput?.value || "").trim();
        }

        setSubmitBusy(nextBtn, true, "Creating account...");
        try {
          const response = await postJson("api/auth/register.php", payload);
          const user = response.data?.user;
          if (!user || !user.role) {
            throw new Error("Invalid register response.");
          }

          setLoggedInUser(user, user.role);
          showToast("Account created successfully.");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 450);
        } catch (error) {
          showToast(normalizeApiError(error, "Unable to create account."));
        } finally {
          setSubmitBusy(nextBtn, false, "Creating account...");
        }
      });

      Promise.all([
        fetchArray("data/universities.json"),
        fetchArray("data/faculties.json"),
        fetchArray("data/departments.json"),
        fetchArray("data/skills.json")
      ]).then(([uniRows, facRows, depRows, skillRows]) => {
        universities = uniRows;
        faculties = facRows;
        departments = depRows;
        skillNames = normalizeSkillList(skillRows);
        renderSuggestedSkills();
      });
    }

    const studentForm = document.getElementById("studentForm");
    if (studentForm) {
      studentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("[AUTH:REGISTER_STUDENT_SUBMIT_START]");
        const submitBtn = studentForm.querySelector("button[type='submit']");
        const name = studentForm.querySelector("input[name='full_name']")?.value?.trim();
        const email = studentForm.querySelector("input[name='email']")?.value?.trim();
        const password = studentForm.querySelector("input[name='password']")?.value;
        const studentId = studentForm.querySelector("input[name='student_id']")?.value?.trim();
        const university = studentForm.querySelector(".university-search")?.value?.trim();
        const faculty = studentForm.querySelector(".faculty-search")?.value?.trim();
        const department = studentForm.querySelector(".department-search")?.value?.trim();
        const universityId = Number(studentForm.querySelector("input[name='university_id']")?.value || 0);
        const facultyId = Number(studentForm.querySelector("input[name='faculty_id']")?.value || 0);
        const departmentId = Number(studentForm.querySelector("input[name='department_id']")?.value || 0);
        const skills = Array.isArray(window.selectedRegisterSkills) ? window.selectedRegisterSkills : [];

        if (!name || !email || !password || !studentId || !university || !faculty || !department) {
          showToast("Please fill all fields.");
          return;
        }

        if (!universityId || !facultyId || !departmentId) {
          showToast("Please select valid university, faculty, and department.");
          return;
        }

        setSubmitBusy(submitBtn, true, "Creating account...");
        try {
          const payload = await postJson("api/auth/register.php", {
            role: "student",
            full_name: name,
            email,
            password,
            student_id: studentId,
            university_id: universityId,
            faculty_id: facultyId,
            department_id: departmentId,
            skills
          });

          const user = payload.data?.user;
          if (!user || !user.role) {
            throw new Error("Invalid register response.");
          }

          logAuthEvent("REGISTER_SUCCESS", {
            role: user.role,
            user
          });

          setLoggedInUser(user, "student");
          showToast("Account created.");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 450);
        } catch (error) {
          logAuthEvent("REGISTER_FAILED", {
            role: "student",
            message: String(error?.message || "")
          });
          showToast(normalizeApiError(error, "Unable to create account."));
        } finally {
          setSubmitBusy(submitBtn, false, "Creating account...");
        }
      });
    }

    const expertForm = document.getElementById("expertForm");
    if (expertForm) {
      expertForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("[AUTH:REGISTER_EXPERT_SUBMIT_START]");
        const submitBtn = expertForm.querySelector("button[type='submit']");
        const name = expertForm.querySelector("input[name='full_name']")?.value?.trim();
        const email = expertForm.querySelector("input[name='email']")?.value?.trim();
        const password = expertForm.querySelector("input[name='password']")?.value;

        if (!name || !email || !password) {
          showToast("Please fill all fields.");
          return;
        }

        setSubmitBusy(submitBtn, true, "Creating account...");
        try {
          const payload = await postJson("api/auth/register.php", {
            role: "expert",
            full_name: name,
            email,
            password
          });

          const user = payload.data?.user;
          if (!user || !user.role) {
            throw new Error("Invalid register response.");
          }

          logAuthEvent("REGISTER_SUCCESS", {
            role: user.role,
            user
          });

          setLoggedInUser(user, "expert");
          showToast("Account created.");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 450);
        } catch (error) {
          logAuthEvent("REGISTER_FAILED", {
            role: "expert",
            message: String(error?.message || "")
          });
          showToast(normalizeApiError(error, "Unable to create account."));
        } finally {
          setSubmitBusy(submitBtn, false, "Creating account...");
        }
      });
    }
  }

  async function init() {
    await syncAuthenticatedUser();
    await loadMyProfileData();
    await loadViewedUserProfileData();
    await loadNotificationsData();
    await mountComponents();
    initNavbar();
    setActiveNav();
    updateSidebarAndNav();
    updateSessionRoleBadges();
    updatePublicRoleBadges();
    updateNotificationBadge();
    enforceProfileRestrictions();
    gateMyProfileForGuests();
    initSearchForms();
    await initSettingsPage();

    await loadPostTemplate();
    await loadPostsData();
    await loadTrendingInnovationsData();
    await loadStudentProfilesData();
    updateSidebarAndNav();
    applyRoleBasedProfileLayout();
    updateProfileIdentity();
    renderMyProfileDetails();
    renderUserProfileDetails();
    updateProfileLikes();
    renderPostStreams();
    renderTrendingInnovations();
    renderMostLikelyPosts();
    renderNotificationsPage();
    renderPostViewPage();
    renderExpertRatingsPage();
    initFeedSort();
    renderSearchResults();
    initMyProfileMediaEditor();

    initCreatePostComposer();
    initEventDelegation();
    initAuthForms();

    window.showToast = showToast;
    window.logout = logout;
    window.showLoginDialog = showLoginDialog;
    window.state = state;
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(() => {
      showToast("Unable to initialize some modules.");
    });
  });
})();