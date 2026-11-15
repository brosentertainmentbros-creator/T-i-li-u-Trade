/**
 * Nhận thông tin khách từ máy chủ Nghề Trader (Cloudflare Worker) và ghi vào Sheet "Khách hàng".
 * Mỗi cuộc trò chuyện là 1 dòng (theo Mã phiên). Thông tin mới chỉ điền vào ô còn trống
 * hoặc ghi đè khi khách nói lại; cột "Trạng thái" và "Ghi chú" dành cho sale, không bao giờ bị ghi đè.
 *
 * Triển khai: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Chỉ máy chủ Cloudflare biết địa chỉ web app này; không dán địa chỉ vào trang web.
 */
var SPREADSHEET_ID = '1YenuLznJUZZtbeBqJNvIC2RBz74QNKDzo5KWua-g754'; // Sheet "Nghề Trader - Khách hàng từ web"
var SHEET_NAME = 'Khách hàng';
var HEADERS = ['Mã phiên', 'Bắt đầu', 'Cập nhật', 'Kênh', 'Tên', 'SĐT / Zalo', 'Khu vực',
  'Kinh nghiệm', 'Thị trường quan tâm', 'Sản phẩm quan tâm', 'Nhu cầu / khó khăn', 'Tóm tắt',
  'Đồng ý liên hệ', 'Trạng thái', 'Ghi chú'];
/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền và tạo dòng tiêu đề. */
function setup() { sheet_(); }

var FIELD_COL = { name: 5, contact: 6, location: 7, experience: 8, markets: 9, interest: 10, need: 11, summary: 12, consent: 13 };

function sheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#07111f').setFontColor('#f0c874');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, HEADERS.length, 150);
    sh.setColumnWidth(12, 320);
  }
  return sh;
}

function doGet() {
  sheet_();
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheet: SHEET_NAME })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents || '{}');
    if (!d.sessionId || !d.fields) return out_({ ok: false, error: 'bad request' });
    var sh = sheet_();
    var now = new Date();
    var ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var idx = ids.indexOf(String(d.sessionId));
    var row;
    if (idx < 0) {
      row = new Array(HEADERS.length).fill('');
      row[0] = String(d.sessionId); row[1] = now; row[2] = now; row[3] = d.channel || '';
      sh.appendRow(row);
      idx = sh.getLastRow() - 2;
    }
    var r = idx + 2;
    var cur = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
    cur[2] = now;
    if (d.channel && String(cur[3]).indexOf(d.channel) < 0) cur[3] = cur[3] ? cur[3] + ', ' + d.channel : d.channel;
    Object.keys(FIELD_COL).forEach(function (k) {
      var v = d.fields[k];
      if (v === undefined || v === null) return;
      v = String(v).replace(/[\r\n]+/g, ' ').trim().slice(0, 500);
      if (!v || /^(không rõ|chưa rõ|n\/a|null|none|-)$/i.test(v)) return;
      if (/^[=+\-@]/.test(v)) v = "'" + v;   // chặn công thức độc hại
      cur[FIELD_COL[k] - 1] = v;
    });
    sh.getRange(r, 1, 1, HEADERS.length).setValues([cur]);
    return out_({ ok: true, row: r });
  } catch (err) {
    return out_({ ok: false, error: String(err).slice(0, 200) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
