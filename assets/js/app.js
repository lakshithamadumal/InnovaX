(() => {
  const templateCache = new Map();
  const state = {
    notificationCount: 4,
    posts: [],
    postTemplate: "",
    commentSectionTemplate: "",
    followStats: {
      me: { followers: 3200, following: 128 },
      sofia: { followers: 18400, following: 612 },
      marcus: { followers: 5400, following: 410 },
      layla: { followers: 9100, following: 380 },
      james: { followers: 7600, following: 290 }
    },
    followingUsers: new Set(["layla", "james"]),
    chatUser: "sofia",
    chats: {
      sofia: [
        { from: "them", text: "I reviewed your prototype deck. Strong opening." },
        { from: "me", text: "Thanks. Want to co-author a short article on it?" },
        { from: "them", text: "Absolutely. Share your outline and I can expand it." }
      ],
      marcus: [
        { from: "them", text: "Your hardware notes were useful." },
        { from: "me", text: "Great. I can send the calibration checklist too." }
      ],
      layla: [
        { from: "them", text: "Can you test the new UX flow on mobile?" },
        { from: "me", text: "Yes, I will send annotated feedback tonight." }
      ]
    }
  };

  const ratingCopy = {
    1: "Needs major work",
    2: "Early stage potential",
    3: "Solid concept",
    4: "Strong and promising",
    5: "Exceptional innovation"
  };

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
    }, 2600);
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
      let html = "";

      try {
        html = await fetchText(componentPath);
      } catch (error) {
        placeholder.innerHTML = `<div class=\"card sidebar-section\"><p class=\"section-note\">Unable to load component: ${escapeHtml(componentName)}</p></div>`;
        continue;
      }

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
    }
  }

  async function loadPostTemplates() {
    state.postTemplate = await fetchText("components/post-card.html");
    state.commentSectionTemplate = await fetchText("components/comment-section.html");
  }

  async function loadPostsData() {
    try {
      const response = await fetch("data/posts.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load posts data");
      }
      const posts = await response.json();
      state.posts = Array.isArray(posts) ? posts : [];
    } catch (error) {
      state.posts = [];
    }
  }

  function renderReply(reply) {
    return `
      <div class="reply-item">
        <div class="avatar" style="background:${escapeHtml(reply.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)")}">${escapeHtml(reply.initials || "IN")}</div>
        <div class="comment-bubble">
          <div class="c-name">${escapeHtml(reply.name || "InnovaX Member")}</div>
          <div class="c-text">${escapeHtml(reply.text || "")}</div>
          <div class="c-time">${escapeHtml(reply.time || "Now")}</div>
        </div>
      </div>
    `;
  }

  function renderComment(comment, postId) {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    const repliesHtml = replies.map(renderReply).join("");

    return `
      <div class="comment-item" data-comment-id="${escapeHtml(comment.id || `${postId}-c`)}">
        <div class="avatar" style="background:${escapeHtml(comment.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)")}">${escapeHtml(comment.initials || "IN")}</div>
        <div class="comment-thread-wrap">
          <div class="comment-bubble">
            <div class="c-name">${escapeHtml(comment.name || "InnovaX Member")}</div>
            <div class="c-text">${escapeHtml(comment.text || "")}</div>
            <div class="c-time">${escapeHtml(comment.time || "Now")}</div>
          </div>
          <div class="comment-thread-actions">
            <button class="reply-toggle" type="button" data-reply-toggle data-post-id="${escapeHtml(postId)}">Reply</button>
          </div>
          <div class="reply-composer" data-reply-composer>
            <input type="text" placeholder="Write a reply..." data-reply-input data-post-id="${escapeHtml(postId)}" />
            <button type="button" class="reply-send" data-reply-send data-post-id="${escapeHtml(postId)}">Send</button>
          </div>
          <div class="reply-list" data-reply-list>${repliesHtml}</div>
        </div>
      </div>
    `;
  }

  function buildPostCard(post) {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];

    const tagsHtml = tags
      .map((tag) => `<span class=\"tag\">${escapeHtml(tag)}</span>`)
      .join("");

    const mediaHtml = post.media
      ? `
        <div class=\"post-media\">
          <div class=\"post-media-inner\">
            <span style=\"font-size:3.5rem\">${escapeHtml(post.media.emoji || "💡")}</span>
            <p>${escapeHtml(post.media.label || "Innovation Asset")}</p>
          </div>
        </div>
      `
      : "";

    const commentsHtml = comments.map((comment) => renderComment(comment, post.id)).join("");
    const commentSection = applyTemplate(state.commentSectionTemplate, {
      id: escapeHtml(post.id),
      comments: commentsHtml
    });

    const card = applyTemplate(state.postTemplate, {
      id: escapeHtml(post.id),
      avatarColor: escapeHtml(post.avatarColor || "linear-gradient(135deg,#4E73DF,#6f8ee8)"),
      avatar: escapeHtml(post.avatar || "IN"),
      name: escapeHtml(post.name || "InnovaX Member"),
      role: escapeHtml(post.role || "Community Member"),
      time: escapeHtml(post.time || "Now"),
      title: escapeHtml(post.title || "Untitled innovation"),
      desc: escapeHtml(post.desc || ""),
      tags: tagsHtml,
      media: mediaHtml,
      likes: escapeHtml(post.likes ?? 0),
      commentCountText: `${comments.length} comment${comments.length === 1 ? "" : "s"}`,
      commentSection
    });

    return card;
  }

  function getPostsForStream(streamType) {
    const allPosts = [...state.posts];

    switch (streamType) {
      case "saved":
        return allPosts.filter((post) => post.saved);
      case "profile":
        return allPosts.slice(0, 3);
      case "user":
        return allPosts.slice(1, 4);
      case "company":
        return allPosts.filter((post) => post.companyOwned);
      case "post-view-related":
        return allPosts.slice(0, 2);
      default:
        return allPosts;
    }
  }

  function renderPostStreams() {
    const streams = Array.from(document.querySelectorAll("[data-post-stream]"));

    streams.forEach((stream) => {
      const streamType = stream.dataset.postStream || "feed";
      const streamPosts = getPostsForStream(streamType);

      if (!streamPosts.length) {
        stream.innerHTML = `
          <div class="card empty-state">
            <i class="fas fa-folder-open"></i>
            <p>No posts available in this view yet.</p>
          </div>
        `;
        return;
      }

      stream.innerHTML = streamPosts.map((post) => buildPostCard(post)).join("");
    });
  }

  function updateNotificationBadge() {
    const badges = Array.from(document.querySelectorAll("#notif-badge"));
    badges.forEach((badge) => {
      badge.textContent = String(state.notificationCount);
      badge.style.display = state.notificationCount > 0 ? "flex" : "none";
    });
  }

  function changeNotification(delta) {
    state.notificationCount = Math.max(0, state.notificationCount + delta);
    updateNotificationBadge();
  }

  function formatCompact(value) {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }

  function renderFollowCounts() {
    const nodes = Array.from(document.querySelectorAll("[data-follow-count]"));
    nodes.forEach((node) => {
      const user = node.dataset.user;
      const type = node.dataset.type;
      const userStats = state.followStats[user];
      if (!userStats || !(type in userStats)) {
        return;
      }

      node.textContent = formatCompact(userStats[type]);
    });
  }

  function syncFollowButtons() {
    const followButtons = Array.from(document.querySelectorAll("[data-follow-btn][data-target-user]"));

    followButtons.forEach((button) => {
      const targetUser = button.dataset.targetUser;
      const isFollowing = state.followingUsers.has(targetUser);
      const label = button.dataset.label || "Follow";
      const activeLabel = button.dataset.activeLabel || "Following";

      button.classList.toggle("following", isFollowing);
      button.textContent = isFollowing ? activeLabel : label;
    });
  }

  function setActiveNav() {
    const activeNav = document.body.dataset.activeNav || "";
    const navLinks = Array.from(document.querySelectorAll(".nav-link[data-nav]"));

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === activeNav);
    });
  }

  function initNavbar() {
    const navbar = document.getElementById("navbar");
    if (!navbar) {
      return;
    }

    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
    });

    const hamburger = document.getElementById("hamburger");
    const menu = document.getElementById("mobile-menu");

    if (hamburger && menu) {
      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("open");
        menu.classList.toggle("open");
      });

      menu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
          hamburger.classList.remove("open");
          menu.classList.remove("open");
        });
      });
    }

    const avatar = document.querySelector(".nav-avatar[data-route]");
    if (avatar) {
      avatar.addEventListener("click", () => {
        window.location.href = avatar.dataset.route;
      });
    }

    const notifLink = document.getElementById("notif-link");
    if (notifLink) {
      notifLink.addEventListener("click", (event) => {
        if (window.location.pathname.endsWith("notifications.html")) {
          event.preventDefault();
          showToast("You are already viewing notifications.");
        }
      });
    }
  }

  function parseTags(text) {
    if (!text.trim()) {
      return ["#Innovation"];
    }

    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  }

  function getPostStreamTarget() {
    return (
      document.querySelector("[data-post-stream='feed']") ||
      document.querySelector("[data-post-stream='profile']") ||
      document.querySelector("[data-post-stream='user']") ||
      document.querySelector("[data-post-stream='post-view-related']")
    );
  }

  function publishFromComposer(card) {
    const titleEl = card.querySelector("[data-create-title]");
    const descEl = card.querySelector("[data-create-desc]");
    const categoryEl = card.querySelector("[data-create-category]");
    const tagsEl = card.querySelector("[data-create-tags]");

    const title = (titleEl?.value || "").trim();
    const desc = (descEl?.value || "").trim();
    const category = categoryEl?.value || "Innovation";
    const tags = parseTags(tagsEl?.value || "");

    if (!title && !desc) {
      showToast("Please add a title or description first.");
      titleEl?.focus();
      return;
    }

    const newPost = {
      id: `new-${Date.now()}`,
      avatar: "AJ",
      avatarColor: "linear-gradient(135deg,#4E73DF,#6f8ee8)",
      name: "Alex Johnson",
      role: "Product Designer · InnovaX",
      time: "Just now",
      title: title || `New ${category} idea`,
      desc: desc || "Excited to share this innovation with the community.",
      tags,
      media: null,
      likes: 0,
      comments: []
    };

    const target = getPostStreamTarget();
    if (!target) {
      showToast("Post drafted. Feed preview is unavailable on this page.");
    } else {
      const html = buildPostCard(newPost);
      target.insertAdjacentHTML("afterbegin", html);
      const cardElement = target.firstElementChild;
      if (cardElement) {
        cardElement.classList.add("new-post-highlight");
        cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      showToast("Post published successfully.");
      changeNotification(1);
    }

    if (titleEl) titleEl.value = "";
    if (descEl) descEl.value = "";
    if (tagsEl) tagsEl.value = "";
  }

  function initCreatePostComposer() {
    const composers = Array.from(document.querySelectorAll("[data-create-post-card]"));

    composers.forEach((card) => {
      const trigger = card.querySelector("[data-open-editor]");
      const editor = card.querySelector("[data-post-editor]");

      if (trigger && editor) {
        trigger.addEventListener("focus", () => editor.classList.add("open"));
        trigger.addEventListener("click", () => editor.classList.add("open"));
      }

      const uploadButtons = Array.from(card.querySelectorAll("[data-upload-trigger]"));
      uploadButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const kind = button.dataset.uploadTrigger;
          const input = card.querySelector(`[data-upload-input='${kind}']`);
          input?.click();
        });
      });

      const uploadInputs = Array.from(card.querySelectorAll("[data-upload-input]"));
      uploadInputs.forEach((input) => {
        input.addEventListener("change", () => {
          if (input.files && input.files[0]) {
            showToast(`${input.files[0].name} attached.`);
          }
        });
      });

      const saveDraftButton = card.querySelector("[data-save-draft]");
      if (saveDraftButton) {
        saveDraftButton.addEventListener("click", () => {
          showToast("Draft saved locally.");
        });
      }

      const publishButton = card.querySelector("[data-publish-post]");
      if (publishButton) {
        publishButton.addEventListener("click", () => publishFromComposer(card));
      }
    });

    document.addEventListener("click", (event) => {
      composers.forEach((card) => {
        const editor = card.querySelector("[data-post-editor]");
        const title = card.querySelector("[data-create-title]");
        const desc = card.querySelector("[data-create-desc]");

        if (!editor || !editor.classList.contains("open")) {
          return;
        }

        if (!card.contains(event.target)) {
          const hasContent = Boolean((title?.value || "").trim() || (desc?.value || "").trim());
          if (!hasContent) {
            editor.classList.remove("open");
          }
        }
      });
    });
  }

  function addComment(postId, value, replyList = null) {
    const text = value.trim();
    if (!text) {
      return false;
    }

    if (replyList) {
      replyList.insertAdjacentHTML(
        "beforeend",
        renderReply({
          initials: "AJ",
          name: "Alex Johnson",
          text,
          time: "Just now",
          avatarColor: "linear-gradient(135deg,#4E73DF,#6f8ee8)"
        })
      );
      return true;
    }

    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) {
      return false;
    }

    list.insertAdjacentHTML(
      "beforeend",
      renderComment(
        {
          id: `${postId}-c-${Date.now()}`,
          initials: "AJ",
          name: "Alex Johnson",
          text,
          time: "Just now",
          avatarColor: "linear-gradient(135deg,#4E73DF,#6f8ee8)",
          replies: []
        },
        postId
      )
    );

    const card = document.getElementById(`post-${postId}`);
    if (card) {
      const commentsLink = card.querySelector(".comments-link");
      if (commentsLink) {
        const current = Number.parseInt(commentsLink.textContent, 10) || 0;
        const next = current + 1;
        commentsLink.textContent = `${next} comment${next === 1 ? "" : "s"}`;
      }
    }

    return true;
  }

  function initSearch() {
    const forms = Array.from(document.querySelectorAll("[data-search-form]"));
    forms.forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input");
        const value = (input?.value || "").trim();
        if (!value) {
          return;
        }

        const queryLabel = document.querySelector("[data-search-query]");
        if (queryLabel) {
          queryLabel.textContent = value;
        }
        showToast(`Showing results for ${value}`);
      });
    });
  }

  function renderChat() {
    const thread = document.querySelector("[data-chat-thread]");
    const messages = state.chats[state.chatUser] || [];

    if (!thread) {
      return;
    }

    thread.innerHTML = messages
      .map((message) => {
        return `<div class="chat-bubble ${message.from === "me" ? "sent" : "received"}">${escapeHtml(message.text)}</div>`;
      })
      .join("");

    thread.scrollTop = thread.scrollHeight;
  }

  function initMessages() {
    const chatRoot = document.querySelector("[data-chat-root]");
    if (!chatRoot) {
      return;
    }

    const users = Array.from(chatRoot.querySelectorAll("[data-chat-user]"));
    users.forEach((user) => {
      user.addEventListener("click", () => {
        users.forEach((entry) => entry.classList.remove("active"));
        user.classList.add("active");
        state.chatUser = user.dataset.chatUser;

        const title = document.querySelector("[data-chat-title]");
        if (title) {
          title.textContent = user.dataset.chatLabel || "Conversation";
        }

        renderChat();
      });
    });

    const input = chatRoot.querySelector("[data-chat-input]");
    const send = chatRoot.querySelector("[data-chat-send]");

    function sendMessage() {
      const text = (input?.value || "").trim();
      if (!text) {
        return;
      }

      if (!state.chats[state.chatUser]) {
        state.chats[state.chatUser] = [];
      }

      state.chats[state.chatUser].push({ from: "me", text });
      input.value = "";
      renderChat();

      setTimeout(() => {
        state.chats[state.chatUser].push({ from: "them", text: "Received. I will review and get back shortly." });
        renderChat();
        changeNotification(1);
      }, 700);
    }

    send?.addEventListener("click", sendMessage);
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        sendMessage();
      }
    });

    renderChat();
  }

  function initRatings() {
    const groups = Array.from(document.querySelectorAll("[data-rating-group]"));

    groups.forEach((group) => {
      const stars = Array.from(group.querySelectorAll("[data-rating-star]"));
      const output = group.querySelector("[data-rating-text]");

      stars.forEach((star) => {
        star.addEventListener("click", () => {
          const value = Number(star.dataset.ratingStar || 0);
          stars.forEach((item) => {
            const itemValue = Number(item.dataset.ratingStar || 0);
            item.classList.toggle("active", itemValue <= value);
          });

          if (output) {
            output.textContent = `${value}/5 - ${ratingCopy[value] || "Rated"}`;
          }

          showToast("Rating submitted.");
        });
      });
    });
  }

  function initEventDelegation() {
    document.addEventListener("click", (event) => {
      const likeBtn = event.target.closest("[data-like-btn]");
      if (likeBtn) {
        likeBtn.classList.toggle("liked");
        const card = likeBtn.closest("[data-post-id]");
        const countEl = card?.querySelector("[data-like-count]");
        if (countEl) {
          const current = Number.parseInt(countEl.textContent, 10) || 0;
          const delta = likeBtn.classList.contains("liked") ? 1 : -1;
          countEl.textContent = String(Math.max(0, current + delta));
          if (delta > 0) {
            changeNotification(1);
          }
        }
        return;
      }

      const commentToggle = event.target.closest("[data-comment-toggle]");
      if (commentToggle) {
        const postId = commentToggle.dataset.postId;
        const section = document.getElementById(`comments-${postId}`);
        if (section) {
          section.classList.toggle("open");
          if (section.classList.contains("open")) {
            const input = section.querySelector("[data-comment-input]");
            input?.focus();
          }
        }
        return;
      }

      const sendComment = event.target.closest("[data-comment-send]");
      if (sendComment) {
        const postId = sendComment.dataset.postId;
        const input = document.querySelector(`[data-comment-input][data-post-id='${postId}']`);
        if (input && addComment(postId, input.value)) {
          input.value = "";
          changeNotification(1);
          showToast("Comment posted.");
        }
        return;
      }

      const replyToggle = event.target.closest("[data-reply-toggle]");
      if (replyToggle) {
        const thread = replyToggle.closest(".comment-thread-wrap");
        const composer = thread?.querySelector("[data-reply-composer]");
        if (composer) {
          composer.classList.toggle("open");
          if (composer.classList.contains("open")) {
            composer.querySelector("[data-reply-input]")?.focus();
          }
        }
        return;
      }

      const replySend = event.target.closest("[data-reply-send]");
      if (replySend) {
        const thread = replySend.closest(".comment-thread-wrap");
        const input = thread?.querySelector("[data-reply-input]");
        const replyList = thread?.querySelector("[data-reply-list]");

        if (input && replyList && addComment(replySend.dataset.postId, input.value, replyList)) {
          input.value = "";
          changeNotification(1);
          showToast("Reply added.");
        }
        return;
      }

      const saveBtn = event.target.closest("[data-save-btn]");
      if (saveBtn) {
        saveBtn.classList.toggle("saved");
        showToast(saveBtn.classList.contains("saved") ? "Saved to your collection." : "Removed from saved posts.");
        return;
      }

      const shareBtn = event.target.closest("[data-share-btn]");
      if (shareBtn) {
        showToast("Post link copied.");
        return;
      }

      const followBtn = event.target.closest("[data-follow-btn], .follow-btn");
      if (followBtn) {
        const targetUser = followBtn.dataset.targetUser;

        if (targetUser) {
          const isFollowing = state.followingUsers.has(targetUser);

          if (isFollowing) {
            state.followingUsers.delete(targetUser);
            if (state.followStats.me) {
              state.followStats.me.following = Math.max(0, state.followStats.me.following - 1);
            }
            if (state.followStats[targetUser]) {
              state.followStats[targetUser].followers = Math.max(0, state.followStats[targetUser].followers - 1);
            }
            showToast("Unfollowed.");
          } else {
            state.followingUsers.add(targetUser);
            if (state.followStats.me) {
              state.followStats.me.following += 1;
            }
            if (state.followStats[targetUser]) {
              state.followStats[targetUser].followers += 1;
            }
            showToast(followBtn.dataset.label === "Follow Back" ? "Followed back." : "Following now.");
          }

          syncFollowButtons();
          renderFollowCounts();
          return;
        }

        followBtn.classList.toggle("following");
        const label = followBtn.dataset.label || "Follow";
        const activeLabel = followBtn.dataset.activeLabel || "Following";
        followBtn.textContent = followBtn.classList.contains("following") ? activeLabel : label;
        showToast(followBtn.classList.contains("following") ? `${activeLabel} enabled.` : `${label} removed.`);
        return;
      }

      const requestAction = event.target.closest("[data-request-action]");
      if (requestAction) {
        const row = requestAction.closest(".request-item");
        row?.classList.add("resolved");
        showToast(`Request ${requestAction.dataset.requestAction}ed.`);
        return;
      }

      const notificationItem = event.target.closest("[data-notification-item]");
      if (notificationItem && !notificationItem.classList.contains("read")) {
        notificationItem.classList.add("read");
        changeNotification(-1);
        return;
      }

      const markAllRead = event.target.closest("[data-mark-all-read]");
      if (markAllRead) {
        document.querySelectorAll("[data-notification-item]").forEach((item) => item.classList.add("read"));
        state.notificationCount = 0;
        updateNotificationBadge();
        showToast("All notifications marked as read.");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      const input = event.target.closest("[data-comment-input]");
      if (input) {
        const postId = input.dataset.postId;
        if (addComment(postId, input.value)) {
          input.value = "";
          changeNotification(1);
          showToast("Comment posted.");
        }
        event.preventDefault();
        return;
      }

      const replyInput = event.target.closest("[data-reply-input]");
      if (replyInput) {
        const thread = replyInput.closest(".comment-thread-wrap");
        const list = thread?.querySelector("[data-reply-list]");
        const postId = replyInput.dataset.postId;

        if (list && addComment(postId, replyInput.value, list)) {
          replyInput.value = "";
          changeNotification(1);
          showToast("Reply added.");
        }
        event.preventDefault();
      }
    });
  }

  async function init() {
    await mountComponents();
    syncFollowButtons();
    renderFollowCounts();
    initNavbar();
    setActiveNav();
    updateNotificationBadge();
    initSearch();

    await loadPostTemplates();
    await loadPostsData();
    renderPostStreams();

    initCreatePostComposer();
    initEventDelegation();
    initMessages();
    initRatings();

    window.showToast = showToast;
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(() => {
      showToast("Some UI modules could not initialize.");
    });
  });
})();
