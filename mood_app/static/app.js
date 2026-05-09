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
    // Auth
    register(u, p) { return this.request("POST", "/api/register", { username: u, password: p }); },
    login(u, p) { return this.request("POST", "/api/login", { username: u, password: p }); },
    changePassword(oldPw, newPw) { return this.request("PUT", "/api/password", { old_password: oldPw, new_password: newPw }); },
    // Moods
    createMood(fd) { return this.request("POST", "/api/moods", fd, true); },
    getMoods(pg, mood = "") { return this.request("GET", `/api/moods?page=${pg}&per_page=15&mood=${mood}`); },
    getMyMoods(pg) { return this.request("GET", `/api/moods/my?page=${pg}&per_page=15`); },
    getUserMoods(uid, pg) { return this.request("GET", `/api/moods/user/${uid}?page=${pg}&per_page=15`); },
    deleteMood(id) { return this.request("DELETE", `/api/moods/${id}`); },
    // Stats
    getStats() { return this.request("GET", "/api/stats"); },
    // Profile
    getProfile(uid) { return this.request("GET", `/api/profile/${uid}`); },
    updateProfile(bio) { return this.request("PUT", "/api/profile", { bio }); },
    searchUsers(q) { return this.request("GET", `/api/users/search?q=${encodeURIComponent(q)}`); },
    // Families
    createFamily(name, desc) { return this.request("POST", "/api/families", { name, description: desc }); },
    joinFamily(code) { return this.request("POST", "/api/families/join", { invite_code: code }); },
    getMyFamilies() { return this.request("GET", "/api/families/my"); },
    getFamilyDetail(id) { return this.request("GET", `/api/families/${id}`); },
    getFamilyMoods(id, pg) { return this.request("GET", `/api/families/${id}/moods?page=${pg}&per_page=15`); },
    leaveFamily(id) { return this.request("POST", `/api/families/${id}/leave`); },
    disbandFamily(id) { return this.request("DELETE", `/api/families/${id}`); },
    // Friends
    sendFriendRequest(uid) { return this.request("POST", `/api/friends/request/${uid}`); },
    respondFriendRequest(rid, action) { return this.request("POST", `/api/friends/respond/${rid}`, { action }); },
    getFriendRequests() { return this.request("GET", "/api/friends/requests"); },
    getFriends() { return this.request("GET", "/api/friends"); },
    getFriendsMoods(pg) { return this.request("GET", `/api/friends/moods?page=${pg}&per_page=15`); },
    removeFriend(id) { return this.request("DELETE", `/api/friends/remove/${id}`); },
};

/* ==================== Constants ==================== */
const MOODS = {
    happy: { emoji: "😊", name: "开心" }, calm: { emoji: "😌", name: "平静" },
    sad: { emoji: "😢", name: "难过" }, anxious: { emoji: "😰", name: "焦虑" },
    excited: { emoji: "🤩", name: "兴奋" }, tired: { emoji: "😴", name: "疲惫" },
};

/* ==================== Utilities ==================== */
function toast(msg, isErr) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast " + (isErr ? "error" : "") + " show";
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2800);
}
function fmtTime(iso) {
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
function imgUrl(f) { return f ? `/api/uploads/${f}` : ""; }

/* ==================== Navigation ==================== */
let curView = "";
let curData = {};
let scrollHandler = null;

function updateSidebar() {
    const nav = document.getElementById("sidebar-nav");
    const userDiv = document.getElementById("sidebar-user");
    const postBtn = document.getElementById("sidebar-post-btn");
    if (!nav) return;

    if (API.token && API.user) {
        postBtn.style.display = "";
        postBtn.onclick = () => { navigate("feed"); setTimeout(() => document.getElementById("mood-textarea")?.focus(), 100); };
        nav.innerHTML = `
            <a data-view="feed"><span class="nav-icon">🏠</span><span>首页</span></a>
            <a data-view="friends"><span class="nav-icon">👥</span><span>好友</span></a>
            <a data-view="families"><span class="nav-icon">👨‍👩‍👧</span><span>家庭</span></a>
            <a data-view="profile" data-user-id="${API.user.id}"><span class="nav-icon">👤</span><span>个人</span></a>
            <a data-view="stats"><span class="nav-icon">📊</span><span>统计</span></a>
        `;
        const ava = avaClass(API.user.username);
        userDiv.innerHTML = `
            <div class="avatar ${ava}">${esc(API.user.username[0].toUpperCase())}</div>
            <div class="user-info">
                <div class="uname">${esc(API.user.username)}</div>
                <div class="uhandle">@${esc(API.user.username)}</div>
            </div>
            <button class="btn btn-outline btn-sm" style="margin-left:auto;flex-shrink:0" id="btn-logout">退出</button>
        `;
        userDiv.onclick = (e) => { if (e.target.id !== "btn-logout") navigate("profile", { userId: API.user.id }); };
        const logoutBtn = document.getElementById("btn-logout");
        if (logoutBtn) logoutBtn.onclick = (e) => { e.stopPropagation(); doLogout(); };
    } else {
        postBtn.style.display = "none";
        nav.innerHTML = "";
        userDiv.innerHTML = "";
    }

    nav.querySelectorAll("a").forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            const uid = a.dataset.userId ? parseInt(a.dataset.userId) : null;
            navigate(a.dataset.view, { userId: uid });
        };
    });
}

