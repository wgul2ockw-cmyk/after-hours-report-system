/**
 * ระบบรายงานตรวจรักษานอกเวลา — Sheet → PDF → Drive
 * Google Apps Script Web App (Execute as: Me / Access: Anyone with link)
 *
 * One-time: run setup() once, authorize, then Deploy → Web app.
 */

// ====== CONFIGURATION ======
var ROOT_FOLDER_ID = '1971PNBG2PL4p9m6W66mhhDXvdJj0cIQf';
var TZ = 'Asia/Bangkok';

var DEFAULT_DOCTORS = [
  'พญ.รุจิราลักน์ พรหมเมือง เลข ว. 21390',
  'ดร.นพ.ธรรมสรณ์ จีรอำพรวัฒน์ เลข ว. 23117',
  'ดร.พญ.จิรฐา ทนันชัยบุตร เลข ว. 24875',
  'นพ.สตางค์ ศุภผล เลข ว. 26385',
  'พญ.วนาพร วัฒนกูล เลข ว. 26570',
  'นพ.นิทิกร สอนชา เลข ว. 27432',
  'นพ.วัชรพงษ์ รินทระ เลข ว. 29553',
  'พญ.มาลินี พิสุทธโกศล เลข ว. 27421',
  'นพ. วราวุธ กุลเวชกิจ เลข ว. 28257',
  'พญ.พวงทอง ปิยกุลมาลา เลข ว. 25303',
  'พญ.นพัสร ทรัพย์พิพัฒน์ เลข ว. 22788',
  'นพ.พิเชฐ อกนิษฐาภิชาติ เลข ว. 19285',
  'นพ.ไพศาล ไตรสิริโชค เลข ว. 36553',
  'พญ.รัดเกล้า ฤกษ์รุจิพิมล เลข ว. 42430',
  'พญ.ธัญญารัตน์ ทวีแสงสุขสกุล เลข ว. 24294',
  'พญ.ศิรินภา ศิริพร ณ ราชสีมา เลข ว. 26382',
  'พญ.ปิยะวรรรณ เชี่ยวธนะกุล เลข ว. 24813',
  'นพ.เทพนที หาญชนะชัยกูล เลข ว. 52069',
  'พญ.สิริลักขณา พระวงศ์ เลข ว. 52069',
  'พญ.ณิชารัฐ สว่างโรจน์ เลข ว. 53604',
  'พญ.มัลลิกา โยคะสิงห์ เลข ว. 29546',
  'นพ.อิศวเทพ อภัยโส เลข ว. 40714',
  'พญ.พันทิพา มีทองหลาง เลข ว. 46953',
  'พญ.กัญญาณัฐ เกษียรสินธุ์ เลข ว. 56846',
  'พญ.ชญานิน สิชมภู เลข ว. 46951',
  'นพ.ณัชพล ทาแดง เลข ว. 56877',
  'พญ.จิตรานุช แกมชัยภูมิ เลข ว. 66385',
  'นพ.อภิวัฒน์ จันทะเฆ่ เลข ว. 66387',
  'นพ.อาทิตย์ โสรถาวร เลข ว. 47377',
  'พญ.ขวัญชนก ขาวกุญชร เลข ว. 68936',
  'พญ.วรามล เหมือนจิตร เลข ว. 76706',
  'พญ.ณริสา ศรีสถาพร เลข ว. 76591',
  'พญ.ปภาวรินทร์ นาจรูญ เลข ว. 76078',
  'พญ.วารสา คำประเทือง เลข ว. 75628',
  'พญ.ภัทรสุดา คุณเวียน เลข ว. 70199',
  'นพ.เอกบุรุษ ฤทธิ์ภู เลข ว. 62431',
  'นพ.ภาณุพงศ์ แก้วไชยะ เลข ว. 46695',
  'พญ.ธนพร ปิยะตระกูลชัย เลข ว. 79744',
  'นพ.คนัช โฆษิตภวิศ เลข ว. 81117',
  'นพ.บารมี เมืองทองแก้ว เลข ว. 79776',
  'นพ.ฐิติพงศ์ โนนน้อย เลข ว. 79707',
  'นพ.กฤษณ์ ณ หนองคาย เลข ว. 80491',
  'พญ.กษมา กอกุลจันทร์ เลข ว. 79672',
  'พญ.ณัฐณิชา ทองหาญ เลข ว. 72849',
  'นพ.สุขสันต์ ปิ่นสุวรรณ เลข ว. 76115',
  'นพ.ณัฏฐ์ สันติรักษ์พงษ์ เลข ว. 71935',
  'นพ.เสกสรร นาสมจิตร เลข ว. 80785'
];
var DEFAULT_CENTERS = ['ศูนย์แพทย์หนองกุง', 'ศูนย์แพทย์มิตรภาพ', 'ศูนย์แพทย์ประชา', 'ศูนย์แพทย์หนองแวง', 'ศูนย์แพทย์หัวทุ่ง', 'ศูนย์แพทย์ชาตะ'];
var DEFAULT_TIMESLOTS = ['8.00 - 12.00', '8.00 - 16.00', '16.00 - 20.00'];

var THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// ====== MONTHLY PAYMENT REPORT (หลักฐานการจ่ายเงิน) ======
var HOSPITAL_NAME = 'โรงพยาบาลขอนแก่น';
var RATE_PER_PATIENT = 50; // บาทต่อผู้ป่วย 1 ราย

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
  var monthlyId = getOrCreateFolder_(root, 'หลักฐานการจ่ายเงิน').getId();

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
    cSheet.getRange(1, 1, 1, 4).setValues([['doctors','centers','timeslots','holidays']]).setFontWeight('bold');
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
    MONTHLY_ID: monthlyId, REGISTRY_ID: regId, TEMPLATE_ID: tplId
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
    var patients = countPatients_(sh);
    var amount = patients * RATE_PER_PATIENT;
    var reportISO = reg ? isoOf_(reg.row[1]) : isoFromThai_(meta.dateThai);

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
      registrySheet_().getRange(reg.index, 8, 1, 4).setValues([['submitted', pdfUrl, patients, amount]]);
    } else {
      // external sheet: we can't move/lock a file we don't own — just record the submission
      registrySheet_().appendRow([
        sheetId, reportISO, meta.dateThai, '', meta.doctor, meta.center,
        Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), 'submitted', pdfUrl, patients, amount
      ]);
    }

    // rebuild this month/center tab of the payment-evidence report (non-fatal on failure)
    var reportUrl = '';
    try { reportUrl = updateMonthlyReport_(reportISO, meta.center); } catch (e) { /* PDF already filed */ }

    return { already: false, pdfUrl: pdfUrl, fileName: fileName, reportUrl: reportUrl };
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
var REGISTRY_COLS = 11; // A..K : sheetId..pdfUrl, patients, amount
function registryRows_() {
  var sh = registrySheet_();
  var n = sh.getLastRow();
  if (n < 2) return [];
  var cols = Math.min(REGISTRY_COLS, sh.getMaxColumns());
  var vals = sh.getRange(2, 1, n - 1, cols).getValues();
  for (var i = 0; i < vals.length; i++) {
    while (vals[i].length < REGISTRY_COLS) vals[i].push('');
  }
  return vals;
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
  var vals = n ? sh.getRange(2, 1, n, 4).getValues() : [];
  var col = function (c) {
    var out = [];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i][c];
      if (v instanceof Date) v = isoOf_(v);
      v = String(v).trim();
      if (v) out.push(v);
    }
    return out;
  };
  return { doctors: col(0), centers: col(1), timeslots: col(2), holidays: col(3) };
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
/** Sheets auto-converts date-like strings to Date objects when stored —
 *  always normalise back to 'yyyy-MM-dd' before parsing. */
