/**
 * OVIAN — nhận đơn hàng từ website vào Google Sheet.
 *
 * Website (máy chủ) gửi đơn tới Web App này; mỗi đơn là một dòng trong trang tính "Đơn hàng".
 * Hướng dẫn cài đặt: docs/GOOGLE_SHEETS_ORDERS.vi.md
 *
 * Script Properties (Cài đặt dự án → Thuộc tính tập lệnh):
 *   OVIAN_SECRET   (bắt buộc)  mã bí mật, giống GOOGLE_SHEETS_SECRET trên máy chủ website
 *   NOTIFY_EMAIL   (tuỳ chọn)  email nhận thông báo khi có đơn mới
 *   NEXT_ORDER_NO  (tự tạo)    số thứ tự đơn tiếp theo
 */

const SHEET_NAME = 'Đơn hàng';

const STATUS_LABELS = {
  pending: 'Mới',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  ready_for_pickup: 'Sẵn sàng nhận',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

const HEADERS = [
  'Thời gian', 'Mã đơn', 'Trạng thái', 'Đã thu tiền', 'Họ tên', 'Số điện thoại', 'Email',
  'Cách nhận', 'Thanh toán', 'Tỉnh/Thành', 'Phường/Xã', 'Số nhà, đường', 'Sản phẩm',
  'Tạm tính', 'Mã giảm giá', 'Giảm giá', 'Phí giao', 'Tổng cộng',
  'Ghi chú của khách', 'Ghi chú nội bộ', 'Mã phiên (không sửa)', 'Dữ liệu (không sửa)',
];
const COL = {};
HEADERS.forEach((h, i) => { COL[h] = i; }); // 0-based index into a row

/* ------------------------------------------------------------------ web app */

function doGet() {
  // Health check only: lets the owner open the URL and see the script is deployed. No order data.
  return json_({ ok: true, service: 'ovian-orders' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad-json' });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('OVIAN_SECRET');
  if (!secret || secret.length < 24 || !req || req.secret !== secret) return json_({ ok: false, error: 'unauthorized' });
  try {
    const p = req.payload || {};
    if (req.action === 'create') return json_(createOrder_(p));
    if (req.action === 'find') return json_({ ok: true, order: findOrder_(COL['Mã phiên (không sửa)'], String(p.checkoutId || '')) });
    if (req.action === 'get') return json_({ ok: true, order: findOrder_(COL['Mã đơn'], String(p.ref || '').toUpperCase()) });
    return json_({ ok: false, error: 'unknown-action' });
  } catch (err) {
    console.error(err);
    // For "create" the website treats this as "outcome unknown" and checks again before retrying.
    return json_({ ok: false, error: 'server-error' });
  }
}

/* ------------------------------------------------------------------ orders */

function createOrder_(p) {
  const problem = validate_(p);
  if (problem) return { ok: false, error: 'bad-request:' + problem };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    // Same checkout submitted again (double click, retry after a timeout): return the existing order.
    const existing = findRow_(sheet, COL['Mã phiên (không sửa)'], p.checkoutId);
    if (existing) return { ok: true, duplicate: true, order: rowToOrder_(existing) };

    const props = PropertiesService.getScriptProperties();
    const n = Number(props.getProperty('NEXT_ORDER_NO') || '1');
    const ref = 'OV' + String(n).padStart(5, '0');
    props.setProperty('NEXT_ORDER_NO', String(n + 1));

    const now = new Date();
    const pickup = p.fulfillment === 'pickup';
    const addr = p.address || {};
    const data = {
      v: 1,
      ref: ref,
      createdAt: now.toISOString(),
      locale: p.locale,
      fulfillment: pickup ? 'pickup' : 'delivery',
      payment: pickup ? 'cash_at_store' : 'cod',
      lines: p.lines,
      couponCode: p.couponCode || null,
      subtotal: p.subtotal,
      discount: p.discount,
      shippingFee: p.shippingFee,
      total: p.total,
      customerName: p.customer.fullName,
      customerPhone: p.customer.phone,
      provinceCode: pickup ? null : addr.provinceCode || null,
      ward: pickup ? null : addr.ward || null,
      street: pickup ? null : addr.street || null,
    };

    const row = new Array(HEADERS.length).fill('');
    row[COL['Thời gian']] = now;
    row[COL['Mã đơn']] = ref;
    row[COL['Trạng thái']] = STATUS_LABELS.pending;
    row[COL['Đã thu tiền']] = false;
    row[COL['Họ tên']] = text_(p.customer.fullName);
    row[COL['Số điện thoại']] = "'" + String(p.customer.phone).replace(/[^\d+]/g, '');
    row[COL['Email']] = text_(p.customer.email || '');
    row[COL['Cách nhận']] = pickup ? 'Nhận tại cửa hàng' : 'Giao tận nhà';
    row[COL['Thanh toán']] = pickup ? 'Tiền mặt tại cửa hàng' : 'COD (thu khi giao)';
    row[COL['Tỉnh/Thành']] = pickup ? '' : text_(addr.provinceName || addr.provinceCode || '');
    row[COL['Phường/Xã']] = pickup ? '' : text_(addr.ward || '');
    row[COL['Số nhà, đường']] = pickup ? '' : text_(addr.street || '');
    row[COL['Sản phẩm']] = text_(p.lines.map(lineText_).join('\n'));
    row[COL['Tạm tính']] = p.subtotal;
    row[COL['Mã giảm giá']] = text_(p.couponCode || '');
    row[COL['Giảm giá']] = p.discount;
    row[COL['Phí giao']] = p.shippingFee;
    row[COL['Tổng cộng']] = p.total;
    row[COL['Ghi chú của khách']] = text_(p.note || '');
    row[COL['Mã phiên (không sửa)']] = p.checkoutId;
    row[COL['Dữ liệu (không sửa)']] = JSON.stringify(data);

    sheet.appendRow(row);
    formatNewRow_(sheet, sheet.getLastRow());
    SpreadsheetApp.flush();
    notify_(data, row);
    return { ok: true, order: rowToOrder_(row) };
  } finally {
    lock.releaseLock();
  }
}

function findOrder_(colIndex, value) {
  if (!value) return null;
  const row = findRow_(getSheet_(), colIndex, value);
  return row ? rowToOrder_(row) : null;
}

/** Order for the website: amounts and lines from the frozen data column; status and payment from the editable columns. */
function rowToOrder_(row) {
  const d = JSON.parse(row[COL['Dữ liệu (không sửa)']]);
  const label = String(row[COL['Trạng thái']] || '').trim();
  let status = 'pending';
  Object.keys(STATUS_LABELS).forEach((k) => { if (STATUS_LABELS[k] === label) status = k; });
  return {
    ref: d.ref,
    createdAt: d.createdAt,
    status: status,
    paid: row[COL['Đã thu tiền']] === true,
    fulfillment: d.fulfillment,
    payment: d.payment,
    lines: d.lines,
    subtotal: d.subtotal,
    discount: d.discount,
    shippingFee: d.shippingFee,
    total: d.total,
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    provinceCode: d.provinceCode,
    ward: d.ward,
    street: d.street,
  };
}

function findRow_(sheet, colIndex, value) {
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][colIndex]) === value) return values[i];
  }
  return null;
}

