/**
 * AREA BARAT — Bridge Spreadsheet
 * --------------------------------
 * Cara pakai (sekali saja):
 * 1. Buka spreadsheet Area Barat > Extensions > Apps Script.
 * 2. Hapus isi Code.gs bawaan, tempel SELURUH file ini.
 * 3. Simpan, lalu Run fungsi `setup` sekali (izinkan akses saat diminta).
 * 4. Deploy > New deployment > Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Salin URL web app ke env Vercel: GOOGLE_SCRIPT_URL.
 *    Isi GOOGLE_SCRIPT_SECRET dengan nilai BRIDGE_SECRET di bawah.
 *
 * Setelah mengubah file ini, deploy ulang: Deploy > Manage deployments >
 * Edit > Version: New version > Deploy (URL tetap sama).
 */

// Ganti dengan teks acak milikmu (mis. buatan `openssl rand -base64 36`),
// lalu samakan nilainya dengan GOOGLE_SCRIPT_SECRET di Vercel.
var BRIDGE_SECRET = 'GANTI_DENGAN_KUNCI_ACAK_MILIKMU_MINIMAL_32_KARAKTER';
var FOLDER_NAME = 'Area Barat - Assets';

var TABS = {
  Menu: ['id', 'nama', 'kategori', 'harga', 'deskripsi', 'fotoId', 'tersedia', 'dibuat', 'diubah'],
  Orders: ['id', 'token', 'kode', 'nama', 'meja', 'items', 'total', 'metode', 'statusBayar', 'status', 'catatan', 'dibuat', 'diubah'],
  Reviews: ['id', 'orderId', 'kode', 'nama', 'rating', 'komentar', 'dibuat'],
  Settings: ['key', 'value'],
  Logs: ['id', 'waktu', 'level', 'sumber', 'pesan', 'detail'],
  Accounts: ['id', 'username', 'role', 'salt', 'hash', 'dibuat', 'diubah']
};

var WRITE_ACTIONS = {
  addMenu: 1, updateMenu: 1, deleteMenu: 1, addOrder: 1, updateOrder: 1, addReview: 1,
  setSetting: 1, addLog: 1, clearLogs: 1, saveImage: 1, repair: 1,
  createAccount: 1, updateAccount: 1, deleteAccount: 1, resetAccounts: 1
};

function setup() {
  var hasil = repair_();
  Logger.log(hasil.join('\n'));
}

function doGet() {
  return ContentService.createTextOutput('Bridge Area Barat aktif. Gunakan POST dari aplikasi.');
}

function doPost(e) {
  var lock = null;
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.secret !== BRIDGE_SECRET) return json_({ ok: false, error: 'Akses ditolak', code: 'AUTH' });
    var action = String(req.action || '');
    var p = req.payload || {};
    if (WRITE_ACTIONS[action]) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) return json_({ ok: false, error: 'Server sibuk, coba lagi', code: 'BUSY' });
    }
    var data = dispatch_(action, p);
    return json_({ ok: true, data: (typeof data === 'undefined' ? null : data) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err), code: (err && err.code) || 'ERR' });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (ignore) {} }
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function err_(msg, code) {
  var e = new Error(msg);
  e.code = code || 'ERR';
  throw e;
}

function dispatch_(action, p) {
  switch (action) {
    case 'ping': return { pong: true, time: new Date().toISOString() };
    case 'diagnose': return diagnose_();
    case 'repair': return repair_();

    case 'getMenu': return readAll_('Menu');
    case 'addMenu': return addMenu_(p.menu);
    case 'updateMenu': return updateMenu_(p.id, p.patch, p.expect);
    case 'deleteMenu': return deleteRow_('Menu', p.id);

    case 'getOrders': return getOrders_(p);
    case 'getOrderByToken': return getByToken_(p.token);
    case 'getOrderById': return getById_(p.id);
    case 'addOrder': return addOrder_(p.order);
    case 'updateOrder': return updateOrder_(p.id, p.patch, p.expect);

    case 'getReviews': return getReviews_(p);
    case 'getReviewByOrder': return getReviewByOrder_(p.orderId);
    case 'addReview': return addReview_(p.review);

    case 'getSettings': return getSettings_();
    case 'setSetting': return setSetting_(p.key, p.value);

    case 'addLog': return addLog_(p.entry);
    case 'getLogs': return getLogs_(p.limit || 200);
    case 'clearLogs': return clearLogs_();

    case 'saveImage': return saveImage_(p.b64, p.mime);
    case 'getImage': return getImage_(p.id);

    case 'getAccounts': return readAll_('Accounts');
    case 'getAccount': return getAccount_(p.username);
    case 'createAccount': return createAccount_(p.account);
    case 'updateAccount': return updateAccount_(p.id, p.patch, p.expect);
    case 'deleteAccount': return deleteRow_('Accounts', p.id);
    case 'resetAccounts': return resetAccounts_();

    default: err_('Aksi tidak dikenal: ' + action);
  }
}

