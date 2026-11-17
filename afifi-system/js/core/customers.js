// ===================== CUSTOMERS =====================
function renderCustomersList() {
  const root = document.getElementById('customersListRoot');
  if (!db.customers.length) {
    root.innerHTML = `<div class="list-card"><div class="empty-state">لا يوجد عملاء بعد — اضغط "+ إضافة عميل" للبدء</div></div>`;
    return;
  }
  root.innerHTML = `<div class="cust-grid">${db.customers.map(c => {
    const L = ledgerOf(c);
    const chip = !L.required && !L.paid ? `<span class="chip info">لا توجد طلبات</span>`
      : L.remaining > 0.005 ? `<span class="chip due">عليه ${fmt(L.remaining)}</span>`
      : `<span class="chip ok">${IC.check} مسدَّد</span>`;
    return `
    <div class="cust-card" data-id="${c.id}">
      <div class="cust-top">
        <div class="avatar">${escapeHtml(initial(c.name))}</div>
        <div class="cust-id"><strong>${escapeHtml(c.name)}</strong><span class="num">${escapeHtml(c.phone || '—')}</span></div>
        ${chip}
      </div>
      <div class="cust-meta">${escapeHtml(c.address || 'بدون عنوان')} • ${c.calculators.length} حاسبة • ${(c.accounts || []).length} طلب</div>
      <div class="cust-stats">
        <div class="mini"><small>المطلوب</small><b class="num">${fmt(L.required)}</b></div>
        <div class="mini ok"><small>المدفوع</small><b class="num">${fmt(L.paid)}</b></div>
        <div class="mini due"><small>المتبقي</small><b class="num">${fmt(L.remaining)}</b></div>
      </div>
      <div class="cust-actions">
        <button class="icon-btn open grow" data-action="open">فتح الحساب</button>
        <button class="icon-btn pay" data-action="collect">+ تحصيل</button>
        <button class="icon-btn edit" data-action="edit">تعديل</button>
        <button class="icon-btn delete" data-action="delete">حذف</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  root.querySelectorAll('.cust-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('click', () => openCustomerDetail(id));
    const on = (a, fn) => card.querySelector(`[data-action="${a}"]`).addEventListener('click', e => { e.stopPropagation(); fn(); });
    on('open', () => openCustomerDetail(id));
    on('collect', () => openPaymentModal(db.customers.find(x => x.id === id), '', true));
    on('edit', () => openCustomerModal(id));
    on('delete', () => {
      const c = db.customers.find(x => x.id === id);
      openConfirm(`هل تريد حذف العميل "${c.name}"؟ سيتم حذف كل حاساباته أيضًا.`, () => {
        db.customers = db.customers.filter(x => x.id !== id);
        persist();
        renderCustomersList();
      });
    });
  });
}

function openCustomerDetail(id) {
  currentCustomerId = id;
  const customer = db.customers.find(c => c.id === id);
  if (!customer) return;
  document.getElementById('customerDetailName').textContent = customer.name;
  document.getElementById('customerDetailAvatar').textContent = initial(customer.name);
  document.getElementById('customerDetailSub').textContent = [customer.phone, customer.address].filter(Boolean).join(' • ') || 'بدون بيانات تواصل';
  renderCustomerSpecs(customer);
  renderCustomerAccounts(customer);
  renderCustomerCalcsList(customer);
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-customer-detail').style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'customers'));
}

function renderCustomerSpecs(customer) {
  const root = document.getElementById('customerSpecsRoot');
  const otherCustomers = db.customers.filter(c => c.id !== customer.id);
  root.innerHTML = `
    <div class="specs-box">
      <h3>مواصفات هذا العميل (تظهر في القائمة المنسدلة بحاساباته)</h3>
      <div class="specs-chips"></div>
      <div class="specs-add-row">
        <input type="text" class="new-spec-input" placeholder="اسم مواصفة جديدة">
        <button class="primary-btn" id="addSpecBtn">+ إضافة</button>
      </div>
      ${otherCustomers.length ? `
      <div class="specs-add-row" style="margin-top:10px;">
        <select class="copy-specs-select">
          <option value="">— انسخ المواصفات من عميل تاني —</option>
          ${otherCustomers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.specs.length} مواصفة)</option>`).join('')}
        </select>
        <button class="secondary-btn" id="copySpecsBtn">نسخ</button>
      </div>` : ''}
    </div>
  `;

  function renderChips() {
    const chips = root.querySelector('.specs-chips');
    chips.innerHTML = customer.specs.map((s, idx) => `
      <span class="spec-chip" data-idx="${idx}">${escapeHtml(s)} <button title="حذف">✕</button></span>
    `).join('');
    chips.querySelectorAll('.spec-chip button').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.parentElement.dataset.idx, 10);
        customer.specs.splice(idx, 1);
        persist();
        renderChips();
      });
    });
  }
  renderChips();

  root.querySelector('#addSpecBtn').addEventListener('click', () => {
    const input = root.querySelector('.new-spec-input');
    const val = input.value.trim();
    if (!val) return;
    if (!customer.specs.includes(val)) customer.specs.push(val);
    input.value = '';
    persist();
    renderChips();
  });
  root.querySelector('.new-spec-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') root.querySelector('#addSpecBtn').click();
  });

  const copyBtn = root.querySelector('#copySpecsBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const select = root.querySelector('.copy-specs-select');
      const source = db.customers.find(c => c.id === select.value);
      if (!source) { alert('اختار عميل الأول عشان تنسخ مواصفاته'); return; }
      openConfirm(`هل تريد استبدال مواصفات "${customer.name}" بنفس مواصفات "${source.name}"؟`, () => {
        customer.specs = [...source.specs];
        persist();
        renderChips();
      });
    });
  }
}
