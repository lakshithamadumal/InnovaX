(() => {
  const state = {
    users: [],
    posts: [],
    ratings: []
  };

  function showMessage(selector, message, isError) {
    const node = document.querySelector(selector);
    if (!node) {
      return;
    }
    node.textContent = message || "";
    node.style.color = isError ? "#dc3545" : "#64748b";
  }

  async function apiGet(url) {
    const response = await fetch(url, {
      credentials: "same-origin"
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Request failed.");
    }
    return payload;
  }

  async function apiPost(url, data) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data || {})
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Request failed.");
    }
    return payload;
  }

  function rolePill(role) {
    const normalized = String(role || "").toLowerCase();
    const className = normalized === "expert" ? "role-expert" : "role-student";
    const label = normalized === "expert" ? "Expert" : "Student";
    return `<span class="role-pill ${className}">${label}</span>`;
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString();
  }

  async function ensureAdminAuth(onFailRedirect) {
    try {
      const payload = await apiGet("../api/admin/me.php");
      const username = payload.data?.admin?.username || "Admin";
      const welcome = document.getElementById("adminWelcome");
      if (welcome) {
        welcome.textContent = `Logged in as ${username}`;
      }
      return true;
    } catch (error) {
      if (onFailRedirect) {
        window.location.href = "./login.html";
      }
      return false;
    }
  }

  async function handleLoginPage() {
    if (!document.getElementById("adminLoginForm")) {
      return;
    }

    const already = await ensureAdminAuth(false);
    if (already) {
      window.location.href = "./dashboard.html";
      return;
    }

    const form = document.getElementById("adminLoginForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = document.getElementById("username")?.value?.trim() || "";
      const password = document.getElementById("password")?.value || "";

      if (!username || !password) {
        showMessage("#loginMessage", "Please enter username and password.", true);
        return;
      }

      showMessage("#loginMessage", "Logging in...", false);
      try {
        await apiPost("../api/admin/login.php", { username, password });
        showMessage("#loginMessage", "Login success. Redirecting...", false);
        setTimeout(() => {
          window.location.href = "./dashboard.html";
        }, 300);
      } catch (error) {
        showMessage("#loginMessage", error.message || "Invalid login.", true);
      }
    });
  }

  function renderSummary(summary) {
    const wrap = document.getElementById("summaryGrid");
    if (!wrap) {
      return;
    }

    const cards = [
      ["Total Users", summary.usersTotal],
      ["Students", summary.studentsTotal],
      ["Experts", summary.expertsTotal],
      ["Total Posts", summary.postsTotal],
      ["Total Ratings", summary.ratingsTotal],
      ["Notifications", summary.notificationsTotal],
      ["Unread Notifications", summary.unreadNotifications]
    ];

    wrap.innerHTML = cards
      .map(([label, value]) => {
        return `<article class="summary-card"><div class="label">${label}</div><div class="value">${Number(value || 0)}</div></article>`;
      })
      .join("");
  }

  function renderUsers(users) {
    const body = document.getElementById("usersTableBody");
    if (!body) {
      return;
    }

    if (!users.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">No users found.</td></tr>';
      return;
    }

    body.innerHTML = users
      .map((user) => {
        const org = user.role === "expert"
          ? `${user.expertTitle || "-"}${user.expertOrganization ? ` · ${user.expertOrganization}` : ""}`
          : `${user.university || "-"}${user.faculty ? ` · ${user.faculty}` : ""}`;

        return `
          <tr>
            <td>${user.name}</td>
            <td>${rolePill(user.role)}</td>
            <td>${user.email}</td>
            <td>${org}</td>
            <td>${user.totalPosts}</td>
            <td><button class="btn-secondary user-more-btn" data-user-id="${user.id}" type="button">More Details</button></td>
          </tr>
        `;
      })
      .join("");

    body.querySelectorAll(".user-more-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const userId = btn.dataset.userId;
        if (userId) {
          loadUserDetails(userId);
        }
      });
    });
  }

  function renderPosts(posts) {
    const body = document.getElementById("postsTableBody");
    if (!body) {
      return;
    }

    if (!posts.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">No posts found.</td></tr>';
      return;
    }

    body.innerHTML = posts
      .map((post) => {
        return `
          <tr>
            <td><strong>${post.title}</strong><div class="muted">${post.id}</div></td>
            <td>${post.authorName}<div class="muted">${rolePill(post.authorRole)}</div></td>
            <td>${formatDate(post.createdAt)}</td>
            <td>${post.likes}</td>
            <td>${post.ratingsCount}</td>
            <td>${post.averageRating}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderRatings(ratings) {
    const body = document.getElementById("ratingsTableBody");
    if (!body) {
      return;
    }

    if (!ratings.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">No ratings found.</td></tr>';
      return;
    }

    body.innerHTML = ratings
      .map((rating) => {
        return `
          <tr>
            <td>${rating.postTitle}<div class="muted">${rating.postId}</div></td>
            <td>${rating.authorName}</td>
            <td>${rating.expertName}</td>
            <td>${rating.score}</td>
            <td>${rating.note || "-"}</td>
            <td>${formatDate(rating.submittedAt)}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadSummary() {
    const payload = await apiGet("../api/admin/summary.php");
    renderSummary(payload.data?.summary || {});
  }

  async function loadUsers() {
    const role = document.getElementById("userRoleFilter")?.value || "";
    const q = document.getElementById("userSearch")?.value?.trim() || "";
    const params = new URLSearchParams();
    if (role) {
      params.set("role", role);
    }
    if (q) {
      params.set("q", q);
    }

    const payload = await apiGet(`../api/admin/users.php?${params.toString()}`);
    state.users = Array.isArray(payload.data?.users) ? payload.data.users : [];
    renderUsers(state.users);
  }

  async function loadPosts() {
    const role = document.getElementById("postRoleFilter")?.value || "";
    const userId = document.getElementById("postUserIdFilter")?.value?.trim() || "";
    const q = document.getElementById("postSearch")?.value?.trim() || "";

    const params = new URLSearchParams();
    if (role) {
      params.set("role", role);
    }
    if (userId) {
      params.set("userId", userId);
    }
    if (q) {
      params.set("q", q);
    }

    const payload = await apiGet(`../api/admin/posts.php?${params.toString()}`);
    state.posts = Array.isArray(payload.data?.posts) ? payload.data.posts : [];
    renderPosts(state.posts);
  }

  async function loadRatings() {
    const authorId = document.getElementById("ratingAuthorFilter")?.value?.trim() || "";
    const q = document.getElementById("ratingSearch")?.value?.trim() || "";

    const params = new URLSearchParams();
    if (authorId) {
      params.set("authorId", authorId);
    }
    if (q) {
      params.set("q", q);
    }

    const payload = await apiGet(`../api/admin/ratings.php?${params.toString()}`);
    state.ratings = Array.isArray(payload.data?.ratings) ? payload.data.ratings : [];
    renderRatings(state.ratings);
  }

  async function loadUserDetails(userId) {
    try {
      const payload = await apiGet(`../api/admin/user-details.php?userId=${encodeURIComponent(userId)}`);
      const user = payload.data?.user || null;
      const posts = Array.isArray(payload.data?.posts) ? payload.data.posts : [];

      if (!user) {
        throw new Error("User details not found.");
      }

      const infoNode = document.getElementById("modalUserInfo");
      const postNode = document.getElementById("modalUserPosts");
      if (!infoNode || !postNode) {
        return;
      }

      infoNode.innerHTML = `
        <div><strong>Name:</strong> ${user.name}</div>
        <div><strong>Email:</strong> ${user.email}</div>
        <div><strong>Role:</strong> ${user.role}</div>
        <div><strong>Student ID:</strong> ${user.studentId || "-"}</div>
        <div><strong>University:</strong> ${user.university || "-"}</div>
        <div><strong>Faculty:</strong> ${user.faculty || "-"}</div>
        <div><strong>Department:</strong> ${user.department || "-"}</div>
        <div><strong>Expert Title:</strong> ${user.expertTitle || "-"}</div>
        <div><strong>Organization:</strong> ${user.expertOrganization || "-"}</div>
        <div><strong>Ratings Given:</strong> ${user.ratingsGiven || 0}</div>
        <div><strong>Joined:</strong> ${formatDate(user.createdAt)}</div>
      `;

      if (!posts.length) {
        postNode.innerHTML = '<div class="muted">This user has no posts.</div>';
      } else {
        postNode.innerHTML = posts
          .map((post) => {
            return `
              <article class="modal-post-item">
                <strong>${post.title}</strong>
                <p class="muted">${post.description || "No description"}</p>
                <div class="muted">Likes: ${post.likes} | Created: ${formatDate(post.createdAt)}</div>
                <div class="muted">Post ID: ${post.id}</div>
              </article>
            `;
          })
          .join("");
      }

      const modal = document.getElementById("userDetailModal");
      modal?.classList.add("show");
      modal?.setAttribute("aria-hidden", "false");
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to load user details.", true);
    }
  }

  async function sendAllNotifications() {
    const message = document.getElementById("broadcastMessage")?.value?.trim() || "";
    if (!message) {
      showMessage("#dashboardMessage", "Please enter broadcast message.", true);
      return;
    }

    showMessage("#dashboardMessage", "Sending notifications...", false);
    try {
      const payload = await apiPost("../api/admin/notify-all.php", { message });
      const delivered = payload.data?.deliveredCount || 0;
      showMessage("#dashboardMessage", `Notification sent to ${delivered} users.`, false);
      await loadSummary();
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to send notifications.", true);
    }
  }

  async function sendStudentEmails() {
    const title = document.getElementById("studentEmailTitle")?.value?.trim() || "";
    const description = document.getElementById("studentEmailDescription")?.value?.trim() || "";

    if (!title || !description) {
      showMessage("#dashboardMessage", "Email title and description are required.", true);
      return;
    }

    showMessage("#dashboardMessage", "Sending student emails...", false);
    try {
      const payload = await apiPost("../api/admin/email-students.php", { title, description });
      const sentCount = payload.data?.sentCount || 0;
      const failedCount = payload.data?.failedCount || 0;
      showMessage("#dashboardMessage", `Email broadcast completed. Sent: ${sentCount}, Failed: ${failedCount}.`, false);
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to send student emails.", true);
    }
  }

  async function setupDashboard() {
    if (!document.getElementById("summaryGrid")) {
      return;
    }

    const authenticated = await ensureAdminAuth(true);
    if (!authenticated) {
      return;
    }

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
      try {
        await apiPost("../api/admin/logout.php", {});
      } catch (error) {
        // Continue redirect even if API fails.
      }
      window.location.href = "./login.html";
    });

    document.getElementById("userSearchBtn")?.addEventListener("click", () => {
      loadUsers().catch((error) => showMessage("#dashboardMessage", error.message, true));
    });

    document.getElementById("postSearchBtn")?.addEventListener("click", () => {
      loadPosts().catch((error) => showMessage("#dashboardMessage", error.message, true));
    });

    document.getElementById("ratingSearchBtn")?.addEventListener("click", () => {
      loadRatings().catch((error) => showMessage("#dashboardMessage", error.message, true));
    });

    document.getElementById("sendAllNotificationsBtn")?.addEventListener("click", () => {
      sendAllNotifications();
    });

    document.getElementById("sendStudentEmailsBtn")?.addEventListener("click", () => {
      sendStudentEmails();
    });

    document.getElementById("closeModalBtn")?.addEventListener("click", () => {
      const modal = document.getElementById("userDetailModal");
      modal?.classList.remove("show");
      modal?.setAttribute("aria-hidden", "true");
    });

    document.getElementById("userDetailModal")?.addEventListener("click", (event) => {
      const modal = document.getElementById("userDetailModal");
      if (event.target === modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      }
    });

    try {
      await Promise.all([loadSummary(), loadUsers(), loadPosts(), loadRatings()]);
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to load dashboard data.", true);
    }
  }

  handleLoginPage();
  setupDashboard();
})();
