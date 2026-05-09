/* ==================== API Layer ==================== */
const API = {
    token: localStorage.getItem("token") || null,
    user: (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })(),

    headers() {
        const h = {};
        if (this.token) h["Authorization"] = `Bearer ${this.token}`;
        return h;
    },

    async request(method, url, body = null, isForm = false) {
        const opts = { method, headers: this.headers() };
        if (isForm) { opts.body = body; }
        else if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
        const res = await fetch(url, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        return data;
    },

    register(username, password) { return this.request("POST", "/api/register", { username, password }, false); },
    login(username, password) { return this.request("POST", "/api/login", { username, password }, false); },
    createMood(formData) { return this.request("POST", "/api/moods", formData, true); },
    getMoods(page, mood = "") { return this.request("GET", `/api/moods?page=${page}&per_page=15&mood=${mood}`); },
    getMyMoods(page) { return this.request("GET", `/api/moods/my?page=${page}&per_page=15`); },
    getUserMoods(userId, page) { return this.request("GET", `/api/moods/user/${userId}?page=${page}&per_page=15`); },
    deleteMood(id) { return this.request("DELETE", `/api/moods/${id}`); },
    getStats() { return this.request("GET", "/api/stats"); },

    // Profile
    getProfile(userId) { return this.request("GET", `/api/profile/${userId}`); },
    updateProfile(bio) { return this.request("PUT", "/api/profile", { bio }); },

    // Families
    createFamily(name, desc) { return this.request("POST", "/api/families", { name, description: desc }); },
    joinFamily(code) { return this.request("POST", "/api/families/join", { invite_code: code }); },
    getMyFamilies() { return this.request("GET", "/api/families/my"); },
    getFamilyDetail(id) { return this.request("GET", `/api/families/${id}`); },
    getFamilyMoods(id, page) { return this.request("GET", `/api/families/${id}/moods?page=${page}&per_page=15`); },
    leaveFamily(id) { return this.request("POST", `/api/families/${id}/leave`); },
    disbandFamily(id) { return this.request("DELETE", `/api/families/${id}`); },

    // Friends
    sendFriendRequest(userId) { return this.request("POST", `/api/friends/request/${userId}`); },
    respondFriendRequest(reqId, action) { return this.request("POST", `/api/friends/respond/${reqId}`, { action }); },
    getFriendRequests() { return this.request("GET", "/api/friends/requests"); },
    getFriends() { return this.request("GET", "/api/friends"); },
    getFriendsMoods(page) { return this.request("GET", `/api/friends/moods?page=${page}&per_page=15`); },
    removeFriend(id) { return this.request("DELETE", `/api/friends/remove/${id}`); },
};

/* ==================== Constants ==================== */
const MOODS = {
    happy:   { emoji: "😊", name: "开心" },
    calm:    { emoji: "😌", name: "平静" },
    sad:     { emoji: "😢", name: "难过" },
    anxious: { emoji: "😰", name: "焦虑" },
    excited: { emoji: "🤩", name: "兴奋" },
    tired:   { emoji: "😴", name: "疲惫" },
};

/* ==================== Utilities ==================== */
function toast(msg, isError) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast " + (isError ? "error" : "") + " show";
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2800);
}
function formatTime(iso) {
    const d = new Date(iso), now = new Date(), diff = now - d;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 604800000) return Math.floor(diff / 86400000) + " 天前";
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function avaClass(s) { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return "avatar-" + (Math.abs(h) % 8); }
function imgUrl(filename) { return filename ? `/api/uploads/${filename}` : ""; }

/* ==================== Navigation ==================== */
let currentView = "";
let currentPageData = {};

