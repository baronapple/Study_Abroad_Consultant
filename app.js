/**
 * app.js — UI 渲染 + 用户操作
 * 数据读写全部通过 data.js 的 API 函数
 */

let selectedState = 'all';
let selectedUni = null;
let activeCourseIdx = null;

// ── 初始化（从服务器加载数据）
async function init() {
  try {
    await loadUnisFromServer();
    buildUniList(getFilteredUnis());
    buildWelcomeGrid();
  } catch (e) {
    document.getElementById('uniListWrap').innerHTML =
      `<div class="no-results" style="color:#c87a7a">⚠ 无法连接服务器<br>请确认 server.py 已运行</div>`;
  }
}

// ── 侧栏渲染
function buildUniList(unis) {
  const wrap = document.getElementById('uniListWrap');
  const byState = {};
  unis.forEach(u => { (byState[u.state] = byState[u.state] || []).push(u); });
  wrap.innerHTML = '';
  if (!unis.length) { wrap.innerHTML = '<div class="no-results">没有找到匹配的大学</div>'; return; }
  Object.keys(byState).sort().forEach(st => {
    const grp = document.createElement('div');
    grp.className = 'uni-group';
    grp.innerHTML = `<div class="uni-group-name">${st}</div>`;
    byState[st].forEach(u => {
      const item = document.createElement('div');
      item.className = 'uni-item' + (selectedUni && selectedUni.id === u.id ? ' active' : '');
      item.innerHTML = `<div><div class="uni-name">${u.name}</div><div class="uni-meta">${u.city}</div></div><div class="course-count">${u.courses.length}</div>`;
      item.onclick = () => selectUni(u);
      grp.appendChild(item);
    });
    wrap.appendChild(grp);
  });
}

function getFilteredUnis() {
  const q = document.getElementById('uniSearch').value.toLowerCase().trim();
  return UNIS.filter(u => {
    const stOk = selectedState === 'all' || u.state === selectedState;
    const qOk = !q || u.name.toLowerCase().includes(q) || (u.abbr||'').toLowerCase().includes(q) || (u.city||'').includes(q);
    return stOk && qOk;
  });
}

function filterState(state, btn) {
  selectedState = state;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  buildUniList(getFilteredUnis());
}

function filterUnis() { buildUniList(getFilteredUnis()); }

// ── 选大学
function selectUni(uni) {
  selectedUni = uni;
  activeCourseIdx = null;
  chatHistory = [];
  buildUniList(getFilteredUnis());
  document.getElementById('headerTitle').textContent = uni.name;
  document.getElementById('headerSub').textContent = `${uni.state} · ${uni.city} · ${uni.courses.length} 个课程`;
  document.getElementById('contextBadge').style.display = '';
  document.getElementById('contentArea').innerHTML = buildCourseSelectionHtml(uni);
}

function buildCourseSelectionHtml(uni) {
  const cards = uni.courses.map((c, i) => `
    <div class="welcome-card" onclick="selectCourse(${i})">
      <div class="wc-uni">${uni.abbr} · ${c.code || '—'}</div>
      <div class="wc-name">${c.name}</div>
      <div class="wc-atar">ATAR ${c.atar || '—'}</div>
      <div class="course-card-actions">
        <button class="card-action-btn" onclick="event.stopPropagation(); openEditModal(${i})">编辑</button>
        <button class="card-action-btn danger" onclick="event.stopPropagation(); deleteCourse(${i})">删除</button>
      </div>
    </div>`).join('');

  return `
  <div style="flex:1;overflow-y:auto;padding:24px;">
    <p style="font-size:12px;color:var(--muted);margin-bottom:16px;">选择课程开始咨询，或管理课程。</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:24px;">
      ${cards}
    </div>
    <div class="quick-strip">
      <div style="font-size:10px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">快速提问</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button class="q-btn" onclick="startQuickChat('${uni.abbr} 有哪些 ATAR 70 以下可申请的课程？')">ATAR 70 以下课程？</button>
        <button class="q-btn" onclick="startQuickChat('${uni.abbr} 的英语和数学要求是什么？')">英语数学要求？</button>
        <button class="q-btn" onclick="startQuickChat('${uni.abbr} 有什么加分项？')">加分项？</button>
      </div>
    </div>
  </div>`;
}

