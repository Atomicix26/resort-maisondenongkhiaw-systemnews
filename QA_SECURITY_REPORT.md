# 🛡️ QA & Security Assessment Report
## AT Resort Booking System

| | |
|---|---|
| **ผู้ตรวจ** | Senior QA & Application Security Tester |
| **วันที่** | 2026-06-21 |
| **Scope** | Next.js 16 (App Router) + Prisma + MySQL + next-auth |
| **วิธีตรวจ** | Static code review (line-by-line) + Unit test baseline (vitest) |
| **ไม่ครอบคลุม** | Dynamic HTTP testing / live DB (ตามที่ตกลง — Static + Unit เท่านั้น) |

> ⚠️ **หมายเหตุ:** บรีฟต้นทางระบุระบบเป็น *Express + MariaDB + vanilla JS (จองคอร์ตแบดมินตัน, PK แบบ `BK001`)* แต่ระบบจริงคือ **Next.js + Prisma (จองห้องพักรีสอร์ต, PK เป็น `cuid()`)** — รายงานนี้อิงระบบจริง ข้อดีของ `cuid()` คือลดความเสี่ยง IDOR แบบเดา ID ลงมาก

---

## 1. Executive Summary

ระบบมี **รากฐานความปลอดภัยที่ดีกว่าค่าเฉลี่ย** — ใช้ Prisma (กัน SQLi โดยปริยาย), bcrypt, ownership check บนทรัพยากรของผู้ใช้, คำนวณราคาฝั่ง server, และมี rate limit ที่ login/register แล้ว **ไม่พบช่องโหว่ระดับ Critical** (ไม่มี SQLi, ไม่มี privilege escalation ตรงๆ, ไม่มี secret หลุดใน repo)

จุดที่ต้องแก้เป็นเรื่อง **session lifecycle, audit trail การชำระเงิน, และการเปิดเผย PII** เป็นหลัก

### สรุปจำนวนข้อบกพร่องตามระดับ

| ระดับ | จำนวน |
|-------|------|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🔵 Low | 5 |
| ⚪ Info | 2 |
| **รวม** | **15** |

---

## 2. ตารางข้อบกพร่องทั้งหมด (เรียงตามความรุนแรง)

| ID | ระดับ | หมวด | หัวข้อ | ตำแหน่ง |
|----|-------|------|--------|---------|
| BUG-001 | 🟠 High | Auth / Session | Session ไม่ถูกเพิกถอนเมื่อ user ถูกลบ/ลดสิทธิ์ | `lib/auth.ts` |
| BUG-002 | 🟠 High | Payment / Audit | Audit trail การ "ปฏิเสธ" การชำระเงินไม่ครบ (ใคร/เมื่อไหร่/เหตุผล) | `app/api/admin/payments/[id]/verify/route.ts` |
| BUG-003 | 🟠 High | Sensitive Data | `GET /api/reviews` เปิด public + เผยชื่อ-นามสกุลผู้รีวิว | `app/api/reviews/route.ts:76` |
| BUG-004 | 🟡 Medium | Business Logic | Double-booking race condition (check-then-insert ไม่มี lock) | `app/api/bookings/route.ts:65` |
| BUG-005 | 🟡 Medium | Auth | ไม่กำหนด session `maxAge` → token อายุ 30 วัน (default) | `lib/auth.ts:88` |
| BUG-006 | 🟡 Medium | File Upload | สลิปตรวจ MIME จากฝั่ง client เท่านั้น ไม่เช็ค magic byte | `app/api/payments/route.ts:85` |
| BUG-007 | 🟡 Medium | Rate Limiting | Payment ไม่มี rate limit + limiter เป็น in-memory | `app/api/payments/route.ts`, `lib/ratelimit.ts` |
| BUG-008 | 🟡 Medium | Business Logic | จองวันที่ย้อนหลัง (อดีต) ได้ | `app/api/bookings/route.ts:33` |
| BUG-009 | 🔵 Low | Security Misconfig | ไม่มี security headers (CSP/HSTS/X-Frame-Options) | `next.config.ts` |
| BUG-010 | 🔵 Low | Input Validation | ค่า enum ผิด (role/status) → Prisma error → 500 แทน 400 | หลาย PATCH endpoint |
| BUG-011 | 🔵 Low | RBAC | ใช้ denylist (`role === "USER"`) ปนกับ allowlist — เปราะ | `app/api/admin/*` |
| BUG-012 | 🔵 Low | Security Misconfig | DB ใช้ `root` ไม่มีรหัสผ่าน | `.env` |
| BUG-013 | 🔵 Low | Architecture | middleware ไม่ครอบ `/api/*` — พึ่ง self-guard ล้วน | `middleware.ts:52` |
| BUG-014 | ⚪ Info | Business Logic | ราคา season เดียวถูกใช้ทั้งทริปแม้ข้ามฤดู | `lib/pricing.ts:19` |
| BUG-015 | ⚪ Info | RBAC | SUPERADMIN ลด/เพิ่มสิทธิ์ SUPERADMIN อื่นได้โดยไม่มี safeguard | `app/api/superadmin/users/[id]/route.ts` |