function updateSidebar() {
    const nav = document.getElementById("sidebar-nav");
    const userDiv = document.getElementById("sidebar-user");
    const postBtn = document.getElementById("sidebar-post-btn");
    if (!nav) return;

    if (API.token && API.user) {
        postBtn.style.display = "";
        postBtn.onclick = () => { navigate("feed"); setTimeout(() => document.getElementById("mood-textarea")?.focus(), 100); };
        nav.innerHTML = `
            <a data-view="feed"><span class="nav-icon">🏠</span> <span>首页</span></a>
            <a data-view="friends"><span class="nav-icon">👥</span> <span>好友</span></a>
            <a data-view="families"><span class="nav-icon">👨‍👩‍👧</span> <span>家庭</span></a>
            <a data-view="profile" data-user-id="${API.user.id}"><span class="nav-icon">👤</span> <span>个人</span></a>
            <a data-view="stats"><span class="nav-icon">📊</span> <span>统计</span></a>
        `;
        const ava = avaClass(API.user.username);
        userDiv.innerHTML = `
            <div class="avatar ${ava}">${esc(API.user.username[0].toUpperCase())}</div>
            <div class="user-info">
                <div class="uname">${esc(API.user.username)}</div>
                <div class="uhandle">@${esc(API.user.username)}</div>
            </div>
        `;
        userDiv.onclick = () => navigate("profile", { userId: API.user.id });
    } else {
        postBtn.style.display = "none";
        nav.innerHTML = "";
        userDiv.innerHTML = "";
    }

    nav.querySelectorAll("a").forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            const view = a.dataset.view;
            const userId = a.dataset.userId ? parseInt(a.dataset.userId) : null;
            navigate(view, { userId });
        };
    });
}

function navigate(view, data = {}) {
    currentView = view;
    currentPageData = data;
    document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
    const activeLink = document.querySelector(`.sidebar-nav a[data-view="${view}"]`);
    if (activeLink) activeLink.classList.add("active");

    const app = document.getElementById("app");
    const rightPanel = document.getElementById("right-panel");

    switch (view) {
        case "login": renderAuth(app); renderRightEmpty(rightPanel); break;
        case "feed": renderFeed(app); renderRightDefault(rightPanel); break;
        case "friends": renderFriends(app); renderRightEmpty(rightPanel); break;
        case "families": renderFamilies(app); renderRightEmpty(rightPanel); break;
        case "family-detail": renderFamilyDetail(app, data.groupId); renderRightEmpty(rightPanel); break;
        case "profile": renderProfile(app, data.userId || (API.user && API.user.id)); renderRightEmpty(rightPanel); break;
        case "stats": renderStats(app); renderRightEmpty(rightPanel); break;
        default: renderFeed(app); renderRightDefault(rightPanel);
    }
}

function renderRightEmpty(panel) { panel.innerHTML = ""; }
function renderRightDefault(panel) {
    panel.innerHTML = `
        <div class="right-card">
            <h3>📊 今日心情</h3>
            <div id="right-stats"><div class="spinner"></div></div>
        </div>
    `;
    loadRightStats();
}

async function loadRightStats() {
    const el = document.getElementById("right-stats");
    if (!el) return;
    try {
        const data = await API.getStats();
        const total = Object.values(data.mood_distribution).reduce((a, b) => a + b, 0) || 1;
        const colors = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };
        let html = "";
        for (const [mood, count] of Object.entries(data.mood_distribution)) {
            const pct = ((count / total) * 100).toFixed(1);
            html += `
                <div class="stat-row">
                    <span class="stat-emoji">${MOODS[mood].emoji}</span>
                    <div class="bar-mini"><div class="bar-mini-fill" style="width:${pct}%;background:${colors[mood]}"></div></div>
                    <span style="font-size:13px;width:32px;text-align:right">${count}</span>
                </div>`;
        }
        el.innerHTML = html;
    } catch { el.innerHTML = ""; }
}

