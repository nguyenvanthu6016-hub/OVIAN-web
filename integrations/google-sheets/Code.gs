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
 *   SPREADSHEET_ID (tuỳ chọn)  chỉ cần khi script được tạo riêng ở script.google.com (không mở từ Sheet)
 *   MAX_ORDERS_PER_PHONE_DAY   (tuỳ chọn) số đơn tối đa mỗi số điện thoại trong 24 giờ; mặc định 3, đặt 0 để tắt
 */

const SHEET_NAME = 'Đơn hàng';
/** Trang tính danh sách chặn: cột A số điện thoại, cột B lý do. */
const BLOCK_SHEET_NAME = 'Chặn';
const DEFAULT_MAX_PER_PHONE_DAY = 3;

const STATUS_LABELS = {
  pending: 'Mới',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  ready_for_pickup: 'Sẵn sàng nhận',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

/** Carriers offered in the "Đơn vị vận chuyển" list; staff may still type another name. */
const CARRIERS = ['GHN', 'GHTK', 'Viettel Post', 'J&T Express', 'Ninja Van', 'VNPost', 'Ahamove', 'Grab/Be', 'Tự giao', 'Khác'];

const HEADERS = [
  // Order
  'Thời gian', 'Mã đơn',
  // Handling (staff edit; status, carrier and tracking number are shown to the customer)
  'Trạng thái', 'Đã thu tiền', 'Đơn vị vận chuyển', 'Mã vận đơn', 'Ngày giao', 'Ngày khách nhận',
  'Phí ship thực tế', 'Người xử lý', 'Đã trừ tồn kho Sapo', 'Lý do huỷ / hoàn',
  // Customer and delivery (written by the website)
  'Họ tên', 'Số điện thoại', 'Email', 'Cách nhận', 'Thanh toán', 'Tỉnh/Thành', 'Phường/Xã', 'Số nhà, đường',
  'Ghi chú của khách',
  // Products and money (calculated by the website server)
  'Sản phẩm', 'Tạm tính', 'Mã giảm giá', 'Giảm giá', 'Phí giao', 'Tổng cộng',
  // Staff note, then hidden technical columns (never edit)
  'Ghi chú nội bộ', 'Mã phiên (không sửa)', 'Dữ liệu (không sửa)',
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
    // detail is only returned to a caller that sent the right secret; it helps diagnose setup problems.
    return json_({ ok: false, error: 'server-error', detail: String(err && err.message || err).slice(0, 200) });
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

    const refusal = spamCheck_(sheet, p.customer.phone);
    if (refusal) return { ok: false, error: 'refused:' + refusal };

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
    row[COL['Đã trừ tồn kho Sapo']] = false;
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
    // Shown to the customer on the tracking page when staff fill them in.
    carrier: String(row[COL['Đơn vị vận chuyển']] || '').trim() || null,
    trackingNumber: String(row[COL['Mã vận đơn']] || '').trim() || null,
  };
}

function findRow_(sheet, colIndex, value) {
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][colIndex]) === value) return values[i];
  }
  return null;
}

/** Trang tính "Chặn": thêm số điện thoại vào cột A để website từ chối đơn từ số đó. */
function setupBlocklist_(ss) {
  const sheet = ss.getSheetByName(BLOCK_SHEET_NAME) || ss.insertSheet(BLOCK_SHEET_NAME);
  if (sheet.getLastRow() >= 1 && sheet.getRange(1, 1).getValue()) return;
  sheet.getRange(1, 1, 1, 3).setValues([['Số điện thoại', 'Lý do', 'Ngày thêm']])
    .setFontWeight('bold').setBackground('#fff1c2');
  sheet.getRange(1, 1).setNote('Thêm mỗi số một dòng. Website sẽ từ chối đơn mới từ các số này. Xoá dòng để bỏ chặn.');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 260);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy');
}

/* ------------------------------------------------------------------ anti-spam */

const digits_ = (v) => String(v == null ? '' : v).replace(/\D/g, '').slice(-9);