// ── 选课程
function selectCourse(idx) {
  activeCourseIdx = idx;
  const course = selectedUni.courses[idx];
  chatHistory = [];
  document.getElementById('headerTitle').textContent = `${selectedUni.abbr} — ${course.name}`;
  document.getElementById('headerSub').textContent = `代码：${course.code || '—'} · ATAR ${course.atar || '—'}`;
  document.getElementById('contentArea').innerHTML = buildChatUiHtml();
  appendBubble('ai', buildInitialMsg(selectedUni, course));
  chatHistory.push({ role: 'assistant', content: `已为你加载 ${selectedUni.name} 的 ${course.name}。` });
  setupChatInputListener();
}

function buildInitialMsg(uni, course) {
  const rows = [
    course.atar     ? `<div class="info-row"><span class="info-key">ATAR</span><span class="info-val"><span class="tag gold">${course.atar}</span></span></div>` : '',
    course.eng      ? `<div class="info-row"><span class="info-key">英语要求</span><span class="info-val">English ≥${course.eng}分 / EAL ≥${course.eal || '—'}分</span></div>` : '',
    course.maths    ? `<div class="info-row"><span class="info-key">数学要求</span><span class="info-val">${course.maths}</span></div>` : '',
    course.duration ? `<div class="info-row"><span class="info-key">学制</span><span class="info-val">${course.duration}</span></div>` : '',
    course.intake   ? `<div class="info-row"><span class="info-key">入学时间</span><span class="info-val">${course.intake}</span></div>` : '',
    course.fees     ? `<div class="info-row"><span class="info-key">费用</span><span class="info-val"><span class="tag green">${course.fees}</span></span></div>` : '',
    course.notes    ? `<div class="info-row"><span class="info-key">备注</span><span class="info-val">${course.notes}</span></div>` : '',
  ].filter(Boolean).join('');

  return `已加载 <strong>${uni.name}</strong> 的课程：<strong>${course.name}</strong>
    <div class="info-card"><div class="info-card-header">VCE 入学要求</div>${rows}</div>
    有什么想进一步了解的？`;
}

function buildChatUiHtml() {
  return `
  <div class="chat-container" id="chatArea"></div>
  <div class="quick-area">
    <button class="q-btn" onclick="quickQ('这个课程有哪些加分项（adjustment factors）？')">加分项？</button>
    <button class="q-btn" onclick="quickQ('如果学生 ATAR 是 62，有机会吗？')">ATAR 62 有机会？</button>
    <button class="q-btn" onclick="quickQ('数学要 Methods 还是 Further 也可以？')">数学选哪科？</button>
    <button class="q-btn" onclick="quickQ('毕业后有哪些职业出路？')">职业前景？</button>
  </div>
  <div class="input-area">
    <div class="input-row">
      <div class="input-wrap">
        <textarea id="chatInput" placeholder="问关于这门课程的任何问题..." rows="1"></textarea>
      </div>
      <button class="send-btn" onclick="sendMsg()">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>`;
}

function startQuickChat(text) {
  chatHistory = [];
  document.getElementById('contentArea').innerHTML = buildChatUiHtml();
  setupChatInputListener();
  document.getElementById('chatInput').value = text;
  sendMsg();
}

function setupChatInputListener() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  });
}

function appendBubble(role, html) {
  const area = document.getElementById('chatArea');
  if (!area) return;
  const row = document.createElement('div');
  row.className = 'msg-row' + (role === 'user' ? ' user' : '');
  row.innerHTML = `<div class="msg-avatar ${role}">${role === 'ai' ? 'AI' : 'U'}</div><div class="bubble">${html}</div>`;
  area.appendChild(row);
  area.scrollTop = area.scrollHeight;
}

function quickQ(text) {
  const ta = document.getElementById('chatInput');
  if (ta) ta.value = text;
  sendMsg();
}