---

## 3. รายละเอียดข้อบกพร่อง (Defect Details)

### BUG-001 — Session ไม่ถูกเพิกถอนเมื่อ user ถูกลบ/ลดสิทธิ์
- **ระดับ:** 🟠 High
- **หมวด:** Security — Broken Access Control / Session Management
- **ตำแหน่ง:** `lib/auth.ts` (callbacks `jwt`/`session` บรรทัด 61–80; ตรวจ `deletedAt`/`isActive` เฉพาะตอน `authorize()` บรรทัด 44–45)
- **ขั้นตอนทำซ้ำ:**
  1. User X login สำเร็จ ได้ JWT (role=ADMIN)
  2. SUPERADMIN เรียก `DELETE /api/superadmin/users/{X}` (soft delete) หรือ `PATCH` ลด role เป็น USER
  3. X ใช้ token เดิม (ที่ยังไม่หมดอายุ) เรียก API ต่อ
- **ผลที่ได้:** Token เดิมยังใช้งานได้ และยังถือ `role` เดิม เพราะ session/jwt callback อ่านค่าจาก token ไม่ re-check DB
- **ผลที่ควรเป็น:** ผู้ใช้ที่ถูกลบ/ลดสิทธิ์ต้องถูกตัด session ทันที (หรือภายในเวลาสั้นๆ)
- **หลักฐาน:** `jwt()` เซ็ต `token.role` ครั้งเดียวตอน login; ไม่มีการ query `user.deletedAt`/`role` ใหม่ในแต่ละ request
- **แนวทางแก้:** ใน `session` callback ดึง user จาก DB ทุกครั้ง (หรือ cache สั้นๆ) เช็ค `deletedAt`/`role`/`staff.isActive` ปัจจุบัน; หรือเก็บ `tokenVersion` ใน DB แล้ว invalidate เมื่อมีการเปลี่ยนสิทธิ์

---

### BUG-002 — Audit trail การปฏิเสธชำระเงินไม่ครบ
- **ระดับ:** 🟠 High
- **หมวด:** Business Logic — Payment / Audit (จุดที่บรีฟเน้นเป็นพิเศษ)
- **ตำแหน่ง:** `app/api/admin/payments/[id]/verify/route.ts:18–32`
- **ขั้นตอนทำซ้ำ:**
  1. ADMIN เรียก `PATCH /api/admin/payments/{id}/verify` body `{"status":"FAILED"}`
  2. ตรวจข้อมูลที่ถูกบันทึก