function navigate(view, data = {}) {
    curView = view;
    curData = data;
    document.querySelectorAll(".sidebar-nav a").forEach(a => a.classList.remove("active"));
    const link = document.querySelector(`.sidebar-nav a[data-view="${view}"]`);
    if (link) link.classList.add("active");

    const app = document.getElementById("app");
    const rp = document.getElementById("right-panel");

    // Clear scroll handler
    window.onscroll = null;

    switch (view) {
        case "login": renderAuth(app); renderRight(rp, ""); break;
        case "feed": renderFeed(app); renderRightDefault(rp); break;
        case "friends": renderFriends(app); renderRight(rp, ""); break;
        case "families": renderFamilies(app); renderRight(rp, ""); break;
        case "family-detail": renderFamilyDetail(app, data.groupId); renderRight(rp, ""); break;
        case "profile":
            renderProfile(app, data.userId || (API.user && API.user.id));
            renderRightSearch(rp);
            break;
        case "settings": renderSettings(app); renderRight(rp, ""); break;
        case "stats": renderStats(app); renderRight(rp, ""); break;
        default: renderFeed(app); renderRightDefault(rp);
    }
}

function renderRight(panel, html) { panel.innerHTML = html; }
function renderRightDefault(panel) {
    panel.innerHTML = `<div class="right-card"><h3>📊 心情分布</h3><div id="right-stats"><div class="spinner"></div></div></div>`;
    loadRightStats();
}
function renderRightSearch(panel) {
    panel.innerHTML = `
        <div class="right-card">
            <h3>🔍 搜索用户</h3>
            <input class="search-input" id="search-input" placeholder="输入用户名...">
            <div id="search-results" style="margin-top:12px"></div>
        </div>
    `;
    const inp = document.getElementById("search-input");
    if (inp) {
        let timer;
        inp.oninput = function() {
            clearTimeout(timer);
            const q = this.value.trim();
            if (!q) { document.getElementById("search-results").innerHTML = ""; return; }
            timer = setTimeout(async () => {
                try {
                    const users = await API.searchUsers(q);
                    const el = document.getElementById("search-results");
                    el.innerHTML = users.length === 0
                        ? `<p style="color:var(--text-secondary);font-size:13px;text-align:center;padding:12px">未找到用户</p>`
                        : users.map(u => {
                            const ava = avaClass(u.username);
                            return `<div class="user-row" onclick="navigate('profile',{userId:${u.id}})">
                                <div class="avatar-sm ${ava}">${esc(u.username[0].toUpperCase())}</div>
                                <div class="ur-info"><div class="ur-name">${esc(u.username)}</div><div class="ur-stat">${esc(u.bio||'暂无简介')}</div></div>
                            </div>`;
                        }).join("");
                } catch { /* ignore */ }
            }, 300);
        };
    }
}

