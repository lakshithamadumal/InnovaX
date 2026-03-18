    /* ====================================================
       SAMPLE POST DATA
    ==================================================== */
    const samplePosts = [
      {
        id: 1,
        avatar: 'SR',
        avatarColor: 'linear-gradient(135deg,#1CC88A,#17a673)',
        name: 'Sofia Rivera',
        role: 'AI Researcher · MIT',
        time: '2h ago',
        title: '🧠 Using GPT-4 Vision to Diagnose Rare Diseases',
        desc: 'We integrated GPT-4 Vision into a diagnostic pipeline for rare dermatological conditions. The model achieved 94% accuracy on a 2,000-sample dataset — outperforming our previous CNN baseline by 12%. This opens a real path to AI-assisted diagnostics in low-resource clinics.',
        tags: ['#AIHealth', '#GPT4', '#MedTech', '#Innovation'],
        media: { emoji: '🔬', label: 'AI Diagnostic Pipeline' },
        likes: 247,
        comments: [
          { name: 'Alex J.', avatarColor: 'linear-gradient(135deg,#4E73DF,#6f8ee8)', initials: 'AJ', text: 'Incredible work, Sofia! The accuracy improvement is remarkable.', time: '1h ago' },
          { name: 'Marcus Kim', avatarColor: 'linear-gradient(135deg,#E74A3B,#c0392b)', initials: 'MK', text: 'Would love to see the dataset breakdown. Open source?', time: '55m ago' }
        ]
      },
      {
        id: 2,
        avatar: 'MK',
        avatarColor: 'linear-gradient(135deg,#E74A3B,#c0392b)',
        name: 'Marcus Kim',
        role: 'Robotics Engineer · Seoul',
        time: '5h ago',
        title: '🤖 Building a Soft Robot That Feels Pain',
        desc: 'Our lab just published our soft-robotic sensor array that mimics human nociception — the perception of pain. The robot can detect damage before failure, extending operational life by 40x. We\'re exploring applications in surgery assistance and disaster response.',
        tags: ['#Robotics', '#SoftRobotics', '#AI', '#Engineering'],
        media: { emoji: '🦾', label: 'Soft Robotic Prototype' },
        likes: 183,
        comments: [
          { name: 'Layla Patel', avatarColor: 'linear-gradient(135deg,#F6C23E,#e0a800)', initials: 'LP', text: 'The implications for surgical robots are huge. Amazing research!', time: '4h ago' }
        ]
      },
      {
        id: 3,
        avatar: 'LP',
        avatarColor: 'linear-gradient(135deg,#F6C23E,#e0a800)',
        name: 'Layla Patel',
        role: 'UX Innovator · Google',
        time: '1d ago',
        title: '🎨 Designing for Neurodiversity: A New UX Framework',
        desc: 'After 18 months of research with 500+ neurodivergent users, we\'ve released our open-source UX framework "NeuroCraft". It provides adaptive layouts, distraction-free modes, and sensory-friendly palettes. Accessibility isn\'t a feature — it\'s the foundation.',
        tags: ['#UXDesign', '#Accessibility', '#Neurodiversity', '#OpenSource'],
        media: null,
        likes: 312,
        comments: []
      },
      {
        id: 4,
        avatar: 'JW',
        avatarColor: 'linear-gradient(135deg,#4E73DF,#6f8ee8)',
        name: 'James Webb',
        role: 'CleanTech Founder · Berlin',
        time: '2d ago',
        title: '⚡ We Just Broke the 50% Efficiency Barrier for Perovskite Solar',
        desc: 'After 3 years in stealth, our team at LumenCell is proud to announce a 51.2% energy conversion efficiency on multi-junction perovskite cells. This is a world record. We\'re aiming to commercialize at $0.008/kWh — cheaper than any fossil fuel on earth.',
        tags: ['#CleanTech', '#SolarEnergy', '#GreenInnovation', '#Perovskite'],
        media: { emoji: '☀️', label: 'LumenCell Solar Array' },
        likes: 891,
        comments: [
          { name: 'Sofia Rivera', avatarColor: 'linear-gradient(135deg,#1CC88A,#17a673)', initials: 'SR', text: 'This is HUGE! Congratulations to the whole LumenCell team! 🎉', time: '1d ago' },
          { name: 'Alex J.', avatarColor: 'linear-gradient(135deg,#4E73DF,#6f8ee8)', initials: 'AJ', text: 'The 51.2% figure is jaw-dropping. When can we expect a whitepaper?', time: '22h ago' }
        ]
      }
    ];


    /* ====================================================
       RENDER POSTS
    ==================================================== */
    function renderPosts(posts) {
      const container = document.getElementById('posts-container');
      posts.forEach((post, i) => {
        const card = buildPostCard(post);
        card.style.animationDelay = `${i * 0.08}s`;
        container.appendChild(card);
      });
    }

    function buildPostCard(post) {
      const card = document.createElement('div');
      card.className = 'card post-card fade-in-card';
      card.id = `post-${post.id}`;

      // Build tags HTML
      const tagsHtml = post.tags.map(t =>
        `<span class="tag" onclick="showToast('Searching for ${t}…')">${t}</span>`
      ).join('');

      // Build media HTML
      const mediaHtml = post.media
        ? `<div class="post-media">
             <div class="post-media-inner">
               <span style="font-size:3.5rem">${post.media.emoji}</span>
               <p>${post.media.label}</p>
             </div>
           </div>`
        : '';

      // Build comments HTML
      const commentsHtml = post.comments.map(c =>
        `<div class="comment-item">
           <div class="avatar" style="background:${c.avatarColor}">${c.initials}</div>
           <div class="comment-bubble">
             <div class="c-name">${c.name}</div>
             <div class="c-text">${c.text}</div>
             <div class="c-time">${c.time}</div>
           </div>
         </div>`
      ).join('');

      const commentCount = post.comments.length;
      const likeCount   = post.likes;

      card.innerHTML = `
        <!-- Header -->
        <div class="post-header">
          <div class="avatar" style="background:${post.avatarColor}" onclick="showToast('Opening ${post.name}'s profile…')">${post.avatar}</div>
          <div class="user-info">
            <span class="user-name" onclick="showToast('Opening ${post.name}'s profile…')">${post.name}</span>
            <div class="user-role">${post.role}</div>
          </div>
          <span class="post-time">${post.time}</span>
          <button class="post-more-btn" onclick="showToast('More options…')"><i class="fas fa-ellipsis-h"></i></button>
        </div>

        <!-- Content -->
        <div class="post-title">${post.title}</div>
        <div class="post-desc">${post.desc}</div>
        <div class="post-tags">${tagsHtml}</div>
        ${mediaHtml}

        <!-- Stats bar -->
        <div class="post-stats">
          <div class="likes-count">
            <div class="like-icon-small"><i class="fas fa-heart"></i></div>
            <span class="likes-num">${likeCount}</span>
          </div>
          <span class="comments-link" onclick="toggleComments(${post.id})">
            ${commentCount} comment${commentCount !== 1 ? 's' : ''}
          </span>
        </div>

        <!-- Action buttons -->
        <div class="post-actions">
          <button class="action-btn like-btn" onclick="toggleLike(this, ${post.id})">
            <i class="fas fa-heart"></i> <span>Like</span>
          </button>
          <button class="action-btn comment-btn" onclick="toggleComments(${post.id})">
            <i class="fas fa-comment"></i> <span>Comment</span>
          </button>
          <button class="action-btn share-btn" onclick="showToast('Post link copied! 🔗')">
            <i class="fas fa-share"></i> <span>Share</span>
          </button>
          <button class="action-btn save-btn" onclick="toggleSave(this)">
            <i class="fas fa-bookmark"></i> <span>Save</span>
          </button>
        </div>

        <!-- Comments section -->
        <div class="comments-section" id="comments-${post.id}">
          <div class="comment-input-row">
            <div class="avatar" style="background:linear-gradient(135deg,#4E73DF,#6f8ee8);width:34px;height:34px;font-size:.7rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">AJ</div>
            <div class="comment-input-wrap">
              <input type="text" placeholder="Write a comment…" id="comment-input-${post.id}" onkeydown="handleCommentKey(event, ${post.id})" />
              <button class="comment-send-btn" onclick="addComment(${post.id})">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
          <div class="comments-list" id="comments-list-${post.id}">
            ${commentsHtml}
          </div>
        </div>
      `;

      return card;
    }


    /* ====================================================
       LIKE TOGGLE
    ==================================================== */
    function toggleLike(btn, postId) {
      btn.classList.toggle('liked');
      const card   = document.getElementById(`post-${postId}`);
      const numEl  = card.querySelector('.likes-num');
      let count    = parseInt(numEl.textContent);

      if (btn.classList.contains('liked')) {
        numEl.textContent = count + 1;
        showToast('❤️ You liked this post!');
      } else {
        numEl.textContent = count - 1;
      }
    }


    /* ====================================================
       COMMENT TOGGLE + ADD
    ==================================================== */
    function toggleComments(postId) {
      const section = document.getElementById(`comments-${postId}`);
      section.classList.toggle('open');
      if (section.classList.contains('open')) {
        const input = document.getElementById(`comment-input-${postId}`);
        setTimeout(() => input && input.focus(), 50);
      }
    }

    function handleCommentKey(e, postId) {
      if (e.key === 'Enter') addComment(postId);
    }

    function addComment(postId) {
      const input   = document.getElementById(`comment-input-${postId}`);
      const text    = input.value.trim();
      if (!text) return;

      const list    = document.getElementById(`comments-list-${postId}`);
      const now     = 'Just now';

      const item    = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `
        <div class="avatar" style="background:linear-gradient(135deg,#4E73DF,#6f8ee8);width:32px;height:32px;font-size:.65rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">AJ</div>
        <div class="comment-bubble">
          <div class="c-name">Alex Johnson</div>
          <div class="c-text">${escapeHtml(text)}</div>
          <div class="c-time">${now}</div>
        </div>
      `;
      list.appendChild(item);
      input.value = '';

      // Update comment count in stats bar
      const card       = document.getElementById(`post-${postId}`);
      const statsLink  = card.querySelector('.comments-link');
      const currentNum = parseInt(statsLink.textContent) || 0;
      const newNum     = currentNum + 1;
      statsLink.textContent = `${newNum} comment${newNum !== 1 ? 's' : ''}`;

      showToast('💬 Comment posted!');
    }


    /* ====================================================
       SAVE TOGGLE
    ==================================================== */
    function toggleSave(btn) {
      btn.classList.toggle('saved');
      if (btn.classList.contains('saved')) {
        btn.querySelector('i').style.color = 'var(--accent-dark)';
        showToast('🔖 Post saved!');
      } else {
        btn.querySelector('i').style.color = '';
        showToast('Removed from saved posts');
      }
    }


    /* ====================================================
       CREATE POST
    ==================================================== */
    let postIdCounter = 100;

    function expandPostEditor() {
      const editor = document.getElementById('post-editor');
      const input  = document.getElementById('post-input');
      if (!editor.classList.contains('open')) {
        editor.classList.add('open');
        input.blur();
        setTimeout(() => {
          document.getElementById('post-title-input').focus();
        }, 50);
      }
    }

    function createPost() {
      const title   = document.getElementById('post-title-input').value.trim();
      const desc    = document.getElementById('post-desc-input').value.trim();
      const tagsRaw = document.getElementById('post-tags-input').value.trim();

      if (!title && !desc) {
        showToast('⚠️ Please add a title or description.');
        document.getElementById('post-title-input').focus();
        return;
      }

      // Parse tags
      const tags = tagsRaw
        ? tagsRaw.split(/\s+/).filter(t => t).map(t => t.startsWith('#') ? t : '#' + t)
        : ['#Innovation'];

      postIdCounter++;
      const newPost = {
        id: postIdCounter,
        avatar: 'AJ',
        avatarColor: 'linear-gradient(135deg,#4E73DF,#6f8ee8)',
        name: 'Alex Johnson',
        role: 'Product Designer · San Francisco, CA',
        time: 'Just now',
        title: title || '💡 New Innovation',
        desc: desc || 'Excited to share this new idea with the InnovaX community!',
        tags: tags,
        media: null,
        likes: 0,
        comments: []
      };

      const container = document.getElementById('posts-container');
      const card      = buildPostCard(newPost);
      card.classList.add('new-post-highlight');
      container.insertBefore(card, container.firstChild);

      // Reset form
      document.getElementById('post-title-input').value = '';
      document.getElementById('post-desc-input').value  = '';
      document.getElementById('post-tags-input').value  = '';
      document.getElementById('post-input').value       = '';
      document.getElementById('post-editor').classList.remove('open');

      showToast('🚀 Post published successfully!');

      // Scroll to new post
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }


    /* ====================================================
       NAVBAR SCROLL EFFECT
    ==================================================== */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    });


    /* ====================================================
       HAMBURGER / MOBILE MENU
    ==================================================== */
    const hamburger   = document.getElementById('hamburger');
    const mobileMenu  = document.getElementById('mobile-menu');

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
      });
    });


    /* ====================================================
       NOTIFICATION BADGE
    ==================================================== */
    const notifLink  = document.getElementById('notif-link');
    const notifBadge = document.getElementById('notif-badge');

    notifLink.addEventListener('click', (e) => {
      e.preventDefault();
      notifBadge.style.display = notifBadge.style.display === 'none' ? 'flex' : 'none';
      const msg = notifBadge.style.display === 'none'
        ? '🔔 Notifications marked as read'
        : '🔔 You have new notifications!';
      showToast(msg);
    });


    /* ====================================================
       ACTIVE NAV LINK
    ==================================================== */
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        if (this.closest('#mobile-menu')) return;
        document.querySelectorAll('.nav-links .nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      });
    });


    /* ====================================================
       FOLLOW TOGGLE
    ==================================================== */
    function toggleFollow(btn) {
      if (btn.classList.contains('following')) {
        btn.classList.remove('following');
        btn.textContent = 'Follow';
        showToast('Unfollowed');
      } else {
        btn.classList.add('following');
        btn.textContent = 'Following';
        showToast('✅ Following! You\'ll see their posts in your feed.');
      }
    }


    /* ====================================================
       TOAST NOTIFICATION
    ==================================================== */
    let toastTimer;
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }


    /* ====================================================
       UTILITY: Escape HTML
    ==================================================== */
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }


    /* ====================================================
       SHIMMER → REAL POSTS
    ==================================================== */
    window.addEventListener('DOMContentLoaded', () => {
      // Simulate loading delay
      setTimeout(() => {
        document.getElementById('shimmer1').remove();
        document.getElementById('shimmer2').remove();
        renderPosts(samplePosts);
      }, 1400);
    });

    /* Close post editor when clicking outside */
    document.addEventListener('click', (e) => {
      const editor      = document.getElementById('post-editor');
      const postInput   = document.getElementById('post-input');
      const createCard  = document.querySelector('.create-post');
      if (!createCard.contains(e.target) && editor.classList.contains('open')) {
        const hasContent =
          document.getElementById('post-title-input').value.trim() ||
          document.getElementById('post-desc-input').value.trim();
        if (!hasContent) {
          editor.classList.remove('open');
        }
      }
    });