- **ผลที่ได้:**
  - ❌ ไม่มีฟิลด์ **reason** ของการปฏิเสธ (schema `PaymentTransaction` ไม่มีคอลัมน์เหตุผล)
  - ❌ ไม่มี **timestamp การ verify** (อัปเดตแค่ `status`/`verifiedById`; `paymentDate` ไม่ถูกแตะ)
  - ❌ `verifiedById = staff?.id ?? null` → ถ้า ADMIN ไม่มี Staff profile จะเป็น **null** → ไม่รู้ว่าใครปฏิเสธ
- **ผลที่ควรเป็น:** การปฏิเสธเงินต้องบันทึก **ใคร / เมื่อไหร่ / เหตุผล** ครบถ้วน (ความต้องการชัดเจนจากบรีฟ)
- **แนวทางแก้:** เพิ่ม `verifiedAt DateTime?` และ `rejectReason String?` ใน `PaymentTransaction`; บังคับ reason เมื่อ status=FAILED; แก้ให้ resolve ผู้ verify จาก `session.user.id` เสมอ (ไม่พึ่ง Staff profile)

---

### BUG-003 — `GET /api/reviews` เปิด public และเผย PII ผู้รีวิว
- **ระดับ:** 🟠 High
- **หมวด:** Security — Sensitive Data Exposure
- **ตำแหน่ง:** `app/api/reviews/route.ts:76–112` (ไม่มี `getServerSession` ใน GET)
- **ขั้นตอนทำซ้ำ:**
  1. **ไม่ต้อง login**
  2. `GET /api/reviews?roomId=<roomId>`
- **ผลที่ได้:** คืนรีวิวพร้อม `user: { name, lastName }` (ชื่อจริง-นามสกุลจริงของผู้เข้าพัก) + ช่วงวันที่เข้าพัก → ใครก็ดึง PII ได้แบบ public
- **ผลที่ควรเป็น:** ถ้าต้องโชว์รีวิวสาธารณะ ควรปกปิดนามสกุล (เช่น "สมชาย ก.") และซ่อนวันที่เข้าพักรายบุคคล; หรือกรองเฉพาะรีวิวที่ `management.status = APPROVED`
- **หลักฐาน:** GET ไม่มี auth guard; `select: { user: { name, lastName } }` (บรรทัด 97)
- **แนวทางแก้:** mask นามสกุล + คืนเฉพาะรีวิว APPROVED + ไม่คืน checkIn/checkOut รายคน

---

### BUG-004 — Double-booking Race Condition
- **ระดับ:** 🟡 Medium
- **หมวด:** Business Logic / Data Integrity
- **ตำแหน่ง:** `app/api/bookings/route.ts:65–108`
- **ขั้นตอนทำซ้ำ:** ส่ง POST จองห้องเดียวกัน ช่วงวันทับกัน 2 request พร้อมกัน (concurrent)
- **ผลที่ได้:** logic เป็น `findFirst` (เช็คชน) แล้วค่อย `create` — ไม่มี `SELECT ... FOR UPDATE` และไม่มี unique constraint บน (room, ช่วงวัน) → ภายใต้ concurrency ทั้งสอง transaction อาจผ่าน check แล้ว insert ทั้งคู่ → จองซ้อน
- **ผลที่ควรเป็น:** ห้องหนึ่งช่วงเวลาหนึ่งต้องมี booking ที่ active ได้รายเดียว
- **แนวทางแก้:** ใช้ row lock (`SELECT ... FOR UPDATE` ผ่าน `$queryRaw`) หรือ exclusion/unique strategy, หรือ retry บน serialization error; พิจารณา DB-level constraint
- **หมายเหตุ:** logic การ overlap เอง (`checkIn < checkOut_new && checkOut > checkIn_new`) **ถูกต้อง** — อนุญาต back-to-back ได้

---

### BUG-005 — ไม่กำหนด session maxAge
- **ระดับ:** 🟡 Medium · **หมวด:** Auth
- **ตำแหน่ง:** `lib/auth.ts:88` (`session: { strategy: "jwt" }` ไม่มี `maxAge`)
- **ผลที่ได้:** ใช้ค่า default ของ next-auth = **30 วัน** → token ที่หลุดมีอายุยาว (ขยายผลกระทบของ BUG-001)
- **แนวทางแก้:** กำหนด `session: { strategy: "jwt", maxAge: 60*60*8 }` (เช่น 8 ชม.) + พิจารณา rolling/`updateAge`

