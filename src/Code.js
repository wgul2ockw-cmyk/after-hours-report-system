/**
 * ระบบรายงานตรวจรักษานอกเวลา — Sheet → PDF → Drive
 * Google Apps Script Web App (Execute as: Me / Access: Anyone with link)
 *
 * One-time: run setup() once, authorize, then Deploy → Web app.
 */

// ====== CONFIGURATION ======
var ROOT_FOLDER_ID = '1971PNBG2PL4p9m6W66mhhDXvdJj0cIQf';
var TZ = 'Asia/Bangkok';

var DEFAULT_DOCTORS   = ['นพ.ฐิติพงศ์  โนนน้อย  เลข ว. 79707'];
var DEFAULT_CENTERS   = ['ศูนย์แพทย์หนองแวง'];
var DEFAULT_TIMESLOTS = ['8.00 - 12.00', '8.00 - 16.00', '16.00 - 20.00'];

var THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

var PATIENT_START_ROW = 5;   // first patient row in template
var PATIENT_MAX_ROWS  = 60;  // pre-numbered rows in template

// ====== WEB APP ENTRY ======
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('รายงานตรวจรักษานอกเวลา')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ====== ONE-TIME SETUP (idempotent — safe to run again) ======
function setup() {
  var props = PropertiesService.getScriptProperties();
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);

  var pendingId = getOrCreateFolder_(root, 'Pending').getId();
  var archiveId = getOrCreateFolder_(root, 'Archive').getId();
  var pdfId     = getOrCreateFolder_(root, 'PDF').getId();

  // Registry + Config spreadsheet
  var regId = props.getProperty('REGISTRY_ID');
  if (!regId || !fileExists_(regId)) {
    var reg = SpreadsheetApp.create('ระบบรายงาน — Registry (อย่าลบ)');
    DriveApp.getFileById(reg.getId()).moveTo(root);
    var rSheet = reg.getSheets()[0];
    rSheet.setName('Registry');
    rSheet.getRange(1, 1, 1, 9).setValues([[
      'sheetId','reportDateISO','reportDateThai','timeSlot','doctor','center','createdAt','status','pdfUrl'
    ]]).setFontWeight('bold');
    var cSheet = reg.insertSheet('Config');
    cSheet.getRange(1, 1, 1, 3).setValues([['doctors','centers','timeslots']]).setFontWeight('bold');
    writeColumn_(cSheet, 1, DEFAULT_DOCTORS);
    writeColumn_(cSheet, 2, DEFAULT_CENTERS);
    writeColumn_(cSheet, 3, DEFAULT_TIMESLOTS);
    regId = reg.getId();
  }

  // Template spreadsheet
  var tplId = props.getProperty('TEMPLATE_ID');
  if (!tplId || !fileExists_(tplId)) {
    tplId = buildTemplate_(root);
  }

  props.setProperties({
    PENDING_ID: pendingId, ARCHIVE_ID: archiveId, PDF_ID: pdfId,
    REGISTRY_ID: regId, TEMPLATE_ID: tplId
  });
  Logger.log('Setup complete. Template: https://docs.google.com/spreadsheets/d/' + tplId);
}

function buildTemplate_(root) {
  var ss = SpreadsheetApp.create('TEMPLATE — เอกสารรายงานตรวจรักษานอกเวลา (อย่าลบ/อย่าแก้)');
  DriveApp.getFileById(ss.getId()).moveTo(root);
  var sh = ss.getSheets()[0];
  sh.setName('รายงาน');

  sh.setColumnWidth(1, 40);   // ลำดับ
  sh.setColumnWidth(2, 220);  // ชื่อ
  sh.setColumnWidth(3, 60);   // อายุ
  sh.setColumnWidth(4, 100);  // HN
  sh.setColumnWidth(5, 320);  // Diag
  sh.setColumnWidth(6, 60);   // tracking (ไม่พิมพ์ลง PDF)

  var all = sh.getRange(1, 1, PATIENT_START_ROW - 1 + PATIENT_MAX_ROWS, 6);
  all.setFontFamily('Sarabun').setFontSize(14).setVerticalAlignment('middle');

  sh.getRange('B1:E1').merge().setValue('เอกสารรายงานตรวจรักษานอกเวลา')
    .setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('B2:E2').merge().setValue('')
    .setHorizontalAlignment('center');
  sh.getRange('B3:E3').merge().setValue('')
    .setHorizontalAlignment('center');

  sh.getRange(4, 1, 1, 5).setValues([['','ชื่อ','อายุ','HN','Diag']])
    .setFontWeight('bold').setHorizontalAlignment('center');

  var nums = [];
  for (var i = 1; i <= PATIENT_MAX_ROWS; i++) nums.push([i]);
  sh.getRange(PATIENT_START_ROW, 1, PATIENT_MAX_ROWS, 1).setValues(nums)
    .setHorizontalAlignment('center');

  sh.getRange(4, 1, 1 + PATIENT_MAX_ROWS, 5)
    .setBorder(true, true, true, true, true, true);

  return ss.getId();
}