async function sendMsg() {
  if (isLoading) return;
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) return;
  ta.value = ''; ta.style.height = 'auto';

  appendBubble('user', escHtml(text));
  isLoading = true;

  const area = document.getElementById('chatArea');
  const typing = document.createElement('div');
  typing.className = 'msg-row'; typing.id = 'typingRow';
  typing.innerHTML = `<div class="msg-avatar ai">AI</div><div class="bubble"><div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  area.appendChild(typing); area.scrollTop = area.scrollHeight;

  try {
    const currentCourse = activeCourseIdx !== null ? selectedUni.courses[activeCourseIdx] : null;
    const reply = await requestAiReply(text, selectedUni, currentCourse);
    document.getElementById('typingRow')?.remove();
    appendBubble('ai', formatReply(reply));
  } catch (e) {
    document.getElementById('typingRow')?.remove();
    appendBubble('ai', '网络连接出错，请稍后再试。');
  }
  isLoading = false;
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatReply(t) {
  return escHtml(t)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');
}

// ── 添加课程
function addCourseUrl() {
  const url = document.getElementById('urlInput').value.trim();
  // 预填大学信息（根据 URL 判断）
  if (url.includes('rmit.edu.au'))       prefillUniFields('RMIT University','RMIT','VIC','墨尔本');
  else if (url.includes('unimelb.edu.au')) prefillUniFields('University of Melbourne','UniMelb','VIC','墨尔本');
  else if (url.includes('monash.edu'))   prefillUniFields('Monash University','Monash','VIC','墨尔本');
  else if (url.includes('unsw.edu.au'))  prefillUniFields('UNSW Sydney','UNSW','NSW','悉尼');
  else if (url.includes('uq.edu.au'))    prefillUniFields('University of Queensland','UQ','QLD','布里斯班');

  document.getElementById('modalUrl').value = url;
  openAddModal();
}

function prefillUniFields(name, abbr, state, city) {
  document.getElementById('modalUniName').value = name;
  document.getElementById('modalUniAbbr').value = abbr;
  document.getElementById('modalState').value = state;
  document.getElementById('modalCity').value = city;
}

function openAddModal() {
  // 预填大学下拉（已有大学）
  const sel = document.getElementById('modalUniSelect');
  sel.innerHTML = '<option value="">— 新建大学 —</option>' +
    UNIS.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  document.getElementById('addCourseModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('addCourseModal').style.display = 'none';
  document.getElementById('editCourseModal').style.display = 'none';
}

// 选了已有大学时，自动填入大学信息
function onUniSelectChange() {
  const sel = document.getElementById('modalUniSelect');
  const uniId = sel.value;
  if (!uniId) return;
  const uni = UNIS.find(u => u.id === uniId);
  if (!uni) return;
  document.getElementById('modalUniName').value = uni.name;
  document.getElementById('modalUniAbbr').value = uni.abbr || '';
  document.getElementById('modalState').value = uni.state;
  document.getElementById('modalCity').value = uni.city || '';
}

async function saveCustomCourse() {
  const uniName  = document.getElementById('modalUniName').value.trim();
  const uniAbbr  = document.getElementById('modalUniAbbr').value.trim();
  const state    = document.getElementById('modalState').value.trim();
  const city     = document.getElementById('modalCity').value.trim();
  const course = {
    name:     document.getElementById('modalCourseName').value.trim(),
    code:     document.getElementById('modalCode').value.trim(),
    atar:     document.getElementById('modalAtar').value.trim(),
    eng:      parseInt(document.getElementById('modalEng').value) || null,
    eal:      parseInt(document.getElementById('modalEal').value) || null,
    maths:    document.getElementById('modalMaths').value.trim(),
    duration: document.getElementById('modalDuration').value.trim(),
    intake:   document.getElementById('modalIntake').value.trim(),
    fees:     'CSP 补贴学位',
    notes:    document.getElementById('modalNotes').value.trim(),
    url:      document.getElementById('modalUrl').value.trim(),
  };

  if (!uniName || !course.name || !state) {
    alert('请填写大学名称、课程名称和州');
    return;
  }

  try {
    const result = await apiAddCourse(uniName, uniAbbr, state, city, course);
    await loadUnisFromServer(); // 重新加载最新数据
    buildUniList(getFilteredUnis());
    closeModal();
    clearAddForm();

    // 自动跳转到新课程
    const uni = UNIS.find(u => u.id === result.uni_id);
    if (uni) { selectUni(uni); setTimeout(() => selectCourse(result.course_idx), 50); }
  } catch (e) {
    alert('保存失败：' + e.message);
  }
}

function clearAddForm() {
  ['modalUniName','modalUniAbbr','modalState','modalCity','modalCourseName',
   'modalCode','modalAtar','modalEng','modalEal','modalMaths',
   'modalDuration','modalIntake','modalNotes','modalUrl'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('modalUniSelect').value = '';
}

// ── 编辑课程
function openEditModal(idx) {
  const course = selectedUni.courses[idx];
  document.getElementById('editCourseIdx').value = idx;
  document.getElementById('editCourseName').value  = course.name || '';
  document.getElementById('editCode').value        = course.code || '';
  document.getElementById('editAtar').value        = course.atar || '';
  document.getElementById('editEng').value         = course.eng || '';
  document.getElementById('editEal').value         = course.eal || '';
  document.getElementById('editMaths').value       = course.maths || '';
  document.getElementById('editDuration').value    = course.duration || '';
  document.getElementById('editIntake').value      = course.intake || '';
  document.getElementById('editNotes').value       = course.notes || '';
  document.getElementById('editCourseModal').style.display = 'flex';
}

async function saveEditCourse() {
  const idx = parseInt(document.getElementById('editCourseIdx').value);
  const fields = {
    name:     document.getElementById('editCourseName').value.trim(),
    code:     document.getElementById('editCode').value.trim(),
    atar:     document.getElementById('editAtar').value.trim(),
    eng:      parseInt(document.getElementById('editEng').value) || null,
    eal:      parseInt(document.getElementById('editEal').value) || null,
    maths:    document.getElementById('editMaths').value.trim(),
    duration: document.getElementById('editDuration').value.trim(),
    intake:   document.getElementById('editIntake').value.trim(),
    notes:    document.getElementById('editNotes').value.trim(),
  };

  try {
    await apiUpdateCourse(selectedUni.id, idx, fields);
    await loadUnisFromServer();
    const uni = UNIS.find(u => u.id === selectedUni.id);
    selectedUni = uni;
    closeModal();
    selectUni(uni); // 刷新视图
  } catch (e) {
    alert('更新失败：' + e.message);
  }
}

// ── 删除课程
async function deleteCourse(idx) {
  const name = selectedUni.courses[idx].name;
  if (!confirm(`确定删除「${name}」吗？`)) return;
  try {
    await apiDeleteCourse(selectedUni.id, idx);
    await loadUnisFromServer();
    const uni = UNIS.find(u => u.id === selectedUni.id);
    if (uni) { selectedUni = uni; selectUni(uni); }
    else { selectedUni = null; document.getElementById('contentArea').innerHTML = '<div style="padding:32px;color:var(--muted)">请从左侧选择大学</div>'; }
    buildUniList(getFilteredUnis());
  } catch (e) {
    alert('删除失败：' + e.message);
  }
}

// ── 欢迎页
function buildWelcomeGrid() {
  const hot = [];
  UNIS.forEach(u => u.courses.forEach((c, i) => { if (hot.length < 6) hot.push({ u, c, i }); }));
  document.getElementById('welcomeGrid').innerHTML = hot.map(({ u, c, i }) => `
    <div class="welcome-card" onclick="quickSelectCourse('${u.id}', ${i})">
      <div class="wc-uni">${u.abbr}</div>
      <div class="wc-name">${c.name}</div>
      <div class="wc-atar">ATAR ${c.atar || '—'}</div>
    </div>`).join('');
}

function quickSelectCourse(uniId, ci) {
  const uni = UNIS.find(u => u.id === uniId);
  if (!uni) return;
  selectUni(uni);
  setTimeout(() => selectCourse(ci), 50);
}

window.onload = init;
