# วิธีขึ้น GitHub Pages (เข้าได้ทุกอุปกรณ์)

## ขั้นที่ 1 — สมัคร GitHub (ถ้ายังไม่มี)

1. เปิด https://github.com
2. กด "Sign up"
3. กรอก Email, Password, Username
4. ยืนยัน Email

---

## ขั้นที่ 2 — สร้าง Repository

1. Login แล้วกดปุ่ม "+" มุมขวาบน → "New repository"
2. ตั้งค่าดังนี้:
   - Repository name: production-app
   - เลือก: Public
   - ไม่ต้องติ๊กอะไรเพิ่ม
3. กด "Create repository"

---

## ขั้นที่ 3 — อัปโหลดไฟล์

1. ในหน้า repository ที่เพิ่งสร้าง
2. กดลิงก์ "uploading an existing file"
3. ลากไฟล์เหล่านี้ทั้งหมดขึ้นไป:
   - index.html
   - style.css
   - app.js
   - db.js
   - export.js
   - chart.js
   - keyboard.js
   - sw.js
   - manifest.json
   - google-apps-script.js
4. ลากโฟลเดอร์ icons/ ขึ้นไปด้วย (ถ้ามีไอคอนแล้ว)
5. เลื่อนลงล่าง กด "Commit changes"

---

## ขั้นที่ 4 — เปิด GitHub Pages

1. กดแถบ "Settings" (บนสุดของ repository)
2. เมนูซ้าย กด "Pages"
3. ตรง "Source" เลือก "Deploy from a branch"
4. ตรง "Branch" เลือก "main" และ "/ (root)"
5. กด "Save"
6. รอ 2-3 นาที แล้ว refresh หน้า
7. จะเห็น URL สีเขียว เช่น:
   https://ชื่อผู้ใช้.github.io/production-app

---

## ขั้นที่ 5 — แชร์ URL

ส่ง URL นั้นให้ทุกคน เปิดได้เลยจาก:
- มือถือ iPhone / Android
- คอมที่บ้าน (WFH)
- Tablet
- ทุกอุปกรณ์ที่มีเบราว์เซอร์

---

## ขั้นที่ 6 — อัปเดตไฟล์ในอนาคต

เมื่อแก้ไขโค้ดแล้วต้องการอัปเดตเว็บ:
1. ไปที่ repository บน GitHub
2. คลิกที่ไฟล์ที่ต้องการแก้
3. กดไอคอนดินสอ (Edit)
4. แก้ไข → Commit changes
   หรือ
1. ลากไฟล์ใหม่ทับไฟล์เดิมในหน้า repository
2. Commit changes
3. รอ 1-2 นาที เว็บอัปเดตอัตโนมัติ

---

## หมายเหตุ

- GitHub Pages ฟรี 100%
- ไม่มีโฆษณา
- ใช้ได้ตลอด ไม่หมดอายุ
- ข้อมูลยังเก็บใน localStorage ของแต่ละเครื่อง
- ถ้าต้องการให้ข้อมูลซิงค์กัน ต้องทำ Google Sheets ด้วย (ดูไฟล์ google-apps-script.js)