/**
 * Refuses an order before anything is written: 'blocked' for a number on the "Chặn" sheet,
 * 'too-many' when that number already has MAX_ORDERS_PER_PHONE_DAY orders in the last 24 hours.
 * Numbers are compared by their last 9 digits, so 0912…, +8491… and 8491… all match.
 */
function spamCheck_(sheet, phone) {
  const want = digits_(phone);
  if (!want) return null;
  if (isBlocked_(want)) return 'blocked';

  const max = Number(PropertiesService.getScriptProperties().getProperty('MAX_ORDERS_PER_PHONE_DAY') || DEFAULT_MAX_PER_PHONE_DAY);
  if (!(max > 0)) return null;
  const since = Date.now() - 24 * 3600 * 1000;
  const values = sheet.getDataRange().getValues();
  let seen = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    const at = values[i][COL['Thời gian']];
    const time = at instanceof Date ? at.getTime() : Date.parse(at);
    if (time && time < since) break; // rows are in order, so everything above is older
    if (digits_(values[i][COL['Số điện thoại']]) === want && ++seen >= max) return 'too-many';
  }
  return null;
}

function isBlocked_(want) {
  const sheet = spreadsheet_().getSheetByName(BLOCK_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) if (digits_(values[i][0]) === want) return true;
  return false;
}

/* ------------------------------------------------------------------ helpers */

/**
 * Checkboxes and lists on the new row only. Pre-filled checkboxes on empty rows would count as data
 * and make appendRow write at the bottom of the sheet.
 */
function formatNewRow_(sheet, r) {
  sheet.getRange(r, COL['Đã thu tiền'] + 1).insertCheckboxes();
  sheet.getRange(r, COL['Đã trừ tồn kho Sapo'] + 1).insertCheckboxes();
  sheet.getRange(r, COL['Trạng thái'] + 1).setDataValidation(statusRule_());
  sheet.getRange(r, COL['Đơn vị vận chuyển'] + 1).setDataValidation(carrierRule_());
  sheet.getRange(r, COL['Ngày giao'] + 1, 1, 2).setDataValidation(dateRule_());
}

function statusRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(Object.values(STATUS_LABELS), true).setAllowInvalid(false).build();
}

/** List of carriers, but another name is still accepted (shown with a warning). */
function carrierRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(CARRIERS, true).setAllowInvalid(true).build();
}

function dateRule_() {
  return SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText('Nhập ngày, ví dụ 15/11/2026').build();
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

/**
 * The spreadsheet that holds orders: the one this script is attached to (Extensions → Apps Script),
 * or, for a standalone script made at script.google.com, the one named by the SPREADSHEET_ID property
 * (the long id in the sheet URL: docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit).
 */
function spreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id.trim());
  throw new Error('Script chưa gắn với Google Sheet. Mở Sheet → Tiện ích mở rộng → Apps Script, hoặc thêm thuộc tính SPREADSHEET_ID.');
}

function getSheet_() {
  const sheet = spreadsheet_().getSheetByName(SHEET_NAME);
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
      spreadsheet_().getUrl(),
    ].join('\n');
    MailApp.sendEmail(to, 'OVIAN: đơn mới ' + d.ref + ' — ' + money_(d.total), body);
  } catch (err) {
    console.error('notify failed', err); // never block the order because of the email
  }
}

/* ------------------------------------------------------------------ one-time setup */

/** Cột anh/chị tự điền (nền vàng nhạt) — các cột còn lại do website ghi (nền xanh nhạt). */
const STAFF_COLUMNS = [
  'Trạng thái', 'Đã thu tiền', 'Đơn vị vận chuyển', 'Mã vận đơn', 'Ngày giao', 'Ngày khách nhận',
  'Phí ship thực tế', 'Người xử lý', 'Đã trừ tồn kho Sapo', 'Lý do huỷ / hoàn', 'Ghi chú nội bộ',
];