// ====== CLIENT API ======
function getInitData() {
  var cfg = readConfig_();
  return {
    doctors: cfg.doctors,
    centers: cfg.centers,
    timeslots: cfg.timeslots,
    todayISO: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    nowHour: Number(Utilities.formatDate(new Date(), TZ, 'H'))
  };
}

function addDoctor(fullName) {
  fullName = String(fullName || '').trim();
  if (!fullName) throw new Error('กรุณากรอกชื่อแพทย์');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var cfg = readConfig_();
    if (cfg.doctors.indexOf(fullName) === -1) {
      var sh = configSheet_();
      sh.getRange(cfg.doctors.length + 2, 1).setValue(fullName);
    }
  } finally { lock.releaseLock(); }
  return readConfig_().doctors;
}

/** Step 1: create the personalised sheet. */
function createReport(dateISO, timeSlot, doctor, center) {
  requireNonEmpty_({dateISO: dateISO, timeSlot: timeSlot, doctor: doctor, center: center});
  var props = PropertiesService.getScriptProperties();
  var thaiDate = thaiDateFromISO_(dateISO);

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var tpl = DriveApp.getFileById(props.getProperty('TEMPLATE_ID'));
    var pending = DriveApp.getFolderById(props.getProperty('PENDING_ID'));
    var name = thaiDate + '_' + doctorShort_(doctor) + '_' + center;
    var copy = tpl.makeCopy(name, pending);

    var ss = SpreadsheetApp.openById(copy.getId());
    var sh = ss.getSheets()[0];
    sh.getRange('B1').setValue('เอกสารรายงานตรวจรักษานอกเวลา ' + center);
    sh.getRange('B2').setValue(doctor);
    sh.getRange('B3').setValue('ประจำวันที่ ' + thaiDate + ' เวลา ' + timeSlot);
    SpreadsheetApp.flush();

    copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

    registrySheet_().appendRow([
      copy.getId(), dateISO, thaiDate, timeSlot, doctor, center,
      Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), 'pending', ''
    ]);
    return { sheetUrl: ss.getUrl(), sheetId: copy.getId(), name: name };
  } finally { lock.releaseLock(); }
}

/** Submit page: list pending reports (optionally filtered by doctor). */
function getPending(doctor) {
  var rows = registryRows_();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r[7] !== 'pending') continue;
    if (doctor && r[4] !== doctor) continue;
    out.push({
      sheetId: r[0], dateThai: r[2], timeSlot: r[3], doctor: r[4], center: r[5],
      url: 'https://docs.google.com/spreadsheets/d/' + r[0]
    });
  }
  return out.reverse(); // newest first
}

var PERMISSION_MSG = 'เปิดชีตไม่ได้ เนื่องจากยังไม่ได้เปิดสิทธิ์การเข้าถึง\n' +
  'กรุณากดปุ่ม "แชร์" ในชีตของคุณ → เปลี่ยนเป็น "ทุกคนที่มีลิงก์" (Anyone with the link) → แล้วกดส่งใหม่อีกครั้ง';

/** Step 2: submit — sheet → PDF → Drive filing. Accepts a pasted Google Sheets URL. */
function submitReport(sheetIdOrUrl) {
  var sheetId = extractSheetId_(sheetIdOrUrl);
  if (!sheetId) throw new Error('ลิงก์ไม่ถูกต้อง — กรุณาวางลิงก์ Google Sheets');

  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var reg = findRegistryRow_(sheetId);
    if (reg && reg.row[7] === 'submitted') {
      return { already: true, pdfUrl: reg.row[8] };
    }

    // Open the sheet. If the user hasn't opened link sharing, report back clearly.
    var ss, sh;
    try {
      ss = SpreadsheetApp.openById(sheetId);
      sh = ss.getSheets()[0];
      sh.getRange('B1').getValue(); // force a real read — triggers permission error if any
    } catch (e) {
      throw new Error(PERMISSION_MSG);
    }
    SpreadsheetApp.flush(); // export endpoint reads saved state only

    // Metadata: from Registry (app-created sheets) or parsed from the sheet header (pasted external sheets)
    var meta = reg
      ? { dateThai: String(reg.row[2]), monthThai: thaiMonthFromISO_(String(reg.row[1])), doctor: String(reg.row[4]), center: String(reg.row[5]) }
      : parseHeaderMeta_(sh);

    var lastRow = lastPatientRow_(sh);
    if (lastRow < PATIENT_START_ROW) throw new Error('ยังไม่มีรายชื่อผู้ป่วยในชีต — กรอกข้อมูลก่อนส่ง');

    var blob;
    try {
      blob = exportPdf_(sheetId, sh.getSheetId(), 'A1:E' + lastRow);
    } catch (e) {
      // export can fail with 403 even when open succeeds, if sharing is restricted
      if (String(e.message).indexOf('403') !== -1) throw new Error(PERMISSION_MSG);
      throw e;
    }

    var props = PropertiesService.getScriptProperties();
    var monthFolder  = getOrCreateFolder_(DriveApp.getFolderById(props.getProperty('PDF_ID')), meta.monthThai);
    var centerFolder = getOrCreateFolder_(monthFolder, meta.center);

    var baseName = meta.dateThai + '_' + doctorShort_(meta.doctor) + '_' + meta.center;
    var fileName = uniqueName_(centerFolder, baseName, '.pdf');
    var pdfFile = centerFolder.createFile(blob.setName(fileName));
    var pdfUrl = pdfFile.getUrl();

    if (reg) {
      // app-owned sheet: archive it and lock to view-only
      try {
        var src = DriveApp.getFileById(sheetId);
        src.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        src.moveTo(DriveApp.getFolderById(props.getProperty('ARCHIVE_ID')));
      } catch (e) { /* non-fatal: PDF already filed */ }
      registrySheet_().getRange(reg.index, 8, 1, 2).setValues([['submitted', pdfUrl]]);
    } else {
      // external sheet: we can't move/lock a file we don't own — just record the submission
      registrySheet_().appendRow([
        sheetId, '', meta.dateThai, '', meta.doctor, meta.center,
        Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), 'submitted', pdfUrl
      ]);
    }
    return { already: false, pdfUrl: pdfUrl, fileName: fileName };
  } finally { lock.releaseLock(); }
}