function isoOf_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).trim();
}
function thaiDateFromISO_(iso) {
  var p = isoOf_(iso).split('-'); // yyyy-mm-dd
  return Number(p[2]) + ' ' + THAI_MONTHS[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
}
function thaiMonthFromISO_(iso) {
  var p = isoOf_(iso).split('-');
  return THAI_MONTHS[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
}
function doctorShort_(doctor) {
  // "นพ.ฐิติพงศ์  โนนน้อย  เลข ว. 79707" → "นพ.ฐิติพงศ์ โนนน้อย"
  return String(doctor).replace(/\s*เลข\s*ว\.?.*$/, '').replace(/\s+/g, ' ').trim();
}
function countPatients_(sh) {
  var vals = sh.getRange(PATIENT_START_ROW, 2, PATIENT_MAX_ROWS, 1).getValues();
  var n = 0;
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() !== '') n++;
  return n;
}
function isoFromThai_(thai) {
  // "8 ส.ค. 2569" → "2026-08-08"
  var m = String(thai).match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  var mi = THAI_MONTHS.indexOf(m[2]);
  var y = Number(m[3]) - 543;
  return y + '-' + ('0' + (mi + 1)).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}
function monthlyFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('MONTHLY_ID');
  if (id && fileExists_(id)) return DriveApp.getFolderById(id);
  var f = getOrCreateFolder_(DriveApp.getFolderById(ROOT_FOLDER_ID), 'หลักฐานการจ่ายเงิน');
  props.setProperty('MONTHLY_ID', f.getId());
  return f;
}

/**
 * Backfill missing patient counts/amounts from the source sheets, then rebuild
 * every month+center payment-evidence tab found in the Registry.
 * Run manually from the editor any time; safe to re-run.
 */
function rebuildMonthlyReports() {
  var sh = registrySheet_();
  sh.getRange(1, 10, 1, 2).setValues([['patients', 'amount']]);

  // ---- backfill ----
  var rows = registryRows_();
  var filled = 0, missing = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r[7] !== 'submitted') continue;
    if (Number(r[10])) continue;                 // already has an amount
    try {
      var src = SpreadsheetApp.openById(String(r[0])).getSheets()[0];
      var n = countPatients_(src);
      if (n > 0) {
        sh.getRange(i + 2, 10, 1, 2).setValues([[n, n * RATE_PER_PATIENT]]);
        rows[i][9] = n; rows[i][10] = n * RATE_PER_PATIENT;
        filled++;
      } else { missing++; }
    } catch (e) { missing++; }                   // sheet deleted / unreadable
  }
  SpreadsheetApp.flush();

  // ---- rebuild every month+center present ----
  var seen = {}, urls = {};
  rows = registryRows_();
  for (var j = 0; j < rows.length; j++) {
    var q = rows[j];
    if (q[7] !== 'submitted' || !Number(q[10])) continue;
    var iso = q[1] ? isoOf_(q[1]) : isoFromThai_(String(q[2]));
    var center = String(q[5]);
    var key = iso.slice(0, 7) + '|' + center;
    if (seen[key]) continue;
    seen[key] = true;
    urls[key] = updateMonthlyReport_(iso, center);
  }
  var keys = Object.keys(seen);
  Logger.log('Backfilled ' + filled + ' row(s), ' + missing + ' unreadable. Rebuilt ' +
             keys.length + ' tab(s): ' + keys.join(', '));
  for (var k = 0; k < keys.length; k++) Logger.log(keys[k] + ' -> ' + urls[keys[k]]);
  return { filled: filled, missing: missing, tabs: keys.length };
}