/* ==================== Auth ==================== */
function renderAuth(app) {
    let mode = "login";
    function html() {
        return `
        <div class="auth-container">
            <div class="auth-card">
                <div class="logo">🌈</div>
                <h2>${mode === "login" ? "欢迎回来" : "创建账号"}</h2>
                <p class="subtitle">${mode === "login" ? "登录心情日记" : "加入心情日记社区"}</p>
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" id="auth-username" placeholder="请输入用户名" maxlength="20" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="auth-password" placeholder="请输入密码" autocomplete="${mode==="login"?"current-password":"new-password"}">
                </div>
                <button class="btn btn-primary btn-lg" id="auth-submit">${mode==="login"?"登 录":"注 册"}</button>
                <div class="auth-switch">${mode==="login"?"还没有账号？":"已有账号？"} <a id="auth-switch-link">${mode==="login"?"立即注册":"立即登录"}</a></div>
            </div>
        </div>`;
    }
    app.innerHTML = html();

    document.getElementById("auth-switch-link").onclick = () => { mode = mode === "login" ? "register" : "login"; app.innerHTML = html(); bindAuth(); };
    bindAuth();

    function bindAuth() {
        document.getElementById("auth-submit").onclick = submit;
        document.getElementById("auth-username").onkeydown = e => { if (e.key === "Enter") document.getElementById("auth-password").focus(); };
        document.getElementById("auth-password").onkeydown = e => { if (e.key === "Enter") submit(); };
    }

    async function submit() {
        const username = document.getElementById("auth-username").value.trim();
        const password = document.getElementById("auth-password").value;
        if (!username || !password) { toast("请填写用户名和密码", true); return; }
        if (username.length < 2) { toast("用户名至少2个字符", true); return; }
        if (password.length < 4) { toast("密码至少4个字符", true); return; }
        const btn = document.getElementById("auth-submit");
        btn.disabled = true; btn.textContent = "处理中...";
        try {
            const res = mode === "login" ? await API.login(username, password) : await API.register(username, password);
            API.token = res.token;
            API.user = res.user;
            localStorage.setItem("token", res.token);
            localStorage.setItem("user", JSON.stringify(res.user));
            toast(res.message || "成功！");
            updateSidebar();
            navigate("feed");
        } catch (e) { toast(e.message, true); }
        btn.disabled = false; btn.textContent = mode === "login" ? "登 录" : "注 册";
    }
}