async function loadRightStats() {
    const el = document.getElementById("right-stats");
    if (!el) return;
    try {
        const d = await API.getStats();
        const total = Object.values(d.mood_distribution).reduce((a, b) => a + b, 0) || 1;
        const cols = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };
        el.innerHTML = Object.entries(d.mood_distribution).map(([k, v]) => {
            const pct = ((v / total) * 100).toFixed(1);
            return `<div class="stat-row">
                <span class="stat-emoji">${MOODS[k].emoji}</span>
                <div class="bar-mini"><div class="bar-mini-fill" style="width:${pct}%;background:${cols[k]}"></div></div>
                <span style="font-size:13px;width:32px;text-align:right">${v}</span>
            </div>`;
        }).join("");
    } catch { el.innerHTML = ""; }
}

/* ==================== Auth ==================== */
function renderAuth(app) {
    let mode = "login";
    function h() {
        return `<div class="auth-container"><div class="auth-card">
            <div class="logo">🌈</div>
            <h2>${mode==="login"?"欢迎回来":"创建账号"}</h2>
            <p class="subtitle">${mode==="login"?"登录心情日记":"加入心情日记社区"}</p>
            <div class="form-group"><label>用户名</label><input type="text" id="auth-un" placeholder="请输入用户名" maxlength="20"></div>
            <div class="form-group"><label>密码</label><input type="password" id="auth-pw" placeholder="请输入密码"></div>
            <button class="btn btn-primary btn-lg" id="auth-btn">${mode==="login"?"登 录":"注 册"}</button>
            <div class="auth-switch">${mode==="login"?"还没有账号？":"已有账号？"} <a id="auth-sw">${mode==="login"?"立即注册":"立即登录"}</a></div>
        </div></div>`;
    }
    app.innerHTML = h();
    document.getElementById("auth-sw").onclick = () => { mode = mode==="login"?"register":"login"; app.innerHTML = h(); bind(); };
    bind();
    function bind() {
        const btn = document.getElementById("auth-btn");
        btn.onclick = submit;
        document.getElementById("auth-un").onkeydown = e => { if (e.key==="Enter") document.getElementById("auth-pw").focus(); };
        document.getElementById("auth-pw").onkeydown = e => { if (e.key==="Enter") submit(); };
    }
    async function submit() {
        const u = document.getElementById("auth-un").value.trim();
        const p = document.getElementById("auth-pw").value;
        if (!u || !p) { toast("请填写用户名和密码", true); return; }
        if (u.length < 2) { toast("用户名至少2个字符", true); return; }
        if (p.length < 4) { toast("密码至少4个字符", true); return; }
        const btn = document.getElementById("auth-btn");
        btn.disabled = true; btn.textContent = "处理中...";
        try {
            const res = mode === "login" ? await API.login(u, p) : await API.register(u, p);
            API.token = res.token;
            API.user = res.user;
            localStorage.setItem("token", res.token);
            localStorage.setItem("user", JSON.stringify(res.user));
            toast(res.message || "成功！");
            updateSidebar();
            navigate("feed");
        } catch (e) { toast(e.message, true); }
        btn.disabled = false; btn.textContent = mode==="login"?"登 录":"注 册";
    }
}

/* ==================== Mood Card ==================== */
function moodCard(r, showDel) {
    const m = MOODS[r.mood] || { emoji: "❓", name: r.mood };
    const ava = avaClass(r.username);
    const tagsH = r.tags && r.tags.length
        ? `<div class="mood-card-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(" ")}</div>` : "";
    const imgH = r.image
        ? `<img class="mood-card-image" src="${imgUrl(r.image)}" onclick="event.stopPropagation();openImg('${imgUrl(r.image)}')" loading="lazy">` : "";
    const delH = showDel
        ? `<button class="action-btn" title="删除" onclick="event.stopPropagation();delMood(${r.id})">🗑️</button>` : "";
    return `<div class="mood-card">
        <div class="mood-card-header">
            <div class="avatar ${ava}" onclick="event.stopPropagation();navigate('profile',{userId:${r.user_id}})">${esc(r.username[0].toUpperCase())}</div>
            <div class="header-info">
                <div class="header-row">
                    <span class="uname" onclick="event.stopPropagation();navigate('profile',{userId:${r.user_id}})">${esc(r.username)}</span>
                    <span class="mood-tag">${m.emoji} ${m.name}</span>
                    <span class="utime">· ${fmtTime(r.created_at)}</span>
                </div>
            </div>
        </div>
        <div class="mood-card-content">${esc(r.content)}</div>
        ${imgH}${tagsH}
        <div class="mood-card-actions-row">${delH}</div>
    </div>`;
}