/* ---------- util tab & baris ---------- */

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(TABS[name]);
    s.setFrozenRows(1);
  }
  return s;
}

function rowToObj_(name, r) {
  var headers = TABS[name];
  var o = {};
  for (var i = 0; i < headers.length; i++) {
    var v = r[i];
    o[headers[i]] = (v === null || typeof v === 'undefined') ? '' : v;
  }
  if (name === 'Menu') {
    o.harga = Number(o.harga) || 0;
    o.tersedia = o.tersedia === true || String(o.tersedia).toUpperCase() === 'TRUE';
    o.id = String(o.id); o.fotoId = String(o.fotoId);
    o.dibuat = String(o.dibuat); o.diubah = String(o.diubah);
  }
  if (name === 'Orders') {
    try { o.items = JSON.parse(o.items || '[]'); } catch (e) { o.items = []; }
    o.total = Number(o.total) || 0;
    o.id = String(o.id); o.token = String(o.token);
    o.dibuat = String(o.dibuat); o.diubah = String(o.diubah);
  }
  if (name === 'Reviews') {
    o.rating = Number(o.rating) || 0;
    o.id = String(o.id); o.orderId = String(o.orderId); o.kode = String(o.kode);
    o.nama = String(o.nama); o.komentar = String(o.komentar); o.dibuat = String(o.dibuat);
  }
  if (name === 'Accounts') {
    o.id = String(o.id); o.username = String(o.username); o.role = String(o.role);
    o.salt = String(o.salt); o.hash = String(o.hash);
    o.dibuat = String(o.dibuat); o.diubah = String(o.diubah);
  }
  return o;
}

function objToRow_(name, o) {
  var headers = TABS[name];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var v = o[headers[i]];
    if (name === 'Orders' && headers[i] === 'items') v = JSON.stringify(v || []);
    if (typeof v === 'undefined' || v === null) v = '';
    // Cegah formula injection: nilai teks tidak boleh diawali = + - @
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v;
    row.push(v);
  }
  return row;
}

function readAll_(name) {
  var s = sheet_(name);
  var last = s.getLastRow();
  if (last < 2) return [];
  var vals = s.getRange(2, 1, last - 1, TABS[name].length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === '') continue;
    out.push(rowToObj_(name, vals[i]));
  }
  return out;
}

function findRow_(name, id) {
  var s = sheet_(name);
  var last = s.getLastRow();
  if (last < 2) return -1;
  var ids = s.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function deleteRow_(name, id) {
  var s = sheet_(name);
  var row = findRow_(name, id);
  if (row < 0) err_('Data tidak ditemukan', 'NOTFOUND');
  s.deleteRow(row);
}

/* ---------- Menu ---------- */

function addMenu_(m) {
  if (!m || !m.nama) err_('Menu tidak valid');
  var s = sheet_('Menu');
  s.appendRow(objToRow_('Menu', m));
  return m;
}

function updateMenu_(id, patch, expect) {
  var s = sheet_('Menu');
  var row = findRow_('Menu', id);
  if (row < 0) err_('Menu tidak ditemukan', 'NOTFOUND');
  var vals = s.getRange(row, 1, 1, TABS.Menu.length).getValues()[0];
  var m = rowToObj_('Menu', vals);
  if (expect && m.diubah !== expect) err_('Menu sudah diubah perangkat lain, muat ulang', 'CONFLICT');
  var allowed = ['nama', 'kategori', 'harga', 'deskripsi', 'fotoId', 'tersedia'];
  for (var k in patch) {
    if (allowed.indexOf(k) >= 0) m[k] = patch[k];
  }
  m.diubah = new Date().toISOString();
  s.getRange(row, 1, 1, TABS.Menu.length).setValues([objToRow_('Menu', m)]);
  return m;
}

/* ---------- Orders ---------- */

function getOrders_(p) {
  var s = sheet_('Orders');
  var last = s.getLastRow();
  if (last < 2) return [];
  var start = 2;
  // Polling biasa cukup baca 600 baris terakhir; laporan pakai full=true.
  if (!p.full && last - 1 > 600) start = last - 600 + 1;
  var vals = s.getRange(start, 1, last - start + 1, TABS.Orders.length).getValues();
  var out = [];
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) === '') continue;
    var o = rowToObj_('Orders', vals[i]);
    if (p.since && o.dibuat < p.since) continue;
    out.push(o);
    if (p.limit && out.length >= p.limit) break;
  }
  return out;
}