/** Parse date/doctor/center from header rows of a pasted (non-registry) sheet. */
function parseHeaderMeta_(sh) {
  var title  = String(sh.getRange('B1').getValue());
  var doctor = String(sh.getRange('B2').getValue()).trim();
  var line3  = String(sh.getRange('B3').getValue());
  var center = title.replace('เอกสารรายงานตรวจรักษานอกเวลา', '').trim();
  var m = line3.match(/ประจำวันที่\s+(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!center || !doctor || !m || THAI_MONTHS.indexOf(m[2]) === -1) {
    throw new Error('รูปแบบหัวชีตไม่ถูกต้อง — กรุณาใช้ชีตที่สร้างจากหน้า "① สร้างรายงาน"');
  }
  return {
    dateThai: m[1] + ' ' + m[2] + ' ' + m[3],
    monthThai: m[2] + ' ' + m[3],
    doctor: doctor,
    center: center
  };
}

// ====== INTERNALS ======
function exportPdf_(spreadsheetId, gid, range) {
  var url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export' +
    '?format=pdf&size=A4&portrait=true&fitw=true&gridlines=false' +
    '&top_margin=0.5&bottom_margin=0.5&left_margin=0.5&right_margin=0.5' +
    '&gid=' + gid + '&range=' + encodeURIComponent(range);
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('สร้าง PDF ไม่สำเร็จ (HTTP ' + res.getResponseCode() + ') — ลองใหม่อีกครั้ง');
  }
  return res.getBlob();
}

function lastPatientRow_(sh) {
  var vals = sh.getRange(PATIENT_START_ROW, 2, PATIENT_MAX_ROWS, 1).getValues();
  var last = PATIENT_START_ROW - 1;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() !== '') last = PATIENT_START_ROW + i;
  }
  return last;
}

function extractSheetId_(input) {
  input = String(input || '').trim();
  var m = input.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input)) return input;
  return null;
}

function registrySheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('REGISTRY_ID')).getSheetByName('Registry');
}
function configSheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('REGISTRY_ID')).getSheetByName('Config');
}
function registryRows_() {
  var sh = registrySheet_();
  var n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, 9).getValues();
}
function findRegistryRow_(sheetId) {
  var rows = registryRows_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === sheetId) return { index: i + 2, row: rows[i] };
  }
  return null;
}
function readConfig_() {
  var sh = configSheet_();
  var n = Math.max(sh.getLastRow() - 1, 0);
  var vals = n ? sh.getRange(2, 1, n, 3).getValues() : [];
  var col = function (c) {
    var out = [];
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][c]).trim();
      if (v) out.push(v);
    }
    return out;
  };
  return { doctors: col(0), centers: col(1), timeslots: col(2) };
}
function writeColumn_(sh, colIndex, values) {
  for (var i = 0; i < values.length; i++) sh.getRange(i + 2, colIndex).setValue(values[i]);
}
function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function uniqueName_(folder, base, ext) {
  var name = base + ext, v = 2;
  while (folder.getFilesByName(name).hasNext()) { name = base + '_v' + (v++) + ext; }
  return name;
}
function fileExists_(id) {
  try { DriveApp.getFileById(id); return true; } catch (e) { return false; }
}
function requireNonEmpty_(obj) {
  for (var k in obj) {
    if (!String(obj[k] || '').trim()) throw new Error('ข้อมูลไม่ครบ: ' + k);
  }
}
function thaiDateFromISO_(iso) {
  var p = String(iso).split('-'); // yyyy-mm-dd
  return Number(p[2]) + ' ' + THAI_MONTHS[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
}
function thaiMonthFromISO_(iso) {
  var p = String(iso).split('-');
  return THAI_MONTHS[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
}
function doctorShort_(doctor) {
  // "นพ.ฐิติพงศ์  โนนน้อย  เลข ว. 79707" → "นพ.ฐิติพงศ์ โนนน้อย"
  return String(doctor).replace(/\s*เลข\s*ว\.?.*$/, '').replace(/\s+/g, ' ').trim();
}