async function delMood(id) {
    if (!confirm("确定删除？")) return;
    try { await API.deleteMood(id); toast("删除成功"); if (curView === "feed") navigate("feed"); else if (curView === "profile") navigate("profile", curData); }
    catch (e) { toast(e.message, true); }
}

/* ==================== Feed ==================== */
let feedMode = "all", feedPage = 1, feedMore = true, feedBusy = false;

function renderFeed(app) {
    feedMode = "all"; feedPage = 1; feedMore = true;
    const ava = avaClass(API.user.username);
    app.innerHTML = `
        <div class="feed-tabs" id="feed-tabs">
            <div class="feed-tab active" data-mode="all">🌍 全部分享</div>
            <div class="feed-tab" data-mode="friends">👥 好友动态</div>
        </div>
        <div class="create-inline" id="create-inline">
            <div class="create-row">
                <div class="avatar ${ava}">${esc(API.user.username[0].toUpperCase())}</div>
                <textarea id="mood-textarea" placeholder="今天心情如何？" maxlength="500"></textarea>
            </div>
            <div class="mood-selector" id="mood-selector"></div>
            <div id="img-preview"></div>
            <div class="create-actions">
                <div class="left-actions">
                    <input type="file" id="img-input" accept="image/*" style="display:none">
                    <button class="icon-btn" id="btn-img" title="添加图片">🖼️</button>
                    <span class="char-count"><span id="char-cnt">0</span>/500</span>
                </div>
                <button class="btn btn-primary btn-sm" id="btn-sub">发布</button>
            </div>
        </div>
        <div id="feed-list"></div>
        <div id="feed-loader" style="display:none"><div class="spinner"></div></div>
    `;

    let selMood = "happy";
    const sel = document.getElementById("mood-selector");
    for (const [k, m] of Object.entries(MOODS)) {
        const el = document.createElement("span");
        el.className = "mood-option" + (k==="happy"?" selected":"");
        el.textContent = m.emoji + " " + m.name;
        el.onclick = () => { selMood = k; sel.querySelectorAll(".mood-option").forEach(o => o.classList.remove("selected")); el.classList.add("selected"); };
        sel.appendChild(el);
    }

    document.getElementById("mood-textarea").oninput = function() { document.getElementById("char-cnt").textContent = this.value.length; };

    let imgFile = null;
    document.getElementById("btn-img").onclick = () => document.getElementById("img-input").click();
    document.getElementById("img-input").onchange = function() {
        imgFile = this.files[0];
        const pv = document.getElementById("img-preview");
        if (imgFile) {
            const url = URL.createObjectURL(imgFile);
            pv.innerHTML = `<div class="image-preview-wrap"><img src="${url}"><button class="remove-img" id="rm-img">✕</button></div>`;
            document.getElementById("rm-img").onclick = () => { imgFile = null; pv.innerHTML = ""; document.getElementById("img-input").value = ""; };
        }
    };

    document.getElementById("btn-sub").onclick = async () => {
        const content = document.getElementById("mood-textarea").value.trim();
        if (!content) { toast("请写下心情描述", true); return; }
        const fd = new FormData();
        fd.append("mood", selMood);
        fd.append("content", content);
        fd.append("tags", "");
        if (imgFile) fd.append("image", imgFile);
        const btn = document.getElementById("btn-sub");
        btn.disabled = true; btn.textContent = "发布中...";
        try {
            await API.createMood(fd);
            toast("✨ 发布成功！");
            document.getElementById("mood-textarea").value = "";
            document.getElementById("char-cnt").textContent = "0";
            document.getElementById("img-preview").innerHTML = "";
            document.getElementById("img-input").value = "";
            imgFile = null;
            feedPage = 1;
            loadFeed();
        } catch (e) { toast(e.message, true); }
        btn.disabled = false; btn.textContent = "发布";
    };

    document.querySelectorAll("#feed-tabs .feed-tab").forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll("#feed-tabs .feed-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            feedMode = tab.dataset.mode;
            feedPage = 1; feedMore = true;
            loadFeed();
        };
    });

    loadFeed();

    window.onscroll = () => {
        if (feedBusy || !feedMore || curView !== "feed") return;
        if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 300) {
            feedPage++;
            loadFeed(true);
        }
    };
}