/* ==================== Mood Card ==================== */
function moodCardHTML(r, showDelete = false) {
    const m = MOODS[r.mood] || { emoji: "❓", name: r.mood };
    const ava = avaClass(r.username);
    const tagsHtml = r.tags && r.tags.length
        ? `<div class="mood-card-tags">${r.tags.map(t => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`).join(" ")}</div>`
        : "";
    const imgHtml = r.image
        ? `<img class="mood-card-image" src="${imgUrl(r.image)}" alt="图片" onclick="event.stopPropagation();openImageViewer('${imgUrl(r.image)}')" loading="lazy">`
        : "";
    const delBtn = showDelete
        ? `<button class="action-btn" title="删除" onclick="event.stopPropagation();deleteMoodCard(${r.id})">🗑️</button>`
        : "";
    return `
        <div class="mood-card">
            <div class="mood-card-header">
                <div class="avatar ${ava}" onclick="event.stopPropagation();navigate('profile',{userId:${r.user_id}})">${esc(r.username[0].toUpperCase())}</div>
                <div class="header-info">
                    <div class="header-row">
                        <span class="uname" onclick="event.stopPropagation();navigate('profile',{userId:${r.user_id}})">${esc(r.username)}</span>
                        <span class="mood-tag">${m.emoji} ${m.name}</span>
                        <span class="utime">· ${formatTime(r.created_at)}</span>
                    </div>
                </div>
            </div>
            <div class="mood-card-content">${esc(r.content)}</div>
            ${imgHtml}
            ${tagsHtml}
            <div class="mood-card-actions-row">${delBtn}</div>
        </div>`;
}

async function deleteMoodCard(id) {
    if (!confirm("确定删除这条心情记录吗？")) return;
    try {
        await API.deleteMood(id);
        toast("删除成功");
        // Re-render current
        if (currentView === "feed") navigate("feed");
        else if (currentView === "profile") navigate("profile", currentPageData);
    } catch (e) { toast(e.message, true); }
}

/* ==================== Feed ==================== */
let feedMode = "all";
let feedFamilyId = null;
let feedPage = 1;
let feedHasMore = true;
let feedLoading = false;

function renderFeed(app) {
    feedMode = "all";
    feedPage = 1;
    feedHasMore = true;
    feedFamilyId = null;
    app.innerHTML = `
        <div class="feed-tabs" id="feed-tabs">
            <div class="feed-tab active" data-mode="all">🌍 全部分享</div>
            <div class="feed-tab" data-mode="friends">👥 好友动态</div>
        </div>
        <div class="create-inline" id="create-inline">
            <div class="create-row">
                <div class="avatar ${avaClass(API.user.username)}">${esc(API.user.username[0].toUpperCase())}</div>
                <textarea id="mood-textarea" placeholder="今天心情如何？" maxlength="500"></textarea>
            </div>
            <div class="mood-selector" id="mood-selector"></div>
            <div id="image-preview-area"></div>
            <div class="create-actions">
                <div class="left-actions">
                    <input type="file" id="image-input" accept="image/*" style="display:none">
                    <button class="icon-btn" id="btn-add-image" title="添加图片">🖼️</button>
                    <span class="char-count"><span id="char-count">0</span>/500</span>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-submit">发布</button>
            </div>
        </div>
        <div id="feed-list"></div>
        <div id="feed-loader" style="display:none"><div class="spinner"></div></div>
    `;

    // Mood selector
    let selectedMood = "happy";
    const sel = document.getElementById("mood-selector");
    for (const [k, m] of Object.entries(MOODS)) {
        const el = document.createElement("span");
        el.className = "mood-option" + (k === "happy" ? " selected" : "");
        el.textContent = m.emoji + " " + m.name;
        el.onclick = () => { selectedMood = k; sel.querySelectorAll(".mood-option").forEach(o => o.classList.remove("selected")); el.classList.add("selected"); };
        sel.appendChild(el);
    }

    // Char count
    document.getElementById("mood-textarea").oninput = function() {
        document.getElementById("char-count").textContent = this.value.length;
    };

    // Image upload
    let imageFile = null;
    document.getElementById("btn-add-image").onclick = () => document.getElementById("image-input").click();
    document.getElementById("image-input").onchange = function() {
        imageFile = this.files[0];
        const preview = document.getElementById("image-preview-area");
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            preview.innerHTML = `<div class="image-preview-wrap"><img src="${url}" alt="preview"><button class="remove-img" id="remove-img">✕</button></div>`;
            document.getElementById("remove-img").onclick = () => { imageFile = null; preview.innerHTML = ""; document.getElementById("image-input").value = ""; };
        }
    };

    // Submit
    document.getElementById("btn-submit").onclick = async () => {
        const content = document.getElementById("mood-textarea").value.trim();
        if (!content) { toast("请写下心情描述", true); return; }
        const formData = new FormData();
        formData.append("mood", selectedMood);
        formData.append("content", content);
        const tags = [...document.querySelectorAll("#feed-list .tag")].map(t => t.dataset.tag).join(",");
        formData.append("tags", "");
        if (imageFile) formData.append("image", imageFile);
        const btn = document.getElementById("btn-submit");
        btn.disabled = true; btn.textContent = "发布中...";
        try {
            await API.createMood(formData);
            toast("✨ 发布成功！");
            document.getElementById("mood-textarea").value = "";
            document.getElementById("char-count").textContent = "0";
            document.getElementById("image-preview-area").innerHTML = "";
            document.getElementById("image-input").value = "";
            imageFile = null;
            feedPage = 1;
            loadFeed();
        } catch (e) { toast(e.message, true); }
        btn.disabled = false; btn.textContent = "发布";
    };

    // Tabs
    document.querySelectorAll("#feed-tabs .feed-tab").forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll("#feed-tabs .feed-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            feedMode = tab.dataset.mode;
            feedPage = 1;
            feedHasMore = true;
            loadFeed();
        };
    });

    loadFeed();

    // Infinite scroll
    window.onscroll = () => {
        if (feedLoading || !feedHasMore) return;
        if (currentView !== "feed") return;
        const scrollY = window.scrollY + window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        if (docH - scrollY < 300) {
            feedPage++;
            loadFeed(true);
        }
    };
}

async function loadFeed(append = false) {
    if (feedLoading) return;
    feedLoading = true;
    const list = document.getElementById("feed-list");
    const loader = document.getElementById("feed-loader");

    if (!append && list) list.innerHTML = '<div class="spinner"></div>';
    if (append && loader) loader.style.display = "block";

    try {
        let data;
        if (feedMode === "friends") {
            data = await API.getFriendsMoods(feedPage);
        } else {
            data = await API.getMoods(feedPage);
        }
        const recordsHtml = data.records.map(r => moodCardHTML(r, r.user_id === API.user?.id)).join("");

        if (append) {
            list.insertAdjacentHTML("beforeend", recordsHtml);
        } else {
            list.innerHTML = data.records.length === 0
                ? `<div class="empty-state"><div class="icon">📝</div><p>${feedMode === "friends" ? "关注好友后，这里会显示他们的心情" : "还没有心情记录"}</p></div>`
                : recordsHtml;
        }

        feedHasMore = data.page < data.pages;
        if (!feedHasMore && !append && data.records.length > 0) {
            list.insertAdjacentHTML("beforeend", '<div class="empty-state" style="padding:20px"><p style="color:var(--text-secondary)">— 已经到底了 —</p></div>');
        }
    } catch (e) {
        if (!append) list.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
    if (loader) loader.style.display = "none";
    feedLoading = false;
}

/* ==================== Friends ==================== */
function renderFriends(app) {
    app.innerHTML = `
        <div class="page-header">👥 好友</div>
        <div id="friend-content"><div class="spinner"></div></div>
    `;
    loadFriendContent();
}

async function loadFriendContent() {
    const container = document.getElementById("friend-content");
    try {
        const [requests, friends] = await Promise.all([API.getFriendRequests(), API.getFriends()]);
        let html = "";

        // Friend requests
        if (requests.length > 0) {
            html += `<div style="padding:16px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">待处理的请求 (${requests.length})</div>`;
            for (const req of requests) {
                const ava = avaClass(req.sender_name);
                html += `
                <div class="friend-request-item">
                    <div class="avatar ${ava}" style="width:40px;height:40px;font-size:16px">${esc(req.sender_name[0].toUpperCase())}</div>
                    <div class="fi-info">
                        <div class="fi-name" onclick="navigate('profile',{userId:${req.sender_id}})">${esc(req.sender_name)}</div>
                        <div class="fi-bio">想添加你为好友</div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();handleFriendResponse(${req.id},'accept')">接受</button>
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();handleFriendResponse(${req.id},'reject')">拒绝</button>
                    </div>
                </div>`;
            }
        }

        // Friends list
        html += `<div style="padding:16px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">我的好友 (${friends.length})</div>`;
        if (friends.length === 0) {
            html += `<div class="empty-state"><p>还没有好友，去广场认识新朋友吧</p></div>`;
        } else {
            for (const f of friends) {
                const ava = avaClass(f.username);
                html += `
                <div class="friend-item">
                    <div class="avatar ${ava}" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate('profile',{userId:${f.id}})">${esc(f.username[0].toUpperCase())}</div>
                    <div class="fi-info">
                        <div class="fi-name" onclick="navigate('profile',{userId:${f.id}})">${esc(f.username)}</div>
                        <div class="fi-bio">${esc(f.bio || "这个人很懒，什么都没写")}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();removeFriend(${f.id},'${esc(f.username)}')">删除</button>
                </div>`;
            }
        }

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
}

async function handleFriendResponse(reqId, action) {
    try { await API.respondFriendRequest(reqId, action); toast(action === "accept" ? "已接受" : "已拒绝"); loadFriendContent(); updateSidebar(); }
    catch (e) { toast(e.message, true); }
}

async function removeFriend(id, name) {
    if (!confirm(`确定删除好友 ${name} 吗？`)) return;
    try { await API.removeFriend(id); toast("已删除好友"); loadFriendContent(); }
    catch (e) { toast(e.message, true); }
}

/* ==================== Families ==================== */
function renderFamilies(app) {
    app.innerHTML = `
        <div class="page-header">👨‍👩‍👧 家庭组</div>
        <div style="padding:12px 18px;display:flex;gap:8px;border-bottom:1px solid var(--border-light)">
            <button class="btn btn-primary btn-sm" id="btn-create-family">+ 创建家庭组</button>
            <button class="btn btn-outline btn-sm" id="btn-join-family">🔗 加入家庭组</button>
        </div>
        <div id="family-list"><div class="spinner"></div></div>
    `;

    document.getElementById("btn-create-family").onclick = showCreateFamilyModal;
    document.getElementById("btn-join-family").onclick = showJoinFamilyModal;
    loadFamilies();
}

async function loadFamilies() {
    const container = document.getElementById("family-list");
    try {
        const families = await API.getMyFamilies();
        if (families.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">👨‍👩‍👧</div><p>还没有加入任何家庭组</p></div>`;
        } else {
            container.innerHTML = families.map(f => `
                <div class="family-card" onclick="navigate('family-detail',{groupId:${f.id}})">
                    <div class="family-name">👨‍👩‍👧 ${esc(f.name)}</div>
                    <div class="family-desc">${esc(f.description || "暂无描述")}</div>
                    <div class="family-meta">
                        <span class="meta-item">👥 ${f.member_count} 人</span>
                        <span class="meta-item">🔑 ${f.invite_code}</span>
                    </div>
                </div>
            `).join("");
        }
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
}

