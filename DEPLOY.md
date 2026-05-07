# วิธี Deploy ให้เข้าได้ทุกอุปกรณ์

## ✅ วิธีที่ 1 — Netlify Drop (ง่ายที่สุด, 2 นาที)

1. เปิด **https://app.netlify.com/drop**
2. **ลากโฟลเดอร์ทั้งหมด** ทิ้งลงในหน้าเว็บ
3. รอ 30 วินาที → ได้ URL เช่น `https://amazing-name-123.netlify.app`
4. แชร์ URL ให้ทุกคนเปิดได้เลย

> ฟรี ไม่ต้องสมัคร ไม่ต้องติดตั้งอะไร

---

## ✅ วิธีที่ 2 — GitHub Pages (ฟรี, URL สวย)

### ครั้งแรก:
```bash
# 1. ติดตั้ง Git (ถ้ายังไม่มี) → https://git-scm.com
# 2. สมัคร GitHub → https://github.com

# 3. สร้าง repo ใหม่ชื่อ production-app (Public)
# 4. รันคำสั่งในโฟลเดอร์นี้:

git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/production-app.git
git push -u origin main
```

### เปิด GitHub Pages:
1. ไปที่ repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. รอ 1-2 นาที → ได้ URL: `https://YOUR_USERNAME.github.io/production-app`

### อัปเดตครั้งต่อไป:
```bash
git add .
git commit -m "Update"
git push
```
→ เว็บอัปเดตอัตโนมัติใน 1 นาที

---

## 📱 ติดตั้งเป็น App บนมือถือ

### iPhone / iPad:
1. เปิด URL ใน **Safari**
2. กดปุ่ม **Share** (กล่องมีลูกศรขึ้น)
3. เลือก **"Add to Home Screen"**
4. กด **Add** → ได้ไอคอนบนหน้าจอ

### Android:
1. เปิด URL ใน **Chrome**
2. กดเมนู ⋮ → **"Add to Home screen"**
3. กด **Add** → ได้ไอคอนบนหน้าจอ

### Windows / Mac (Chrome):
1. เปิด URL ใน Chrome
2. กดไอคอน ⊕ ในแถบ URL → **Install**

---

## 🔧 ขั้นตอนสร้างไอคอน (ทำครั้งเดียว)

1. เปิดไฟล์ `generate-icons.html` ในเบราว์เซอร์
2. กด **icon-192.png** และ **icon-512.png**
3. นำไฟล์ที่ดาวน์โหลดไปวางในโฟลเดอร์ `icons/`
4. Push ขึ้น GitHub อีกครั้ง

---

## ☁️ เชื่อมต่อ Google Sheets (ใช้ร่วมกันหลายคน)

ดูขั้นตอนในไฟล์ `google-apps-script.js`  
หลังได้ URL แล้ว → เปิดเว็บ → กด **⚙️ ตั้งค่า** → วาง URL → บันทึก