---

### BUG-006 — Slip upload เชื่อ MIME จาก client
- **ระดับ:** 🟡 Medium · **หมวด:** File Upload / Input Validation
- **ตำแหน่ง:** `app/api/payments/route.ts:85` (`ALLOWED_MIME.has(slipFile.type)`)
- **ผลที่ได้:** `slipFile.type` ผู้ใช้ตั้งค่าเองได้ → อัปไฟล์เนื้อหาใดก็ได้โดยตั้ง type เป็น `image/png`; ไม่มีการตรวจ magic byte
- **ปัจจัยลดความเสี่ยง:** เก็บใน `private/` (นอก web root), ตั้งชื่อสุ่ม, อ่านได้เฉพาะ ADMIN ผ่าน `/api/slips` ที่มี `nosniff` + extension whitelist + path-traversal guard
- **แนวทางแก้:** ตรวจ magic bytes (เช่น sniff signature JPEG/PNG/WebP) ฝั่ง server ก่อนบันทึก

---

### BUG-007 — Payment ไม่มี rate limit + limiter เป็น in-memory
- **ระดับ:** 🟡 Medium · **หมวด:** Rate Limiting / Availability
- **ตำแหน่ง:** `app/api/payments/route.ts` (ไม่เรียก `checkRateLimit`), `lib/ratelimit.ts:6`
- **ผลที่ได้:** (ก) `RATE_LIMITS.payment` ถูก define แต่ไม่เคยใช้ → endpoint อัปสลิปไม่จำกัดอัตรา (เปลือง storage/abuse) (ข) limiter เก็บใน `Map` ใน memory → รีเซ็ตเมื่อ restart และไม่ทำงานข้าม instance (serverless/หลาย pod)
- **แนวทางแก้:** เรียก rate limit ใน payment POST; ย้าย limiter ไป Redis/Upstash สำหรับ production

---

### BUG-008 — จองวันที่ย้อนหลังได้
- **ระดับ:** 🟡 Medium · **หมวด:** Business Logic
- **ตำแหน่ง:** `app/api/bookings/route.ts:33` (เช็คแค่ `checkIn >= checkOut`)
- **ผลที่ได้:** ส่ง `checkIn` เป็นวันในอดีตได้ → ข้อมูลจองเพี้ยน/หลบ logic ราคา
- **แนวทางแก้:** reject ถ้า `checkInDate < today` (อิงเวลา server/timezone รีสอร์ต)

---

### BUG-009 — ไม่มี Security Headers
- **ระดับ:** 🔵 Low · **หมวด:** Security Misconfiguration
- **ตำแหน่ง:** `next.config.ts` (ไม่มี `async headers()`)
- **ผลที่ได้:** ขาด CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy → เปิดช่อง clickjacking/MIME-sniffing ในระดับเบราว์เซอร์
- **แนวทางแก้:** เพิ่ม `headers()` ใส่ security headers ครบชุด

---

### BUG-010 — Enum ผิด → 500 แทน 400
- **ระดับ:** 🔵 Low · **หมวด:** Input Validation / Error Handling
- **ตำแหน่ง:** `app/api/admin/reviews/[id]/route.ts:26`, `app/api/admin/bookings/[id]/route.ts`, `app/api/superadmin/users/[id]/route.ts:28`
- **ผลที่ได้:** ส่ง `status`/`role` ที่ไม่อยู่ใน enum → cast ตรงเข้า Prisma → throw → ตอบ 500 (ควรเป็น 400 Bad Request)
- **แนวทางแก้:** validate ค่าด้วย allowlist (หรือ zod) ก่อนเข้า DB

---

