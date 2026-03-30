(() => {
  function showMessage(selector, message, isError = false) {
    const node = document.querySelector(selector);
    if (!node) {
      return;
    }
    node.textContent = message || "";
    node.style.color = isError ? "#dd4258" : "#64748b";
  }

  function getPageName() {
    return String(document.body.dataset.page || "").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  async function ensureAdminAuth(onFailRedirect = true) {
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

  function setupLogout() {
    document.querySelectorAll("#logoutBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiPost("../api/admin/logout.php", {});
        } catch (error) {
          // Ignore API failure and continue redirect.
        }
        window.location.href = "./login.html";
      });
    });
  }

  function renderSummaryCards(summary) {
    const wrap = document.getElementById("summaryGrid");
    if (!wrap) {
      return;
    }

    const cards = [
      ["Total Users", summary.usersTotal, "fa-users", "tone-indigo"],
      ["Students", summary.studentsTotal, "fa-user-graduate", "tone-blue"],
      ["Experts", summary.expertsTotal, "fa-user-tie", "tone-emerald"],
      ["Total Posts", summary.postsTotal, "fa-newspaper", "tone-cyan"],
      ["Total Ratings", summary.ratingsTotal, "fa-star", "tone-gold"],
      ["Notifications", summary.notificationsTotal, "fa-bell", "tone-rose"]
    ];

    wrap.innerHTML = cards.map(([label, value, icon, tone]) => {
      return `
        <article class="summary-card">
          <div class="summary-card-head">
            <div class="label">${escapeHtml(label)}</div>
            <span class="summary-icon ${escapeHtml(tone)}"><i class="fas ${escapeHtml(icon)}"></i></span>
          </div>
          <div class="value">${Number(value || 0)}</div>
        </article>
      `;
    }).join("");
  }

  function renderRatingsSummaryCards(summary) {
    const wrap = document.getElementById("ratingSummaryCards");
    if (!wrap) {
      return;
    }

    const cards = [
      ["Total Ratings", Number(summary.totalRatings || 0), "fa-list-check", "tone-indigo"],
      ["Overall Avg", Number(summary.overallAverageScore || 0), "fa-chart-simple", "tone-cyan"],
      ["Top Rated Post Avg", Number(summary.topRatedPostAverage || 0), "fa-trophy", "tone-gold"],
      ["Top Rated Post Votes", Number(summary.topRatedPostRatingsCount || 0), "fa-users-viewfinder", "tone-blue"]
    ];

    const topPostName = summary.topRatedPostTitle
      ? `
        <article class="summary-card">
          <div class="summary-card-head">
            <div class="label">Top Rated Post</div>
            <span class="summary-icon tone-emerald"><i class="fas fa-crown"></i></span>
          </div>
          <div class="value" style="font-size:1rem;line-height:1.35;">${escapeHtml(summary.topRatedPostTitle)}</div>
        </article>
      `
      : "";

    wrap.innerHTML = cards.map(([label, value, icon, tone]) => {
      return `
        <article class="summary-card">
          <div class="summary-card-head">
            <div class="label">${escapeHtml(label)}</div>
            <span class="summary-icon ${escapeHtml(tone)}"><i class="fas ${escapeHtml(icon)}"></i></span>
          </div>
          <div class="value">${escapeHtml(value)}</div>
        </article>
      `;
    }).join("") + topPostName;
  }

  function renderUsersTable(tbodyId, users, mode) {
    const body = document.getElementById(tbodyId);
    if (!body) {
      return;
    }

    if (!users.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">No users found.</td></tr>';
      return;
    }

    body.innerHTML = users.map((user) => {
      if (mode === "students") {
        return `
          <tr>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.university || "-")}</td>
            <td>${escapeHtml([user.faculty, user.department].filter(Boolean).join(" / ") || "-")}</td>
            <td>${Number(user.totalPosts || 0)}</td>
            <td><button class="btn-secondary user-more-btn" data-user-id="${escapeHtml(user.id)}" type="button">More Details</button></td>
          </tr>
        `;
      }

      return `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.expertTitle || "-")}</td>
          <td>${escapeHtml(user.expertOrganization || "-")}</td>
          <td>${Number(user.totalPosts || 0)}</td>
          <td><button class="btn-secondary user-more-btn" data-user-id="${escapeHtml(user.id)}" type="button">More Details</button></td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll(".user-more-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const userId = btn.dataset.userId;
        if (userId) {
          loadUserDetails(userId);
        }
      });
    });
  }

  function renderPostsTable(posts) {
    const body = document.getElementById("postsTableBody");
    if (!body) {
      return;
    }

    if (!posts.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No posts found.</td></tr>';
      return;
    }

    body.innerHTML = posts.map((post) => {
      const postViewUrl = `https://innovax.works/post-view.html?postId=${encodeURIComponent(String(post.id || ""))}`;
      const hasDocument = Boolean(post.documentUrl);
      const documentLink = hasDocument 
        ? `<a class="btn-secondary" href="${escapeHtml(post.documentUrl)}" download style="font-size:0.85rem;"><i class="fas fa-download"></i> Document</a>`
        : '<span class="muted">—</span>';
      
      return `
        <tr>
          <td><strong>${escapeHtml(post.title)}</strong><div class="muted">${escapeHtml(post.id)}</div></td>
          <td>${escapeHtml(post.authorName)}</td>
          <td>${escapeHtml(formatDate(post.createdAt))}</td>
          <td>${Number(post.likes || 0)}</td>
          <td>${Number(post.ratingsCount || 0)}</td>
          <td>${Number(post.averageRating || 0)}</td>
          <td>${documentLink}</td>
          <td><a class="btn-secondary" href="${postViewUrl}" target="_blank" rel="noopener">View Post</a></td>
        </tr>
      `;
    }).join("");
  }

  function renderRatingsTable(ratings) {
    const body = document.getElementById("ratingsTableBody");
    if (!body) {
      return;
    }

    if (!ratings.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No ratings found.</td></tr>';
      return;
    }

    body.innerHTML = ratings.map((rating) => {
      const postViewUrl = `https://innovax.works/post-view.html?postId=${encodeURIComponent(String(rating.postId || ""))}`;
      return `
        <tr>
          <td>${escapeHtml(rating.postTitle)}<div class="muted">${escapeHtml(rating.postId)}</div></td>
          <td>${Number(rating.postAverageScore || 0)} <span class="muted">(${Number(rating.postRatingCount || 0)})</span></td>
          <td>${escapeHtml(rating.authorName)}</td>
          <td>${escapeHtml(rating.expertName)}</td>
          <td>${Number(rating.score || 0)}</td>
          <td>${escapeHtml(rating.note || "-")}</td>
          <td>${escapeHtml(formatDate(rating.submittedAt))}</td>
          <td><a class="btn-secondary" href="${postViewUrl}" target="_blank" rel="noopener">View Post</a></td>
        </tr>
      `;
    }).join("");
  }

  function setupModalHandlers() {
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
  }

  async function loadUserDetails(userId) {
    try {
      const payload = await apiGet(`../api/admin/user-details.php?userId=${encodeURIComponent(userId)}`);
      const user = payload.data?.user;
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
        <div><strong>Name:</strong> ${escapeHtml(user.name)}</div>
        <div><strong>Email:</strong> ${escapeHtml(user.email)}</div>
        <div><strong>Role:</strong> ${rolePill(user.role)}</div>
        <div><strong>Student ID:</strong> ${escapeHtml(user.studentId || "-")}</div>
        <div><strong>University:</strong> ${escapeHtml(user.university || "-")}</div>
        <div><strong>Faculty:</strong> ${escapeHtml(user.faculty || "-")}</div>
        <div><strong>Department:</strong> ${escapeHtml(user.department || "-")}</div>
        <div><strong>Expert Title:</strong> ${escapeHtml(user.expertTitle || "-")}</div>
        <div><strong>Organization:</strong> ${escapeHtml(user.expertOrganization || "-")}</div>
        <div><strong>Ratings Given:</strong> ${Number(user.ratingsGiven || 0)}</div>
        <div><strong>Joined:</strong> ${escapeHtml(formatDate(user.createdAt))}</div>
      `;

      if (!posts.length) {
        postNode.innerHTML = '<div class="muted">This user has no posts.</div>';
      } else {
        postNode.innerHTML = posts.map((post) => {
          const postViewUrl = `https://innovax.works/post-view.html?postId=${encodeURIComponent(String(post.id || ""))}`;
          return `
            <article class="modal-post-item">
              <a class="modal-post-link" href="${postViewUrl}" target="_blank" rel="noopener">
                ${escapeHtml(post.title)} <i class="fas fa-up-right-from-square"></i>
              </a>
            </article>
          `;
        }).join("");
      }

      const modal = document.getElementById("userDetailModal");
      modal?.classList.add("show");
      modal?.setAttribute("aria-hidden", "false");
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to load user details.", true);
    }
  }

  async function loadRatingsWithFilters() {
    const q = document.getElementById("ratingSearch")?.value?.trim() || "";
    const authorId = document.getElementById("ratingAuthorFilter")?.value?.trim() || "";

    const params = new URLSearchParams();
    if (q) {
      params.set("q", q);
    }
    if (authorId) {
      params.set("authorId", authorId);
    }

    const payload = await apiGet(`../api/admin/ratings.php?${params.toString()}`);
    return {
      ratings: Array.isArray(payload.data?.ratings) ? payload.data.ratings : [],
      summary: payload.data?.summary || {}
    };
  }

  async function initLoginPage() {
    const form = document.getElementById("adminLoginForm");
    if (!form) {
      return false;
    }

    const isAlreadyLogged = await ensureAdminAuth(false);
    if (isAlreadyLogged) {
      window.location.href = "./dashboard.html";
      return true;
    }

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
        showMessage("#loginMessage", error.message || "Invalid credentials.", true);
      }
    });

    return true;
  }

  async function initSummaryPage() {
    const summaryGrid = document.getElementById("summaryGrid");
    if (!summaryGrid) {
      return;
    }

    const summaryPayload = await apiGet("../api/admin/summary.php");
    renderSummaryCards(summaryPayload.data?.summary || {});

    const ratingsPayload = await apiGet("../api/admin/ratings.php");
    renderRatingsSummaryCards(ratingsPayload.data?.summary || {});
  }

  async function initStudentsPage() {
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) {
      return;
    }

    setupModalHandlers();

    const load = async () => {
      const q = document.getElementById("studentSearch")?.value?.trim() || "";
      const params = new URLSearchParams({ role: "student" });
      if (q) {
        params.set("q", q);
      }
      const payload = await apiGet(`../api/admin/users.php?${params.toString()}`);
      const users = Array.isArray(payload.data?.users) ? payload.data.users : [];
      renderUsersTable("studentsTableBody", users, "students");
    };

    document.getElementById("studentSearchBtn")?.addEventListener("click", () => {
      load().catch((error) => showMessage("#dashboardMessage", error.message || "Unable to load students.", true));
    });

    await load();
  }

  async function initExpertsPage() {
    const tbody = document.getElementById("expertsTableBody");
    if (!tbody) {
      return;
    }

    setupModalHandlers();

    const load = async () => {
      const q = document.getElementById("expertSearch")?.value?.trim() || "";
      const params = new URLSearchParams({ role: "expert" });
      if (q) {
        params.set("q", q);
      }
      const payload = await apiGet(`../api/admin/users.php?${params.toString()}`);
      const users = Array.isArray(payload.data?.users) ? payload.data.users : [];
      renderUsersTable("expertsTableBody", users, "experts");
    };

    document.getElementById("expertSearchBtn")?.addEventListener("click", () => {
      load().catch((error) => showMessage("#dashboardMessage", error.message || "Unable to load experts.", true));
    });

    await load();
  }

  async function initPostsPage() {
    const tbody = document.getElementById("postsTableBody");
    if (!tbody) {
      return;
    }

    const load = async () => {
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
      const posts = Array.isArray(payload.data?.posts) ? payload.data.posts : [];
      renderPostsTable(posts);
    };

    document.getElementById("postSearchBtn")?.addEventListener("click", () => {
      load().catch((error) => showMessage("#dashboardMessage", error.message || "Unable to load posts.", true));
    });

    await load();
  }

  async function initRatingsPage() {
    const tbody = document.getElementById("ratingsTableBody");
    if (!tbody) {
      return;
    }

    const load = async () => {
      const { ratings, summary } = await loadRatingsWithFilters();
      renderRatingsSummaryCards(summary);
      renderRatingsTable(ratings);
    };

    document.getElementById("ratingSearchBtn")?.addEventListener("click", () => {
      load().catch((error) => showMessage("#dashboardMessage", error.message || "Unable to load ratings.", true));
    });

    await load();
  }

  async function initNotificationsPage() {
    const btn = document.getElementById("sendAllNotificationsBtn");
    if (!btn) {
      return;
    }

    btn.addEventListener("click", async () => {
      const message = document.getElementById("broadcastMessage")?.value?.trim() || "";
      if (!message) {
        showMessage("#dashboardMessage", "Please enter notification message.", true);
        return;
      }

      showMessage("#dashboardMessage", "Sending notifications...", false);
      try {
        const payload = await apiPost("../api/admin/notify-all.php", { message });
        const delivered = Number(payload.data?.deliveredCount || 0);
        showMessage("#dashboardMessage", `Notification sent to ${delivered} users.`, false);
      } catch (error) {
        showMessage("#dashboardMessage", error.message || "Unable to send notifications.", true);
      }
    });
  }

  async function initEmailsPage() {
    const btn = document.getElementById("sendStudentEmailsBtn");
    if (!btn) {
      return;
    }

    btn.addEventListener("click", async () => {
      const title = document.getElementById("studentEmailTitle")?.value?.trim() || "";
      const description = document.getElementById("studentEmailDescription")?.value?.trim() || "";

      if (!title || !description) {
        showMessage("#dashboardMessage", "Email title and description are required.", true);
        return;
      }

      showMessage("#dashboardMessage", "Sending student emails...", false);
      try {
        const payload = await apiPost("../api/admin/email-students.php", { title, description });
        const sentCount = Number(payload.data?.sentCount || 0);
        const failedCount = Number(payload.data?.failedCount || 0);
        showMessage("#dashboardMessage", `Email broadcast completed. Sent: ${sentCount}, Failed: ${failedCount}.`, false);
      } catch (error) {
        showMessage("#dashboardMessage", error.message || "Unable to send emails.", true);
      }
    });
  }

  async function initProtectedPages() {
    const pageName = getPageName();
    if (!pageName) {
      return;
    }

    const authenticated = await ensureAdminAuth(true);
    if (!authenticated) {
      return;
    }

    setupLogout();

    try {
      await initSummaryPage();
      await initStudentsPage();
      await initExpertsPage();
      await initPostsPage();
      await initRatingsPage();
      await initNotificationsPage();
      await initEmailsPage();
    } catch (error) {
      showMessage("#dashboardMessage", error.message || "Unable to load page data.", true);
    }
  }

  initLoginPage().then((isLoginPage) => {
    if (!isLoginPage) {
      initProtectedPages();
    }
  });
})();