const HEADER_NOTES = {
  'Mã đơn': 'Khách dùng mã này + số điện thoại để tra cứu đơn trên website.',
  'Trạng thái': 'Khách THẤY trạng thái này khi tra cứu đơn.',
  'Đã thu tiền': 'Tích khi đã nhận tiền thật (COD hoặc tại cửa hàng).',
  'Đơn vị vận chuyển': 'Khách THẤY khi tra cứu đơn. Chọn trong danh sách hoặc gõ tên khác.',
  'Mã vận đơn': 'Khách THẤY khi tra cứu đơn, để tự theo dõi với bên vận chuyển.',
  'Phí ship thực tế': 'Phí OVIAN trả cho bên vận chuyển. So với cột "Phí giao" (khách trả).',
  'Đã trừ tồn kho Sapo': 'Đơn web KHÔNG tự trừ tồn kho Sapo. Tích sau khi đã trừ trong Sapo.',
  'Phí giao': 'Phí giao khách trả, do website tính theo tỉnh.',
  'Mã phiên (không sửa)': 'Cột kỹ thuật: chống tạo trùng đơn. Không sửa, không xoá.',
  'Dữ liệu (không sửa)': 'Cột kỹ thuật: dữ liệu gốc của đơn, dùng cho trang tra cứu. Không sửa, không xoá.',
};

/** Chạy một lần sau khi dán mã: tạo trang tính "Đơn hàng", tiêu đề, màu, ghi chú, định dạng. */
function setup() {
  const ss = spreadsheet_();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() > 1) {
    throw new Error('Trang tính "' + SHEET_NAME + '" đã có đơn hàng. Không chạy lại setup() để tránh làm lệch cột.');
  }
  const col = (h) => COL[h] + 1;
  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setValues([HEADERS]).setFontWeight('bold').setBackground('#e6efe8').setFontColor('#1f2a22').setWrap(true).setVerticalAlignment('middle');
  STAFF_COLUMNS.forEach((h) => sheet.getRange(1, col(h)).setBackground('#fff1c2'));
  Object.keys(HEADER_NOTES).forEach((h) => sheet.getRange(1, col(h)).setNote(HEADER_NOTES[h]));
  sheet.setRowHeight(1, 42);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  const rows = sheet.getMaxRows() - 1; // formats only: they do not count as data for appendRow
  sheet.getRange(2, col('Thời gian'), rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  ['Ngày giao', 'Ngày khách nhận'].forEach((h) => sheet.getRange(2, col(h), rows, 1).setNumberFormat('dd/MM/yyyy'));
  ['Phí ship thực tế', 'Tạm tính', 'Giảm giá', 'Phí giao', 'Tổng cộng'].forEach((h) => sheet.getRange(2, col(h), rows, 1).setNumberFormat('#,##0'));
  ['Sản phẩm', 'Ghi chú của khách', 'Ghi chú nội bộ', 'Lý do huỷ / hoàn'].forEach((h) => sheet.getRange(2, col(h), rows, 1).setWrap(true));
  sheet.getRange(2, 1, rows, HEADERS.length).setVerticalAlignment('top');

  const widths = { 'Thời gian': 120, 'Mã đơn': 80, 'Trạng thái': 110, 'Đơn vị vận chuyển': 120, 'Mã vận đơn': 130,
    'Họ tên': 150, 'Số điện thoại': 110, 'Số nhà, đường': 200, 'Ghi chú của khách': 200, 'Sản phẩm': 380,
    'Lý do huỷ / hoàn': 180, 'Ghi chú nội bộ': 200 };
  Object.keys(widths).forEach((h) => sheet.setColumnWidth(col(h), widths[h]));
  sheet.hideColumns(col('Mã phiên (không sửa)'), 2);
  setupBlocklist_(ss);
  if (!PropertiesService.getScriptProperties().getProperty('NEXT_ORDER_NO')) {
    PropertiesService.getScriptProperties().setProperty('NEXT_ORDER_NO', '1');
  }
}