### BUG-011 — RBAC denylist เปราะ/ไม่สม่ำเสมอ
- **ระดับ:** 🔵 Low · **หมวด:** RBAC (Defense in depth)
- **ตำแหน่ง:** `app/api/admin/*` ใช้ `if (role === "USER") 403` ขณะที่ `app/api/superadmin/*` ใช้ allowlist `!== "SUPERADMIN"`
- **ผลที่ได้:** ปัจจุบันทำงานถูกต้องสำหรับ 3 role แต่ pattern denylist จะ "เปิดโดย default" ถ้ามี role ใหม่ในอนาคต
- **แนวทางแก้:** เปลี่ยนเป็น allowlist ทุกจุด + helper กลาง เช่น `requireRole([...])`

---

### BUG-012 — DB root ไม่มีรหัสผ่าน
- **ระดับ:** 🔵 Low · **หมวด:** Security Misconfiguration
- **ตำแหน่ง:** `.env:12` (`mysql://root:@localhost`)
- **ผลที่ได้:** เป็นค่า dev — ต้องไม่หลุดไป production; root ไม่มีรหัสเสี่ยงสูงถ้า DB เปิด network
- **แนวทางแก้:** ใช้ DB user สิทธิ์จำกัด + รหัสผ่านแข็งแรงใน production (`.env` ถูก gitignore แล้ว ✅)

---

### BUG-013 — middleware ไม่ครอบ `/api/*`
- **ระดับ:** 🔵 Low · **หมวด:** Architecture / Defense in depth
- **ตำแหน่ง:** `middleware.ts:52–64` (`matcher` มีแต่ page routes)
- **ผลที่ได้:** ความปลอดภัยของ API พึ่ง self-guard ในแต่ละไฟล์ล้วน — ถ้าลืม guard ในไฟล์ใหม่ = เปิดโล่งทันที (ปัจจุบันทุก route guard ครบ ✅)
- **แนวทางแก้:** เพิ่มชั้น auth กลางสำหรับ `/api/*` หรือ helper บังคับใช้

---

### BUG-014 — ราคา season เดียวทั้งทริป (ข้ามฤดู)
- **ระดับ:** ⚪ Info · **หมวด:** Business Logic
- **ตำแหน่ง:** `lib/pricing.ts:19` (`findFirst` 1 config ใช้ทุกคืน)
- **ผลที่ได้:** ถ้าเข้าพักคร่อม high/low season ระบบใช้เรตเดียวทุกคืน อาจคิดเงินคลาดเคลื่อน
- **แนวทางแก้:** คำนวณราคาแบบรายคืน (per-night) ตาม config ที่ตรงแต่ละวัน

---

### BUG-015 — SUPERADMIN จัดการ SUPERADMIN อื่นได้ไม่มี safeguard
- **ระดับ:** ⚪ Info · **หมวด:** RBAC
- **ตำแหน่ง:** `app/api/superadmin/users/[id]/route.ts:22–31`
- **ผลที่ได้:** กันแก้ "ตัวเอง" แล้ว แต่ SUPERADMIN A ลด role / soft-delete SUPERADMIN B ได้ และตั้ง role ใครเป็น SUPERADMIN ก็ได้ (ต่างจาก `staff` route ที่กัน SUPERADMIN ถูกแก้)
- **แนวทางแก้:** เพิ่ม guard ห้ามแก้ผู้ที่เป็น SUPERADMIN (ให้สอดคล้องกับ `staff/[id]` route)

---

## 4. Top 5 จุดเสี่ยงที่ต้องแก้ก่อน

