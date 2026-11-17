// ===================== USERS MANAGEMENT =====================
const PERM_SECTIONS = [
  ['general', 'الحاسبة العامة', 'حساب تكلفة وسعر المنتجات وطباعة العروض'],
  ['customers', 'العملاء والطلبات', 'حسابات العملاء والحاسبات والطلبات والعربون'],
  ['collections', 'التحصيل', 'تسجيل الدفعات ومتابعة المتبقي'],
  ['quotes', 'عروض الأسعار', 'إنشاء وطباعة عروض الأسعار'],
  ['company', 'بيانات الشركة', 'الشعار والعناوين وأرقام التواصل'],
  ['users', 'المستخدمون', 'إدارة الحسابات والصلاحيات']
];
function defaultPerms() { return { general: true, customers: true, collections: true, quotes: true, company: false, users: false }; }
function normalizeUser(u) {
  if (u.active === undefined) u.active = true;
  if (u.canLogin === undefined) u.canLogin = true;
  if (!u.groups) u.groups = [];
  if (!u.fullName) u.fullName = u.username;
  if (!u.branches) u.branches = [];
  return u;
}
function canAccess(view) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  const p = Object.assign(defaultPerms(), currentUser.perms || {});
  return !!p[view];
}
function applyNavAccess() {
  document.querySelectorAll('.nav-btn').forEach(el => { el.style.display = canAccess(el.dataset.view) ? '' : 'none'; });
}

let usersFilter = { q: '', status: 'all' };