function getByToken_(token) {
  if (!token) return null;
  var s = sheet_('Orders');
  var last = s.getLastRow();
  if (last < 2) return null;
  var count = Math.min(last - 1, 2000);
  var start = last - count + 1;
  var vals = s.getRange(start, 1, count, TABS.Orders.length).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][1]) === String(token)) return rowToObj_('Orders', vals[i]);
  }
  return null;
}

function getById_(id) {
  if (!id) return null;
  var s = sheet_('Orders');
  var row = findRow_('Orders', id);
  if (row < 0) return null;
  var vals = s.getRange(row, 1, 1, TABS.Orders.length).getValues()[0];
  return rowToObj_('Orders', vals);
}

function addOrder_(o) {
  if (!o || !o.id || !o.token) err_('Pesanan tidak valid');
  var s = sheet_('Orders');
  s.appendRow(objToRow_('Orders', o));
  return o;
}

function updateOrder_(id, patch, expect) {
  var s = sheet_('Orders');
  var row = findRow_('Orders', id);
  if (row < 0) err_('Pesanan tidak ditemukan', 'NOTFOUND');
  var vals = s.getRange(row, 1, 1, TABS.Orders.length).getValues()[0];
  var o = rowToObj_('Orders', vals);
  if (expect && o.diubah !== expect) err_('Pesanan sudah diubah perangkat lain, muat ulang', 'CONFLICT');
  var allowed = ['status', 'statusBayar'];
  for (var k in patch) {
    if (allowed.indexOf(k) >= 0) o[k] = patch[k];
  }
  o.diubah = new Date().toISOString();
  s.getRange(row, 1, 1, TABS.Orders.length).setValues([objToRow_('Orders', o)]);
  return o;
}

/* ---------- Ulasan ---------- */

function getReviews_(p) {
  var rows = readAll_('Reviews');
  var out = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (p.since && r.dibuat < p.since) continue;
    out.push(r);
    if (p.limit && out.length >= p.limit) break;
  }
  return out;
}

function getReviewByOrder_(orderId) {
  if (!orderId) return null;
  var rows = readAll_('Reviews');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].orderId === String(orderId)) return rows[i];
  }
  return null;
}

function addReview_(r) {
  if (!r || !r.id || !r.orderId) err_('Ulasan tidak valid');
  var rating = Number(r.rating);
  if (!(rating >= 1 && rating <= 5)) err_('Rating harus 1-5');
  if (getReviewByOrder_(r.orderId)) err_('Pesanan ini sudah diberi ulasan', 'CONFLICT');
  var e = {
    id: String(r.id),
    orderId: String(r.orderId),
    kode: String(r.kode || '').substring(0, 20),
    nama: String(r.nama || '').substring(0, 40),
    rating: rating,
    komentar: String(r.komentar || '').substring(0, 300),
    dibuat: r.dibuat || new Date().toISOString()
  };
  sheet_('Reviews').appendRow(objToRow_('Reviews', e));
  return e;
}

/* ---------- Settings ---------- */

function getSettings_() {
  var rows = readAll_('Settings');
  var o = {};
  for (var i = 0; i < rows.length; i++) o[String(rows[i].key)] = String(rows[i].value);
  return o;
}

