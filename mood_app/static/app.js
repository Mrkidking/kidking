/* ==================== API Layer ==================== */
var API = {
    token: localStorage.getItem("token"), user: (function() { try { return JSON.parse(localStorage.getItem("user")); } catch(e) { return null; } })(),
    headers: function() { var h = {}; if (this.token) h["Authorization"] = "Bearer " + this.token; return h; },
    request: async function(m, url, body, isF) {
        var o = { method: m, headers: this.headers() };
        if (isF) o.body = body; else if (body) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(body); }
        var r = await fetch(url, o), d = await r.json();
        if (!r.ok) throw new Error(d.error || "请求失败"); return d;
    },
    register: function(u,p) { return this.request("POST","/api/register",{username:u,password:p}); },
    login: function(u,p) { return this.request("POST","/api/login",{username:u,password:p}); },
    changePw: function(o,n) { return this.request("PUT","/api/password",{old_password:o,new_password:n}); },
    updateProfile: function(d) { return this.request("PUT","/api/profile",d); },
    getProfile: function(id) { return this.request("GET","/api/profile/"+id); },
    searchUsers: function(q) { return this.request("GET","/api/users/search?q="+encodeURIComponent(q)); },
    createMood: function(fd) { return this.request("POST","/api/moods",fd,true); },
    getMoods: function(p,m) { return this.request("GET","/api/moods?page="+p+"&per_page=15&mood="+(m||"")); },
    getMyMoods: function(p) { return this.request("GET","/api/moods/my?page="+p+"&per_page=15"); },
    getUserMoods: function(uid,p) { return this.request("GET","/api/moods/user/"+uid+"?page="+p+"&per_page=15"); },
    deleteMood: function(id) { return this.request("DELETE","/api/moods/"+id); },
    getStats: function() { return this.request("GET","/api/stats"); },
    getWeeklyStats: function() { return this.request("GET","/api/stats/weekly"); },
    getStreak: function() { return this.request("GET","/api/stats/streak"); },
    getOnThisDay: function() { return this.request("GET","/api/moods/onthisday"); },
    createFamily: function(n,d) { return this.request("POST","/api/families",{name:n,description:d}); },
    joinFamily: function(c) { return this.request("POST","/api/families/join",{invite_code:c}); },
    getMyFamilies: function() { return this.request("GET","/api/families/my"); },
    getFamilyDetail: function(id) { return this.request("GET","/api/families/"+id); },
    getFamilyMoods: function(id,p) { return this.request("GET","/api/families/"+id+"/moods?page="+p+"&per_page=15"); },
    leaveFamily: function(id) { return this.request("POST","/api/families/"+id+"/leave"); },
    disbandFamily: function(id) { return this.request("DELETE","/api/families/"+id); },
    sendFriendRequest: function(uid) { return this.request("POST","/api/friends/request/"+uid); },
    respondFR: function(rid,act) { return this.request("POST","/api/friends/respond/"+rid,{action:act}); },
    getFriendRequests: function() { return this.request("GET","/api/friends/requests"); },
    getFriends: function() { return this.request("GET","/api/friends"); },
    getFriendsMoods: function(p) { return this.request("GET","/api/friends/moods?page="+p+"&per_page=15"); },
    removeFriend: function(id) { return this.request("DELETE","/api/friends/remove/"+id); },
};

/* ==================== Constants ==================== */
var MOODS = { happy:{emoji:"😊",name:"开心"}, calm:{emoji:"😌",name:"平静"}, sad:{emoji:"😢",name:"难过"}, anxious:{emoji:"😰",name:"焦虑"}, excited:{emoji:"🤩",name:"兴奋"}, tired:{emoji:"😴",name:"疲惫"} };
var AVATAR_COLORS = ["purple","pink","orange","green","red","indigo","cyan","amber"];
var AVATAR_EMOJIS = ["😀","😂","🥰","😎","🤩","🦊","🐱","🐶","🦄","🐼","🌸","⭐","🔥","💜","🌈","🎉","🍀","🌙","☀️","💎"];
var THEMES = { purple:"🟣紫", warm:"🟠暖阳", ocean:"🔵深海", forest:"🟢森林", sunset:"🔴晚霞" };

