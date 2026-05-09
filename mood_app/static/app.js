/* ==================== API Layer ==================== */
const API = {
    token: localStorage.getItem("token") || null,
    user: (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })(),

    headers() {
        const h = {};
        if (this.token) h["Authorization"] = "Bearer " + this.token;
        return h;
    },

    async request(method, url, body, isForm) {
        var opts = { method: method, headers: this.headers() };
        if (isForm) {
            opts.body = body;
        } else if (body) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(body);
        }
        var res = await fetch(url, opts);
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || "请求失败 (" + res.status + ")");
        return data;
    },

    register: function(u, p) { return this.request("POST", "/api/register", { username: u, password: p }); },
    login: function(u, p) { return this.request("POST", "/api/login", { username: u, password: p }); },
    changePassword: function(o, n) { return this.request("PUT", "/api/password", { old_password: o, new_password: n }); },
    createMood: function(fd) { return this.request("POST", "/api/moods", fd, true); },
    getMoods: function(pg, m) { return this.request("GET", "/api/moods?page=" + pg + "&per_page=15&mood=" + (m || "")); },
    getMyMoods: function(pg) { return this.request("GET", "/api/moods/my?page=" + pg + "&per_page=15"); },
    getUserMoods: function(uid, pg) { return this.request("GET", "/api/moods/user/" + uid + "?page=" + pg + "&per_page=15"); },
    deleteMood: function(id) { return this.request("DELETE", "/api/moods/" + id); },
    getStats: function() { return this.request("GET", "/api/stats"); },
    getProfile: function(uid) { return this.request("GET", "/api/profile/" + uid); },
    updateProfile: function(bio) { return this.request("PUT", "/api/profile", { bio: bio }); },
    searchUsers: function(q) { return this.request("GET", "/api/users/search?q=" + encodeURIComponent(q)); },
    createFamily: function(n, d) { return this.request("POST", "/api/families", { name: n, description: d }); },
    joinFamily: function(c) { return this.request("POST", "/api/families/join", { invite_code: c }); },
    getMyFamilies: function() { return this.request("GET", "/api/families/my"); },
    getFamilyDetail: function(id) { return this.request("GET", "/api/families/" + id); },
    getFamilyMoods: function(id, pg) { return this.request("GET", "/api/families/" + id + "/moods?page=" + pg + "&per_page=15"); },
    leaveFamily: function(id) { return this.request("POST", "/api/families/" + id + "/leave"); },
    disbandFamily: function(id) { return this.request("DELETE", "/api/families/" + id); },
    sendFriendRequest: function(uid) { return this.request("POST", "/api/friends/request/" + uid); },
    respondFriendRequest: function(rid, act) { return this.request("POST", "/api/friends/respond/" + rid, { action: act }); },
    getFriendRequests: function() { return this.request("GET", "/api/friends/requests"); },
    getFriends: function() { return this.request("GET", "/api/friends"); },
    getFriendsMoods: function(pg) { return this.request("GET", "/api/friends/moods?page=" + pg + "&per_page=15"); },
    removeFriend: function(id) { return this.request("DELETE", "/api/friends/remove/" + id); },
};

/* ==================== Constants ==================== */
var MOODS = {
    happy: { emoji: "😊", name: "开心" },
    calm: { emoji: "😌", name: "平静" },
    sad: { emoji: "😢", name: "难过" },
    anxious: { emoji: "😰", name: "焦虑" },
    excited: { emoji: "🤩", name: "兴奋" },
    tired: { emoji: "😴", name: "疲惫" },
};

/* ==================== Utilities ==================== */
function toast(msg, isErr) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast " + (isErr ? "error" : "") + " show";
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.remove("show"); }, 2800);
}

