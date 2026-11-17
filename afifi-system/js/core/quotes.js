// ===================== QUOTES =====================
function renderQuotesList() {
  const root = document.getElementById('quotesListRoot');
  if (!db.quotes.length) {
    root.innerHTML = `<div class="list-card"><div class="empty-state">لا توجد عروض أسعار بعد — اضغط "+ عرض سعر جديد"</div></div>`;
    return;
  }
  root.innerHTML = `<div class="list-card">${db.quotes.map(q => `
    <div class="list-row" data-id="${q.id}">
      <div class="list-main">
        <div class="avatar">${IC.file}</div>
        <div>
          <strong>${escapeHtml(q.customerName || 'بدون اسم')}</strong>
          <div class="list-sub">${escapeHtml(q.date || '')} • ${q.items.length} بند • <span class="row-badge ok num">${fmt(q.items.reduce((s, it) => s + quoteItemTotal(it), 0))} ج.م</span></div>
        </div>
      </div>
      <div class="list-actions">
        <button class="icon-btn open" data-action="toAccount">➕ لحساب العميل</button>
        <button class="icon-btn edit" data-action="edit">تعديل</button>
        <button class="icon-btn print" data-action="print">طباعة</button>
        <button class="icon-btn delete" data-action="delete">حذف</button>
      </div>
    </div>
  `).join('')}</div>`;

  root.querySelectorAll('.list-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => editQuote(id));
    row.querySelector('[data-action="print"]').addEventListener('click', () => {
      const q = db.quotes.find(x => x.id === id);
      printQuote(q);
    });
    row.querySelector('[data-action="toAccount"]').addEventListener('click', () => {
      const q = db.quotes.find(x => x.id === id);
      const customer = db.customers.find(c => c.id === q.customerId);
      if (!customer) { alert('عرض السعر ده مش مرتبط بعميل مسجل. من فضلك افتح عرض السعر واختار عميل موجود من القائمة أولًا.'); return; }
      const grand = q.items.reduce((s, it) => s + quoteItemTotal(it), 0);
      if (!customer.accounts) customer.accounts = [];
      customer.accounts.push({
        id: uid(),
        description: 'عرض سعر بتاريخ ' + (q.date || todayStr()),
        totalAmount: Math.round(grand * 100) / 100,
        date: todayStr(),
        payments: [],
        quoteId: q.id
      });
      persist();
      alert(`تم إضافة عرض السعر كطلب في حساب العميل "${customer.name}" بمبلغ ${fmt(grand)} ج.م`);
      openCustomerDetail(customer.id);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      openConfirm('هل تريد حذف عرض السعر هذا؟', () => {
        db.quotes = db.quotes.filter(x => x.id !== id);
        persist();
        renderQuotesList();
      });
    });
  });
}

document.getElementById('addQuoteBtn').addEventListener('click', () => {
  currentQuoteEditing = {
    id: null,
    customerId: '',
    customerName: '',
    date: new Date().toISOString().slice(0, 10),
    items: [{ bayan: '', qty: 1, price: '' }],
    notes: defaultNotes()
  };
  renderQuoteForm();
  showView('quote-form');
});

document.getElementById('backToQuotesBtn').addEventListener('click', () => showView('quotes'));

function editQuote(id) {
  const q = db.quotes.find(x => x.id === id);
  if (!q) return;
  currentQuoteEditing = JSON.parse(JSON.stringify(q));
  renderQuoteForm();
  showView('quote-form');
}

