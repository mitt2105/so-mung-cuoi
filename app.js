(() => {
  'use strict';

  const STORAGE_KEY = 'so-mung-cuoi-v1';
  const HEADERS = ['Ngày nhận', 'Tên khách/nhóm', 'Mối quan hệ', 'Dịp/bàn', 'Số tiền mừng (VND)', 'Hình thức', 'Tình trạng mừng lại', 'Ngày mừng lại', 'Số tiền mừng lại (VND)', 'Ghi chú'];
  const $ = (id) => document.getElementById(id);
  const form = $('giftForm');
  const today = new Date();
  $('giftDate').value = localDate(today);
  let gifts = [];
  let editingId = null;
  let persistent = true;

  function localDate(date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  function money(value) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value) || 0) + ' ₫';
  }
  function dateText(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN').format(d);
  }
  function clean(value) { return String(value ?? '').trim(); }
  function norm(value) {
    return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
      persistent = true;
    } catch (_) { persistent = false; }
    $('saveState').textContent = persistent ? 'Dữ liệu đang lưu trên trình duyệt này' : 'Trình duyệt không lưu được dữ liệu';
    $('saveState').parentElement.querySelector('p').textContent = persistent
      ? 'Xuất Excel định kỳ và giữ một bản sao riêng để không mất sổ khi đổi máy hoặc mất đường dẫn.'
      : 'Hãy xuất Excel sau mỗi lần cập nhật. Khi mở lại trang, dữ liệu chưa xuất có thể không còn.';
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      gifts = Array.isArray(parsed) ? parsed : [];
    } catch (_) { gifts = []; persistent = false; }
  }
  function cell(tag, text, className) {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function render() {
    const query = norm($('searchInput').value);
    const filtered = gifts.filter((g) => !query || norm(g.name).includes(query));
    const body = $('giftRows');
    body.replaceChildren();
    for (const gift of [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
      const tr = document.createElement('tr');
      tr.append(cell('td', dateText(gift.date), 'date-cell'));
      const nameCell = document.createElement('td');
      const name = cell('strong', gift.name || 'Chưa có tên');
      nameCell.append(name);
      if (gift.occasion) nameCell.append(cell('small', gift.occasion));
      tr.append(nameCell, cell('td', money(gift.amount), 'money-cell'), cell('td', gift.method || 'Tiền mặt'));
      const detail = [gift.relationship, gift.note].filter(Boolean).join(' · ') || '—';
      tr.append(cell('td', detail));
      const badge = cell('span', gift.returnStatus === 'Đã mừng' ? 'Đã mừng' : 'Chưa mừng', `status-pill ${gift.returnStatus === 'Đã mừng' ? 'is-done' : ''}`);
      tr.append(Object.assign(document.createElement('td'), { }), cell('td', gift.returnDate ? `${dateText(gift.returnDate)} · ${money(gift.returnAmount)}` : '—'));
      tr.children[5].append(badge);
      const actions = cell('td', '', 'row-actions');
      const edit = cell('button', 'Sửa', 'text-action'); edit.type = 'button'; edit.addEventListener('click', () => beginEdit(gift.id));
      const del = cell('button', 'Xóa', 'text-action danger-action'); del.type = 'button'; del.addEventListener('click', () => removeGift(gift.id));
      actions.append(edit, del); tr.append(actions);
      body.append(tr);
    }
    $('emptyState').hidden = filtered.length > 0;
    $('visibleCount').textContent = `${filtered.length} dòng`;
    const received = gifts.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
    $('totalReceived').textContent = money(received);
    $('giftCount').textContent = String(gifts.length);
    $('returnedCount').textContent = String(gifts.filter((g) => g.returnStatus === 'Đã mừng').length);
    $('pendingCount').textContent = String(gifts.filter((g) => g.returnStatus !== 'Đã mừng').length);
    const summary = $('searchSummary');
    if (query) {
      const sum = filtered.reduce((n, g) => n + (Number(g.amount) || 0), 0);
      summary.hidden = false;
      summary.replaceChildren(cell('span', filtered.length ? `Tìm thấy ${filtered.length} lượt mừng` : 'Chưa tìm thấy khách phù hợp'), cell('strong', money(sum)));
    } else { summary.hidden = true; summary.replaceChildren(); }
  }
  function resetForm() {
    form.reset(); $('giftDate').value = localDate(new Date()); $('returnStatus').value = 'Chưa mừng';
    editingId = null; $('entryTitle').textContent = 'Thêm khoản mừng'; $('saveGift').textContent = 'Lưu khoản mừng'; $('cancelEdit').hidden = true;
  }
  function beginEdit(id) {
    const g = gifts.find((item) => item.id === id); if (!g) return;
    editingId = id;
    $('giftDate').value = g.date || ''; $('guestName').value = g.name || ''; $('relationship').value = g.relationship || '';
    $('occasion').value = g.occasion || ''; $('giftAmount').value = g.amount ?? ''; $('giftMethod').value = g.method || 'Tiền mặt';
    $('returnStatus').value = g.returnStatus || 'Chưa mừng'; $('returnDate').value = g.returnDate || '';
    $('returnAmount').value = g.returnAmount ?? ''; $('giftNote').value = g.note || '';
    $('entryTitle').textContent = 'Sửa khoản mừng'; $('saveGift').textContent = 'Lưu thay đổi'; $('cancelEdit').hidden = false;
    $('guestName').focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function removeGift(id) {
    const target = gifts.find((g) => g.id === id);
    if (!target || !window.confirm(`Xóa khoản mừng của “${target.name}”?`)) return;
    gifts = gifts.filter((g) => g.id !== id); save(); render();
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = {
      id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      date: $('giftDate').value, name: clean($('guestName').value), relationship: clean($('relationship').value),
      occasion: clean($('occasion').value), amount: Number($('giftAmount').value) || 0, method: $('giftMethod').value,
      returnStatus: $('returnStatus').value, returnDate: $('returnDate').value, returnAmount: Number($('returnAmount').value) || 0, note: clean($('giftNote').value)
    };
    if (editingId) gifts = gifts.map((g) => g.id === editingId ? item : g); else gifts.push(item);
    save(); render(); resetForm(); $('formStatus').textContent = 'Đã lưu khoản mừng.';
  });
  $('cancelEdit').addEventListener('click', resetForm);
  $('searchInput').addEventListener('input', render);

  function excelRows() {
    return gifts.map((g) => [g.date || '', g.name || '', g.relationship || '', g.occasion || '', Number(g.amount) || 0, g.method || '', g.returnStatus || 'Chưa mừng', g.returnDate || '', Number(g.returnAmount) || 0, g.note || '']);
  }
  function setSheetBasics(ws, widths) {
    ws['!cols'] = widths.map((wch) => ({ wch }));
    const last = XLSX.utils.encode_col(widths.length - 1);
    ws['!autofilter'] = { ref: `A1:${last}${Math.max(1, gifts.length + 1)}` };
  }
  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const overview = XLSX.utils.aoa_to_sheet([
      ['SỔ THEO DÕI TIỀN MỪNG CƯỚI'], ['Cập nhật', new Date().toLocaleDateString('vi-VN')], [],
      ['Tổng hợp', 'Giá trị'], ['Tổng tiền nhận (₫)', gifts.reduce((n, g) => n + (Number(g.amount) || 0), 0)],
      ['Số lượt mừng', gifts.length], ['Đã mừng lại', gifts.filter((g) => g.returnStatus === 'Đã mừng').length],
      ['Chưa mừng lại', gifts.filter((g) => g.returnStatus !== 'Đã mừng').length],
      ['Tổng tiền đã mừng lại (₫)', gifts.reduce((n, g) => n + (Number(g.returnAmount) || 0), 0)], [],
      ['Cách dùng', 'Mỗi khách hoặc mỗi lần mừng ghi một dòng trong sheet Sổ mừng cưới. Dùng bộ lọc ở hàng tiêu đề để tìm.']
    ]);
    overview['!cols'] = [{ wch: 32 }, { wch: 82 }];
    const ledger = XLSX.utils.aoa_to_sheet([HEADERS, ...excelRows()]); setSheetBasics(ledger, [15, 28, 20, 20, 20, 18, 22, 17, 24, 36]);
    const guide = XLSX.utils.aoa_to_sheet([
      ['HƯỚNG DẪN SỬ DỤNG'], [], ['1. Ghi nhận', 'Mỗi khách hoặc mỗi lần mừng ghi một dòng; nhập ngày, tên và số tiền.'],
      ['2. Tra cứu', 'Trong sheet Sổ mừng cưới, bật bộ lọc và tìm theo tên khách hoặc gia đình.'],
      ['3. Mừng lại', 'Cập nhật tình trạng, ngày và số tiền ở các cột mừng lại.'],
      ['4. Dự phòng', 'Giữ file Excel này ở nơi an toàn. Có thể nhập lại vào công cụ bất cứ lúc nào.'],
      ['Lưu ý', 'Công cụ lưu trên trình duyệt của thiết bị hiện tại; không tự đồng bộ sang máy khác.']
    ]);
    guide['!cols'] = [{ wch: 22 }, { wch: 100 }];
    XLSX.utils.book_append_sheet(wb, overview, 'Tổng quan'); XLSX.utils.book_append_sheet(wb, ledger, 'Sổ mừng cưới'); XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn');
    XLSX.writeFile(wb, `so-mung-cuoi-${localDate(new Date())}.xlsx`);
    $('formStatus').textContent = 'Đã tải file Excel dự phòng về thiết bị.';
  }
  $('exportExcel').addEventListener('click', exportExcel);

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return localDate(value);
    if (typeof value === 'number' && value > 10000) {
      const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000); return localDate(d);
    }
    const s = clean(value); if (!s) return '';
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  }
  function amountValue(value) {
    if (typeof value === 'number') return value;
    const s = clean(value).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    return Number(s) || 0;
  }
  function importRows(rows) {
    if (!rows.length) return [];
    const keys = rows[0].map(norm);
    const index = (labels) => keys.findIndex((h) => labels.some((label) => h === norm(label)));
    const idx = {
      date: index(['Ngày nhận', 'Ngày']), name: index(['Tên khách/nhóm', 'Tên khách', 'Khách mừng', 'Tên khách mời', 'Họ tên']),
      relationship: index(['Mối quan hệ']), occasion: index(['Dịp/bàn', 'Dịp / bàn']), amount: index(['Số tiền mừng (VND)', 'Số tiền mừng', 'Số tiền', 'Tiền mừng']),
      method: index(['Hình thức']), status: index(['Tình trạng mừng lại', 'Mừng lại']), returnDate: index(['Ngày mừng lại']),
      returnAmount: index(['Số tiền mừng lại (VND)', 'Số tiền mừng lại']), note: index(['Ghi chú'])
    };
    if (idx.name < 0) throw new Error('Không thấy cột tên khách. Hãy dùng file mẫu hoặc sheet “Sổ mừng cưới”.');
    return rows.slice(1).filter((r) => clean(r[idx.name])).map((r) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, date: idx.date < 0 ? '' : parseDate(r[idx.date]), name: clean(r[idx.name]),
      relationship: idx.relationship < 0 ? '' : clean(r[idx.relationship]), occasion: idx.occasion < 0 ? '' : clean(r[idx.occasion]),
      amount: idx.amount < 0 ? 0 : amountValue(r[idx.amount]), method: idx.method < 0 ? 'Tiền mặt' : (clean(r[idx.method]) || 'Tiền mặt'),
      returnStatus: idx.status < 0 ? 'Chưa mừng' : (clean(r[idx.status]) || 'Chưa mừng'), returnDate: idx.returnDate < 0 ? '' : parseDate(r[idx.returnDate]),
      returnAmount: idx.returnAmount < 0 ? 0 : amountValue(r[idx.returnAmount]), note: idx.note < 0 ? '' : clean(r[idx.note])
    }));
  }
  $('excelImport').addEventListener('change', async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames.find((n) => norm(n) === norm('Sổ mừng cưới')) || wb.SheetNames[0];
      if (!sheetName) throw new Error('File Excel không có trang tính để nhập.');
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      const imported = importRows(rows);
      if (!imported.length) throw new Error('Không tìm thấy dòng khách có tên trong file.');
      if ($('importMode').value === 'replace') {
        if (!window.confirm(`Thay sổ hiện tại bằng ${imported.length} dòng từ file Excel?`)) return;
        gifts = imported;
      } else gifts = gifts.concat(imported);
      save(); render(); $('formStatus').textContent = `Đã nhập ${imported.length} dòng từ Excel.`;
    } catch (error) { window.alert(error.message || 'Không đọc được file Excel.'); }
    finally { event.target.value = ''; }
  });

  load(); save(); render();
})();