function renderUsersList() {
  const root = document.getElementById('usersListRoot');
  const q = usersFilter.q.trim().toLowerCase();
  const list = db.users.filter(u => {
    if (q && !((u.fullName || '') + ' ' + u.username).toLowerCase().includes(q)) return false;
    if (usersFilter.status === 'active' && u.active === false) return false;
    if (usersFilter.status === 'inactive' && u.active !== false) return false;
    return true;
  });
  const tickOk = '<span class="tick-ok">' + IC.check + '</span>';
  const tickNo = '<span class="tick-no"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></span>';
  root.innerHTML = `
  <div class="list-card users-card">
    <h3 class="users-title">قائمة المستخدمين</h3>
    <div class="users-filter">
      <div class="search-inp">${IC.search}<input type="text" id="userSearch" placeholder="بحث بالاسم أو اسم المستخدم" value="${escapeHtml(usersFilter.q)}"></div>
      <select id="userStatusFilter">
        <option value="all" ${usersFilter.status === 'all' ? 'selected' : ''}>كل الحالات</option>
        <option value="active" ${usersFilter.status === 'active' ? 'selected' : ''}>مفعّل</option>
        <option value="inactive" ${usersFilter.status === 'inactive' ? 'selected' : ''}>موقوف</option>
      </select>
      <button class="primary-btn" id="userFilterBtn">تصفية</button>
      <button class="secondary-btn" id="userResetBtn">إعادة ضبط</button>
    </div>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>الاسم الكامل</th><th>اسم المستخدم لتسجيل الدخول</th><th>الحالة</th><th>يسمح بتسجيل الدخول</th><th>مدير عام</th><th>المجموعات</th><th>الإجراءات</th></tr></thead>
      <tbody>
      ${list.length ? list.map(u => `
        <tr data-id="${u.id}">
          <td><div class="cell-user"><div class="avatar">${escapeHtml(initial(u.fullName || u.username))}</div><b>${escapeHtml(u.fullName || u.username)}</b></div></td>
          <td><span class="uname">${escapeHtml(u.username)}</span></td>
          <td>${u.active === false ? '<span class="chip due">موقوف</span>' : '<span class="chip ok">مفعّل</span>'}</td>
          <td>${u.canLogin === false ? tickNo : tickOk}</td>
          <td>${u.role === 'admin' ? '<span class="chip purple">نعم</span>' : '<span class="chip gray">لا</span>'}</td>
          <td>${(u.groups || []).length ? `<div class="group-chips">${u.groups.map(g => `<span class="chip info">${escapeHtml(g)}</span>`).join('')}</div>` : '—'}</td>
          <td><div class="row-actions">
            <button class="btn-outline" data-action="perms">إدارة الصلاحيات</button>
            <button class="btn-outline" data-action="branches">الفروع والمخازن</button>
            <button class="btn-outline" data-action="edit">تعديل</button>
            <button class="btn-outline red" data-action="delete">حذف</button>
          </div></td>
        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--m-mute);">لا يوجد مستخدمون مطابقون</td></tr>'}
      </tbody></table></div>
    <div class="users-foot">عرض <b>${list.length ? 1 : 0}</b> إلى <b>${list.length}</b> من إجمالي <b>${db.users.length}</b></div>
  </div>`;

  const apply = () => {
    usersFilter.q = document.getElementById('userSearch').value;
    usersFilter.status = document.getElementById('userStatusFilter').value;
    renderUsersList();
  };
  document.getElementById('userFilterBtn').addEventListener('click', apply);
  document.getElementById('userSearch').addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
  document.getElementById('userStatusFilter').addEventListener('change', apply);
  document.getElementById('userResetBtn').addEventListener('click', () => { usersFilter = { q: '', status: 'all' }; renderUsersList(); });

  root.querySelectorAll('tbody tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="perms"]').addEventListener('click', () => openPermsModal(id));
    row.querySelector('[data-action="branches"]').addEventListener('click', () => openBranchesModal(id));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openUserModal(id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      const u = db.users.find(x => x.id === id);
      if (currentUser && u.id === currentUser.id) { alert('لا يمكنك حذف حسابك الحالي وأنت مسجل دخول به'); return; }
      const adminsCount = db.users.filter(x => x.role === 'admin' && x.active !== false).length;
      if (u.role === 'admin' && u.active !== false && adminsCount <= 1) { alert('لا يمكن حذف آخر حساب مدير في البرنامج'); return; }
      openConfirm(`هل تريد حذف المستخدم "${u.username}"؟`, () => {
        db.users = db.users.filter(x => x.id !== id);
        persist();
        renderUsersList();
      });
    });
  });
}

function makeOverlay(html) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.style.display = 'flex';
  ov.innerHTML = html;
  document.body.appendChild(ov);
  ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
  return ov;
}

function openPermsModal(id) {
  const u = db.users.find(x => x.id === id); if (!u) return;
  const admin = u.role === 'admin';
  const cur = Object.assign(defaultPerms(), u.perms || {});
  const ov = makeOverlay(`
    <div class="modal">
      <h2>إدارة الصلاحيات — ${escapeHtml(u.fullName || u.username)}</h2>
      ${admin ? '<div class="soft-note">المدير العام يملك كل الصلاحيات تلقائياً.</div>' : '<div class="soft-note">اختر الأقسام التي يظهر لهذا المستخدم الدخول إليها.</div>'}
      <div class="perm-list">
        ${PERM_SECTIONS.map(([k, name, desc]) => `
          <label class="perm-row"><span><b>${name}</b><small>${desc}</small></span>
          <input type="checkbox" class="switch" data-k="${k}" ${admin || cur[k] ? 'checked' : ''} ${admin ? 'disabled' : ''}></label>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="secondary-btn" data-x>${admin ? 'إغلاق' : 'إلغاء'}</button>
        ${admin ? '' : '<button class="primary-btn" data-save>حفظ الصلاحيات</button>'}
      </div>
    </div>`);
  ov.querySelector('[data-x]').addEventListener('click', () => ov.remove());
  const sv = ov.querySelector('[data-save]');
  if (sv) sv.addEventListener('click', () => {
    const p = {};
    ov.querySelectorAll('.switch').forEach(i => p[i.dataset.k] = i.checked);
    u.perms = p;
    persist();
    if (currentUser && currentUser.id === u.id) applyNavAccess();
    ov.remove();
    showToast('تم حفظ صلاحيات ' + (u.fullName || u.username));
  });
}

function openBranchesModal(id) {
  const u = db.users.find(x => x.id === id); if (!u) return;
  if (!db.branches) db.branches = [];
  const sel = new Set(u.branches || []);
  const ov = makeOverlay('<div class="modal"></div>');
  const box = ov.querySelector('.modal');
  const draw = () => {
    box.innerHTML = `
      <h2>الفروع والمخازن — ${escapeHtml(u.fullName || u.username)}</h2>
      <div class="soft-note">حدّد الفروع والمخازن التي يتبع لها المستخدم. يتم حفظ الربط الآن، ويمكن استخدامه لاحقاً لتقييد البيانات حسب الفرع.</div>
      <div class="perm-list">
        ${db.branches.map(b => `<div class="branch-row"><label><input type="checkbox" data-b="${b.id}" ${sel.has(b.id) ? 'checked' : ''}> ${escapeHtml(b.name)} <span class="chip info">${escapeHtml(b.kind || 'فرع')}</span></label><button class="del-payment" data-del="${b.id}" title="حذف">✕</button></div>`).join('') || '<div class="empty-state" style="padding:16px;">لا توجد فروع أو مخازن</div>'}
      </div>
      <div class="branch-add"><input type="text" id="newBranchName" placeholder="اسم فرع أو مخزن جديد"><select id="newBranchKind"><option>فرع</option><option>مخزن</option></select><button class="secondary-btn" id="addBranchBtn">إضافة</button></div>
      <div class="modal-actions"><button class="secondary-btn" data-x>إلغاء</button><button class="primary-btn" data-save>حفظ</button></div>`;
    box.querySelectorAll('[data-b]').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.b) : sel.delete(c.dataset.b); }));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      db.branches = db.branches.filter(x => x.id !== b.dataset.del);
      db.users.forEach(x => { x.branches = (x.branches || []).filter(i => i !== b.dataset.del); });
      sel.delete(b.dataset.del); persist(); draw();
    }));
    box.querySelector('#addBranchBtn').addEventListener('click', () => {
      const n = box.querySelector('#newBranchName').value.trim(); if (!n) return;
      db.branches.push({ id: uid(), name: n, kind: box.querySelector('#newBranchKind').value });
      persist(); draw();
    });
    box.querySelector('[data-x]').addEventListener('click', () => ov.remove());
    box.querySelector('[data-save]').addEventListener('click', () => {
      u.branches = [...sel]; persist(); ov.remove(); showToast('تم حفظ الفروع والمخازن');
    });
  };
  draw();
}