function setSetting_(key, value) {
  if (!key) err_('Key setting kosong');
  var s = sheet_('Settings');
  var last = s.getLastRow();
  if (last >= 2) {
    var vals = s.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === String(key)) {
        s.getRange(i + 2, 2).setValue(String(value));
        return;
      }
    }
  }
  s.appendRow([String(key), String(value)]);
}

/* ---------- Logs ---------- */

function addLog_(entry) {
  var s = sheet_('Logs');
  var e = {
    id: Utilities.getUuid(),
    waktu: entry.waktu || new Date().toISOString(),
    level: entry.level || 'info',
    sumber: String(entry.sumber || '').substring(0, 100),
    pesan: String(entry.pesan || '').substring(0, 500),
    detail: String(entry.detail || '').substring(0, 2000)
  };
  s.appendRow(objToRow_('Logs', e));
  var last = s.getLastRow();
  if (last > 5200) s.deleteRows(2, 200);
}

function getLogs_(limit) {
  var s = sheet_('Logs');
  var last = s.getLastRow();
  if (last < 2) return [];
  var count = Math.min(last - 1, Math.max(1, Math.min(limit, 1000)));
  var start = last - count + 1;
  var vals = s.getRange(start, 1, count, TABS.Logs.length).getValues();
  var out = [];
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) === '') continue;
    var o = rowToObj_('Logs', vals[i]);
    o.waktu = String(o.waktu);
    out.push(o);
  }
  return out;
}

function clearLogs_() {
  var s = sheet_('Logs');
  var last = s.getLastRow();
  if (last > 1) s.deleteRows(2, last - 1);
}

/* ---------- Gambar (Google Drive) ---------- */

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ASSET_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* dibuat ulang di bawah */ }
  }
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('ASSET_FOLDER_ID', folder.getId());
  return folder;
}

function saveImage_(b64, mime) {
  if (!b64 || !mime) err_('Gambar tidak valid');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) err_('Format gambar tidak didukung');
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length > 2100000) err_('Gambar terlalu besar (maks 2 MB)');
  var ext = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
  var blob = Utilities.newBlob(bytes, mime, 'ab-' + Utilities.getUuid() + '.' + ext);
  var file = folder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: file.getId() };
}

function getImage_(id) {
  if (!id || !/^[A-Za-z0-9_-]{10,80}$/.test(String(id))) return null;
  var file;
  try { file = DriveApp.getFileById(String(id)); } catch (e) { return null; }
  // Hanya layani file dari folder aset aplikasi, bukan file Drive lain.
  var folderId = folder_().getId();
  var parents = file.getParents();
  var milikAplikasi = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) { milikAplikasi = true; break; }
  }
  if (!milikAplikasi) return null;
  var blob = file.getBlob();
  return { b64: Utilities.base64Encode(blob.getBytes()), mime: blob.getContentType() };
}

/* ---------- Akun staff ---------- */

// Harus identik dengan lib/password.ts: SHA-256(salt + ':' + password) hex.
function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < raw.length; i++) out += ('0' + (raw[i] & 0xff).toString(16)).slice(-2);
  return out;
}

function defaultAccount_(username, role) {
  var t = new Date().toISOString();
  var salt = Utilities.getUuid();
  return { id: Utilities.getUuid(), username: username, role: role, salt: salt, hash: hashPassword_(username, salt), dibuat: t, diubah: t };
}

function getAccount_(username) {
  if (!username) return null;
  var rows = readAll_('Accounts');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].username === String(username)) return rows[i];
  }
  return null;
}

function createAccount_(a) {
  if (!a || !a.id || !a.username || !a.hash) err_('Akun tidak valid');
  if (getAccount_(a.username)) err_('Username "' + a.username + '" sudah dipakai', 'CONFLICT');
  sheet_('Accounts').appendRow(objToRow_('Accounts', a));
  return a;
}