/* ==================== Utilities ==================== */
function $el(id) { return document.getElementById(id); }
function toast(msg, err) { var e = $el("toast"); if (!e) return; e.textContent = msg; e.className = "toast " + (err?"error":"") + " show"; clearTimeout(e._t); e._t = setTimeout(function() { e.classList.remove("show"); }, 2800); }
function fmtTime(iso) { var d = new Date(iso), n = new Date(), df = n - d; if (df < 60000) return "刚刚"; if (df < 3600000) return Math.floor(df/60000)+" 分钟前"; if (df < 86400000) return Math.floor(df/3600000)+" 小时前"; if (df < 604800000) return Math.floor(df/86400000)+" 天前"; var p = function(n) { return String(n).padStart(2,"0"); }; return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); }
function fmtDate(iso) { var d = new Date(iso); return d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日加入"; }
function esc(s) { if (!s) return ""; var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function avaColor(s) { var h = 0; for (var i = 0; i < (s||"").length; i++) h = s.charCodeAt(i) + ((h<<5)-h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function imgUrl(f) { return f ? "/api/uploads/" + f : ""; }
function makePwToggle(id) { return '<span class="pw-toggle" onclick="togglePw(\''+id+'\')">👁️</span>'; }
function togglePw(id) { var el = $el(id); if (!el) return; if (el.type==="password") { el.type="text"; el.nextElementSibling.textContent="🙈"; } else { el.type="password"; el.nextElementSibling.textContent="👁️"; } }

/* ==================== Theme ==================== */
function applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, "").trim();
    if (theme && theme !== "purple") document.body.classList.add("theme-" + theme);
}
if (API.user && API.user.theme) applyTheme(API.user.theme);

/* ==================== Navigation ==================== */
var curView = "", curData = {};

function updateSidebar() {
    var nav = $el("sidebar-nav"), userDiv = $el("sidebar-user"), postBtn = $el("sidebar-post-btn");
    if (!nav) return;
    if (API.token && API.user) {
        if (postBtn) { postBtn.style.display = ""; postBtn.onclick = function() { navigate("feed"); }; }
        nav.innerHTML = "";
        var links = [ ["feed","🏠","首页",null], ["friends","👥","好友",null], ["families","👨‍👩‍👧","家庭",null], ["profile","👤","个人",API.user.id], ["stats","📊","统计",null] ];
        for (var i = 0; i < links.length; i++) {
            var a = document.createElement("a");
            a.setAttribute("data-view", links[i][0]);
            if (links[i][3] !== null) a.setAttribute("data-user-id", String(links[i][3]));
            a.innerHTML = '<span class="nav-icon">'+links[i][1]+'</span> <span>'+links[i][2]+'</span>';
            a.onclick = (function(v,uid) { return function(e) { e.preventDefault(); navigate(v,{userId:uid}); }; })(links[i][0], links[i][3]);
            nav.appendChild(a);
        }
        var emoji = API.user.avatar_emoji || API.user.username[0].toUpperCase();
        var color = API.user.avatar_color || avaColor(API.user.username);
        userDiv.innerHTML = '<div class="avatar avatar-'+color+'" style="width:40px;height:40px;font-size:16px">'+esc(emoji)+'</div>' +
            '<div class="user-info"><div class="uname">'+esc(API.user.username)+'</div><div class="uhandle">@'+esc(API.user.username)+'</div></div>' +
            '<button class="btn btn-outline btn-sm" style="margin-left:auto;flex-shrink:0" id="btn-logout">退出</button>';
        userDiv.onclick = function(e) { if (e.target && e.target.id==="btn-logout") return; navigate("profile",{userId:API.user.id}); };
        var lb = $el("btn-logout"); if (lb) lb.onclick = function(e) { e.stopPropagation(); logout(); };
    } else {
        if (postBtn) postBtn.style.display = "none";
        nav.innerHTML = ""; userDiv.innerHTML = "";
    }
    // Mobile nav
    var mn = $el("mobile-nav");
    if (mn) mn.style.display = (API.token && API.user) ? "flex" : "none";
}

function navigate(view, data) {
    curView = view; curData = data || {}; window.onscroll = null;
    // Desktop sidebar active
    var links = document.querySelectorAll(".sidebar-nav a");
    for (var i = 0; i < links.length; i++) links[i].classList.remove("active");
    var al = document.querySelector('.sidebar-nav a[data-view="'+view+'"]');
    if (al) al.classList.add("active");
    // Mobile nav active
    var mlinks = document.querySelectorAll(".mobile-nav a");
    for (var i = 0; i < mlinks.length; i++) mlinks[i].classList.remove("active");
    var mal = document.querySelector('.mobile-nav a[data-view="'+view+'"]');
    if (mal) mal.classList.add("active");

    var app = $el("app"), rp = $el("right-panel");
    if (!app) return;

    if (view === "login") { renderAuth(app); renderRight(rp, ""); }
    else if (view === "feed") { renderFeed(app); renderRightDefault(rp); }
    else if (view === "friends") { renderFriends(app); renderRight(rp, ""); }
    else if (view === "families") { renderFamilies(app); renderRight(rp, ""); }
    else if (view === "family-detail") { renderFamilyDetail(app, data.groupId); renderRight(rp, ""); }
    else if (view === "profile") { renderProfile(app, data.userId || (API.user&&API.user.id)); renderRightSearch(rp); }
    else if (view === "settings") { renderSettings(app); renderRight(rp, ""); }
    else if (view === "stats") { renderStats(app); renderRight(rp, ""); }
    else if (view === "post") { navigate("feed"); setTimeout(function() { var t = $el("mood-textarea"); if (t) { t.focus(); window.scrollTo({top:0,behavior:"smooth"}); } }, 100); }
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
    panel.innerHTML = '<div class="right-card"><h3>🔍 搜索用户</h3><input class="search-input" id="search-input" placeholder="输入用户名..."><div id="search-results" style="margin-top:12px"></div></div>';
    var inp = $el("search-input"); if (!inp) return; var timer;
    inp.oninput = function() { clearTimeout(timer); var q = this.value.trim(); var r = $el("search-results"); if (!q) { if (r) r.innerHTML=""; return; }
        timer = setTimeout(async function() { try { var u = await API.searchUsers(q); var e = $el("search-results"); if (!e) return;
            e.innerHTML = u.length===0 ? '<p style="color:var(--text-secondary);font-size:13px;text-align:center;padding:12px">未找到</p>'
                : u.map(function(x) { return '<div class="user-row" onclick="navigate(\'profile\',{userId:'+x.id+'})"><div class="avatar-sm avatar-'+(x.avatar_color||avaColor(x.username))+'">'+esc(x.avatar_emoji||x.username[0].toUpperCase())+'</div><div class="ur-info"><div class="ur-name">'+esc(x.username)+'</div><div class="ur-stat">'+esc(x.bio||"暂无简介")+'</div></div></div>'; }).join("");
        } catch(ee) {} }, 300); };
}
async function loadRightStats() { var e = $el("right-stats"); if (!e) return; try { var d = await API.getStats(); var t=0,ks=Object.keys(d.mood_distribution); for (var i=0;i<ks.length;i++) t+=d.mood_distribution[ks[i]]; if(t===0)t=1; var cols={happy:"#f59e0b",calm:"#6366f1",sad:"#3b82f6",anxious:"#ef4444",excited:"#ec4899",tired:"#8b5cf6"}; var h="",es=Object.entries(d.mood_distribution); for(var i=0;i<es.length;i++){var k=es[i][0],v=es[i][1];h+='<div class="stat-row"><span class="stat-emoji">'+MOODS[k].emoji+'</span><div class="bar-mini"><div class="bar-mini-fill" style="width:'+((v/t)*100).toFixed(1)+'%;background:'+cols[k]+'"></div></div><span style="font-size:13px;width:32px;text-align:right">'+v+'</span></div>';} e.innerHTML = h; } catch(ee) { e.innerHTML=""; } }

/* ==================== Auth ==================== */
function renderAuth(app) { var mode="login";
    function h() {
        var isReg = mode !== "login";
        return '<div class="auth-container"><div class="auth-card"><div class="logo">🌈</div><h2>'+(isReg?"创建账号":"欢迎回来")+'</h2><p class="subtitle">'+(isReg?"加入心情日记社区":"登录心情日记")+'</p><div class="form-group"><label>用户名</label><input type="text" id="auth-un" placeholder="请输入用户名" maxlength="20" autocomplete="username"></div><div class="form-group"><label>密码</label><div class="pw-wrap"><input type="password" id="auth-pw" placeholder="请输入密码" autocomplete="'+(isReg?"new-password":"current-password")+'">'+makePwToggle("auth-pw")+'</div></div>'+
        (isReg ? '<div class="form-group"><label>确认密码</label><div class="pw-wrap"><input type="password" id="auth-pw2" placeholder="再次输入密码">'+makePwToggle("auth-pw2")+'</div></div>' : '') +
        '<button class="btn btn-primary btn-lg" id="auth-btn">'+(isReg?"注 册":"登 录")+'</button><div class="auth-switch">'+(isReg?"已有账号？":"还没有账号？")+' <a id="auth-sw">'+(isReg?"立即登录":"立即注册")+'</a></div></div></div>';
    }
    app.innerHTML = h();
    $el("auth-sw").onclick = function() { mode = (mode==="login"?"register":"login"); app.innerHTML = h(); bind(); };
    bind();
    function bind() { $el("auth-btn").onclick = submit; $el("auth-un").onkeydown = function(e) { if(e.key==="Enter") $el("auth-pw").focus(); }; $el("auth-pw").onkeydown = function(e) { if(e.key==="Enter") submit(); }; }
    async function submit() { var u = $el("auth-un").value.trim(), p = $el("auth-pw").value; var isReg = mode !== "login"; if(!u||!p) { toast("请填写用户名和密码",true); return; } if(u.length<2) { toast("用户名至少2个字符",true); return; } if(p.length<4) { toast("密码至少4个字符",true); return; } if(isReg) { var p2 = $el("auth-pw2"); if(p2&&p!==p2.value) { toast("两次密码不一致",true); return; } } var btn = $el("auth-btn"); btn.disabled = true; btn.textContent = "处理中..."; btn.style.opacity = "0.6"; try { var res = isReg ? await API.register(u,p) : await API.login(u,p); API.token = res.token; API.user = res.user; localStorage.setItem("token", res.token); localStorage.setItem("user", JSON.stringify(res.user)); applyTheme(API.user.theme); toast(res.message||"成功！"); updateSidebar(); navigate("feed"); } catch(e) { toast(e.message,true); } btn.disabled = false; btn.textContent = isReg?"注 册":"登 录"; btn.style.opacity = "1"; }
}

/* ==================== Mood Card ==================== */
function moodCard(r, showDel) {
    var m = MOODS[r.mood]||{emoji:"❓",name:r.mood}, col = avaColor(r.username);
    var tagsH = ""; if (r.tags&&r.tags.length) { tagsH = '<div class="mood-card-tags">'; for (var i=0;i<r.tags.length;i++) tagsH += '<span class="tag">'+esc(r.tags[i])+'</span>'; tagsH += '</div>'; }
    var imgH = r.image ? '<img class="mood-card-image" src="'+imgUrl(r.image)+'" onclick="event.stopPropagation();openImg(\''+imgUrl(r.image)+'\')" loading="lazy">' : "";
    var privH = r.is_private ? ' <span class="private-badge">🔒 私密</span>' : '';
    var delH = showDel ? '<button class="action-btn" title="删除" onclick="event.stopPropagation();delMood('+r.id+')">🗑️</button>' : '';
    return '<div class="mood-card"><div class="mood-card-header">' +
        '<div class="avatar avatar-'+col+'" onclick="event.stopPropagation();navigate(\'profile\',{userId:'+r.user_id+'})">'+esc((r.username||"?")[0].toUpperCase())+'</div>' +
        '<div class="header-info"><div class="header-row">' +
        '<span class="uname" onclick="event.stopPropagation();navigate(\'profile\',{userId:'+r.user_id+'})">'+esc(r.username)+'</span>' +
        '<span class="mood-tag">'+m.emoji+' '+m.name+'</span>'+privH+'<span class="utime">· '+fmtTime(r.created_at)+'</span>' +
        '</div></div></div><div class="mood-card-content">'+esc(r.content)+'</div>'+imgH+tagsH+'<div class="mood-card-actions-row">'+delH+'</div></div>';
}
async function delMood(id) { if(!confirm("确定删除？")) return; try { await API.deleteMood(id); toast("已删除"); if(curView==="feed") navigate("feed"); else if(curView==="profile") navigate("profile",curData); } catch(e) { toast(e.message,true); } }

/* ==================== Feed ==================== */
var feedMode = "all", feedPage = 1, feedMore = true, feedBusy = false;

function renderFeed(app) {
    feedMode = "all"; feedPage = 1; feedMore = true;
    var color = API.user ? (API.user.avatar_color || avaColor(API.user.username)) : "purple";
    var emoji = API.user ? (API.user.avatar_emoji || API.user.username[0].toUpperCase()) : "?";
    var moodOpts = "", ks = Object.keys(MOODS);
    for (var i = 0; i < ks.length; i++) { var k = ks[i]; moodOpts += '<span class="mood-option'+(k==="happy"?" selected":"")+'" data-mood="'+k+'">'+MOODS[k].emoji+' '+MOODS[k].name+'</span>'; }

    app.innerHTML =
        '<div class="feed-tabs" id="feed-tabs"><div class="feed-tab active" data-mode="all">🌍 广场</div><div class="feed-tab" data-mode="friends">👥 好友</div></div>' +
        '<div id="onthisday" style="display:none"></div>' +
        '<div class="create-inline"><div class="create-row"><div class="avatar avatar-'+color+'">'+esc(emoji)+'</div><textarea id="mood-textarea" placeholder="今天心情如何？" maxlength="500"></textarea></div>' +
        '<div class="mood-selector" id="mood-selector">'+moodOpts+'</div><div id="img-preview"></div>' +
        '<div class="create-actions"><div class="left-actions">' +
        '<input type="file" id="img-input" accept="image/*" style="display:none">' +
        '<button class="icon-btn" id="btn-img" title="图片">🖼️</button>' +
        '<div class="private-toggle" id="private-toggle" title="仅自己可见"><span class="toggle-switch" id="toggle-switch"></span>🔒 私密</div>' +
        '<span class="char-count"><span id="char-cnt">0</span>/500</span></div>' +
        '<button class="btn btn-primary btn-sm" id="btn-sub">发布</button></div></div>' +
        '<div id="feed-list">'+skeletonHTML()+'</div><div id="feed-loader" style="display:none"><div class="spinner"></div></div>';

    var selMood = "happy", isPrivate = false;
    // Mood selector
    var mels = document.querySelectorAll("#mood-selector .mood-option");
    for (var i = 0; i < mels.length; i++) mels[i].onclick = function() { selMood = this.getAttribute("data-mood"); var all = document.querySelectorAll("#mood-selector .mood-option"); for (var j=0;j<all.length;j++)all[j].classList.remove("selected");this.classList.add("selected"); };
    // Private toggle
    var pt = $el("private-toggle"), ts = $el("toggle-switch");
    if (pt && ts) pt.onclick = function() { isPrivate = !isPrivate; if (isPrivate) { ts.classList.add("on"); pt.innerHTML = '<span class="toggle-switch on" id="toggle-switch"></span>🔒 私密'; } else { ts.classList.remove("on"); pt.innerHTML = '<span class="toggle-switch" id="toggle-switch"></span>🔒 私密'; } };
    // Textarea with draft auto-save
    var ta = $el("mood-textarea");
    if (ta) {
        var savedDraft = localStorage.getItem("mood_draft") || "";
        if (savedDraft) ta.value = savedDraft;
        var cc = $el("char-cnt"); if (cc) cc.textContent = ta.value.length;
        ta.oninput = function() {
            localStorage.setItem("mood_draft", this.value);
            var c = $el("char-cnt"); if (c) c.textContent = this.value.length;
        };
    }
    // Image
    var imgFile = null, btnImg = $el("btn-img"), imgInput = $el("img-input");
    if (btnImg&&imgInput) { btnImg.onclick = function() { imgInput.click(); }; imgInput.onchange = function() { imgFile = this.files[0]; var pv = $el("img-preview"); if(!pv) return; if(imgFile) { var url = URL.createObjectURL(imgFile); pv.innerHTML = '<div class="image-preview-wrap"><img src="'+url+'"><button class="remove-img" id="rm-img">✕</button></div>'; var rm=$el("rm-img"); if(rm)rm.onclick=function(){imgFile=null;pv.innerHTML="";imgInput.value="";}; } }; }
    // Submit
    var bs = $el("btn-sub");
    if (bs) bs.onclick = async function() { var ta=$el("mood-textarea"); if(!ta)return; var content=ta.value.trim(); if(!content){toast("请写下心情描述",true);return;} var fd=new FormData(); fd.append("mood",selMood);fd.append("content",content);fd.append("tags","");fd.append("is_private",isPrivate?"true":"false"); if(imgFile)fd.append("image",imgFile); bs.disabled=true;bs.textContent="发布中..."; try{await API.createMood(fd);toast("✨ 心情已记录！");ta.value="";localStorage.removeItem("mood_draft");var cc=$el("char-cnt");if(cc)cc.textContent="0";var pv=$el("img-preview");if(pv)pv.innerHTML="";if(imgInput)imgInput.value="";imgFile=null;feedPage=1;loadFeed();loadOnThisDay();}catch(e){toast(e.message,true);}bs.disabled=false;bs.textContent="发布"; };
    // Tabs
    var tabs = document.querySelectorAll("#feed-tabs .feed-tab");
    for (var i=0;i<tabs.length;i++) tabs[i].onclick = function() { var all=document.querySelectorAll("#feed-tabs .feed-tab"); for(var j=0;j<all.length;j++)all[j].classList.remove("active");this.classList.add("active");feedMode=this.getAttribute("data-mode");feedPage=1;feedMore=true;loadFeed(); };
    loadFeed();
    loadOnThisDay();
    window.onscroll = function() { if(feedBusy||!feedMore||curView!=="feed")return; if(document.documentElement.scrollHeight-window.scrollY-window.innerHeight<300){feedPage++;loadFeed(true);} };
}

function skeletonHTML() { var h=""; for(var i=0;i<4;i++)h+='<div class="skeleton-card"><div class="sk-header"><div class="skeleton sk-avatar"></div><div><div class="skeleton sk-line" style="width:120px"></div><div class="skeleton sk-line sk-line-short" style="width:80px;margin-top:4px"></div></div></div><div class="skeleton sk-line sk-line-full" style="margin-top:12px"></div><div class="skeleton sk-line sk-line-short"></div></div>'; return h; }

async function loadFeed(append) { if(feedBusy)return;feedBusy=true;var list=$el("feed-list"),loader=$el("feed-loader");if(!list){feedBusy=false;return;}if(!append)list.innerHTML=skeletonHTML();else if(loader)loader.style.display="block";try{var data=feedMode==="friends"?await API.getFriendsMoods(feedPage):await API.getMoods(feedPage);var h="";for(var i=0;i<data.records.length;i++)h+=moodCard(data.records[i],data.records[i].user_id===(API.user?API.user.id:-1));if(append)list.insertAdjacentHTML("beforeend",h);else list.innerHTML=data.records.length===0?'<div class="empty-state"><div class="icon">📝</div><h3>还没有心情记录</h3><p>'+(feedMode==="friends"?"添加好友后查看他们的心情":"写下第一条心情，开始记录吧")+'</p></div>':h;feedMore=data.page<data.pages;if(!feedMore&&!append&&data.records.length>0)list.insertAdjacentHTML("beforeend",'<div class="empty-state" style="padding:20px"><p style="color:var(--text-secondary)">— 已经到底了 —</p></div>');}catch(e){if(!append)list.innerHTML='<div class="empty-state"><div class="icon">⚠️</div><p>'+esc(e.message)+'</p></div>';}if(loader)loader.style.display="none";feedBusy=false;}

async function loadOnThisDay() {
    if (!API.token) return;
    var el = $el("onthisday"); if (!el) return;
    try {
        var records = await API.getOnThisDay();
        if (!records.length) { el.style.display = "none"; return; }
        el.style.display = "block";
        el.innerHTML =
            '<div class="onthisday-banner" style="padding:12px 18px;background:var(--primary-bg);border-bottom:1px solid var(--border-light)">' +
            '<div style="font-weight:600;font-size:14px;color:var(--primary)">📅 那年今日</div>' +
            '<div style="margin-top:6px">' +
            records.map(function(r) {
                var year = new Date(r.created_at).getFullYear();
                var m = MOODS[r.mood] || { emoji: "❓", name: r.mood };
                return '<div style="padding:4px 0;font-size:13px;color:var(--text-secondary)">' +
                    '<span style="color:var(--text)">' + year + '年</span> ' + m.emoji + ' ' + esc(r.content).substring(0, 40) + (r.content.length > 40 ? '...' : '') + '</div>';
            }).join("") + '</div></div>';
    } catch(e) { el.style.display = "none"; }
}

/* ==================== Friends ==================== */
function renderFriends(app) { app.innerHTML = '<div class="page-header">👥 好友</div><div id="frd-ctn">'+skeletonHTML()+'</div>'; loadFriends(); }
async function loadFriends() { var el = $el("frd-ctn"); if (!el) return; try { var reqs=await API.getFriendRequests(), frds=await API.getFriends(), h=""; if(reqs.length){ h+='<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">待处理 ('+reqs.length+')</div>'; for(var i=0;i<reqs.length;i++){var r=reqs[i],col=avaColor(r.sender_name);h+='<div class="friend-request-item"><div class="avatar avatar-'+col+'" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate(\'profile\',{userId:'+r.sender_id+'})">'+esc(r.sender_name[0].toUpperCase())+'</div><div class="fi-info"><div class="fi-name" onclick="navigate(\'profile\',{userId:'+r.sender_id+'})">'+esc(r.sender_name)+'</div><div class="fi-bio">想添加你为好友</div></div><div class="friend-actions"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();handleFR('+r.id+',\'accept\')">接受</button><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();handleFR('+r.id+',\'reject\')">拒绝</button></div></div>';} } h+='<div style="padding:14px 18px;font-weight:700;font-size:15px;border-bottom:1px solid var(--border-light)">我的好友 ('+frds.length+')</div>'; if(!frds.length)h+='<div class="empty-state"><div class="icon">👥</div><h3>还没有好友</h3><p>去广场认识新朋友吧</p></div>'; else for(var i=0;i<frds.length;i++){var f=frds[i],col=f.avatar_color||avaColor(f.username),em=f.avatar_emoji||f.username[0].toUpperCase();h+='<div class="friend-item"><div class="avatar avatar-'+col+'" style="width:40px;height:40px;font-size:16px;cursor:pointer" onclick="navigate(\'profile\',{userId:'+f.id+'})">'+esc(em)+'</div><div class="fi-info"><div class="fi-name" onclick="navigate(\'profile\',{userId:'+f.id+'})">'+esc(f.username)+'</div><div class="fi-bio">'+esc(f.bio||"暂无简介")+'</div></div><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();removeFriend('+f.id+',\''+esc(f.username)+'\')">删除</button></div>'; } el.innerHTML = h; } catch(e) { el.innerHTML = '<div class="empty-state"><p>加载失败</p></div>'; } }
async function handleFR(rid,act) { try { await API.respondFR(rid,act); toast(act==="accept"?"已接受":"已拒绝"); loadFriends(); updateSidebar(); } catch(e) { toast(e.message,true); } }
async function removeFriend(id,name) { if(!confirm("确定删除好友 "+name+"？"))return; try { await API.removeFriend(id); toast("已删除"); loadFriends(); } catch(e) { toast(e.message,true); } }

/* ==================== Families ==================== */
function renderFamilies(app) { app.innerHTML = '<div class="page-header">👨‍👩‍👧 家庭组</div><div style="padding:12px 18px;display:flex;gap:8px;border-bottom:1px solid var(--border-light)"><button class="btn btn-primary btn-sm" id="btn-cf">+ 创建</button><button class="btn btn-outline btn-sm" id="btn-jf">🔗 加入</button></div><div id="fam-list">'+skeletonHTML()+'</div>'; var cf=$el("btn-cf");if(cf)cf.onclick=showCreateFam; var jf=$el("btn-jf");if(jf)jf.onclick=showJoinFam; loadFamilies(); }
async function loadFamilies() { var el=$el("fam-list");if(!el)return;try{var fs=await API.getMyFamilies();el.innerHTML=fs.length===0?'<div class="empty-state"><div class="icon">👨‍👩‍👧</div><h3>还没有家庭组</h3><p>创建一个家庭组，和家人分享心情</p></div>':fs.map(function(f){return'<div class="family-card" onclick="navigate(\'family-detail\',{groupId:'+f.id+'})"><div class="family-name">👨‍👩‍👧 '+esc(f.name)+'</div><div class="family-desc">'+esc(f.description||"暂无描述")+'</div><div class="family-meta"><span class="meta-item">👥 '+f.member_count+' 人</span><span class="meta-item">🔑 '+f.invite_code+'</span></div></div>';}).join("");}catch(e){el.innerHTML='<div class="empty-state"><p>加载失败</p></div>';} }
function showCreateFam() { showModal("创建家庭组",'<div class="form-group"><label>名称</label><input type="text" id="fam-name" placeholder="起个名字" maxlength="80"></div><div class="form-group"><label>描述</label><input type="text" id="fam-desc" placeholder="简单介绍" maxlength="200"></div><button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-docf">创建</button>'); var b=$el("btn-docf");if(b)b.onclick=async function(){var n=$el("fam-name");if(!n)return;var name=n.value.trim();if(!name){toast("请输入名称",true);return;}try{await API.createFamily(name,$el("fam-desc")?$el("fam-desc").value.trim():"");toast("创建成功！");closeModal();loadFamilies();}catch(e){toast(e.message,true);}}; }
function showJoinFam() { showModal("加入家庭组",'<div class="form-group"><label>邀请码</label><input type="text" id="inv-code" placeholder="6位邀请码" maxlength="6"></div><button class="btn btn-primary" style="width:100%;justify-content:center" id="btn-doj">加入</button>'); var b=$el("btn-doj");if(b)b.onclick=async function(){var c=$el("inv-code");if(!c)return;var code=c.value.trim();if(!code){toast("请输入邀请码",true);return;}try{var r=await API.joinFamily(code);toast(r.message);closeModal();loadFamilies();}catch(e){toast(e.message,true);}}; }
function renderFamilyDetail(app,gid) { app.innerHTML='<div class="page"><div class="spinner"></div></div>'; loadFamilyDetail(gid); }
async function loadFamilyDetail(gid) { var app=$el("app");if(!app)return;try{var g=await API.getFamilyDetail(gid),md=await API.getFamilyMoods(gid,1);var chips="";for(var i=0;i<g.members.length;i++){var m=g.members[i],col=avaColor(m.username);chips+='<span class="member-chip" onclick="navigate(\'profile\',{userId:'+m.user_id+'})"><span class="chip-avatar avatar-'+col+'">'+esc(m.username[0].toUpperCase())+'</span>'+esc(m.username)+'</span>';} var mh=md.records.length===0?'<div class="empty-state"><p>还没有心情记录</p></div>':""; for(var i=0;i<md.records.length;i++)mh+=moodCard(md.records[i],md.records[i].user_id===(API.user?API.user.id:-1)); app.innerHTML='<div class="page-header">← 返回</div><div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)"><h2 style="font-size:20px;margin-bottom:4px">👨‍👩‍👧 '+esc(g.name)+'</h2><p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px">'+esc(g.description||"暂无描述")+'</p><div class="invite-code-box"><div class="code">'+g.invite_code+'</div><div class="code-hint">邀请码 — 分享给家人加入</div></div><div style="font-size:13px;font-weight:650;margin-bottom:6px">成员 ('+g.members.length+')</div><div class="member-chips">'+chips+'</div><div style="margin-top:14px;display:flex;gap:8px">'+(!g.is_creator&&g.is_member?'<button class="btn btn-outline btn-sm" id="btn-leave">退出</button>':"")+(g.is_creator?'<button class="btn btn-danger btn-sm" id="btn-disband">解散</button>':"")+'</div></div><div id="fam-moods">'+mh+'</div>'; var lb=$el("btn-leave"),db=$el("btn-disband");if(lb)lb.onclick=async function(){if(!confirm("确定退出？"))return;try{await API.leaveFamily(gid);toast("已退出");navigate("families");}catch(e){toast(e.message,true);}};if(db)db.onclick=async function(){if(!confirm("确定解散？不可撤销！"))return;try{await API.disbandFamily(gid);toast("已解散");navigate("families");}catch(e){toast(e.message,true);}};}catch(e){app.innerHTML='<div class="empty-state"><p>加载失败</p></div>';} }

/* ==================== Profile ==================== */
function renderProfile(app,userId) { var sid=API.user?API.user.id:null,eid=userId||sid,isSelf=sid&&String(sid)===String(eid); app.innerHTML='<div class="page"><div class="spinner"></div></div>'; loadProfile(eid,isSelf); }
async function loadProfile(uid,isSelf) { var app=$el("app");if(!app)return;try{var p=await API.getProfile(uid),md=await API.getUserMoods(uid,1),wk=isSelf?await API.getWeeklyStats():null,st=isSelf?await API.getStreak():null; var col=p.avatar_color||avaColor(p.username),em=p.avatar_emoji||p.username[0].toUpperCase(); var mh="";if(md.records.length===0)mh='<div class="empty-state"><div class="icon">📭</div><h3>还没有心情记录</h3><p>去广场发布第一条心情吧</p></div>';else for(var i=0;i<md.records.length;i++)mh+=moodCard(md.records[i],String(md.records[i].user_id)===String(API.user?API.user.id:-1)); var streakH = ""; if (st && st.streak > 1) streakH = '<span style="color:var(--accent);margin-left:4px">🔥' + st.streak + '天连续记录</span>'; var bars="";if(st&&st.total_days>0){var maxDays=Math.min(st.total_days,60);for(var i=0;i<maxDays;i++)bars+='<span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin:1px;background:var(--primary);opacity:'+(0.3+0.7*(i/maxDays))+'" title="'+st.total_days+'天"></span>';}
var weekH="";if(wk){weekH='<div style="margin-bottom:16px"><div style="font-weight:700;font-size:14px;margin-bottom:12px">📈 本周心情 ('+wk.total_this_week+'条)</div><div class="week-grid">';for(var i=0;i<wk.days.length;i++){var d=wk.days[i];weekH+='<div class="week-day'+(d.mood?' has-mood':'')+'"><div class="day-emoji">'+(d.emoji||'·')+'</div><div class="day-date">'+d.date.split('-')[1]+'/'+d.date.split('-')[0]+'</div></div>';}weekH+='</div></div>';} var sid=API.user?API.user.id:null; app.innerHTML='<div class="page-header" style="font-size:18px;font-weight:700;padding:16px 18px">'+(isSelf?'👤 我的主页':'👤 '+esc(p.username)+' 的主页')+(!isSelf?'<span style="font-size:13px;font-weight:400;color:var(--primary);float:right;cursor:pointer" onclick="navigate(\'profile\',{userId:'+sid+'})">← 返回我的主页</span>':"")+'</div><div class="profile-cover"></div><div class="profile-info">'+weekH+'<div class="profile-avatar-lg avatar-'+col+'">'+esc(em)+'</div><div class="profile-name">'+esc(p.username)+streakH+'</div><div class="profile-handle">@'+esc(p.username)+' · '+fmtDate(p.created_at)+'</div><div class="profile-bio">'+esc(p.bio||"这个人很懒，什么都没写")+'</div>'+(bars?'<div style="margin-bottom:8px">'+bars+'</div>':'')+'<div class="profile-stats"><span><strong>'+p.mood_count+'</strong> 心情</span><span><strong>'+p.friend_count+'</strong> 好友</span><span><strong>'+p.family_count+'</strong> 家庭</span></div><div class="profile-actions">'+(isSelf?'<button class="btn btn-outline btn-sm" id="btn-edit">✏️ 编辑资料</button> <button class="btn btn-outline btn-sm" id="btn-settings">⚙️ 设置</button>':'<button class="btn btn-primary btn-sm" id="btn-friend">➕ 添加好友</button>')+'</div></div><div id="profile-moods">'+mh+'</div>'; if(isSelf){var eb=$el("btn-edit");if(eb)eb.onclick=function(){showEditProfile(p);};var sb=$el("btn-settings");if(sb)sb.onclick=function(){navigate("settings");};}else{var fb=$el("btn-friend");if(fb)fb.onclick=async function(){try{var r=await API.sendFriendRequest(uid);toast(r.message);fb.textContent="✓已发送";fb.disabled=true;}catch(e){toast(e.message,true);}};} }catch(e){app.innerHTML='<div class="empty-state"><div class="icon">⚠️</div><p>加载失败</p></div>';} }

function showEditProfile(p) {
    var colorOpts = "", emojiOpts = "", themeOpts = "";
    for (var i=0;i<AVATAR_COLORS.length;i++) { var c=AVATAR_COLORS[i]; colorOpts+='<span class="color-option avatar-'+c+(p.avatar_color===c?" selected":"")+'" data-color="'+c+'" onclick="selAvatarColor(this,\''+c+'\')"></span>'; }
    for (var i=0;i<AVATAR_EMOJIS.length;i++) { var e=AVATAR_EMOJIS[i]; emojiOpts+='<span class="emoji-option'+(p.avatar_emoji===e?" selected":"")+'" data-emoji="'+e+'" onclick="selAvatarEmoji(this,\''+e+'\')">'+e+'</span>'; }
    var tks=Object.keys(THEMES); for(var i=0;i<tks.length;i++){var tk=tks[i];themeOpts+='<span class="theme-option '+tk+(p.theme===tk||(!p.theme&&tk==="purple")?" selected":"")+'" data-theme="'+tk+'" onclick="selTheme(this,\''+tk+'\')" title="'+THEMES[tk]+'"></span>';}

    showModal("编辑资料",
        '<div class="form-group"><label>用户名</label><input type="text" id="edit-un" value="'+esc(p.username||"")+'" maxlength="20"></div>' +
        '<div class="form-group"><label>简介</label><textarea id="edit-bio" maxlength="200" placeholder="介绍一下自己...">'+esc(p.bio||"")+'</textarea></div>' +
        '<div class="form-group"><label>头像颜色</label><div class="color-picker">'+colorOpts+'</div></div>' +
        '<div class="form-group"><label>头像表情</label><div class="emoji-picker">'+emojiOpts+'</div></div>' +
        '<div class="form-group"><label>主题配色</label><div class="theme-picker">'+themeOpts+'</div></div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" id="btn-save">保存</button>'
    );

    var selColor = p.avatar_color || "purple", selEmoji = p.avatar_emoji || "", selTheme = p.theme || "purple";
    window.selAvatarColor = function(el,c) { selColor=c;var all=document.querySelectorAll("#color-picker .color-option");for(var i=0;i<all.length;i++)all[i].classList.remove("selected");el.classList.add("selected"); };
    window.selAvatarEmoji = function(el,e) { selEmoji=e;var all=document.querySelectorAll("#emoji-picker .emoji-option");for(var i=0;i<all.length;i++)all[i].classList.remove("selected");el.classList.add("selected"); };
    window.selTheme = function(el,t) { selTheme=t;var all=document.querySelectorAll("#theme-picker .theme-option");for(var i=0;i<all.length;i++)all[i].classList.remove("selected");el.classList.add("selected"); };

    var sbtn = $el("btn-save");
    if (sbtn) sbtn.onclick = async function() {
        var un = $el("edit-un"), bio = $el("edit-bio"), data = {};
        if (un) { var nu = un.value.trim(); if (nu !== p.username) data.username = nu; }
        if (bio) { var nb = bio.value.trim(); if (nb !== (p.bio||"")) data.bio = nb; }
        if (selColor !== (p.avatar_color||"purple")) data.avatar_color = selColor;
        if (selEmoji !== (p.avatar_emoji||"")) data.avatar_emoji = selEmoji;
        if (selTheme !== (p.theme||"purple")) data.theme = selTheme;
        if (Object.keys(data).length === 0) { toast("没有修改"); return; }
        if (data.username && data.username.length < 2) { toast("用户名至少2个字符", true); return; }
        try {
            var res = await API.updateProfile(data);
            API.user = res.user;
            localStorage.setItem("user", JSON.stringify(res.user));
            applyTheme(API.user.theme);
            toast(res.message || "已更新");
            closeModal();
            updateSidebar();
            navigate("profile", { userId: p.id });
        } catch(e) { toast(e.message, true); }
    };
}

/* ==================== Settings ==================== */
function renderSettings(app) {
    app.innerHTML = '<div class="page"><div class="page-header">⚙️ 账号设置</div>' +
        '<div style="padding:18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)">' +
        '<h3 style="margin-bottom:12px">修改密码</h3>' +
        '<div class="form-group"><label>原密码</label><div class="pw-wrap"><input type="password" id="s-old" placeholder="输入原密码">'+makePwToggle("s-old")+'</div></div>' +
        '<div class="form-group"><label>新密码</label><div class="pw-wrap"><input type="password" id="s-new" placeholder="至少4位">'+makePwToggle("s-new")+'</div></div>' +
        '<button class="btn btn-primary" id="btn-chpw">修改密码</button></div></div>';
    var b = $el("btn-chpw"); if (!b) return;
    b.onclick = async function() { var o=$el("s-old"),n=$el("s-new");if(!o||!n)return;var op=o.value,np=n.value;if(!op||!np){toast("请填写完整",true);return;}if(np.length<4){toast("新密码至少4个字符",true);return;}try{await API.changePw(op,np);toast("密码修改成功！");navigate("profile",{userId:API.user?API.user.id:null});}catch(e){toast(e.message,true);} };
}

/* ==================== Stats ==================== */
function renderStats(app) { app.innerHTML='<div class="page"><div style="padding:18px"><div class="spinner"></div></div></div>'; loadStats(); }
async function loadStats() { var app=$el("app");if(!app)return;try{var d=await API.getStats(),t=0,ks=Object.keys(d.mood_distribution);for(var i=0;i<ks.length;i++)t+=d.mood_distribution[ks[i]];if(t===0)t=1;var cols={happy:"#f59e0b",calm:"#6366f1",sad:"#3b82f6",anxious:"#ef4444",excited:"#ec4899",tired:"#8b5cf6"};var distH="",es=Object.entries(d.mood_distribution);for(var i=0;i<es.length;i++){var k=es[i][0],v=es[i][1];distH+='<div class="stat-row" style="padding:8px 0"><span class="stat-emoji">'+MOODS[k].emoji+'</span><span style="width:50px;font-size:14px;font-weight:550">'+MOODS[k].name+'</span><div class="bar-mini"><div class="bar-mini-fill" style="width:'+((v/t)*100).toFixed(1)+'%;background:'+cols[k]+'"></div></div><span style="font-size:14px;font-weight:650;width:40px;text-align:right">'+v+'</span></div>';} var medals=["🥇","🥈","🥉"],topH=d.top_users.length===0?'<p style="color:var(--text-secondary);text-align:center;padding:12px">暂无数据</p>':"";for(var i=0;i<d.top_users.length;i++){var u=d.top_users[i];topH+='<div class="friend-item"><span style="font-size:22px;width:30px">'+(medals[i]||(i+1))+'</span><span style="font-weight:650;flex:1">'+esc(u.username)+'</span><span style="color:var(--text-secondary)">'+u.count+' 条</span></div>';} app.innerHTML='<div class="page-header">📊 统计</div><div style="padding:16px 18px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;background:var(--card-bg);border-bottom:1px solid var(--border-light)"><div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">'+d.total_records+'</div><div style="font-size:12px;color:var(--text-secondary)">总记录</div></div><div style="text-align:center;padding:12px"><div style="font-size:32px;font-weight:800">'+d.total_users+'</div><div style="font-size:12px;color:var(--text-secondary)">用户数</div></div></div><div style="padding:16px 18px;background:var(--card-bg);border-bottom:1px solid var(--border-light)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">心情分布</div>'+distH+'</div><div style="padding:16px 18px;background:var(--card-bg)"><div style="font-weight:700;font-size:15px;margin-bottom:12px">🏆 活跃用户</div>'+topH+'</div>'; }catch(e){app.innerHTML='<div class="empty-state"><p>加载失败</p></div>';} }

/* ==================== Modal & Image ==================== */
function showModal(title,body) { var c=$el("modal-content");if(!c)return;c.innerHTML='<div class="modal-header"><span>'+title+'</span><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body">'+body+'</div>';var ov=$el("modal-overlay");if(ov){ov.style.display="flex";ov.onclick=function(e){if(e.target===ov)closeModal();};} }
function closeModal() { var ov=$el("modal-overlay");if(ov)ov.style.display="none"; }
function openImg(url) { var vi=$el("image-viewer"),img=$el("image-viewer-img");if(vi&&img){img.src=url;vi.style.display="flex";vi.onclick=closeImg;} }
function closeImg() { var vi=$el("image-viewer");if(vi)vi.style.display="none"; }

/* ==================== Logout ==================== */
function logout() { API.token=null;API.user=null;localStorage.removeItem("token");localStorage.removeItem("user");document.body.className="";updateSidebar();navigate("login"); }

/* ==================== Init ==================== */
function init() {
    updateSidebar();
    // Mobile nav click handlers
    var mlinks = document.querySelectorAll(".mobile-nav a");
    for (var i = 0; i < mlinks.length; i++) {
        mlinks[i].onclick = (function(view) {
            return function(e) { e.preventDefault(); navigate(view, { userId: API.user ? API.user.id : null }); };
        })(mlinks[i].getAttribute("data-view"));
    }
    if (API.token && API.user) { navigate("feed"); }
    else { navigate("login"); $el("mobile-nav").style.display = "none"; }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
