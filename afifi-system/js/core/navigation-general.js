// ===================== NAVIGATION =====================
function showView(name) {
  if (typeof canAccess === 'function' && currentUser && !canAccess(name)) {
    const first = ['general', 'customers', 'collections', 'quotes', 'company', 'users'].find(v => canAccess(v));
    if (!first) return;
    name = first;
  }
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + name).style.display = 'block';
  if (name === 'collections') renderCollectionsView();
  if (name === 'customers') renderCustomersList();
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

// ===================== GENERAL CALCULATOR =====================
function renderGeneralView() {
  if (!db.general) db.general = defaultCalc();
  const root = document.getElementById('generalCalcRoot');
  renderCalculator(root, db.general, persist);
}
