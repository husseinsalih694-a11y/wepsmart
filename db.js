const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

let useMongoose = process.env.NODE_ENV === 'production';
const JSON_FILE_PATH = path.join(__dirname, 'database.json');

// Helper to read local JSON database
async function readJsonDB() {
  try {
    const data = await fs.readFile(JSON_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { projects: [], members: [], ideas: [], submissions: [] };
  }
}

// Helper to write local JSON database
async function writeJsonDB(data) {
  await fs.writeFile(JSON_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Normalization helpers for form data
function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

function parseSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') {
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// schema configurations
const schemaOptions = {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      return ret;
    }
  }
};

// --- Mongoose Schemas ---
const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  bio: { type: String, required: true },
  image: { type: String, required: true },
  skills: [String],
  order: { type: Number, default: 0 }
}, schemaOptions);

const IdeaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  quarter: { type: String, required: true },
  status: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const SubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: { type: String, required: true },
  cvPath: { type: String, required: true },
  cvName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, schemaOptions);

const Project = mongoose.model('Project', ProjectSchema);
const Member = mongoose.model('Member', MemberSchema);
const Idea = mongoose.model('Idea', IdeaSchema);
const Submission = mongoose.model('Submission', SubmissionSchema);

// Connection logic switching between Local JSON mock and hosted MongoDB Atlas
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!uri) {
    if (isProd) {
      console.error("❌ CRITICAL: MONGO_URI is missing in production environment!");
      process.exit(1);
    }
    console.log(`📡 MONGO_URI not provided. Local Database Activated for Frontend Testing (JSON Fallback)`);
    useMongoose = false;
    return;
  }
  
  // Disable mongoose buffering so queries fail immediately if connection is lost
  mongoose.set('bufferCommands', false);
  
  // Set up connection event listeners to manage Render server connectivity
  mongoose.connection.on('connected', () => {
    console.log(`📡 Connected to MongoDB Atlas successfully`);
    useMongoose = true;
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error:`, err.message);
    if (isProd) {
      useMongoose = true; // In production, force Mongoose mode so we throw errors instead of saving locally
    } else {
      useMongoose = false;
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`⚠️ MongoDB disconnected from Atlas. Reconnection attempts managed by driver...`);
  });
  
  try {
    await mongoose.connect(uri);
    
    // Seed MongoDB Atlas database if it's empty
    await seedOfficialData();
  } catch (err) {
    console.error(`❌ Initial MongoDB connection failed:`, err.message);
    if (isProd) {
      useMongoose = true;
    } else {
      console.log(`📡 Falling back to local JSON database for local testing.`);
      useMongoose = false;
    }
  }
};

const db = {
  connectDB,
  
  getProjects: async () => {
    if (useMongoose) {
      return Project.find().sort({ createdAt: -1 });
    } else {
      const data = await readJsonDB();
      return (data.projects || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },
  
  addProject: async (p) => {
    p.tags = parseTags(p.tags);
    if (useMongoose) {
      return new Project(p).save();
    } else {
      const data = await readJsonDB();
      const newProj = { id: 'proj_' + Date.now(), createdAt: new Date().toISOString(), ...p };
      data.projects = data.projects || [];
      data.projects.push(newProj);
      await writeJsonDB(data);
      return newProj;
    }
  },
  
  updateProject: async (id, update) => {
    if (update.tags) update.tags = parseTags(update.tags);
    if (useMongoose) {
      return Project.findByIdAndUpdate(id, update, { new: true });
    } else {
      const data = await readJsonDB();
      const idx = data.projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        data.projects[idx] = { ...data.projects[idx], ...update };
        await writeJsonDB(data);
        return data.projects[idx];
      }
      return null;
    }
  },
  
  deleteProject: async (id) => {
    if (useMongoose) {
      return Project.findByIdAndDelete(id);
    } else {
      const data = await readJsonDB();
      data.projects = (data.projects || []).filter(p => p.id !== id);
      await writeJsonDB(data);
      return true;
    }
  },

  getMembers: async () => {
    if (useMongoose) {
      return Member.find().sort({ order: 1 });
    } else {
      const data = await readJsonDB();
      return (data.members || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  },
  
  addMember: async (m) => {
    m.skills = parseSkills(m.skills);
    m.order = Number(m.order) || 0;
    if (useMongoose) {
      return new Member(m).save();
    } else {
      const data = await readJsonDB();
      const newMem = { id: 'mem_' + Date.now(), ...m };
      data.members = data.members || [];
      data.members.push(newMem);
      await writeJsonDB(data);
      return newMem;
    }
  },
  
  updateMember: async (id, update) => {
    if (update.skills) update.skills = parseSkills(update.skills);
    if (update.order !== undefined) update.order = Number(update.order) || 0;
    if (useMongoose) {
      return Member.findByIdAndUpdate(id, update, { new: true });
    } else {
      const data = await readJsonDB();
      const idx = data.members.findIndex(m => m.id === id);
      if (idx !== -1) {
        data.members[idx] = { ...data.members[idx], ...update };
        await writeJsonDB(data);
        return data.members[idx];
      }
      return null;
    }
  },
  
  deleteMember: async (id) => {
    if (useMongoose) {
      return Member.findByIdAndDelete(id);
    } else {
      const data = await readJsonDB();
      data.members = (data.members || []).filter(m => m.id !== id);
      await writeJsonDB(data);
      return true;
    }
  },

  getIdeas: async () => {
    if (useMongoose) {
      return Idea.find().sort({ createdAt: -1 });
    } else {
      const data = await readJsonDB();
      return data.ideas || [];
    }
  },
  
  addIdea: async (i) => {
    if (useMongoose) {
      return new Idea(i).save();
    } else {
      const data = await readJsonDB();
      const newIdea = { id: 'idea_' + Date.now(), createdAt: new Date().toISOString(), ...i };
      data.ideas = data.ideas || [];
      data.ideas.push(newIdea);
      await writeJsonDB(data);
      return newIdea;
    }
  },
  
  deleteIdea: async (id) => {
    if (useMongoose) {
      return Idea.findByIdAndDelete(id);
    } else {
      const data = await readJsonDB();
      data.ideas = (data.ideas || []).filter(i => i.id !== id);
      await writeJsonDB(data);
      return true;
    }
  },

  getSubmissions: async () => {
    if (useMongoose) {
      return Submission.find().sort({ createdAt: -1 });
    } else {
      const data = await readJsonDB();
      return (data.submissions || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },
  
  addSubmission: async (s) => {
    if (useMongoose) {
      return new Submission(s).save();
    } else {
      const data = await readJsonDB();
      const newSub = { id: 'sub_' + Date.now(), createdAt: new Date().toISOString(), ...s };
      data.submissions = data.submissions || [];
      data.submissions.push(newSub);
      await writeJsonDB(data);
      return newSub;
    }
  },
  
  deleteSubmission: async (id) => {
    if (useMongoose) {
      return Submission.findByIdAndDelete(id);
    } else {
      const data = await readJsonDB();
      data.submissions = (data.submissions || []).filter(s => s.id !== id);
      await writeJsonDB(data);
      return true;
    }
  }
};

// Seed official database details if empty
async function seedOfficialData() {
  const memberCount = await Member.countDocuments();
  if (memberCount === 0) {
    await Member.create([
      {
        name: "م.م آيات ناظم كاظم",
        role: "المشرف العام على المشروع (Project Supervisor)",
        bio: "الإشراف الأكاديمي والتوجيه الاستراتيجي لهيكلية المشروع وضمان توافقه مع معايير جودة الأنظمة الذكية.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        skills: ["Academic Supervision", "Project Management", "AI Strategy"],
        order: 1
      },
      {
        name: "مصطفى ستار جبار",
        role: "قائد الفريق (Team Leader)",
        bio: "إدارة وتنسيق مهام الفريق، ومتابعة الجداول الزمنية لتنفيذ وتطوير منصات التحول الرقمي.",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
        skills: ["Leadership", "Agile", "Team Coordination"],
        order: 2
      },
      {
        name: "حسين عبدالهادي صالح",
        role: "مطور ذكاء اصطناعي وعلم بيانات (AI & Data Scientist)",
        bio: "متخصص في بناء وتدريب نماذج التعلم العميق وتحليل البيانات المتقدمة برمجياً باستخدام مكتبات الذكاء الاصطناعي وهندسة الأكواد التكرارية.",
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
        skills: ["Python", "C++", "Pandas", "AI Models"],
        order: 3
      },
      {
        name: "عباس كاظم منديل",
        role: "مطور أنظمة خلفية (Backend Developer)",
        bio: "متخصص في هندسة السيرفرات، وبناء واجهات برمجة التطبيقات (APIs)، وإدارة وتأمين قواعد البيانات السحابية.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        skills: ["Node.js", "Express", "APIs", "MongoDB"],
        order: 4
      },
      {
        name: "طيبة احمد جواد",
        role: "مصممة واجهات وتجربة المستخدم (UI/UX Designer)",
        bio: "تصميم الهوية البصرية وتحسين تجربة المستخدم ورسم المخططات التفاعلية لواجهات المنصة.",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
        skills: ["Figma", "UI Design", "User Experience", "Branding"],
        order: 5
      },
      {
        name: "فاطمة سالم كاظم",
        role: "مصممة واجهات وتجربة المستخدم (UI/UX Designer)",
        bio: "تحليل سلوك المستخدمين وبناء التصاميم والهياكل السلكية المتجاوبة مع كافة الشاشات.",
        image: "https://images.unsplash.com/photo-1534751516642-a131fed10495?auto=format&fit=crop&w=400&q=80",
        skills: ["Figma", "Wireframing", "Visual Design", "Prototyping"],
        order: 6
      }
    ]);
    
    await Project.create({
      title: "منصة تمكين (Tamkeen Platform)",
      description: "منصة ذكية وشاملة مصممة لربط الطلاب والمهنيين الشباب بسوق العمل العراقي خلال فترة دراستهم وتوفير مسارات مخصصة لهم.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
      tags: ["الذكاء الاصطناعي", "تمكين", "تطوير الويب"]
    });
    console.log("🌱 Official production database seeded successfully with Team Horizon!");
  }
}

module.exports = db;