function showCreateFamilyModal() {
    showModal("创建家庭组", `
        <div class="form-group"><label>家庭组名称</label><input type="text" id="family-name" placeholder="给家庭组起个名字" maxlength="80"></div>
        <div class="form-group"><label>描述（可选）</label><input type="text" id="family-desc" placeholder="简单介绍一下这个家庭组" maxlength="200"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-create">创建</button>
    `);
    document.getElementById("btn-create").onclick = async () => {
        const name = document.getElementById("family-name").value.trim();
        const desc = document.getElementById("family-desc").value.trim();
        if (!name) { toast("请输入家庭组名称", true); return; }
        try {
            await API.createFamily(name, desc);
            toast("创建成功！");
            closeModal();
            loadFamilies();
        } catch (e) { toast(e.message, true); }
    };
}

function showJoinFamilyModal() {
    showModal("加入家庭组", `
        <div class="form-group"><label>邀请码</label><input type="text" id="invite-code" placeholder="输入6位邀请码" maxlength="6"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-join">加入</button>
    `);
    document.getElementById("btn-join").onclick = async () => {
        const code = document.getElementById("invite-code").value.trim();
        if (!code) { toast("请输入邀请码", true); return; }
        try {
            const res = await API.joinFamily(code);
            toast(res.message);
            closeModal();
            loadFamilies();
        } catch (e) { toast(e.message, true); }
    };
}