function fmtTime(iso) {
    var d = new Date(iso), now = new Date(), diff = now - d;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 604800000) return Math.floor(diff / 86400000) + " 天前";
    var p = function(n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

function avaClass(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    return "avatar-" + (Math.abs(h) % 8);
}

function imgUrl(f) {
    return f ? "/api/uploads/" + f : "";
}

function getEl(id) {
    return document.getElementById(id);
}

/* ==================== Navigation ==================== */
var curView = "";
var curData = {};

function updateSidebar() {
    var nav = getEl("sidebar-nav");
    var userDiv = getEl("sidebar-user");
    var postBtn = getEl("sidebar-post-btn");
    if (!nav) return;

    if (API.token && API.user) {
        if (postBtn) {
            postBtn.style.display = "";
            postBtn.onclick = function() { navigate("feed"); };
        }
        nav.innerHTML = "";
        var links = [
            ["feed", "🏠", "首页", API.user.id, false],
            ["friends", "👥", "好友", null, false],
            ["families", "👨‍👩‍👧", "家庭", null, false],
            ["profile", "👤", "个人", API.user.id, true],
            ["stats", "📊", "统计", null, false],
        ];
        for (var i = 0; i < links.length; i++) {
            var a = document.createElement("a");
            a.setAttribute("data-view", links[i][0]);
            if (links[i][2] !== null) a.setAttribute("data-user-id", String(links[i][2]));
            a.innerHTML = '<span class="nav-icon">' + links[i][1] + '</span> <span>' + links[i][2] + '</span>';
            a.onclick = (function(view, uid) {
                return function(e) {
                    e.preventDefault();
                    navigate(view, { userId: uid });
                };
            })(links[i][0], links[i][3]);
            nav.appendChild(a);
        }

        var ava = avaClass(API.user.username);
        userDiv.innerHTML =
            '<div class="avatar ' + ava + '">' + esc(API.user.username[0].toUpperCase()) + '</div>' +
            '<div class="user-info"><div class="uname">' + esc(API.user.username) + '</div>' +
            '<div class="uhandle">@' + esc(API.user.username) + '</div></div>' +
            '<button class="btn btn-outline btn-sm" style="margin-left:auto;flex-shrink:0" id="btn-logout">退出</button>';

        userDiv.onclick = function(e) {
            if (e.target && e.target.id === "btn-logout") return;
            navigate("profile", { userId: API.user.id });
        };

        var logoutBtn = getEl("btn-logout");
        if (logoutBtn) {
            logoutBtn.onclick = function(e) {
                e.stopPropagation();
                logout();
            };
        }
    } else {
        if (postBtn) postBtn.style.display = "none";
        if (nav) nav.innerHTML = "";
        if (userDiv) userDiv.innerHTML = "";
    }
}

function navigate(view, data) {
    curView = view;
    curData = data || {};
    window.onscroll = null;

    // Update active link
    var allLinks = document.querySelectorAll(".sidebar-nav a");
    for (var i = 0; i < allLinks.length; i++) {
        allLinks[i].classList.remove("active");
    }
    var activeLink = document.querySelector('.sidebar-nav a[data-view="' + view + '"]');
    if (activeLink) activeLink.classList.add("active");

    var app = getEl("app");
    var rp = getEl("right-panel");
    if (!app) return;

    if (view === "login") { renderAuth(app); renderRight(rp, ""); }
    else if (view === "feed") { renderFeed(app); renderRightDefault(rp); }
    else if (view === "friends") { renderFriends(app); renderRight(rp, ""); }
    else if (view === "families") { renderFamilies(app); renderRight(rp, ""); }
    else if (view === "family-detail") { renderFamilyDetail(app, data.groupId); renderRight(rp, ""); }
    else if (view === "profile") {
        var uid = data.userId || (API.user && API.user.id);
        renderProfile(app, uid);
        renderRightSearch(rp);
    }
    else if (view === "settings") { renderSettings(app); renderRight(rp, ""); }
    else if (view === "stats") { renderStats(app); renderRight(rp, ""); }
    else { renderFeed(app); renderRightDefault(rp); }
}

function renderRight(panel, html) { if (panel) panel.innerHTML = html; }

function renderRightDefault(panel) {
    if (!panel) return;
    panel.innerHTML = '<div class="right-card"><h3>📊 心情分布</h3><div id="right-stats"><div class="spinner"></div></div></div>';
    loadRightStats();
}

function renderRightSearch(panel) {
    if (!panel) return;
    panel.innerHTML =
        '<div class="right-card"><h3>🔍 搜索用户</h3>' +
        '<input class="search-input" id="search-input" placeholder="输入用户名...">' +
        '<div id="search-results" style="margin-top:12px"></div></div>';
    var inp = getEl("search-input");
    if (!inp) return;
    var timer;
    inp.oninput = function() {
        clearTimeout(timer);
        var q = this.value.trim();
        var results = getEl("search-results");
        if (!q) { if (results) results.innerHTML = ""; return; }
        timer = setTimeout(async function() {
            try {
                var users = await API.searchUsers(q);
                var el = getEl("search-results");
                if (!el) return;
                if (users.length === 0) {
                    el.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;text-align:center;padding:12px">未找到用户</p>';
                } else {
                    var h = "";
                    for (var i = 0; i < users.length; i++) {
                        var u = users[i];
                        var ava = avaClass(u.username);
                        h += '<div class="user-row" onclick="navigate(\'profile\',{userId:' + u.id + '})">' +
                            '<div class="avatar-sm ' + ava + '">' + esc(u.username[0].toUpperCase()) + '</div>' +
                            '<div class="ur-info"><div class="ur-name">' + esc(u.username) + '</div>' +
                            '<div class="ur-stat">' + esc(u.bio || "暂无简介") + '</div></div></div>';
                    }
                    el.innerHTML = h;
                }
            } catch (e) {}
        }, 300);
    };
}

async function loadRightStats() {
    var el = getEl("right-stats");
    if (!el) return;
    try {
        var d = await API.getStats();
        var total = 0;
        var keys = Object.keys(d.mood_distribution);
        for (var i = 0; i < keys.length; i++) total += d.mood_distribution[keys[i]];
        if (total === 0) total = 1;
        var cols = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };
        var h = "";
        var entries = Object.entries(d.mood_distribution);
        for (var i = 0; i < entries.length; i++) {
            var k = entries[i][0], v = entries[i][1];
            var pct = ((v / total) * 100).toFixed(1);
            h += '<div class="stat-row"><span class="stat-emoji">' + MOODS[k].emoji + '</span>' +
                '<div class="bar-mini"><div class="bar-mini-fill" style="width:' + pct + '%;background:' + cols[k] + '"></div></div>' +
                '<span style="font-size:13px;width:32px;text-align:right">' + v + '</span></div>';
        }
        el.innerHTML = h;
    } catch (e) { el.innerHTML = ""; }
}