async function loadFeed(append) {
    if (feedBusy) return;
    feedBusy = true;
    const list = document.getElementById("feed-list");
    const loader = document.getElementById("feed-loader");
    if (!list) { feedBusy = false; return; }

    if (!append) list.innerHTML = '<div class="spinner"></div>';
    else if (loader) loader.style.display = "block";

    try {
        const data = feedMode === "friends" ? await API.getFriendsMoods(feedPage) : await API.getMoods(feedPage);
        const html = data.records.map(r => moodCard(r, r.user_id === API.user?.id)).join("");
        if (append) list.insertAdjacentHTML("beforeend", html);
        else list.innerHTML = data.records.length === 0
            ? `<div class="empty-state"><div class="icon">📝</div><p>${feedMode==="friends"?"关注好友后查看他们的心情":"还没有心情记录，快来写第一条吧"}</p></div>`
            : html;
        feedMore = data.page < data.pages;
        if (!feedMore && !append && data.records.length > 0) {
            list.insertAdjacentHTML("beforeend", '<div class="empty-state" style="padding:20px"><p style="color:var(--text-secondary)">— 已经到底了 —</p></div>');
        }
    } catch (e) {
        if (!append) list.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`;
    }
    if (loader) loader.style.display = "none";
    feedBusy = false;
}

/* ==================== Friends ==================== */
function renderFriends(app) {
    app.innerHTML = `<div class="page-header">👥 好友</div><div id="frd-ctn"><div class="spinner"></div></div>`;
    loadFriends();
}
async function loadFriends() {
    const el = document.getElementById("frd-ctn");
    try {
        const [reqs, frds] = await Promise.all([API.getFriendRequests(), API.getFriends()]);
        let h = "";
        if (reqs.length) {
            h += `<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">待处理 (${reqs.length})</div>`;
            for (const r of reqs) {
                const ava = avaClass(r.sender_name);
                h += `<div class="friend-request-item">
                    <div class="avatar ${ava}" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate('profile',{userId:${r.sender_id}})">${esc(r.sender_name[0].toUpperCase())}</div>
                    <div class="fi-info"><div class="fi-name" onclick="navigate('profile',{userId:${r.sender_id}})">${esc(r.sender_name)}</div><div class="fi-bio">想添加你为好友</div></div>
                    <div class="friend-actions">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();handleFR(${r.id},'accept')">接受</button>
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();handleFR(${r.id},'reject')">拒绝</button>
                    </div></div>`;
            }
        }
        h += `<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">我的好友 (${frds.length})</div>`;
        if (!frds.length) h += `<div class="empty-state"><p>还没有好友</p></div>`;
        else for (const f of frds) {
            const ava = avaClass(f.username);
            h += `<div class="friend-item">
                <div class="avatar ${ava}" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate('profile',{userId:${f.id}})">${esc(f.username[0].toUpperCase())}</div>
                <div class="fi-info"><div class="fi-name" onclick="navigate('profile',{userId:${f.id}})">${esc(f.username)}</div><div class="fi-bio">${esc(f.bio||"暂无简介")}</div></div>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();rmFriend(${f.id},'${esc(f.username)}')">删除</button>
            </div>`;
        }
        el.innerHTML = h;
    } catch (e) { el.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`; }
}
async function handleFR(rid, act) { try { await API.respondFriendRequest(rid, act); toast(act==="accept"?"已接受":"已拒绝"); loadFriends(); updateSidebar(); } catch (e) { toast(e.message, true); } }
async function rmFriend(id, name) { if (!confirm(`确定删除好友 ${name}？`)) return; try { await API.removeFriend(id); toast("已删除"); loadFriends(); } catch (e) { toast(e.message, true); } }

/* ==================== Families ==================== */
function renderFamilies(app) {
    app.innerHTML = `<div class="page-header">👨‍👩‍👧 家庭组</div>
        <div style="padding:12px 18px;display:flex;gap:8px;border-bottom:1px solid var(--border-light)">
            <button class="btn btn-primary btn-sm" id="btn-cf">+ 创建家庭组</button>
            <button class="btn btn-outline btn-sm" id="btn-jf">🔗 加入家庭组</button>
        </div><div id="fam-list"><div class="spinner"></div></div>`;
    document.getElementById("btn-cf").onclick = showCreateFam;
    document.getElementById("btn-jf").onclick = showJoinFam;
    loadFams();
}
async function loadFams() {
    const el = document.getElementById("fam-list");
    try {
        const fs = await API.getMyFamilies();
        el.innerHTML = fs.length === 0 ? `<div class="empty-state"><div class="icon">👨‍👩‍👧</div><p>还没有加入家庭组</p></div>`
            : fs.map(f => `<div class="family-card" onclick="navigate('family-detail',{groupId:${f.id}})">
                <div class="family-name">👨‍👩‍👧 ${esc(f.name)}</div>
                <div class="family-desc">${esc(f.description||"暂无描述")}</div>
                <div class="family-meta"><span class="meta-item">👥 ${f.member_count} 人</span><span class="meta-item">🔑 ${f.invite_code}</span></div>
            </div>`).join("");
    } catch (e) { el.innerHTML = `<div class="empty-state"><p>加载失败</p></div>`; }
}
function showCreateFam() {
    showModal("创建家庭组", `
        <div class="form-group"><label>名称</label><input type="text" id="fam-name" placeholder="给家庭组起个名字" maxlength="80"></div>
        <div class="form-group"><label>描述</label><input type="text" id="fam-desc" placeholder="简单介绍一下" maxlength="200"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-docf">创建</button>
    `);
    document.getElementById("btn-docf").onclick = async () => {
        const n = document.getElementById("fam-name").value.trim();
        if (!n) { toast("请输入名称", true); return; }
        try { await API.createFamily(n, document.getElementById("fam-desc").value.trim()); toast("创建成功！"); closeModal(); loadFams(); }
        catch (e) { toast(e.message, true); }
    };
}
function showJoinFam() {
    showModal("加入家庭组", `
        <div class="form-group"><label>邀请码</label><input type="text" id="inv-code" placeholder="输入6位邀请码" maxlength="6"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-doj">加入</button>
    `);
    document.getElementById("btn-doj").onclick = async () => {
        const c = document.getElementById("inv-code").value.trim();
        if (!c) { toast("请输入邀请码", true); return; }
        try { const r = await API.joinFamily(c); toast(r.message); closeModal(); loadFams(); }
        catch (e) { toast(e.message, true); }
    };
}

/* ==================== Family Detail ==================== */
function renderFamilyDetail(app, gid) {
    app.innerHTML = `<div class="page"><div class="spinner"></div></div>`;
    loadFamDetail(gid);
}
async function loadFamDetail(gid) {
    const app = document.getElementById("app");
    try {
        const [g, md] = await Promise.all([API.getFamilyDetail(gid), API.getFamilyMoods(gid, 1)]);
        const chips = g.members.map(m => {
            const ava = avaClass(m.username);
            return `<span class="member-chip" onclick="navigate('profile',{userId:${m.user_id}})"><span class="chip-avatar ${ava}">${esc(m.username[0].toUpperCase())}</span>${esc(m.username)}</span>`;
        }).join("");
        const mh = md.records.length === 0 ? `<div class="empty-state"><p>还没有心情记录</p></div>`
            : md.records.map(r => moodCard(r, r.user_id === API.user?.id)).join("");
        app.innerHTML = `
            <div class="page-header">← 返回</div>
            <div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
                <h2 style="font-size:20px;margin-bottom:4px">👨‍👩‍👧 ${esc(g.name)}</h2>
                <p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px">${esc(g.description||"暂无描述")}</p>
                <div class="invite-code-box"><div class="code">${g.invite_code}</div><div class="code-hint">邀请码 — 分享给家人加入</div></div>
                <div style="font-size:13px;font-weight:650;margin-bottom:6px">成员 (${g.members.length})</div>
                <div class="member-chips">${chips}</div>
                <div style="margin-top:14px;display:flex;gap:8px">
                    ${!g.is_creator && g.is_member ? `<button class="btn btn-outline btn-sm" id="btn-leave">退出家庭组</button>` : ""}
                    ${g.is_creator ? `<button class="btn btn-danger btn-sm" id="btn-disband">解散家庭组</button>` : ""}
                </div>
            </div><div id="fam-moods">${mh}</div>`;
        const leaveBtn = document.getElementById("btn-leave");
        const disBtn = document.getElementById("btn-disband");
        if (leaveBtn) leaveBtn.onclick = async () => { if (!confirm("确定退出？")) return; try { await API.leaveFamily(gid); toast("已退出"); navigate("families"); } catch (e) { toast(e.message, true); } };
        if (disBtn) disBtn.onclick = async () => { if (!confirm("确定解散？此操作不可撤销！")) return; try { await API.disbandFamily(gid); toast("已解散"); navigate("families"); } catch (e) { toast(e.message, true); } };
    } catch (e) { app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`; }
}