1. **BUG-002 (Payment Audit)** — เป็นความต้องการหลักของระบบ (audit การปฏิเสธเงิน) และกระทบความถูกต้องทางการเงิน/ตรวจสอบย้อนหลัง แก้ schema + บังคับ reason/ผู้ทำ/เวลา
2. **BUG-001 (Session ไม่เพิกถอน)** — พนักงานที่ถูกไล่ออก/ผู้ใช้ที่ถูกแบนยังเข้าระบบได้นานถึง 30 วัน กระทบ access control โดยตรง
3. **BUG-003 (PII รั่วทาง reviews)** — ชื่อจริงลูกค้าหลุด public โดยไม่ต้อง login แก้ได้เร็ว ผลกระทบ privacy สูง
4. **BUG-004 (Double booking)** — กระทบรายได้และประสบการณ์ลูกค้าโดยตรงเมื่อมี traffic สูง
5. **BUG-005 + BUG-007 (maxAge + rate limit/in-memory)** — ขยายผลกระทบของช่องโหว่ session และเปิดช่อง abuse; ต้องแก้ก่อนขึ้น production จริง (โดยเฉพาะถ้า deploy แบบ serverless)

---

## 5. สิ่งที่ทำได้ดีอยู่แล้ว (อย่าไปแก้)

- ✅ **ไม่มี SQL Injection** — ใช้ Prisma method ทั้งระบบ; `$queryRaw` 2 จุดเป็น tagged template ที่ SQL คงที่ ไม่มี interpolation ของ input
- ✅ **คำนวณราคาฝั่ง server** — `POST /api/bookings` ไม่เชื่อราคาจาก client (กัน price tampering)
- ✅ **Ownership checks** ครบบน `bookings/[id]`, `payments`, `cancel-requests`, `reviews` (กัน IDOR)
- ✅ **bcrypt (cost 10)** สำหรับรหัสผ่าน; ไม่มี endpoint คืน `password` ออกมาเลย
- ✅ **PK เป็น `cuid()`** — เดา/ไล่ ID ไม่ได้ ลดความเสี่ยง IDOR เชิงโครงสร้าง
- ✅ **Slip serving ปลอดภัย** — path-traversal guard, extension whitelist, `nosniff`, `private, no-store`, เก็บนอก web root, admin-only
- ✅ **Rate limit ที่ login (email + IP) และ register** ทำงานถูกต้อง (มี unit test ครอบ)
- ✅ **Booking state machine** บังคับ transition ถูกต้อง (กันข้ามสถานะ)
- ✅ **overlap logic ของ booking ถูกต้อง** (อนุญาต back-to-back)
- ✅ **ไม่มี stored XSS surface** — React auto-escape, ไม่มี `dangerouslySetInnerHTML` ในโค้ดแอป
- ✅ **`.env` ถูก gitignore** + `NEXTAUTH_SECRET` ยาว 32 bytes (แข็งแรง)
- ✅ **Self-protection guards** — กันลบ/แก้ตัวเอง และกัน deactivate SUPERADMIN ใน `staff` route
- ✅ **Error handling** — catch ทุก route คืน generic message ไม่หลุด stack trace/ชื่อตาราง

---

## 6. ผลการทดสอบอัตโนมัติ (Baseline)

```
vitest run
 ✓ tests/pricing.test.ts   (5 tests)
 ✓ tests/ratelimit.test.ts (8 tests)
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

**ข้อเสนอแนะ:** เพิ่ม integration test (route handlers) สำหรับ RBAC matrix, ownership/IDOR, payment verify, และ booking concurrency — ปัจจุบัน unit test ครอบเฉพาะ pure lib (pricing/ratelimit)

---

## 7. ขอบเขตที่ยังไม่ได้ทดสอบ (Recommendation สำหรับรอบถัดไป)
- Dynamic HTTP testing จริงหลาย role + live DB (ยืนยัน RBAC/IDOR runtime)
- Concurrency test จริงสำหรับ BUG-004
- CSRF behavior ของ next-auth (SameSite cookie) ภายใต้ deployment จริง
- Penetration test ฝั่ง client (token storage, XSS reflected ผ่าน query)

---

*รายงานนี้อิงการตรวจ static code review เป็นหลัก ทุกข้อบกพร่องอ้างอิงไฟล์/บรรทัดที่ตรวจสอบได้ — ไม่มีการแก้ไขโค้ด production ในขั้นตอนการตรวจตามกฎ*