function updateAccount_(id, patch, expect) {
  var s = sheet_('Accounts');
  var row = findRow_('Accounts', id);
  if (row < 0) err_('Akun tidak ditemukan', 'NOTFOUND');
  var vals = s.getRange(row, 1, 1, TABS.Accounts.length).getValues()[0];
  var a = rowToObj_('Accounts', vals);
  if (expect && a.diubah !== expect) err_('Akun sudah diubah perangkat lain, muat ulang', 'CONFLICT');
  if (patch.username && patch.username !== a.username) {
    var lain = getAccount_(patch.username);
    if (lain && lain.id !== id) err_('Username "' + patch.username + '" sudah dipakai', 'CONFLICT');
  }
  var allowed = ['username', 'role', 'salt', 'hash'];
  for (var k in patch) {
    if (allowed.indexOf(k) >= 0) a[k] = patch[k];
  }
  a.diubah = new Date().toISOString();
  s.getRange(row, 1, 1, TABS.Accounts.length).setValues([objToRow_('Accounts', a)]);
  return a;
}

function seedAccountsIfEmpty_() {
  var s = sheet_('Accounts');
  if (s.getLastRow() >= 2) return false;
  s.appendRow(objToRow_('Accounts', defaultAccount_('kasir', 'kasir')));
  s.appendRow(objToRow_('Accounts', defaultAccount_('bos', 'bos')));
  return true;
}

function resetAccounts_() {
  var hasil = [];
  seedAccountsIfEmpty_();
  var defaults = [defaultAccount_('kasir', 'kasir'), defaultAccount_('bos', 'bos')];
  for (var i = 0; i < defaults.length; i++) {
    var def = defaults[i];
    var existing = getAccount_(def.username);
    if (existing) {
      updateAccount_(existing.id, { role: def.role, salt: def.salt, hash: def.hash });
      hasil.push('Akun "' + def.username + '" direset ke password default.');
    } else {
      sheet_('Accounts').appendRow(objToRow_('Accounts', def));
      hasil.push('Akun "' + def.username + '" dibuat ulang dengan password default.');
    }
  }
  return hasil;
}

/* ---------- Diagnostik & perbaikan ---------- */

function diagnose_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = {};
  for (var name in TABS) {
    var s = ss.getSheetByName(name);
    var info = { exists: !!s, rows: 0, headersOk: false };
    if (s) {
      info.rows = Math.max(0, s.getLastRow() - 1);
      var head = s.getRange(1, 1, 1, TABS[name].length).getValues()[0];
      var ok = true;
      for (var i = 0; i < TABS[name].length; i++) {
        if (String(head[i]) !== TABS[name][i]) { ok = false; break; }
      }
      info.headersOk = ok;
    }
    tabs[name] = info;
  }
  var folderOk = false;
  try { folderOk = !!folder_().getId(); } catch (e) {}
  return { tabs: tabs, folderOk: folderOk, bridgeTime: new Date().toISOString() };
}

function repair_() {
  var hasil = [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var name in TABS) {
    var s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      s.appendRow(TABS[name]);
      s.setFrozenRows(1);
      hasil.push('Tab "' + name + '" dibuat lengkap dengan header.');
    } else if (s.getLastRow() === 0) {
      s.appendRow(TABS[name]);
      s.setFrozenRows(1);
      hasil.push('Header tab "' + name + '" dipasang.');
    } else {
      var head = s.getRange(1, 1, 1, TABS[name].length).getValues()[0];
      var ok = true;
      for (var i = 0; i < TABS[name].length; i++) {
        if (String(head[i]) !== TABS[name][i]) { ok = false; break; }
      }
      if (!ok) hasil.push('PERHATIAN: header tab "' + name + '" tidak sesuai. Jangan ubah header manual; hubungi developer.');
      else hasil.push('Tab "' + name + '" sehat (' + (s.getLastRow() - 1) + ' baris).');
    }
  }
  try {
    var f = folder_();
    hasil.push('Folder gambar Drive siap: ' + f.getName());
  } catch (e) {
    hasil.push('PERHATIAN: folder Drive gagal dibuat: ' + e.message);
  }
  try {
    if (seedAccountsIfEmpty_()) hasil.push('Akun default dibuat: kasir/kasir dan bos/bos. Segera ganti password lewat Panel Bos.');
  } catch (e) {
    hasil.push('PERHATIAN: gagal menyiapkan akun default: ' + e.message);
  }
  return hasil;
}