let userModalMode = 'add';
let userModalEditId = null;

function openUserModal(id) {
  userModalMode = id ? 'edit' : 'add';
  userModalEditId = id;
  document.getElementById('userModalTitle').textContent = id ? 'تعديل مستخدم' : 'إنشاء مستخدم جديد';
  document.getElementById('userPasswordInput').value = '';
  if (id) {
    const u = db.users.find(x => x.id === id);
    document.getElementById('userFullNameInput').value = u.fullName || '';
    document.getElementById('userUsernameInput').value = u.username;
    document.getElementById('userRoleInput').value = u.role;
    document.getElementById('userActiveInput').value = u.active === false ? '0' : '1';
    document.getElementById('userCanLoginInput').checked = u.canLogin !== false;
    document.getElementById('userGroupsInput').value = (u.groups || []).join('، ');
  } else {
    document.getElementById('userFullNameInput').value = '';
    document.getElementById('userUsernameInput').value = '';
    document.getElementById('userRoleInput').value = 'user';
    document.getElementById('userActiveInput').value = '1';
    document.getElementById('userCanLoginInput').checked = true;
    document.getElementById('userGroupsInput').value = '';
  }
  document.getElementById('userModalOverlay').style.display = 'flex';
}

document.getElementById('addUserBtn').addEventListener('click', () => openUserModal(null));
document.getElementById('cancelUserModalBtn').addEventListener('click', () => {
  document.getElementById('userModalOverlay').style.display = 'none';
});

document.getElementById('saveUserModalBtn').addEventListener('click', async () => {
  const fullName = document.getElementById('userFullNameInput').value.trim();
  const username = document.getElementById('userUsernameInput').value.trim();
  const password = document.getElementById('userPasswordInput').value;
  const role = document.getElementById('userRoleInput').value;
  const active = document.getElementById('userActiveInput').value === '1';
  const canLogin = document.getElementById('userCanLoginInput').checked;
  const groups = document.getElementById('userGroupsInput').value.split(/[,،]/).map(x => x.trim()).filter(Boolean);
  if (!username) { alert('من فضلك أدخل اسم المستخدم'); return; }

  if (userModalMode === 'add') {
    if (!password) { alert('من فضلك أدخل كلمة مرور'); return; }
    if (db.users.some(u => u.username === username)) { alert('اسم المستخدم موجود بالفعل'); return; }
    const passwordHash = await sha256(password);
    db.users.push(normalizeUser({ id: uid(), fullName: fullName || username, username, passwordHash, role, active, canLogin, groups, createdAt: todayStr() }));
  } else {
    const u = db.users.find(x => x.id === userModalEditId);
    if (u) {
      if (db.users.some(x => x.username === username && x.id !== u.id)) { alert('اسم المستخدم موجود بالفعل'); return; }
      const othersAdmins = db.users.filter(x => x.id !== u.id && x.role === 'admin' && x.active !== false).length;
      if ((role !== 'admin' || !active) && u.role === 'admin' && othersAdmins === 0) { alert('لا يمكن تغيير أو إيقاف آخر مدير عام في البرنامج'); return; }
      if (currentUser && u.id === currentUser.id && (!active || !canLogin)) { alert('لا يمكنك إيقاف حسابك الحالي'); return; }
      Object.assign(u, { fullName: fullName || username, username, role, active, canLogin, groups });
      if (password) u.passwordHash = await sha256(password);
    }
  }
  await persist();
  document.getElementById('userModalOverlay').style.display = 'none';
  renderUsersList();
});