/* ------------------------------------------------------------------ helpers */

/** Checkbox and status list on the new row only (pre-filled checkboxes would make appendRow skip to the bottom). */
function formatNewRow_(sheet, r) {
  sheet.getRange(r, COL['Đã thu tiền'] + 1).insertCheckboxes();
  sheet.getRange(r, COL['Trạng thái'] + 1).setDataValidation(statusRule_());
}

function statusRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(Object.values(STATUS_LABELS), true).setAllowInvalid(false).build();
}

function validate_(p) {
  const isNum = (x) => typeof x === 'number' && isFinite(x) && x >= 0;
  if (!p || typeof p.checkoutId !== 'string' || p.checkoutId.length < 8 || p.checkoutId.length > 64) return 'checkoutId';
  if (!p.customer || !p.customer.fullName || !p.customer.phone) return 'customer';
  if (p.fulfillment !== 'pickup' && p.fulfillment !== 'delivery') return 'fulfillment';
  if (p.fulfillment === 'delivery' && (!p.address || !p.address.provinceCode || !p.address.street)) return 'address';
  if (!Array.isArray(p.lines) || p.lines.length === 0 || p.lines.length > 100) return 'lines';
  if (!p.lines.every((l) => l && l.name && isNum(l.quantity) && isNum(l.unitPrice) && isNum(l.lineTotal))) return 'lines';
  if (![p.subtotal, p.discount, p.shippingFee, p.total].every(isNum)) return 'totals';
  return null;
}

function lineText_(l) {
  const variant = l.variantTitle && l.variantTitle !== l.name ? ' (' + l.variantTitle + ')' : '';
  const sku = l.sku ? ' [' + l.sku + ']' : '';
  return l.quantity + ' × ' + l.name + variant + sku + ' = ' + money_(l.lineTotal);
}

function money_(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

/** Customer text is stored as text, never as a formula (=, +, -, @ would otherwise be evaluated). */
function text_(v) {
  const s = String(v == null ? '' : v).slice(0, 2000);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Chưa có trang tính "' + SHEET_NAME + '". Hãy chạy hàm setup() một lần.');
  return sheet;
}

function notify_(d, row) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  try {
    const body = [
      'Đơn mới ' + d.ref + ' — ' + row[COL['Cách nhận']] + ', ' + row[COL['Thanh toán']],
      'Khách: ' + d.customerName + ' — ' + d.customerPhone,
      '',
      row[COL['Sản phẩm']],
      '',
      'Tổng cộng: ' + money_(d.total),
      '',
      SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    ].join('\n');
    MailApp.sendEmail(to, 'OVIAN: đơn mới ' + d.ref + ' — ' + money_(d.total), body);
  } catch (err) {
    console.error('notify failed', err); // never block the order because of the email
  }
}

/* ------------------------------------------------------------------ one-time setup */

/** Chạy một lần sau khi dán mã: tạo trang tính "Đơn hàng", tiêu đề, danh sách trạng thái, định dạng. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#e6efe8');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  const rows = sheet.getMaxRows() - 1; // formats only: they do not count as data for appendRow
  const col = (h) => COL[h] + 1;
  sheet.getRange(2, col('Thời gian'), rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  ['Tạm tính', 'Giảm giá', 'Phí giao', 'Tổng cộng'].forEach((h) => sheet.getRange(2, col(h), rows, 1).setNumberFormat('#,##0'));
  sheet.getRange(2, col('Sản phẩm'), rows, 1).setWrap(true);
  sheet.setColumnWidth(col('Sản phẩm'), 360);
  sheet.hideColumns(col('Mã phiên (không sửa)'), 2);
  if (!PropertiesService.getScriptProperties().getProperty('NEXT_ORDER_NO')) {
    PropertiesService.getScriptProperties().setProperty('NEXT_ORDER_NO', '1');
  }
}