/** Rebuild one month+center tab of the payment-evidence spreadsheet from the Registry. */
function updateMonthlyReport_(dateISO, center) {
  var p = isoOf_(dateISO).split('-');
  var y = Number(p[0]), mo = Number(p[1]);
  var be = y + 543;
  var fileName = 'หลักฐานการจ่ายเงิน_' + THAI_MONTHS[mo - 1] + ' ' + be;

  // ensure Registry has the extended header
  try { registrySheet_().getRange(1, 10, 1, 2).setValues([['patients', 'amount']]); } catch (e) {}

  var folder = monthlyFolder_();
  var it = folder.getFilesByName(fileName);
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.openById(it.next().getId());
  } else {
    ss = SpreadsheetApp.create(fileName);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
  }
  var sh = ss.getSheetByName(center) || ss.insertSheet(center);
  // drop the default empty sheet once a real tab exists
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (def && ss.getSheets().length > 1 && def.getName() !== center) ss.deleteSheet(def);

  // ---- gather month data for this center from the Registry ----
  var rows = registryRows_();
  var doctors = [];           // ordered by first submission
  var grid = {};              // doctor -> {day -> amount}
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r[7] !== 'submitted' || String(r[5]) !== center) continue;
    var amt = Number(r[10]);
    if (!amt) continue;       // old rows without amount data are skipped
    var iso = r[1] ? isoOf_(r[1]) : isoFromThai_(String(r[2]));
    var q = iso.split('-');
    if (Number(q[0]) !== y || Number(q[1]) !== mo) continue;
    var day = Number(q[2]);
    var name = doctorShort_(String(r[4]));
    if (doctors.indexOf(name) === -1) { doctors.push(name); grid[name] = {}; }
    grid[name][day] = (grid[name][day] || 0) + amt;
  }

  // ---- rebuild the tab ----
  var DAY_COLS = 31, COLS = 3 + DAY_COLS + 2; // ที่ | ชื่อ-สกุล | ตำแหน่ง | 1..31 | จำนวน | ผู้รับเงิน
  sh.clear();
  var maxRows = 5 + Math.max(doctors.length, 15);
  sh.getRange(1, 1, maxRows, COLS).setFontFamily('Sarabun').setFontSize(11).setVerticalAlignment('middle');

  sh.getRange(1, 1, 1, COLS).merge()
    .setValue('หลักฐานการจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการและวันหยุดราชการ ' + center)
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  sh.getRange(2, 1, 1, COLS).merge()
    .setValue('ส่วนราชการ ' + HOSPITAL_NAME + ' ประจำเดือน' + THAI_MONTHS_FULL[mo - 1] + ' พ.ศ. ' + be)
    .setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(3, 1, 1, COLS).merge()
    .setValue('เบิกตามฎีกาที่ ......................... วันที่ .................. เดือน ................................ พ.ศ. ..................')
    .setHorizontalAlignment('center');

  sh.getRange(4, 1, 2, 1).merge().setValue('ที่');
  sh.getRange(4, 2, 2, 1).merge().setValue('ชื่อ-สกุล');
  sh.getRange(4, 3, 2, 1).merge().setValue('ตำแหน่ง');
  sh.getRange(4, 4, 1, DAY_COLS).merge().setValue('วันที่');
  sh.getRange(4, 4 + DAY_COLS, 2, 1).merge().setValue('จำนวน');
  sh.getRange(4, 5 + DAY_COLS, 2, 1).merge().setValue('ผู้รับเงิน');
  var dayNums = [[]];
  for (var d = 1; d <= DAY_COLS; d++) dayNums[0].push(d);
  sh.getRange(5, 4, 1, DAY_COLS).setValues(dayNums);
  sh.getRange(4, 1, 2, COLS).setFontWeight('bold').setHorizontalAlignment('center');

  // shade weekends + configured holidays
  var holidays = readConfig_().holidays; // ISO yyyy-mm-dd strings
  var daysInMonth = new Date(y, mo, 0).getDate();
  for (var d2 = 1; d2 <= daysInMonth; d2++) {
    var dow = new Date(y, mo - 1, d2).getDay();
    var iso2 = y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d2).slice(-2);
    if (dow === 0 || dow === 6 || holidays.indexOf(iso2) !== -1) {
      sh.getRange(5, 3 + d2).setBackground('#c9c9c9');
    }
  }

  // data rows
  if (doctors.length) {
    var data = [];
    for (var k = 0; k < doctors.length; k++) {
      var name2 = doctors[k];
      var row = [k + 1, name2, 'น.พ.'];
      var total = 0;
      for (var d3 = 1; d3 <= DAY_COLS; d3++) {
        var v = grid[name2][d3] || '';
        if (v) total += v;
        row.push(v);
      }
      row.push(total, '');
      data.push(row);
    }
    sh.getRange(6, 1, data.length, COLS).setValues(data);
    sh.getRange(6, 1, data.length, 1).setHorizontalAlignment('center');
    sh.getRange(6, 4, data.length, DAY_COLS).setFontSize(8).setHorizontalAlignment('center').setNumberFormat('#,##0');
    sh.getRange(6, 4 + DAY_COLS, data.length, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  }

  // layout + borders
  sh.setColumnWidth(1, 34); sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 62);
  for (var c = 4; c < 4 + DAY_COLS; c++) sh.setColumnWidth(c, 34);
  sh.setColumnWidth(4 + DAY_COLS, 76); sh.setColumnWidth(5 + DAY_COLS, 84);
  sh.getRange(4, 1, 2 + Math.max(doctors.length, 15), COLS).setBorder(true, true, true, true, true, true);

  return ss.getUrl();
}