function renderQuoteForm() {
  const root = document.getElementById('quoteFormRoot');
  const q = currentQuoteEditing;
  root.innerHTML = `
    <div class="sheet" style="padding:20px 24px;">
      <div class="quote-form-grid">
        <div class="field">
          <label>اختر العميل</label>
          <select class="quote-customer-select">
            <option value="">— اختر عميل موجود —</option>
            ${db.customers.map(c => `<option value="${c.id}" ${q.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>اسم العميل (يظهر في الطباعة)</label>
          <input type="text" class="quote-customer-name" value="${escapeHtml(q.customerName || '')}" placeholder="اسم الشركة أو العميل">
        </div>
        <div class="field">
          <label>التاريخ</label>
          <input type="date" class="quote-date" value="${q.date || ''}">
        </div>
      </div>

      <div class="calc-picker-box"></div>

      <table class="quote-items-table">
        <thead>
          <tr><th style="width:36px;">م</th><th>الصنف</th><th style="width:100px;">الكمية</th><th style="width:130px;">سعر الوحدة</th><th style="width:130px;">السعر الإجمالي</th><th style="width:36px;"></th></tr>
        </thead>
        <tbody class="quote-items-body"></tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align:left; font-family:'Cairo',sans-serif; font-weight:800; padding:10px; background:#eee5cf;">إجمالي الأسعار</td>
            <td colspan="2" class="quote-grand-total" style="font-family:'Cairo',sans-serif; font-weight:800; padding:10px; background: var(--brass-light); text-align:center;">0 ج.م</td>
          </tr>
        </tfoot>
      </table>
      <button class="add-row-btn" id="addQuoteItemBtn">+ إضافة بند يدوي</button>

      <div class="notes-box">
        <h3>ملاحظات تظهر أسفل عرض السعر</h3>
        <div class="notes-list"></div>
        <button class="add-row-btn" id="addNoteBtn">+ إضافة ملاحظة</button>
      </div>
    </div>
  `;

  root.querySelector('.quote-customer-select').addEventListener('change', e => {
    const c = db.customers.find(x => x.id === e.target.value);
    q.customerId = e.target.value;
    if (c) {
      q.customerName = c.name;
      root.querySelector('.quote-customer-name').value = c.name;
      // if the items list is still empty/default, auto-pull all of this customer's calculators
      const isBlankDefault = q.items.length <= 1 && q.items.every(it => !it.bayan && it.price === '');
      if (isBlankDefault && c.calculators.length) {
        q.items = c.calculators.map(makeQuoteItemFromCalc);
      }
    }
    renderCalcPicker(root, q);
    buildQuoteItemsTable(root, q);
  });
  root.querySelector('.quote-customer-name').addEventListener('input', e => { q.customerName = e.target.value; });
  root.querySelector('.quote-date').addEventListener('input', e => { q.date = e.target.value; });

  renderCalcPicker(root, q);
  buildQuoteItemsTable(root, q);
  buildNotesList(root, q);

  root.querySelector('#addQuoteItemBtn').addEventListener('click', () => {
    q.items.push({ bayan: '', qty: 1, price: '' });
    buildQuoteItemsTable(root, q);
  });
  root.querySelector('#addNoteBtn').addEventListener('click', () => {
    q.notes.push('');
    buildNotesList(root, q);
  });
}

function makeQuoteItemFromCalc(calc) {
  const computed = computeCalc(calc);
  return {
    bayan: calc.palletName || calc.name || TYPE_META[calc.type || 'pallet'].label,
    type: calc.type || 'pallet',
    qty: 1,
    price: Math.round(computed.finalPrice * 100) / 100
  };
}

function renderCalcPicker(root, q) {
  const box = root.querySelector('.calc-picker-box');
  const customer = db.customers.find(c => c.id === q.customerId);
  if (!customer || !customer.calculators.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="costs-box" style="margin-bottom:16px;">
      <h3>إضافة بند من حاسبات "${escapeHtml(customer.name)}"</h3>
      <div class="calc-picker-list">
        ${customer.calculators.map(calc => {
          const computed = computeCalc(calc);
          return `
          <div class="calc-picker-item">
            <span>${escapeHtml(calc.palletName || calc.name || 'حاسبة')} — ${fmt(computed.finalPrice)} ج.م</span>
            <button class="icon-btn open" data-calc-id="${calc.id}">+ إضافة لعرض السعر</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
  box.querySelectorAll('[data-calc-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const calc = customer.calculators.find(c => c.id === btn.dataset.calcId);
      q.items.push(makeQuoteItemFromCalc(calc));
      buildQuoteItemsTable(root, q);
    });
  });
}

function buildQuoteItemsTable(root, q) {
  const tbody = root.querySelector('.quote-items-body');
  tbody.innerHTML = '';
  q.items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rownum">${idx + 1}</td>
      <td><input type="text" class="bayan-input" value="${escapeHtml(item.bayan || '')}" placeholder="مثال: بالتة 113*113 أو صندوق خشبي أو بكرة سحاب"></td>
      <td><input type="number" class="qty-input" value="${item.qty ?? 1}" min="0" placeholder="1"></td>
      <td><input type="number" class="price-input" value="${item.price ?? ''}" placeholder="0"></td>
      <td class="calc line-total-cell">0</td>
      <td><button class="row-del-btn" title="حذف البند">✕</button></td>
    `;
    tr.querySelector('.bayan-input').addEventListener('input', e => { item.bayan = e.target.value; });
    tr.querySelector('.qty-input').addEventListener('input', e => { item.qty = e.target.value; updateQuoteTotals(root, q); });
    tr.querySelector('.price-input').addEventListener('input', e => { item.price = e.target.value; updateQuoteTotals(root, q); });
    tr.querySelector('.row-del-btn').addEventListener('click', () => {
      q.items.splice(idx, 1);
      buildQuoteItemsTable(root, q);
    });
    tbody.appendChild(tr);
  });
  updateQuoteTotals(root, q);
}

function quoteItemTotal(item) {
  const qty = parseFloat(item.qty ?? 1) || 0;
  const price = parseFloat(item.price) || 0;
  return qty * price;
}

function updateQuoteTotals(root, q) {
  const rows = root.querySelectorAll('.quote-items-body tr');
  let grand = 0;
  rows.forEach((tr, idx) => {
    const total = quoteItemTotal(q.items[idx]);
    grand += total;
    const cell = tr.querySelector('.line-total-cell');
    if (cell) cell.textContent = fmt(total);
  });
  const grandCell = root.querySelector('.quote-grand-total');
  if (grandCell) grandCell.textContent = fmt(grand) + ' ج.م';
}

function buildNotesList(root, q) {
  const list = root.querySelector('.notes-list');
  list.innerHTML = '';
  q.notes.forEach((note, idx) => {
    const div = document.createElement('div');
    div.className = 'note-row';
    div.innerHTML = `<input type="text" value="${escapeHtml(note)}"><button class="row-del-btn" title="حذف">✕</button>`;
    div.querySelector('input').addEventListener('input', e => { q.notes[idx] = e.target.value; });
    div.querySelector('button').addEventListener('click', () => { q.notes.splice(idx, 1); buildNotesList(root, q); });
    list.appendChild(div);
  });
}

document.getElementById('saveQuoteBtn').addEventListener('click', () => {
  const q = currentQuoteEditing;
  if (!q.customerName.trim()) { alert('من فضلك اختر أو اكتب اسم العميل'); return; }
  if (q.id) {
    const idx = db.quotes.findIndex(x => x.id === q.id);
    if (idx > -1) db.quotes[idx] = q;
  } else {
    q.id = uid();
    db.quotes.push(q);
  }
  persist();
  renderQuotesList();
  showView('quotes');
});

document.getElementById('printQuoteBtn').addEventListener('click', () => {
  printQuote(currentQuoteEditing);
});