/* ==================== Auth ==================== */
function renderAuth(app) {
    var mode = "login";
    function html() {
        return '<div class="auth-container"><div class="auth-card">' +
            '<div class="logo">🌈</div>' +
            '<h2>' + (mode === "login" ? "欢迎回来" : "创建账号") + '</h2>' +
            '<p class="subtitle">' + (mode === "login" ? "登录心情日记" : "加入心情日记社区") + '</p>' +
            '<div class="form-group"><label>用户名</label><input type="text" id="auth-un" placeholder="请输入用户名" maxlength="20"></div>' +
            '<div class="form-group"><label>密码</label><input type="password" id="auth-pw" placeholder="请输入密码"></div>' +
            '<button class="btn btn-primary btn-lg" id="auth-btn">' + (mode === "login" ? "登 录" : "注 册") + '</button>' +
            '<div class="auth-switch">' + (mode === "login" ? "还没有账号？" : "已有账号？") +
            ' <a id="auth-sw">' + (mode === "login" ? "立即注册" : "立即登录") + '</a></div>' +
            '</div></div>';
    }
    app.innerHTML = html();
    getEl("auth-sw").onclick = function() { mode = mode === "login" ? "register" : "login"; app.innerHTML = html(); bind(); };
    bind();
    function bind() {
        getEl("auth-btn").onclick = submit;
        getEl("auth-un").onkeydown = function(e) { if (e.key === "Enter") getEl("auth-pw").focus(); };
        getEl("auth-pw").onkeydown = function(e) { if (e.key === "Enter") submit(); };
    }
    async function submit() {
        var u = getEl("auth-un").value.trim();
        var p = getEl("auth-pw").value;
        if (!u || !p) { toast("请填写用户名和密码", true); return; }
        if (u.length < 2) { toast("用户名至少2个字符", true); return; }
        if (p.length < 4) { toast("密码至少4个字符", true); return; }
        var btn = getEl("auth-btn");
        btn.disabled = true; btn.textContent = "处理中...";
        try {
            var res = mode === "login" ? await API.login(u, p) : await API.register(u, p);
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
function moodCard(r, showDel) {
    var m = MOODS[r.mood] || { emoji: "❓", name: r.mood };
    var ava = avaClass(r.username);
    var tagsH = "";
    if (r.tags && r.tags.length) {
        tagsH = '<div class="mood-card-tags">';
        for (var i = 0; i < r.tags.length; i++) tagsH += '<span class="tag">' + esc(r.tags[i]) + '</span>';
        tagsH += '</div>';
    }
    var imgH = r.image ? '<img class="mood-card-image" src="' + imgUrl(r.image) + '" onclick="event.stopPropagation();openImg(\'' + imgUrl(r.image) + '\')" loading="lazy">' : "";
    var delH = showDel ? '<button class="action-btn" title="删除" onclick="event.stopPropagation();delMood(' + r.id + ')">🗑️</button>' : "";
    return '<div class="mood-card">' +
        '<div class="mood-card-header">' +
        '<div class="avatar ' + ava + '" onclick="event.stopPropagation();navigate(\'profile\',{userId:' + r.user_id + '})">' + esc(r.username[0].toUpperCase()) + '</div>' +
        '<div class="header-info"><div class="header-row">' +
        '<span class="uname" onclick="event.stopPropagation();navigate(\'profile\',{userId:' + r.user_id + '})">' + esc(r.username) + '</span>' +
        '<span class="mood-tag">' + m.emoji + ' ' + m.name + '</span>' +
        '<span class="utime">· ' + fmtTime(r.created_at) + '</span>' +
        '</div></div></div>' +
        '<div class="mood-card-content">' + esc(r.content) + '</div>' +
        imgH + tagsH +
        '<div class="mood-card-actions-row">' + delH + '</div></div>';
}

async function delMood(id) {
    if (!confirm("确定删除这条心情记录吗？")) return;
    try {
        await API.deleteMood(id);
        toast("删除成功");
        if (curView === "feed") navigate("feed");
        else if (curView === "profile") navigate("profile", curData);
    } catch (e) { toast(e.message, true); }
}

/* ==================== Feed ==================== */
var feedMode = "all";
var feedPage = 1;
var feedMore = true;
var feedBusy = false;

function renderFeed(app) {
    feedMode = "all";
    feedPage = 1;
    feedMore = true;

    var ava = avaClass(API.user ? API.user.username : "?");
    var initial = API.user ? esc(API.user.username[0].toUpperCase()) : "?";

    // Build mood selector options
    var moodOpts = "";
    var moodKeys = Object.keys(MOODS);
    for (var i = 0; i < moodKeys.length; i++) {
        var k = moodKeys[i];
        moodOpts += '<span class="mood-option' + (k === "happy" ? " selected" : "") + '" data-mood="' + k + '">' +
            MOODS[k].emoji + ' ' + MOODS[k].name + '</span>';
    }

    app.innerHTML =
        '<div class="feed-tabs" id="feed-tabs">' +
        '<div class="feed-tab active" data-mode="all">🌍 全部分享</div>' +
        '<div class="feed-tab" data-mode="friends">👥 好友动态</div></div>' +
        '<div class="create-inline" id="create-inline">' +
        '<div class="create-row">' +
        '<div class="avatar ' + ava + '">' + initial + '</div>' +
        '<textarea id="mood-textarea" placeholder="今天心情如何？" maxlength="500"></textarea></div>' +
        '<div class="mood-selector" id="mood-selector">' + moodOpts + '</div>' +
        '<div id="img-preview"></div>' +
        '<div class="create-actions">' +
        '<div class="left-actions">' +
        '<input type="file" id="img-input" accept="image/*" style="display:none">' +
        '<button class="icon-btn" id="btn-img" title="添加图片">🖼️</button>' +
        '<span class="char-count"><span id="char-cnt">0</span>/500</span></div>' +
        '<button class="btn btn-primary btn-sm" id="btn-sub">发布</button></div></div>' +
        '<div id="feed-list"><div class="spinner"></div></div>' +
        '<div id="feed-loader" style="display:none"><div class="spinner"></div></div>';

    // Bind mood selector clicks
    var selectedMood = "happy";
    var moodEls = document.querySelectorAll("#mood-selector .mood-option");
    for (var i = 0; i < moodEls.length; i++) {
        moodEls[i].onclick = function() {
            selectedMood = this.getAttribute("data-mood");
            var all = document.querySelectorAll("#mood-selector .mood-option");
            for (var j = 0; j < all.length; j++) all[j].classList.remove("selected");
            this.classList.add("selected");
        };
    }

    // Char counter
    var textarea = getEl("mood-textarea");
    if (textarea) {
        textarea.oninput = function() {
            var cnt = getEl("char-cnt");
            if (cnt) cnt.textContent = this.value.length;
        };
    }

    // Image preview
    var imgFile = null;
    var btnImg = getEl("btn-img");
    var imgInput = getEl("img-input");
    if (btnImg && imgInput) {
        btnImg.onclick = function() { imgInput.click(); };
        imgInput.onchange = function() {
            imgFile = this.files[0];
            var pv = getEl("img-preview");
            if (!pv) return;
            if (imgFile) {
                var url = URL.createObjectURL(imgFile);
                pv.innerHTML = '<div class="image-preview-wrap"><img src="' + url + '"><button class="remove-img" id="rm-img">✕</button></div>';
                var rmBtn = getEl("rm-img");
                if (rmBtn) rmBtn.onclick = function() { imgFile = null; pv.innerHTML = ""; imgInput.value = ""; };
            }
        };
    }

    // Submit
    var btnSub = getEl("btn-sub");
    if (btnSub) {
        btnSub.onclick = async function() {
            var ta = getEl("mood-textarea");
            if (!ta) return;
            var content = ta.value.trim();
            if (!content) { toast("请写下心情描述", true); return; }
            var fd = new FormData();
            fd.append("mood", selectedMood);
            fd.append("content", content);
            fd.append("tags", "");
            if (imgFile) fd.append("image", imgFile);
            btnSub.disabled = true; btnSub.textContent = "发布中...";
            try {
                await API.createMood(fd);
                toast("✨ 发布成功！");
                ta.value = "";
                var cnt = getEl("char-cnt"); if (cnt) cnt.textContent = "0";
                var pv = getEl("img-preview"); if (pv) pv.innerHTML = "";
                if (imgInput) imgInput.value = "";
                imgFile = null;
                feedPage = 1;
                loadFeed();
            } catch (e) { toast(e.message, true); }
            btnSub.disabled = false; btnSub.textContent = "发布";
        };
    }

    // Tabs
    var tabs = document.querySelectorAll("#feed-tabs .feed-tab");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].onclick = function() {
            var all = document.querySelectorAll("#feed-tabs .feed-tab");
            for (var j = 0; j < all.length; j++) all[j].classList.remove("active");
            this.classList.add("active");
            feedMode = this.getAttribute("data-mode");
            feedPage = 1; feedMore = true;
            loadFeed();
        };
    }

    loadFeed();

    // Scroll
    window.onscroll = function() {
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
    var list = getEl("feed-list");
    var loader = getEl("feed-loader");
    if (!list) { feedBusy = false; return; }

    if (!append) list.innerHTML = '<div class="spinner"></div>';
    else if (loader) loader.style.display = "block";

    try {
        var data = feedMode === "friends" ? await API.getFriendsMoods(feedPage) : await API.getMoods(feedPage);
        var html = "";
        for (var i = 0; i < data.records.length; i++) {
            html += moodCard(data.records[i], data.records[i].user_id === (API.user ? API.user.id : -1));
        }
        if (append) {
            list.insertAdjacentHTML("beforeend", html);
        } else {
            list.innerHTML = data.records.length === 0
                ? '<div class="empty-state"><div class="icon">📝</div><p>' + (feedMode === "friends" ? "关注好友后，这里会显示他们的心情" : "还没有心情记录，快来写第一条吧") + '</p></div>'
                : html;
        }
        feedMore = data.page < data.pages;
        if (!feedMore && !append && data.records.length > 0) {
            list.insertAdjacentHTML("beforeend", '<div class="empty-state" style="padding:20px"><p style="color:var(--text-secondary)">— 已经到底了 —</p></div>');
        }
    } catch (e) {
        if (!append) list.innerHTML = '<div class="empty-state"><p>加载失败：' + esc(e.message) + '</p></div>';
    }
    if (loader) loader.style.display = "none";
    feedBusy = false;
}

/* ==================== Friends ==================== */
function renderFriends(app) {
    app.innerHTML = '<div class="page-header">👥 好友</div><div id="frd-ctn"><div class="spinner"></div></div>';
    loadFriends();
}

async function loadFriends() {
    var el = getEl("frd-ctn");
    if (!el) return;
    try {
        var reqs = await API.getFriendRequests();
        var frds = await API.getFriends();
        var h = "";
        if (reqs.length > 0) {
            h += '<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">待处理 (' + reqs.length + ')</div>';
            for (var i = 0; i < reqs.length; i++) {
                var r = reqs[i];
                var ava = avaClass(r.sender_name);
                h += '<div class="friend-request-item">' +
                    '<div class="avatar ' + ava + '" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate(\'profile\',{userId:' + r.sender_id + '})">' + esc(r.sender_name[0].toUpperCase()) + '</div>' +
                    '<div class="fi-info"><div class="fi-name" onclick="navigate(\'profile\',{userId:' + r.sender_id + '})">' + esc(r.sender_name) + '</div><div class="fi-bio">想添加你为好友</div></div>' +
                    '<div class="friend-actions">' +
                    '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();handleFR(' + r.id + ',\'accept\')">接受</button>' +
                    '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();handleFR(' + r.id + ',\'reject\')">拒绝</button></div></div>';
            }
        }
        h += '<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">我的好友 (' + frds.length + ')</div>';
        if (frds.length === 0) {
            h += '<div class="empty-state"><p>还没有好友</p></div>';
        } else {
            for (var i = 0; i < frds.length; i++) {
                var f = frds[i];
                var ava = avaClass(f.username);
                h += '<div class="friend-item">' +
                    '<div class="avatar ' + ava + '" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate(\'profile\',{userId:' + f.id + '})">' + esc(f.username[0].toUpperCase()) + '</div>' +
                    '<div class="fi-info"><div class="fi-name" onclick="navigate(\'profile\',{userId:' + f.id + '})">' + esc(f.username) + '</div><div class="fi-bio">' + esc(f.bio || "暂无简介") + '</div></div>' +
                    '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();removeFriend(' + f.id + ',\'' + esc(f.username) + '\')">删除</button></div>';
            }
        }
        el.innerHTML = h;
    } catch (e) { el.innerHTML = '<div class="empty-state"><p>加载失败：' + esc(e.message) + '</p></div>'; }
}

async function handleFR(rid, act) {
    try { await API.respondFriendRequest(rid, act); toast(act === "accept" ? "已接受" : "已拒绝"); loadFriends(); updateSidebar(); }
    catch (e) { toast(e.message, true); }
}

async function removeFriend(id, name) {
    if (!confirm("确定删除好友 " + name + " 吗？")) return;
    try { await API.removeFriend(id); toast("已删除"); loadFriends(); }
    catch (e) { toast(e.message, true); }
}

/* ==================== Families ==================== */
function renderFamilies(app) {
    app.innerHTML = '<div class="page-header">👨‍👩‍👧 家庭组</div>' +
        '<div style="padding:12px 18px;display:flex;gap:8px;border-bottom:1px solid var(--border-light)">' +
        '<button class="btn btn-primary btn-sm" id="btn-cf">+ 创建家庭组</button>' +
        '<button class="btn btn-outline btn-sm" id="btn-jf">🔗 加入家庭组</button></div>' +
        '<div id="fam-list"><div class="spinner"></div></div>';
    var btnCf = getEl("btn-cf"); if (btnCf) btnCf.onclick = showCreateFam;
    var btnJf = getEl("btn-jf"); if (btnJf) btnJf.onclick = showJoinFam;
    loadFamilies();
}

async function loadFamilies() {
    var el = getEl("fam-list");
    if (!el) return;
    try {
        var fs = await API.getMyFamilies();
        if (fs.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="icon">👨‍👩‍👧</div><p>还没有加入家庭组</p></div>';
        } else {
            var h = "";
            for (var i = 0; i < fs.length; i++) {
                var f = fs[i];
                h += '<div class="family-card" onclick="navigate(\'family-detail\',{groupId:' + f.id + '})">' +
                    '<div class="family-name">👨‍👩‍👧 ' + esc(f.name) + '</div>' +
                    '<div class="family-desc">' + esc(f.description || "暂无描述") + '</div>' +
                    '<div class="family-meta"><span class="meta-item">👥 ' + f.member_count + ' 人</span><span class="meta-item">🔑 ' + f.invite_code + '</span></div></div>';
            }
            el.innerHTML = h;
        }
    } catch (e) { el.innerHTML = '<div class="empty-state"><p>加载失败</p></div>'; }
}

function showCreateFam() {
    showModal("创建家庭组",
        '<div class="form-group"><label>名称</label><input type="text" id="fam-name" placeholder="给家庭组起个名字" maxlength="80"></div>' +
        '<div class="form-group"><label>描述</label><input type="text" id="fam-desc" placeholder="简单介绍一下" maxlength="200"></div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-docf">创建</button>');
    var btn = getEl("btn-docf");
    if (btn) btn.onclick = async function() {
        var n = getEl("fam-name"); var d = getEl("fam-desc");
        if (!n) return;
        var name = n.value.trim();
        if (!name) { toast("请输入名称", true); return; }
        try { await API.createFamily(name, d ? d.value.trim() : ""); toast("创建成功！"); closeModal(); loadFamilies(); }
        catch (e) { toast(e.message, true); }
    };
}

function showJoinFam() {
    showModal("加入家庭组",
        '<div class="form-group"><label>邀请码</label><input type="text" id="inv-code" placeholder="输入6位邀请码" maxlength="6"></div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-doj">加入</button>');
    var btn = getEl("btn-doj");
    if (btn) btn.onclick = async function() {
        var inp = getEl("inv-code"); if (!inp) return;
        var c = inp.value.trim();
        if (!c) { toast("请输入邀请码", true); return; }
        try { var r = await API.joinFamily(c); toast(r.message); closeModal(); loadFamilies(); }
        catch (e) { toast(e.message, true); }
    };
}

/* ==================== Family Detail ==================== */
function renderFamilyDetail(app, gid) {
    app.innerHTML = '<div class="page"><div class="spinner"></div></div>';
    loadFamilyDetail(gid);
}

async function loadFamilyDetail(gid) {
    var app = getEl("app");
    if (!app) return;
    try {
        var g = await API.getFamilyDetail(gid);
        var md = await API.getFamilyMoods(gid, 1);
        var chips = "";
        for (var i = 0; i < g.members.length; i++) {
            var m = g.members[i];
            var ava = avaClass(m.username);
            chips += '<span class="member-chip" onclick="navigate(\'profile\',{userId:' + m.user_id + '})"><span class="chip-avatar ' + ava + '">' + esc(m.username[0].toUpperCase()) + '</span>' + esc(m.username) + '</span>';
        }
        var mh = md.records.length === 0 ? '<div class="empty-state"><p>还没有心情记录</p></div>' : "";
        for (var i = 0; i < md.records.length; i++) {
            mh += moodCard(md.records[i], md.records[i].user_id === (API.user ? API.user.id : -1));
        }
        app.innerHTML =
            '<div class="page-header">← 返回</div>' +
            '<div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">' +
            '<h2 style="font-size:20px;margin-bottom:4px">👨‍👩‍👧 ' + esc(g.name) + '</h2>' +
            '<p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px">' + esc(g.description || "暂无描述") + '</p>' +
            '<div class="invite-code-box"><div class="code">' + g.invite_code + '</div><div class="code-hint">邀请码 — 分享给家人加入</div></div>' +
            '<div style="font-size:13px;font-weight:650;margin-bottom:6px">成员 (' + g.members.length + ')</div>' +
            '<div class="member-chips">' + chips + '</div>' +
            '<div style="margin-top:14px;display:flex;gap:8px">' +
            (!g.is_creator && g.is_member ? '<button class="btn btn-outline btn-sm" id="btn-leave">退出家庭组</button>' : "") +
            (g.is_creator ? '<button class="btn btn-danger btn-sm" id="btn-disband">解散家庭组</button>' : "") +
            '</div></div><div id="fam-moods">' + mh + '</div>';
        var lb = getEl("btn-leave"), db = getEl("btn-disband");
        if (lb) lb.onclick = async function() { if (!confirm("确定退出？")) return; try { await API.leaveFamily(gid); toast("已退出"); navigate("families"); } catch (e) { toast(e.message, true); } };
        if (db) db.onclick = async function() { if (!confirm("确定解散？此操作不可撤销！")) return; try { await API.disbandFamily(gid); toast("已解散"); navigate("families"); } catch (e) { toast(e.message, true); } };
    } catch (e) { app.innerHTML = '<div class="empty-state"><p>加载失败：' + esc(e.message) + '</p></div>'; }
}

/* ==================== Profile ==================== */
function renderProfile(app, userId) {
    var selfId = API.user ? API.user.id : null;
    var eid = userId || selfId;
    var isSelf = selfId && String(selfId) === String(eid);
    app.innerHTML = '<div class="page"><div class="spinner"></div></div>';
    loadProfile(eid, isSelf);
}

async function loadProfile(uid, isSelf) {
    var app = getEl("app");
    if (!app) return;
    try {
        var p = await API.getProfile(uid);
        var md = await API.getUserMoods(uid, 1);
        var ava = avaClass(p.username);
        var mh = "";
        if (md.records.length === 0) {
            mh = '<div class="empty-state"><div class="icon">📭</div><p>还没有心情记录</p></div>';
        } else {
            for (var i = 0; i < md.records.length; i++) {
                mh += moodCard(md.records[i], String(md.records[i].user_id) === String(API.user ? API.user.id : -1));
            }
        }
        var selfId = API.user ? API.user.id : null;
        app.innerHTML =
            '<div class="page-header" style="font-size:18px;font-weight:700;padding:16px 18px">' +
            (isSelf ? '👤 我的主页' : '👤 ' + esc(p.username) + ' 的主页') +
            (!isSelf ? '<span style="font-size:13px;font-weight:400;color:var(--primary);float:right;cursor:pointer" onclick="navigate(\'profile\',{userId:' + selfId + '})">← 返回我的主页</span>' : '') +
            '</div>' +
            '<div class="profile-cover"></div>' +
            '<div class="profile-info">' +
            '<div class="profile-avatar-lg ' + ava + '">' + esc(p.username[0].toUpperCase()) + '</div>' +
            '<div class="profile-name">' + esc(p.username) + '</div>' +
            '<div class="profile-handle">@' + esc(p.username) + '</div>' +
            '<div class="profile-bio">' + esc(p.bio || "这个人很懒，什么都没写") + '</div>' +
            '<div class="profile-stats">' +
            '<span><strong>' + p.mood_count + '</strong> 心情</span>' +
            '<span><strong>' + p.friend_count + '</strong> 好友</span>' +
            '<span><strong>' + p.family_count + '</strong> 家庭</span></div>' +
            '<div class="profile-actions">' +
            (isSelf
                ? '<button class="btn btn-outline btn-sm" id="btn-edit">编辑资料</button> <button class="btn btn-outline btn-sm" id="btn-settings">⚙️ 账号设置</button>'
                : '<button class="btn btn-primary btn-sm" id="btn-friend">➕ 添加好友</button>') +
            '</div></div><div id="profile-moods">' + mh + '</div>';

        if (isSelf) {
            var editBtn = getEl("btn-edit"); if (editBtn) editBtn.onclick = function() { showEditProfile(p); };
            var setBtn = getEl("btn-settings"); if (setBtn) setBtn.onclick = function() { navigate("settings"); };
        } else {
            var fb = getEl("btn-friend");
            if (fb) fb.onclick = async function() {
                try { var r = await API.sendFriendRequest(uid); toast(r.message); fb.textContent = "✓ 已发送"; fb.disabled = true; }
                catch (e) { toast(e.message, true); }
            };
        }
    } catch (e) { app.innerHTML = '<div class="empty-state"><p>加载失败：' + esc(e.message) + '</p></div>'; }
}

function showEditProfile(p) {
    showModal("编辑资料",
        '<div class="form-group"><label>简介</label><textarea id="edit-bio" maxlength="200" placeholder="介绍一下自己...">' + esc(p.bio || "") + '</textarea></div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-save">保存</button>');
    var btn = getEl("btn-save");
    if (btn) btn.onclick = async function() {
        var inp = getEl("edit-bio"); if (!inp) return;
        var bio = inp.value.trim();
        try {
            var r = await API.updateProfile(bio);
            if (API.user && API.user.id === p.id) { API.user.bio = bio; localStorage.setItem("user", JSON.stringify(API.user)); }
            toast(r.message); closeModal(); navigate("profile", { userId: p.id });
        } catch (e) { toast(e.message, true); }
    };
}

/* ==================== Settings ==================== */
function renderSettings(app) {
    app.innerHTML = '<div class="page">' +
        '<div class="page-header">⚙️ 账号设置</div>' +
        '<div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">' +
        '<h3 style="margin-bottom:12px">修改密码</h3>' +
        '<div class="form-group"><label>原密码</label><input type="password" id="s-old-pw" placeholder="输入原密码"></div>' +
        '<div class="form-group"><label>新密码</label><input type="password" id="s-new-pw" placeholder="输入新密码（至少4位）"></div>' +
        '<button class="btn btn-primary" id="btn-chpw">修改密码</button></div></div>';
    var btn = getEl("btn-chpw");
    if (btn) btn.onclick = async function() {
        var o = getEl("s-old-pw"), n = getEl("s-new-pw");
        if (!o || !n) return;
        var oldPw = o.value, newPw = n.value;
        if (!oldPw || !newPw) { toast("请填写完整", true); return; }
        if (newPw.length < 4) { toast("新密码至少4个字符", true); return; }
        try { await API.changePassword(oldPw, newPw); toast("密码修改成功！"); navigate("profile", { userId: API.user ? API.user.id : null }); }
        catch (e) { toast(e.message, true); }
    };
}

/* ==================== Stats ==================== */
function renderStats(app) {
    app.innerHTML = '<div class="page"><div style="padding:18px"><div class="spinner"></div></div></div>';
    loadStats();
}

async function loadStats() {
    var app = getEl("app");
    if (!app) return;
    try {
        var d = await API.getStats();
        var total = 0;
        var distKeys = Object.keys(d.mood_distribution);
        for (var i = 0; i < distKeys.length; i++) total += d.mood_distribution[distKeys[i]];
        if (total === 0) total = 1;
        var cols = { happy: "#f59e0b", calm: "#6366f1", sad: "#3b82f6", anxious: "#ef4444", excited: "#ec4899", tired: "#8b5cf6" };
        var distH = "";
        var entries = Object.entries(d.mood_distribution);
        for (var i = 0; i < entries.length; i++) {
            var k = entries[i][0], v = entries[i][1];
            var pct = ((v / total) * 100).toFixed(1);
            distH += '<div class="stat-row" style="padding:8px 0"><span class="stat-emoji">' + MOODS[k].emoji + '</span>' +
                '<span style="width:50px;font-size:14px;font-weight:550">' + MOODS[k].name + '</span>' +
                '<div class="bar-mini"><div class="bar-mini-fill" style="width:' + pct + '%;background:' + cols[k] + '"></div></div>' +
                '<span style="font-size:14px;font-weight:650;width:40px;text-align:right">' + v + '</span></div>';
        }
        var medals = ["🥇", "🥈", "🥉"];
        var topH = d.top_users.length === 0 ? '<p style="color:var(--text-secondary);text-align:center;padding:12px">暂无数据</p>' : "";
        for (var i = 0; i < d.top_users.length; i++) {
            var u = d.top_users[i];
            topH += '<div class="friend-item"><span style="font-size:22px;width:30px">' + (medals[i] || (i + 1)) + '</span>' +
                '<span style="font-weight:650;flex:1">' + esc(u.username) + '</span>' +
                '<span style="color:var(--text-secondary)">' + u.count + ' 条</span></div>';
        }
        app.innerHTML =
            '<div class="page-header">📊 统计</div>' +
            '<div style="padding:16px 18px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">' +
            '<div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">' + d.total_records + '</div><div style="font-size:12px;color:var(--text-secondary)">总记录</div></div>' +
            '<div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">' + d.total_users + '</div><div style="font-size:12px;color:var(--text-secondary)">用户数</div></div></div>' +
            '<div style="padding:16px 18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">心情分布</div>' + distH + '</div>' +
            '<div style="padding:16px 18px;background:var(--card-bg)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">🏆 活跃用户</div>' + topH + '</div>';
    } catch (e) { app.innerHTML = '<div class="empty-state"><p>加载失败：' + esc(e.message) + '</p></div>'; }
}

/* ==================== Modal & Image Viewer ==================== */
function showModal(title, body) {
    var content = getEl("modal-content");
    if (!content) return;
    content.innerHTML = '<div class="modal-header"><span>' + title + '</span><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body">' + body + '</div>';
    var ov = getEl("modal-overlay");
    if (ov) {
        ov.style.display = "flex";
        ov.onclick = function(e) { if (e.target === ov) closeModal(); };
    }
}

function closeModal() {
    var ov = getEl("modal-overlay");
    if (ov) ov.style.display = "none";
}

function openImg(url) {
    var vi = getEl("image-viewer");
    var img = getEl("image-viewer-img");
    if (vi && img) { img.src = url; vi.style.display = "flex"; vi.onclick = closeImg; }
}

function closeImg() {
    var vi = getEl("image-viewer");
    if (vi) vi.style.display = "none";
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

// Start when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
