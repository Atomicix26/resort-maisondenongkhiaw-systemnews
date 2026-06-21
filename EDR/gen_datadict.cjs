// Generates an editable .docx Data Dictionary from schema.prisma (15 tables)
// Fonts: Lao -> Saysettha OT (w:cs), Latin/symbols -> Times New Roman (w:ascii/hAnsi)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LAO = 'Saysettha OT';
const ENG = 'Times New Roman';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// run: text with both fonts; bold optional; size in half-points (default 24 = 12pt)
function run(text, { bold = false, size = 22 } = {}) {
  const rpr = `<w:rPr><w:rFonts w:ascii="${ENG}" w:hAnsi="${ENG}" w:cs="${LAO}"/>${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return `<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(text, { bold = false, size = 22, after = 60, jc = null } = {}) {
  const ppr = `<w:pPr>${jc ? `<w:jc w:val="${jc}"/>` : ''}<w:spacing w:after="${after}" w:line="240" w:lineRule="auto"/></w:pPr>`;
  return `<w:p>${ppr}${run(text, { bold, size })}</w:p>`;
}

function cell(text, w, { bold = false, jc = 'left', shade = null } = {}) {
  const tcPr = `<w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>`;
  const ppr = `<w:pPr><w:jc w:val="${jc}"/><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>`;
  return `<w:tc>${tcPr}<w:p>${ppr}${run(text, { bold })}</w:p></w:tc>`;
}

const COLS = [600, 2150, 1750, 700, 1450, 2380]; // sum ~9030
function tableXml(rows) {
  const grid = `<w:tblGrid>${COLS.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  const borders = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tblBorders>`;
  const tblPr = `<w:tblPr><w:tblW w:w="9030" w:type="dxa"/>${borders}<w:tblLayout w:type="fixed"/></w:tblPr>`;
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${
    ['No', 'Field', 'Type', 'Key', 'Reference', 'Description'].map((h, i) =>
      cell(h, COLS[i], { bold: true, jc: i === 0 ? 'center' : 'left', shade: 'D9D9D9' })).join('')
  }</w:tr>`;
  const body = rows.map((r, idx) => {
    const cells = [
      cell(String(idx + 1), COLS[0], { jc: 'center' }),
      cell(r.field, COLS[1]),
      cell(r.type, COLS[2]),
      cell(r.key || '', COLS[3], { jc: 'center' }),
      cell(r.ref || '', COLS[4]),
      cell(r.desc, COLS[5]),
    ];
    return `<w:tr>${cells.join('')}</w:tr>`;
  }).join('');
  return `<w:tbl>${tblPr}${grid}${header}${body}</w:tbl>`;
}

// ── Data: all 15 tables ──────────────────────────────────────────────
const tables = [
  { no: '3.1', name: 'User', lao: 'ຂໍ້ມູນຜູ້ໃຊ້ງານ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດຜູ້ໃຊ້' },
    { field: 'email', type: 'VARCHAR(255)', desc: 'ອີເມວ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'password', type: 'VARCHAR(255)', desc: 'ລະຫັດຜ່ານ' },
    { field: 'name', type: 'VARCHAR(100)', desc: 'ຊື່' },
    { field: 'lastName', type: 'VARCHAR(100)', desc: 'ນາມສະກຸນ' },
    { field: 'phone', type: 'VARCHAR(20)', desc: 'ເບີໂທ' },
    { field: 'role', type: 'ENUM', desc: 'ສິດການນຳໃຊ້ (USER / ADMIN / SUPERADMIN)' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
    { field: 'deletedAt', type: 'DATETIME', desc: 'ວັນທີລຶບຂໍ້ມູນ (soft delete)' },
  ]},
  { no: '3.2', name: 'Staff', lao: 'ຂໍ້ມູນພະນັກງານ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດພະນັກງານ' },
    { field: 'userId', type: 'VARCHAR(30)', key: 'FK', ref: 'User', desc: 'ລະຫັດຜູ້ໃຊ້ (ເຊື່ອມໂຍງ 1:1)' },
    { field: 'position', type: 'VARCHAR(100)', desc: 'ຕຳແໜ່ງງານ' },
    { field: 'role', type: 'ENUM', desc: 'ບົດບາດ (STAFF / MANAGER / ADMIN)' },
    { field: 'salary', type: 'DECIMAL(10,2)', desc: 'ເງິນເດືອນ' },
    { field: 'startDate', type: 'DATETIME', desc: 'ວັນທີເລີ່ມວຽກ' },
    { field: 'isActive', type: 'BOOLEAN', desc: 'ສະຖານະການໃຊ້ງານ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.3', name: 'RoomType', lao: 'ຂໍ້ມູນປະເພດຫ້ອງ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດປະເພດຫ້ອງ' },
    { field: 'typeName', type: 'VARCHAR(100)', desc: 'ຊື່ປະເພດຫ້ອງ' },
    { field: 'description', type: 'TEXT', desc: 'ລາຍລະອຽດ' },
    { field: 'basePrice', type: 'DECIMAL(10,2)', desc: 'ລາຄາພື້ນຖານ' },
    { field: 'maxGuests', type: 'INT', desc: 'ຈຳນວນຄົນພັກສູງສຸດ' },
    { field: 'images', type: 'TEXT', desc: 'ຮູບພາບ (JSON array)' },
    { field: 'amenities', type: 'TEXT', desc: 'ສິ່ງອຳນວຍຄວາມສະດວກ (JSON array)' },
    { field: 'isActive', type: 'BOOLEAN', desc: 'ສະຖານະການໃຊ້ງານ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.4', name: 'Room', lao: 'ຂໍ້ມູນຫ້ອງພັກ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດຫ້ອງ' },
    { field: 'roomNumber', type: 'VARCHAR(20)', desc: 'ເລກຫ້ອງ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'name', type: 'VARCHAR(100)', desc: 'ຊື່ຫ້ອງ' },
    { field: 'description', type: 'TEXT', desc: 'ລາຍລະອຽດ' },
    { field: 'roomTypeId', type: 'VARCHAR(30)', key: 'FK', ref: 'RoomType', desc: 'ລະຫັດປະເພດຫ້ອງ' },
    { field: 'price', type: 'DECIMAL(10,2)', desc: 'ລາຄາຫ້ອງ' },
    { field: 'capacity', type: 'INT', desc: 'ຄວາມຈຸ (ຈຳນວນຄົນ)' },
    { field: 'bedType', type: 'VARCHAR(50)', desc: 'ປະເພດຕຽງ' },
    { field: 'size', type: 'INT', desc: 'ຂະໜາດ (ຕ.ມ.)' },
    { field: 'view', type: 'VARCHAR(50)', desc: 'ວິວ' },
    { field: 'images', type: 'TEXT', desc: 'ຮູບພາບ (JSON array)' },
    { field: 'amenities', type: 'TEXT', desc: 'ສິ່ງອຳນວຍຄວາມສະດວກ (JSON array)' },
    { field: 'status', type: 'ENUM', desc: 'ສະຖານະຫ້ອງ (AVAILABLE / OCCUPIED / MAINTENANCE / RESERVED)' },
    { field: 'featured', type: 'BOOLEAN', desc: 'ຫ້ອງແນະນຳ' },
    { field: 'isActive', type: 'BOOLEAN', desc: 'ສະຖານະການໃຊ້ງານ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
    { field: 'deletedAt', type: 'DATETIME', desc: 'ວັນທີລຶບຂໍ້ມູນ (soft delete)' },
  ]},
  { no: '3.5', name: 'PriceConfig', lao: 'ຂໍ້ມູນການຕັ້ງຄ່າລາຄາ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການຕັ້ງລາຄາ' },
    { field: 'roomTypeId', type: 'VARCHAR(30)', key: 'FK', ref: 'RoomType', desc: 'ລະຫັດປະເພດຫ້ອງ' },
    { field: 'seasonName', type: 'VARCHAR(100)', desc: 'ຊື່ຊ່ວງລະດູການ' },
    { field: 'priceAmount', type: 'DECIMAL(10,2)', desc: 'ລາຄາທີ່ກຳນົດ' },
    { field: 'startDate', type: 'DATETIME', desc: 'ວັນທີເລີ່ມຕົ້ນ' },
    { field: 'endDate', type: 'DATETIME', desc: 'ວັນທີສິ້ນສຸດ' },
    { field: 'priority', type: 'INT', desc: 'ລຳດັບຄວາມສຳຄັນ (ສູງກວ່າຈະຊະນະ)' },
    { field: 'isActive', type: 'BOOLEAN', desc: 'ສະຖານະການໃຊ້ງານ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.6', name: 'Booking', lao: 'ຂໍ້ມູນການຈອງ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການຈອງ' },
    { field: 'userId', type: 'VARCHAR(30)', key: 'FK', ref: 'User', desc: 'ລະຫັດຜູ້ໃຊ້ / ລູກຄ້າ' },
    { field: 'roomId', type: 'VARCHAR(30)', key: 'FK', ref: 'Room', desc: 'ລະຫັດຫ້ອງ' },
    { field: 'checkIn', type: 'DATETIME', desc: 'ວັນທີເຂົ້າພັກ' },
    { field: 'checkOut', type: 'DATETIME', desc: 'ວັນທີອອກ' },
    { field: 'guests', type: 'INT', desc: 'ຈຳນວນຜູ້ເຂົ້າພັກ' },
    { field: 'totalPrice', type: 'DECIMAL(10,2)', desc: 'ລາຄາລວມທັງໝົດ' },
    { field: 'status', type: 'ENUM', desc: 'ສະຖານະການຈອງ (PENDING / CONFIRMED / CHECKED_IN / CHECKED_OUT / COMPLETED / CANCELLED)' },
    { field: 'specialRequest', type: 'TEXT', desc: 'ຄຳຮ້ອງຂໍພິເສດ' },
    { field: 'actualCheckIn', type: 'DATETIME', desc: 'ເວລາເຂົ້າພັກຈິງ' },
    { field: 'actualCheckOut', type: 'DATETIME', desc: 'ເວລາອອກຈິງ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
    { field: 'deletedAt', type: 'DATETIME', desc: 'ວັນທີລຶບຂໍ້ມູນ (soft delete)' },
  ]},
  { no: '3.7', name: 'PaymentTransaction', lao: 'ຂໍ້ມູນການຊຳລະເງິນ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການຊຳລະ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ' },
    { field: 'type', type: 'ENUM', desc: 'ປະເພດທຸລະກຳ (CHARGE / REFUND / ADJUSTMENT)' },
    { field: 'amount', type: 'DECIMAL(10,2)', desc: 'ຈຳນວນເງິນ' },
    { field: 'method', type: 'ENUM', desc: 'ຊ່ອງທາງການຊຳລະ (TRANSFER / CREDIT_CARD / CASH)' },
    { field: 'status', type: 'ENUM', desc: 'ສະຖານະການຊຳລະ (PENDING / PENDING_VERIFY / PAID / FAILED / REFUNDED)' },
    { field: 'slipImage', type: 'VARCHAR(255)', desc: 'ຮູບພາບຫຼັກຖານການໂອນ' },
    { field: 'paymentDate', type: 'DATETIME', desc: 'ວັນເວລາທີ່ຊຳລະ' },
    { field: 'verifiedById', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ລະຫັດພະນັກງານທີ່ກວດສອບ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.8', name: 'BookApproval', lao: 'ຂໍ້ມູນການອະນຸມັດການຈອງ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການອະນຸມັດ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ອະນຸມັດ' },
    { field: 'status', type: 'ENUM', desc: 'ຜົນການອະນຸມັດ (PENDING / APPROVED / REJECTED)' },
    { field: 'reason', type: 'TEXT', desc: 'ເຫດຜົນ' },
    { field: 'refund', type: 'BOOLEAN', desc: 'ຄືນເງິນຫຼືບໍ່' },
    { field: 'apprDate', type: 'DATETIME', desc: 'ວັນທີອະນຸມັດ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.9', name: 'CheckInLog', lao: 'ຂໍ້ມູນບັນທຶກການເຂົ້າພັກ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການເຂົ້າພັກ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ຈັດການ' },
    { field: 'actualTime', type: 'DATETIME', desc: 'ເວລາເຂົ້າພັກຈິງ' },
    { field: 'verifyDoc', type: 'VARCHAR(255)', desc: 'ເອກະສານຢືນຢັນ' },
    { field: 'remarks', type: 'TEXT', desc: 'ໝາຍເຫດ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.10', name: 'CheckOutLog', lao: 'ຂໍ້ມູນບັນທຶກການອອກ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການອອກ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ຈັດການ' },
    { field: 'actualTime', type: 'DATETIME', desc: 'ເວລາອອກຈິງ' },
    { field: 'remarks', type: 'TEXT', desc: 'ໝາຍເຫດ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.11', name: 'CancelRequest', lao: 'ຂໍ້ມູນຄຳຮ້ອງຂໍຍົກເລີກ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດຄຳຮ້ອງ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'userId', type: 'VARCHAR(30)', key: 'FK', ref: 'User', desc: 'ລະຫັດຜູ້ໃຊ້ / ລູກຄ້າ' },
    { field: 'reason', type: 'TEXT', desc: 'ເຫດຜົນ' },
    { field: 'status', type: 'ENUM', desc: 'ສະຖານະຄຳຮ້ອງ (PENDING / APPROVED / REJECTED)' },
    { field: 'refundable', type: 'BOOLEAN', desc: 'ສາມາດຄືນເງິນໄດ້ຫຼືບໍ່' },
    { field: 'requestDate', type: 'DATETIME', desc: 'ວັນທີສົ່ງຄຳຮ້ອງ' },
    { field: 'actionDate', type: 'DATETIME', desc: 'ວັນທີດຳເນີນການ' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ດຳເນີນການ' },
  ]},
  { no: '3.12', name: 'Review', lao: 'ຂໍ້ມູນການຣີວິວ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດຣີວິວ' },
    { field: 'bookingId', type: 'VARCHAR(30)', key: 'FK', ref: 'Booking', desc: 'ລະຫັດການຈອງ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'rating', type: 'INT', desc: 'ຄະແນນ (1–5)' },
    { field: 'comment', type: 'TEXT', desc: 'ຄຳຄິດເຫັນ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີຣີວິວ' },
    { field: 'deletedAt', type: 'DATETIME', desc: 'ວັນທີລຶບຂໍ້ມູນ (soft delete)' },
  ]},
  { no: '3.13', name: 'ReviewManage', lao: 'ຂໍ້ມູນການຈັດການຣີວິວ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການຈັດການຣີວິວ' },
    { field: 'reviewId', type: 'VARCHAR(30)', key: 'FK', ref: 'Review', desc: 'ລະຫັດຣີວິວ (ບໍ່ຊ້ຳກັນ)' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ຈັດການ' },
    { field: 'status', type: 'ENUM', desc: 'ສະຖານະ (PENDING / APPROVED / HIDDEN / FLAGGED)' },
    { field: 'reply', type: 'TEXT', desc: 'ຂໍ້ຄວາມຕອບກັບ' },
    { field: 'actionDate', type: 'DATETIME', desc: 'ວັນທີດຳເນີນການ' },
    { field: 'createdAt', type: 'DATETIME', desc: 'ວັນທີສ້າງຂໍ້ມູນ' },
  ]},
  { no: '3.14', name: 'StatusRoom', lao: 'ຂໍ້ມູນການປ່ຽນສະຖານະຫ້ອງ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດບັນທຶກ' },
    { field: 'roomId', type: 'VARCHAR(30)', key: 'FK', ref: 'Room', desc: 'ລະຫັດຫ້ອງ' },
    { field: 'staffId', type: 'VARCHAR(30)', key: 'FK', ref: 'Staff', desc: 'ພະນັກງານຜູ້ປ່ຽນສະຖານະ' },
    { field: 'oldStatus', type: 'ENUM', desc: 'ສະຖານະເກົ່າ' },
    { field: 'newStatus', type: 'ENUM', desc: 'ສະຖານະໃໝ່' },
    { field: 'reason', type: 'VARCHAR(255)', desc: 'ເຫດຜົນ' },
    { field: 'changedAt', type: 'DATETIME', desc: 'ເວລາປ່ຽນ' },
  ]},
  { no: '3.15', name: 'AccessLog', lao: 'ຂໍ້ມູນປະຫວັດການເຂົ້າໃຊ້ລະບົບ', rows: [
    { field: 'id', type: 'VARCHAR(30)', key: 'PK', desc: 'ລະຫັດການເຂົ້າໃຊ້' },
    { field: 'userId', type: 'VARCHAR(30)', key: 'FK', ref: 'User', desc: 'ລະຫັດຜູ້ໃຊ້' },
    { field: 'userType', type: 'ENUM', desc: 'ປະເພດຜູ້ໃຊ້ (USER / ADMIN / SUPERADMIN)' },
    { field: 'ipAddress', type: 'VARCHAR(50)', desc: 'IP ເຄື່ອງທີ່ໃຊ້' },
    { field: 'loginTime', type: 'DATETIME', desc: 'ເວລາເຂົ້າສູ່ລະບົບ' },
    { field: 'logoutTime', type: 'DATETIME', desc: 'ເວລາອອກຈາກລະບົບ' },
  ]},
];

// ── Build document body ──────────────────────────────────────────────
let body = '';
body += para('ພົດຈະນານຸກົມຂໍ້ມູນ (Data Dictionary)', { bold: true, size: 32, after: 120 });
body += para('ຕາຕະລາງທີ່ນຳໃຊ້ໃນຖານຂໍ້ມູນ ເຊິ່ງໄດ້ມາຈາກແຜນພາບທັງໝົດ 15 ຕາຕະລາງ ລາຍລະອຽດດັ່ງນີ້:', { after: 160 });

tables.forEach((t, i) => {
  body += para(`ຕາຕະລາງທີ ${t.no} ສະແດງຕາຕະລາງ${t.lao} (${t.name})`, { bold: false, after: 60 });
  body += tableXml(t.rows);
  body += para('', { after: 160 }); // spacer
});

const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}${sectPr}</w:body></w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${ENG}" w:hAnsi="${ENG}" w:cs="${LAO}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="${ENG}" w:hAnsi="${ENG}" w:cs="${LAO}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
</w:styles>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

// ── Write parts to temp dir ──────────────────────────────────────────
const root = path.join(__dirname, '_dd_build');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(path.join(root, '_rels'), { recursive: true });
fs.mkdirSync(path.join(root, 'word', '_rels'), { recursive: true });
fs.writeFileSync(path.join(root, '[Content_Types].xml'), contentTypes);
fs.writeFileSync(path.join(root, '_rels', '.rels'), relsRoot);
fs.writeFileSync(path.join(root, 'word', 'document.xml'), documentXml);
fs.writeFileSync(path.join(root, 'word', 'styles.xml'), stylesXml);
fs.writeFileSync(path.join(root, 'word', '_rels', 'document.xml.rels'), relsDoc);

console.log('Parts written to', root);
console.log('Tables:', tables.length, 'Total fields:', tables.reduce((a, t) => a + t.rows.length, 0));
