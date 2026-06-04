require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// الاتصال بقاعدة البيانات
db.connectDB();

// إعدادات Cloudinary لرفع الصور بشكل دائم ومستمر
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تهيئة مسار رفع الملفات المحلي للسير الذاتية (CVs)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// إنشاء مجلد رفع ملفات السيرة الذاتية إذا لم يكن موجوداً
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// إعدادات رفع ملفات السيرة الذاتية (تخزين محلي مؤقت/مستمر على السيرفر)
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadCV = multer({ storage: cvStorage });

// إعدادات رفع الصور باستخدام Memory Storage لإرسالها مباشرة إلى السحابة
const uploadImg = multer({ storage: multer.memoryStorage() });

// إعدادات الحماية والتحقق للوحة التحكم (Admin)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'SmartHorizon2026!';
const ADMIN_TOKEN = 'smarthorizon_secure_handshake_token_2026';

const checkAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_TOKEN}` || authHeader === ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'غير مصرح لك بدخول هذا القسم!' });
};

// --- واجهات برمجة التطبيقات (API Routes) ---

// تسجيل دخول لوحة التحكم
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
  }
});

// رفع صور المشاريع وأعضاء الفريق مباشرة إلى Cloudinary
app.post('/api/upload', checkAdminAuth, uploadImg.single('image'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'يرجى اختيار صورة للرفع.' });
    
    // استخدام Stream لرفع الملف من الذاكرة إلى Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'smart_horizon_uploads' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'فشل رفع الصورة إلى السيرفر السحابي.' });
        }
        // إرجاع الرابط السحابي الدائم للملف
        res.json({
          secure_url: result.secure_url,
          path: result.secure_url
        });
      }
    );
    
    uploadStream.end(req.file.buffer);
  } catch (err) {
    next(err);
  }
});

// إدارة المشاريع (Projects API)
app.get('/api/projects', async (req, res) => {
  try { res.json(await db.getProjects()); } catch (err) { res.status(500).json({ error: 'خطأ في جلب المشاريع' }); }
});
app.post('/api/projects', checkAdminAuth, async (req, res) => {
  try { res.status(201).json(await db.addProject(req.body)); } catch (err) { res.status(500).json({ error: 'فشل إضافة المشروع' }); }
});
app.put('/api/projects/:id', checkAdminAuth, async (req, res) => {
  try { res.json(await db.updateProject(req.params.id, req.body)); } catch (err) { res.status(500).json({ error: 'فشل التعديل' }); }
});
app.delete('/api/projects/:id', checkAdminAuth, async (req, res) => {
  try { await db.deleteProject(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'فشل الحذف' }); }
});

// إدارة الأعضاء (Members API)
app.get('/api/members', async (req, res) => {
  try { res.json(await db.getMembers()); } catch (err) { res.status(500).json({ error: 'خطأ في جلب الأعضاء' }); }
});
app.post('/api/members', checkAdminAuth, async (req, res) => {
  try { res.status(201).json(await db.addMember(req.body)); } catch (err) { res.status(500).json({ error: 'فشل إضافة العضو' }); }
});
app.put('/api/members/:id', checkAdminAuth, async (req, res) => {
  try { res.json(await db.updateMember(req.params.id, req.body)); } catch (err) { res.status(500).json({ error: 'فشل التحديث' }); }
});
app.delete('/api/members/:id', checkAdminAuth, async (req, res) => {
  try { await db.deleteMember(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'فشل الحذف' }); }
});

// إدارة الأفكار والمقترحات (Ideas API)
app.get('/api/ideas', async (req, res) => {
  try { res.json(await db.getIdeas()); } catch (err) { res.status(500).json({ error: 'خطأ في جلب الأفكار' }); }
});
app.post('/api/ideas', async (req, res) => {
  try { res.status(201).json(await db.addIdea(req.body)); } catch (err) { res.status(500).json({ error: 'فشل إرسال الفكرة' }); }
});
app.delete('/api/ideas/:id', checkAdminAuth, async (req, res) => {
  try { await db.deleteIdea(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'فشل الحذف' }); }
});

// طلبات الانضمام للفريق (Submissions API)
app.get('/api/submissions', checkAdminAuth, async (req, res) => {
  try { res.json(await db.getSubmissions()); } catch (err) { res.status(500).json({ error: 'خطأ في جلب الطلبات' }); }
});
app.post('/api/submissions', uploadCV.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'يرجى رفع ملف السيرة الذاتية PDF.' });
    const submissionData = { 
      ...req.body, 
      cvPath: `/api/submissions/download/${req.file.filename}`, 
      cvName: req.file.originalname 
    };
    res.status(201).json(await db.addSubmission(submissionData));
  } catch (err) { res.status(500).json({ error: 'فشل إرسال الطلب.' }); }
});
app.delete('/api/submissions/:id', checkAdminAuth, async (req, res) => {
  try {
    await db.deleteSubmission(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'فشل الحذف' }); }
});

// تحميل السير الذاتية بشكل آمن للأدمن فقط
app.get('/api/submissions/download/:filename', checkAdminAuth, (req, res) => {
  try {
    const filepath = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(filepath)) {
      res.sendFile(filepath);
    } else {
      res.status(404).json({ error: 'الملف غير موجود!' });
    }
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل الملف.' });
  }
});

// تشغيل وخدمة واجهات الـ Frontend الثابتة من مجلد public
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error('🔥 Global Server Error:', err);
  res.status(500).json({ error: 'حدث خطأ داخلي في الخادم!' });
});

// بدء تشغيل السيرفر محلياً أو على Render
app.listen(PORT, () => console.log(`🚀 Server fully operational on port ${PORT}`));

module.exports = app;