/* ==================== Family Detail ==================== */
function renderFamilyDetail(app, groupId) {
    app.innerHTML = `<div class="page"><div class="spinner"></div></div>`;
    loadFamilyDetail(groupId);
}

async function loadFamilyDetail(groupId) {
    const app = document.getElementById("app");
    try {
        const group = await API.getFamilyDetail(groupId);
        const moodsData = await API.getFamilyMoods(groupId, 1);

        const memberChips = group.members.map(m => {
            const ava = avaClass(m.username);
            return `<span class="member-chip" onclick="navigate('profile',{userId:${m.user_id}})">
                <span class="chip-avatar ${ava}">${esc(m.username[0].toUpperCase())}</span>${esc(m.username)}
            </span>`;
        }).join("");

        const moodHtml = moodsData.records.length === 0
            ? `<div class="empty-state"><p>家庭组还没有心情记录</p></div>`
            : moodsData.records.map(r => moodCardHTML(r, r.user_id === API.user?.id)).join("");

        app.innerHTML = `
            <div class="page-header">← 家庭组</div>
            <div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
                <h2 style="font-size:20px;margin-bottom:4px">👨‍👩‍👧 ${esc(group.name)}</h2>
                <p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px">${esc(group.description || "暂无描述")}</p>
                <div class="invite-code-box">
                    <div class="code">${group.invite_code}</div>
                    <div class="code-hint">邀请码 — 分享给家人加入</div>
                </div>
                <div style="font-size:13px;font-weight:650;margin-bottom:6px">成员 (${group.members.length})</div>
                <div class="member-chips">${memberChips}</div>
                <div style="margin-top:14px;display:flex;gap:8px">
                    ${!group.is_creator ? `<button class="btn btn-outline btn-sm" id="btn-leave">退出家庭组</button>` : ""}
                    ${group.is_creator ? `<button class="btn btn-danger btn-sm" id="btn-disband">解散家庭组</button>` : ""}
                </div>
            </div>
            <div id="family-moods">${moodHtml}</div>
        `;

        if (!group.is_creator && group.is_member) {
            document.getElementById("btn-leave").onclick = async () => {
                if (!confirm("确定退出这个家庭组吗？")) return;
                try { await API.leaveFamily(groupId); toast("已退出"); navigate("families"); }
                catch (e) { toast(e.message, true); }
            };
        }
        if (group.is_creator) {
            document.getElementById("btn-disband").onclick = async () => {
                if (!confirm("确定解散这个家庭组吗？此操作不可撤销！")) return;
                try { await API.disbandFamily(groupId); toast("已解散"); navigate("families"); }
                catch (e) { toast(e.message, true); }
            };
        }
    } catch (e) {
        app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
}

/* ==================== Profile ==================== */
function myUserId() {
    return API.user ? API.user.id : null;
}

function renderProfile(app, userId) {
    // Always use the logged-in user's ID for "my profile"
    // If no userId provided or userId matches current user, it's "my profile"
    const selfId = myUserId();
    const effectiveUserId = userId || selfId;
    const isSelf = selfId && String(selfId) === String(effectiveUserId);
    app.innerHTML = `<div class="page"><div class="spinner"></div></div>`;
    loadProfile(effectiveUserId, isSelf);
}

async function loadProfile(userId, isSelf) {
    const app = document.getElementById("app");
    try {
        const [profile, moodsData] = await Promise.all([
            API.getProfile(userId),
            API.getUserMoods(userId, 1),
        ]);
        const ava = avaClass(profile.username);

        const moodHtml = moodsData.records.length === 0
            ? `<div class="empty-state"><div class="icon">📭</div><p>还没有心情记录</p></div>`
            : moodsData.records.map(r => moodCardHTML(r, String(r.user_id) === String(myUserId()))).join("");

        app.innerHTML = `
            <div class="page-header" style="font-size:18px;font-weight:700;padding:16px 18px">
                ${isSelf ? '👤 我的主页' : `👤 ${esc(profile.username)} 的主页`}
                ${!isSelf ? `<span style="font-size:13px;font-weight:400;color:var(--text-secondary);float:right;cursor:pointer" onclick="navigate('profile',{userId:${myUserId()}})">← 返回我的主页</span>` : ''}
            </div>
            <div class="profile-cover"></div>
            <div class="profile-info">
                <div class="profile-avatar-lg ${ava}">${esc(profile.username[0].toUpperCase())}</div>
                <div class="profile-name">${esc(profile.username)}</div>
                <div class="profile-handle">@${esc(profile.username)}</div>
                <div class="profile-bio">${esc(profile.bio || "这个人很懒，什么都没写")}</div>
                <div class="profile-stats">
                    <span><strong>${profile.mood_count}</strong> 心情</span>
                    <span><strong>${profile.friend_count}</strong> 好友</span>
                    <span><strong>${profile.family_count}</strong> 家庭</span>
                </div>
                <div class="profile-actions">
                    ${isSelf
                        ? `<button class="btn btn-outline btn-sm" id="btn-edit-profile">编辑资料</button>`
                        : `<button class="btn btn-primary btn-sm" id="btn-add-friend">➕ 添加好友</button>`
                    }
                </div>
            </div>
            <div id="profile-moods">${moodHtml}</div>
        `;

        if (isSelf) {
            const editBtn = document.getElementById("btn-edit-profile");
            if (editBtn) editBtn.onclick = () => showEditProfileModal(profile);
        } else {
            const addBtn = document.getElementById("btn-add-friend");
            if (addBtn) {
                addBtn.onclick = async () => {
                    try {
                        const res = await API.sendFriendRequest(userId);
                        toast(res.message);
                        addBtn.textContent = "✓已发送";
                        addBtn.disabled = true;
                    } catch (e) { toast(e.message, true); }
                };
            }
        }
    } catch (e) {
        app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
}

function showEditProfileModal(profile) {
    showModal("编辑资料", `
        <div class="form-group"><label>简介</label><textarea id="edit-bio" maxlength="200" placeholder="介绍一下自己...">${esc(profile.bio || "")}</textarea></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-save-profile">保存</button>
    `);
    document.getElementById("btn-save-profile").onclick = async () => {
        const bio = document.getElementById("edit-bio").value.trim();
        try {
            const res = await API.updateProfile(bio);
            if (API.user && API.user.id === profile.id) {
                API.user.bio = bio;
                localStorage.setItem("user", JSON.stringify(API.user));
            }
            toast(res.message);
            closeModal();
            navigate("profile", { userId: profile.id });
        } catch (e) { toast(e.message, true); }
    };
}

/* ==================== Stats ==================== */
function renderStats(app) {
    app.innerHTML = `<div class="page"><div style="padding:18px"><div class="spinner"></div></div></div>`;
    loadFullStats();
}

async function loadFullStats() {
    const app = document.getElementById("app");
    try {
        const data = await API.getStats();
        const total = Object.values(data.mood_distribution).reduce((a, b) => a + b, 0) || 1;
        const colors = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };

        let distroHtml = "";
        for (const [mood, count] of Object.entries(data.mood_distribution)) {
            const pct = ((count / total) * 100).toFixed(1);
            distroHtml += `
                <div class="stat-row" style="padding:8px 0">
                    <span class="stat-emoji">${MOODS[mood].emoji}</span>
                    <span style="width:50px;font-size:14px;font-weight:550">${MOODS[mood].name}</span>
                    <div class="bar-mini"><div class="bar-mini-fill" style="width:${pct}%;background:${colors[mood]}"></div></div>
                    <span style="font-size:14px;font-weight:650;width:40px;text-align:right">${count}</span>
                </div>`;
        }

        let topHtml = "";
        if (data.top_users.length === 0) {
            topHtml = `<p style="color:var(--text-secondary);text-align:center;padding:12px">暂无数据</p>`;
        } else {
            const medals = ["🥇", "🥈", "🥉"];
            data.top_users.forEach((u, i) => {
                topHtml += `
                <div class="friend-item">
                    <span style="font-size:22px;width:30px">${medals[i] || (i + 1)}</span>
                    <span style="font-weight:650;flex:1">${esc(u.username)}</span>
                    <span style="color:var(--text-secondary)">${u.count} 条</span>
                </div>`;
            });
        }

        app.innerHTML = `
            <div class="page-header">📊 统计</div>
            <div style="padding:16px 18px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
                <div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">${data.total_records}</div><div style="font-size:12px;color:var(--text-secondary)">总记录</div></div>
                <div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">${data.total_users}</div><div style="font-size:12px;color:var(--text-secondary)">用户数</div></div>
            </div>
            <div style="padding:16px 18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
                <div style="font-weight:700;font-size:15px;margin-bottom:12px">心情分布</div>
                ${distroHtml}
            </div>
            <div style="padding:16px 18px;background:var(--card-bg)">
                <div style="font-weight:700;font-size:15px;margin-bottom:12px">🏆 活跃用户</div>
                ${topHtml}
            </div>
        `;
    } catch (e) {
        app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
}

/* ==================== Modal ==================== */
function showModal(title, bodyHTML) {
    const overlay = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");
    content.innerHTML = `
        <div class="modal-header"><span>${title}</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="modal-body">${bodyHTML}</div>
    `;
    overlay.style.display = "flex";
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}
function closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
}

/* ==================== Image Viewer ==================== */
function openImageViewer(url) {
    document.getElementById("image-viewer-img").src = url;
    document.getElementById("image-viewer").style.display = "flex";
    document.getElementById("image-viewer").onclick = closeImageViewer;
}
function closeImageViewer() {
    document.getElementById("image-viewer").style.display = "none";
}

/* ==================== Logout ==================== */
function logout() {
    API.token = null;
    API.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    updateSidebar();
    navigate("login");
}

/* ==================== Init ==================== */
function init() {
    updateSidebar();
    if (API.token && API.user) {
        navigate("feed");
    } else {
        navigate("login");
    }
}

// Global logout handler
document.addEventListener("click", (e) => {
    if (e.target.id === "btn-logout") logout();
});

init();
