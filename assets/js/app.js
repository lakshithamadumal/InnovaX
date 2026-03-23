(() => {
  const templateCache = new Map();

  const state = {
    isLoggedIn: JSON.parse(localStorage.getItem("isLoggedIn") || "false"),
    userRole: localStorage.getItem("userRole") || null,
    currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
    posts: [],
    postTemplate: "",
    notificationCount: 2,
    feedSort: "recent"
  };

  const studentProfiles = [
    {
      id: "student1",
      name: "Alex Johnson",
      title: "Final Year Student · Product Design",
      badge: "Student"
    },
    {
      id: "student2",
      name: "Nadeesha Perera",
      title: "Computer Science Student · AI Builder",
      badge: "Student"
    },
    {
      id: "student3",
      name: "Kasun Silva",
      title: "Engineering Student · IoT Creator",
      badge: "Student"
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function setLoggedInUser(user, role) {
    state.isLoggedIn = true;
    state.userRole = role;
    state.currentUser = user;
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", role);
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUser");
    state.isLoggedIn = false;
    state.userRole = null;
    state.currentUser = null;
    window.location.href = "index.html";
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

  function requireAuthAction() {
    if (state.isLoggedIn) {
      return true;
    }
    showLoginDialog();
    return false;
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
      const response = await fetch("data/posts.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Post data not found");
      }
      const data = await response.json();
      const normalized = Array.isArray(data) ? data : [];

      state.posts = normalized.map((post, index) => {
        const id = String(post.id || `seed-${index + 1}`);
        return {
          ...post,
          id,
          authorId: post.authorId || `seed-${id}`,
          likes: Number(post.likes || 0),
          createdOrder: Number(post.id || index + 1)
        };
      });
    } catch (error) {
      state.posts = [];
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
    const mediaHtml = post.media
      ? `
        <div class="post-media">
          <div class="post-media-inner">
            <span style="font-size:3.5rem">${escapeHtml(post.media.emoji || "💡")}</span>
            <p>${escapeHtml(post.media.label || "Post asset")}</p>
          </div>
        </div>
      `
      : "";

    return applyTemplate(state.postTemplate, {
      id: escapeHtml(post.id),
      authorId: escapeHtml(post.authorId),
      avatarColor: escapeHtml(post.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)"),
      avatar: escapeHtml(post.avatar || getInitials(post.name)),
      name: escapeHtml(post.name || "InnovaX Member"),
      role: escapeHtml(post.role || "Member"),
      time: escapeHtml(post.time || "Now"),
      title: escapeHtml(post.title || "Untitled post"),
      desc: escapeHtml(post.desc || ""),
      tags: tagsHtml,
      media: mediaHtml,
      likes: escapeHtml(post.likes ?? 0),
      moreMenu: buildMoreMenu(post)
    });
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
          <a class="trend-item" href="post-view.html">
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

  function updateNotificationBadge() {
    const badges = Array.from(document.querySelectorAll("#notif-badge"));
    badges.forEach((badge) => {
      if (!state.isLoggedIn) {
        badge.style.display = "none";
        return;
      }
      badge.textContent = String(state.notificationCount);
      badge.style.display = state.notificationCount > 0 ? "flex" : "none";
    });
  }

  function setActiveNav() {
    const activeNav = document.body.dataset.activeNav || "";
    const links = Array.from(document.querySelectorAll(".nav-link[data-nav]"));
    links.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === activeNav);
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

    const sidebarName = document.getElementById("sidebar-user-name");
    const sidebarRole = document.getElementById("sidebar-user-role");
    const sidebarAvatar = document.getElementById("sidebar-user-avatar");
    const sidebarStats = document.getElementById("sidebar-user-stats");
    const sidebarStatValue = document.getElementById("sidebar-user-stat-value");
    const sidebarStatLabel = document.getElementById("sidebar-user-stat-label");
    const navAvatar = document.querySelector(".nav-avatar");

    if (state.isLoggedIn && state.currentUser) {
      const initials = getInitials(state.currentUser.name);
      if (sidebarName) sidebarName.textContent = state.currentUser.name;
      if (sidebarRole) sidebarRole.textContent = state.userRole === "student" ? "Student" : "Expert";
      if (sidebarAvatar) sidebarAvatar.textContent = initials;

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
        navAvatar.textContent = initials;
        navAvatar.dataset.route = "my-profile.html";
        navAvatar.title = "My Profile";
      }
    } else if (navAvatar) {
      navAvatar.textContent = "IN";
      navAvatar.dataset.route = "login.html";
      navAvatar.title = "Login";
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

  function applyRoleBasedProfileLayout() {
    const page = document.body.dataset.page;
    if (page !== "my-profile" && page !== "user-profile") {
      return;
    }

    const isExpert = state.isLoggedIn && state.userRole === "expert";
    const sections = Array.from(document.querySelectorAll("[data-profile-section]"));
    const savedLinkCards = Array.from(document.querySelectorAll("[data-expert-saved-link]"));

    sections.forEach((section) => {
      const key = section.dataset.profileSection;
      const shouldHide = isExpert && ["skills", "portfolio", "my-posts"].includes(key);
      section.style.display = shouldHide ? "none" : "block";
    });

    savedLinkCards.forEach((card) => {
      card.style.display = isExpert ? "block" : "none";
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
    }

    const navAvatar = document.querySelector(".nav-avatar");
    if (navAvatar) {
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

  function publishFromComposer(card) {
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

    const newOrder = state.posts.length ? Math.max(...state.posts.map((post) => post.createdOrder || 0)) + 1 : 1;

    const newPost = {
      id: `new-${Date.now()}`,
      authorId: state.currentUser.id,
      avatar: getInitials(state.currentUser.name),
      avatarColor: "linear-gradient(135deg,#4E73DF,#6f8ee8)",
      name: state.currentUser.name,
      role: "Student Creator",
      time: "Just now",
      title: title || "New student post",
      desc: desc || "",
      tags,
      media: null,
      likes: 0,
      saved: false,
      createdOrder: newOrder
    };

    state.posts.unshift(newPost);
    renderPostStreams();
    renderMostLikelyPosts();

    if (titleEl) titleEl.value = "";
    if (descEl) descEl.value = "";
    if (tagsEl) tagsEl.value = "";

    showToast("Post published.");
  }

  function initCreatePostComposer() {
    const composer = document.querySelector("[data-create-post-card]");
    if (!composer) {
      return;
    }

    const feed = document.querySelector("[data-page='feed']");
    if (!feed && document.body.dataset.page !== "feed") {
      return;
    }

    const roleNote = composer.querySelector("[data-create-role-note]");
    const editor = composer.querySelector("[data-post-editor]");
    const trigger = composer.querySelector("[data-open-editor]");
    const publishBtn = composer.querySelector("[data-publish-post]");

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
      const avatar = composer.querySelector(".create-post-top .avatar");
      if (avatar && state.currentUser?.name) {
        avatar.textContent = getInitials(state.currentUser.name);
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
    renderMostLikelyPosts();
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
          if (window.confirm("Delete this post?")) {
            removePostById(postId);
            showToast("Post deleted.");
          }
        }
        return;
      }

      if (!event.target.closest(".post-more-wrap")) {
        closePostMenus();
      }

      const likeBtn = event.target.closest("[data-like-btn]");
      if (likeBtn) {
        if (!requireAuthAction()) {
          return;
        }

        likeBtn.classList.toggle("liked");
        const card = likeBtn.closest("[data-post-id]");
        const count = card?.querySelector("[data-like-count]");
        if (count) {
          const current = Number.parseInt(count.textContent, 10) || 0;
          const delta = likeBtn.classList.contains("liked") ? 1 : -1;
          count.textContent = String(Math.max(0, current + delta));
        }
        return;
      }

      const saveBtn = event.target.closest("[data-save-btn]");
      if (saveBtn) {
        if (!requireAuthAction()) {
          return;
        }
        saveBtn.classList.toggle("saved");
        showToast(saveBtn.classList.contains("saved") ? "Saved post." : "Removed from saved.");
        return;
      }

      const shareBtn = event.target.closest("[data-share-btn]");
      if (shareBtn) {
        showToast("Post link copied.");
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

    const studentHits = studentProfiles.filter((profile) => {
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
        return `<article class="article-card"><h3>Student: ${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.title)} · Badge: ${escapeHtml(profile.badge)}</p></article>`;
      })
      .join("");

    const postHtml = sortedPostHits
      .map((post) => {
        return `<article class="article-card"><h3>Post: ${escapeHtml(post.title || "Untitled")}</h3><p>Author: ${escapeHtml(post.name || "Member")} · ${escapeHtml(post.likes)} likes</p></article>`;
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
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const role = document.querySelector(".role-btn.active")?.dataset.role;
        const email = loginForm.querySelector("input[type='email']")?.value?.trim();
        const password = loginForm.querySelector("input[type='password']")?.value;

        if (!role || !email || !password) {
          showToast("Please fill all fields.");
          return;
        }

        const validCredentials = {
          student: { email: "student@example.com", password: "student123" },
          expert: { email: "expert@example.com", password: "expert123" }
        };

        const valid = validCredentials[role];
        if (!valid || valid.email !== email || valid.password !== password) {
          showToast("Invalid credentials.");
          return;
        }

        const user = role === "student"
          ? { id: "student1", name: "Alex Johnson", email, role }
          : { id: "expert1", name: "Dr. Sarah Smith", email, role };

        setLoggedInUser(user, role);
        showToast(`Welcome, ${user.name}`);
        setTimeout(() => {
          window.location.href = "index.html";
        }, 450);
      });
    }

    const studentForm = document.getElementById("studentForm");
    if (studentForm) {
      studentForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = studentForm.querySelector("input[type='text']")?.value?.trim();
        const email = studentForm.querySelector("input[type='email']")?.value?.trim();
        const password = studentForm.querySelector("input[type='password']")?.value;
        const studentId = studentForm.querySelector("input[placeholder*='Student']")?.value?.trim();
        const university = studentForm.querySelector(".university-search")?.value?.trim();

        if (!name || !email || !password || !studentId || !university) {
          showToast("Please fill all fields.");
          return;
        }

        const user = {
          id: `student_${Date.now()}`,
          name,
          email,
          role: "student",
          studentId,
          university
        };

        setLoggedInUser(user, "student");
        showToast("Account created.");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 450);
      });
    }

    const expertForm = document.getElementById("expertForm");
    if (expertForm) {
      expertForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = expertForm.querySelector("input[type='text']")?.value?.trim();
        const email = expertForm.querySelector("input[type='email']")?.value?.trim();
        const password = expertForm.querySelector("input[type='password']")?.value;

        if (!name || !email || !password) {
          showToast("Please fill all fields.");
          return;
        }

        const user = {
          id: `expert_${Date.now()}`,
          name,
          email,
          role: "expert"
        };

        setLoggedInUser(user, "expert");
        showToast("Account created.");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 450);
      });
    }
  }

  async function init() {
    await mountComponents();
    initNavbar();
    setActiveNav();
    updateSidebarAndNav();
    updateSessionRoleBadges();
    updateNotificationBadge();
    enforceProfileRestrictions();
    gateMyProfileForGuests();
    initSearchForms();

    await loadPostTemplate();
    await loadPostsData();
    updateSidebarAndNav();
    applyRoleBasedProfileLayout();
    renderPostStreams();
    renderMostLikelyPosts();
    initFeedSort();
    renderSearchResults();

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