/* ==================== Profile ==================== */
function myUid() { return API.user ? API.user.id : null; }

function renderProfile(app, userId) {
    const sid = myUid();
    const eid = userId || sid;
    const isSelf = sid && String(sid) === String(eid);
    app.innerHTML = `<div class="page"><div class="spinner"></div></div>`;
    loadProfile(eid, isSelf);
}

async function loadProfile(uid, isSelf) {
    const app = document.getElementById("app");
    try {
        const [p, md] = await Promise.all([API.getProfile(uid), API.getUserMoods(uid, 1)]);
        const ava = avaClass(p.username);
        const mh = md.records.length === 0 ? `<div class="empty-state"><div class="icon">📭</div><p>还没有心情记录</p></div>`
            : md.records.map(r => moodCard(r, String(r.user_id) === String(myUid()))).join("");

        app.innerHTML = `
            <div class="page-header" style="font-size:18px;font-weight:700;padding:16px 18px">
                ${isSelf ? '👤 我的主页' : `👤 ${esc(p.username)} 的主页`}
                ${!isSelf ? `<span style="font-size:13px;font-weight:400;color:var(--primary);float:right;cursor:pointer" onclick="navigate('profile',{userId:${myUid()}})">← 返回我的主页</span>` : ''}
            </div>
            <div class="profile-cover"></div>
            <div class="profile-info">
                <div class="profile-avatar-lg ${ava}">${esc(p.username[0].toUpperCase())}</div>
                <div class="profile-name">${esc(p.username)}</div>
                <div class="profile-handle">@${esc(p.username)}</div>
                <div class="profile-bio">${esc(p.bio||"这个人很懒，什么都没写")}</div>
                <div class="profile-stats">
                    <span><strong>${p.mood_count}</strong> 心情</span>
                    <span><strong>${p.friend_count}</strong> 好友</span>
                    <span><strong>${p.family_count}</strong> 家庭</span>
                </div>
                <div class="profile-actions">
                    ${isSelf
                        ? `<button class="btn btn-outline btn-sm" id="btn-edit">编辑资料</button>
                           <button class="btn btn-outline btn-sm" id="btn-settings">⚙️ 账号设置</button>`
                        : `<button class="btn btn-primary btn-sm" id="btn-friend">➕ 添加好友</button>`}
                </div>
            </div>
            <div id="profile-moods">${mh}</div>`;
        if (isSelf) {
            document.getElementById("btn-edit").onclick = () => showEditProfile(p);
            document.getElementById("btn-settings").onclick = () => navigate("settings");
        } else {
            const fb = document.getElementById("btn-friend");
            if (fb) fb.onclick = async () => {
                try { const r = await API.sendFriendRequest(uid); toast(r.message); fb.textContent = "✓已发送"; fb.disabled = true; }
                catch (e) { toast(e.message, true); }
            };
        }
    } catch (e) { app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`; }
}

function showEditProfile(p) {
    showModal("编辑资料", `
        <div class="form-group"><label>简介</label><textarea id="edit-bio" maxlength="200" placeholder="介绍一下自己...">${esc(p.bio||"")}</textarea></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-save">保存</button>
    `);
    document.getElementById("btn-save").onclick = async () => {
        const bio = document.getElementById("edit-bio").value.trim();
        try {
            const r = await API.updateProfile(bio);
            if (API.user && API.user.id === p.id) { API.user.bio = bio; localStorage.setItem("user", JSON.stringify(API.user)); }
            toast(r.message); closeModal(); navigate("profile", { userId: p.id });
        } catch (e) { toast(e.message, true); }
    };
}

/* ==================== Settings ==================== */
function renderSettings(app) {
    app.innerHTML = `<div class="page">
        <div class="page-header">⚙️ 账号设置</div>
        <div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
            <h3 style="margin-bottom:12px">修改密码</h3>
            <div class="form-group"><label>原密码</label><input type="password" id="s-old-pw" placeholder="输入原密码"></div>
            <div class="form-group"><label>新密码</label><input type="password" id="s-new-pw" placeholder="输入新密码（至少4位）"></div>
            <button class="btn btn-primary" id="btn-chpw">修改密码</button>
        </div>
    </div>`;
    document.getElementById("btn-chpw").onclick = async () => {
        const oldPw = document.getElementById("s-old-pw").value;
        const newPw = document.getElementById("s-new-pw").value;
        if (!oldPw || !newPw) { toast("请填写完整", true); return; }
        if (newPw.length < 4) { toast("新密码至少4个字符", true); return; }
        try { await API.changePassword(oldPw, newPw); toast("密码修改成功！"); navigate("profile", { userId: myUid() }); }
        catch (e) { toast(e.message, true); }
    };
}

/* ==================== Stats ==================== */
function renderStats(app) {
    app.innerHTML = `<div class="page"><div style="padding:18px"><div class="spinner"></div></div></div>`;
    loadStats();
}
async function loadStats() {
    const app = document.getElementById("app");
    try {
        const d = await API.getStats();
        const total = Object.values(d.mood_distribution).reduce((a, b) => a + b, 0) || 1;
        const cols = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };
        const distH = Object.entries(d.mood_distribution).map(([k, v]) => {
            const pct = ((v / total) * 100).toFixed(1);
            return `<div class="stat-row" style="padding:8px 0"><span class="stat-emoji">${MOODS[k].emoji}</span>
                <span style="width:50px;font-size:14px;font-weight:550">${MOODS[k].name}</span>
                <div class="bar-mini"><div class="bar-mini-fill" style="width:${pct}%;background:${cols[k]}"></div></div>
                <span style="font-size:14px;font-weight:650;width:40px;text-align:right">${v}</span></div>`;
        }).join("");
        const medals = ["🥇","🥈","🥉"];
        const topH = d.top_users.length === 0 ? `<p style="color:var(--text-secondary);text-align:center;padding:12px">暂无数据</p>`
            : d.top_users.map((u, i) => `<div class="friend-item"><span style="font-size:22px;width:30px">${medals[i]||(i+1)}</span><span style="font-weight:650;flex:1">${esc(u.username)}</span><span style="color:var(--text-secondary)">${u.count} 条</span></div>`).join("");
        app.innerHTML = `
            <div class="page-header">📊 统计</div>
            <div style="padding:16px 18px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">
                <div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">${d.total_records}</div><div style="font-size:12px;color:var(--text-secondary)">总记录</div></div>
                <div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">${d.total_users}</div><div style="font-size:12px;color:var(--text-secondary)">用户数</div></div>
            </div>
            <div style="padding:16px 18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">心情分布</div>${distH}</div>
            <div style="padding:16px 18px;background:var(--card-bg)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">🏆 活跃用户</div>${topH}</div>`;
    } catch (e) { app.innerHTML = `<div class="empty-state"><p>加载失败：${esc(e.message)}</p></div>`; }
}

/* ==================== Modal & Image Viewer ==================== */
function showModal(title, body) {
    document.getElementById("modal-content").innerHTML = `<div class="modal-header"><span>${title}</span><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body">${body}</div>`;
    const ov = document.getElementById("modal-overlay");
    ov.style.display = "flex";
    ov.onclick = (e) => { if (e.target === ov) closeModal(); };
}
function closeModal() { document.getElementById("modal-overlay").style.display = "none"; }
function openImg(url) { document.getElementById("image-viewer-img").src = url; document.getElementById("image-viewer").style.display = "flex"; document.getElementById("image-viewer").onclick = closeImg; }
function closeImg() { document.getElementById("image-viewer").style.display = "none"; }

/* ==================== Logout ==================== */
function doLogout() {
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
    if (API.token && API.user) navigate("feed");
    else navigate("login");
}
init();
