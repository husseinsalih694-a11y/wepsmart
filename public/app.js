// Global client application state
const state = {
  activeTab: 'projects', // active admin dashboard tab
  token: localStorage.getItem('smart_horizon_admin_token') || null,
  projects: [],
  members: [],
  ideas: [],
  submissions: []
};

// ==========================================
// 1. DYNAMIC INTERACTIVE PARTICLE BACKGROUND
// ==========================================
class ParticleNetwork {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.colorPalette = ['rgba(0, 242, 254, ', 'rgba(79, 172, 254, ', 'rgba(16, 185, 129, '];
    
    this.init();
    this.animate();
    this.bindEvents();
  }

  init() {
    this.resizeCanvas();
    this.particles = [];
    // Adjust density based on screen width
    const particleCount = Math.min(Math.floor(window.innerWidth / 20), 75);
    
    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 2 + 1;
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: size,
        alpha: Math.random() * 0.5 + 0.2,
        color: this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)]
      });
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw and connect particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off screen boundaries
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // Mouse attraction effect
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x -= dx * force * 0.03;
          p.y -= dy * force * 0.03;
        }
      }

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + p.alpha + ')';
      this.ctx.fill();

      // Connect adjacent nodes
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          const opacity = (1 - distance / 120) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.stroke();
        }
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    window.addEventListener('resize', () => this.init());
    
    // Track mouse hover positions
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
}

// ==========================================
// 2. SPA NAVIGATION ROUTER LAYER
// ==========================================
function initSPARouter() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  const mobileDropdown = document.getElementById('mobile-dropdown');

  function navigateTo(hash) {
    let targetId = hash.replace('#', '') || 'home';
    
    // Handle conditional admin page display
    if (targetId === 'admin') {
      checkAdminDashboardAuth();
    }

    let targetSection = document.getElementById(targetId);
    if (!targetSection) targetSection = document.getElementById('home');

    // Toggle active classes on content sections
    sections.forEach(sec => {
      sec.classList.remove('active-page');
    });
    targetSection.classList.add('active-page');

    // Toggle active states on desktop navigation links
    links.forEach(link => {
      link.classList.remove('active-nav');
      if (link.getAttribute('href') === `#${targetId}`) {
        link.classList.add('active-nav');
      }
    });

    // Close mobile drawer on navigation click
    if (mobileDropdown) mobileDropdown.classList.add('hidden');
    
    // Smooth scroll back to top of document
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Perform load triggers for respective pages
    if (targetId === 'projects') loadProjectsClient();
    if (targetId === 'team') loadMembersClient();
    if (targetId === 'roadmap') loadRoadmapClient();
  }

  // Bind click listeners to standard hash changes
  window.addEventListener('hashchange', () => navigateTo(window.location.hash));
  
  // Navigate on initial page load
  navigateTo(window.location.hash);
}

// Toggle Mobile Navigation Drawer
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-dropdown');
  if (btn && drawer) {
    btn.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
    });
  }

  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (drawer) drawer.classList.add('hidden');
    });
  });
}

// ==========================================
// 3. FRONT-END CLIENT DYNAMIC LOADERS
// ==========================================

// 3a. Render Projects on Client
async function loadProjectsClient() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  
  grid.innerHTML = `<div class="col-span-full py-12 flex justify-center"><i class="fa-solid fa-circle-notch animate-spin text-3xl text-neonCyan"></i></div>`;
  
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    state.projects = projects;

    if (projects.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-slate-400 py-12">لا توجد مشاريع مضافة حالياً. يرجى العودة لاحقاً!</p>`;
      return;
    }

    grid.innerHTML = projects.map(proj => {
      const tagsHTML = proj.tags.map(tag => 
        `<span class="px-2.5 py-0.5 rounded-md bg-neonCyan/10 text-[10px] font-bold text-neonCyan border border-neonCyan/20">${tag}</span>`
      ).join('');

      return `
        <article class="glass glass-hover p-6 rounded-3xl border-white/5 flex flex-col group overflow-hidden transition-all duration-300 relative reveal-element active">
          <!-- Card Image Thumbnail -->
          <div class="w-full h-48 rounded-2xl overflow-hidden mb-6 relative">
            <img src="${proj.image}" alt="${proj.title}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-80"></div>
          </div>
          <!-- Tags list -->
          <div class="flex flex-wrap gap-2 mb-4">
            ${tagsHTML}
          </div>
          <!-- Title & Description -->
          <h3 class="text-xl font-bold font-cairo mb-3 group-hover:text-neonCyan transition-all text-white text-start">${proj.title}</h3>
          <p class="text-slate-400 text-xs sm:text-sm leading-relaxed text-start flex-grow mb-6">${proj.description}</p>
          
          <!-- Subtle border accent line -->
          <div class="w-0 h-0.5 bg-gradient-to-r from-neonCyan to-neonBlue absolute bottom-0 left-0 group-hover:w-full transition-all duration-500"></div>
        </article>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-red-400 py-12"><i class="fa-solid fa-triangle-exclamation me-1"></i> فشل الاتصال بالخادم لجلب المشاريع.</p>`;
  }
}

// 3b. Render Team Members on Client
async function loadMembersClient() {
  const grid = document.getElementById('members-grid');
  if (!grid) return;

  grid.innerHTML = `<div class="col-span-full py-12 flex justify-center"><i class="fa-solid fa-circle-notch animate-spin text-3xl text-neonBlue"></i></div>`;

  try {
    const res = await fetch('/api/members');
    const members = await res.json();
    state.members = members;

    if (members.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-slate-400 py-12">فريق العمل قيد التنظيم حالياً!</p>`;
      return;
    }

    grid.innerHTML = members.map(mem => {
      const skillsHTML = mem.skills.map(skill => 
        `<span class="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-slate-400 border border-white/5">${skill}</span>`
      ).join('');

      return `
        <div class="glass glass-hover p-6 rounded-3xl border-white/5 flex flex-col items-center text-center group transition-all duration-300 relative reveal-element active">
          <!-- Member Avatar Portrait -->
          <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-neonBlue transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] mb-4 relative">
            <img src="${mem.image}" alt="${mem.name}" class="w-full h-full object-cover">
          </div>
          
          <!-- Name & Role -->
          <h3 class="text-lg font-bold font-cairo text-white">${mem.name}</h3>
          <span class="text-xs text-neonBlue font-semibold mb-3">${mem.role}</span>
          
          <!-- Biography description -->
          <p class="text-slate-400 text-xs sm:text-sm leading-relaxed text-center flex-grow mb-5">${mem.bio}</p>
          
          <!-- Skills list -->
          <div class="flex flex-wrap justify-center gap-1.5 pt-4 border-t border-white/5 w-full">
            ${skillsHTML}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-red-400 py-12"><i class="fa-solid fa-triangle-exclamation me-1"></i> فشل الاتصال لجلب أعضاء الفريق.</p>`;
  }
}

// 3c. Render Roadmap Timeline on Client
async function loadRoadmapClient() {
  const container = document.getElementById('roadmap-timeline');
  if (!container) return;

  container.innerHTML = `<div class="py-12 flex justify-center"><i class="fa-solid fa-circle-notch animate-spin text-3xl text-neonEmerald"></i></div>`;

  try {
    const res = await fetch('/api/ideas');
    const ideas = await res.json();
    state.ideas = ideas;

    if (ideas.length === 0) {
      container.innerHTML = `<p class="text-center text-slate-400 py-12">لا توجد خطط مرصودة حالياً.</p>`;
      return;
    }

    container.innerHTML = ideas.map((idea, index) => {
      // Determine alternating position classes
      const isEven = index % 2 === 0;
      const alignClass = isEven ? 'timeline-item-left mr-auto md:ml-0 md:mr-auto' : 'timeline-item-right ml-auto md:mr-0 md:ml-auto';
      const arrowClass = isEven ? 'left-[-8px] rotate-45 border-t border-l border-white/5 bg-slateDark' : 'right-[-8px] rotate-45 border-b border-r border-white/5 bg-slateDark';
      
      // Select status badge classes
      let badgeClass = 'badge-status-planning';
      if (idea.status.includes('تطوير') || idea.status.includes('أول')) badgeClass = 'badge-status-dev';
      if (idea.status.includes('نهائي') || idea.status.includes('منفذ')) badgeClass = 'badge-status-prod';

      return `
        <div class="timeline-item ${alignClass} reveal-element active">
          <!-- Glow Marker on timeline -->
          <div class="timeline-marker"></div>
          
          <!-- Card Content Glass bubble -->
          <div class="glass p-6 rounded-2xl border-white/5 relative shadow-xl hover:border-neonCyan/20 transition-all">
            
            <!-- Floating Timeline Pointer details -->
            <div class="flex justify-between items-center mb-3">
              <span class="text-[10px] font-bold text-neonCyan uppercase font-mono tracking-wider"><i class="fa-regular fa-calendar-check me-1"></i> ${idea.quarter}</span>
              <span class="badge-status ${badgeClass}">
                <span class="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span> ${idea.status}
              </span>
            </div>
            
            <!-- Title & Description text -->
            <h3 class="text-lg font-bold font-cairo text-white mb-2 text-start">${idea.title}</h3>
            <p class="text-slate-400 text-xs sm:text-sm leading-relaxed text-start">${idea.description}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-center text-red-400 py-12"><i class="fa-solid fa-triangle-exclamation me-1"></i> فشل الاتصال لجلب بنود خطة التطوير.</p>`;
  }
}

// ==========================================
// 4. JOIN US RECRUITMENT CLIENT VALIDATOR
// ==========================================
function initRecruitmentForm() {
  const form = document.getElementById('recruitment-form');
  const dropzone = document.getElementById('cv-dropzone');
  const fileInput = document.getElementById('applicant-cv');
  const fileLabel = document.getElementById('cv-label');
  const errorBox = document.getElementById('recruitment-error');
  const errorMsg = document.getElementById('recruitment-error-msg');
  const submitBtn = document.getElementById('recruitment-submit-btn');

  if (!form || !dropzone || !fileInput) return;

  // Clicking dropzone triggers hidden input click
  dropzone.addEventListener('click', () => fileInput.click());

  // Handle Drag & Drop styling
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('border-neonCyan', 'bg-neonCyan/5');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-neonCyan', 'bg-neonCyan/5');
    }, false);
  });

  // Handle dropped file
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelected(files[0]);
    }
  });

  // Handle manual input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  function handleFileSelected(file) {
    fileLabel.innerHTML = `تم اختيار: <strong class="text-neonCyan">${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    dropzone.classList.add('border-neonCyan/30');
  }

  // Handle form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    
    // Set loading state on submit button
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> جاري إرسال سيرتك الذاتية وتشفير البيانات...`;

    const formData = new FormData(form);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال طلبك. يرجى المحاولة لاحقاً.');
      }

      // Show success layout screen
      document.getElementById('join-form-container').classList.add('hidden');
      document.getElementById('join-success-container').classList.remove('hidden');

    } catch (err) {
      errorMsg.textContent = err.message;
      errorBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Reset Form fields on recruitment success reset
function resetRecruitmentForm() {
  const form = document.getElementById('recruitment-form');
  const fileLabel = document.getElementById('cv-label');
  const dropzone = document.getElementById('cv-dropzone');
  
  if (form) form.reset();
  if (fileLabel) fileLabel.textContent = "اسحب وأفلت السيرة الذاتية هنا أو انقر للتصفح";
  if (dropzone) dropzone.classList.remove('border-neonCyan/30');
  
  document.getElementById('join-success-container').classList.add('hidden');
  document.getElementById('join-form-container').classList.remove('hidden');
}

// ==========================================
// 5. SECURE ADMIN SYSTEM OPERATIONS (Auth & CRUD)
// ==========================================

// Check page permissions and serve either Auth gate or Admin Control Panel
function checkAdminDashboardAuth() {
  const gate = document.getElementById('admin-login-gate');
  const panel = document.getElementById('admin-dashboard-panel');
  if (!gate || !panel) return;

  if (state.token) {
    gate.classList.add('hidden');
    panel.classList.remove('hidden');
    // Load default tab content
    switchAdminTab(state.activeTab);
  } else {
    panel.classList.add('hidden');
    gate.classList.remove('hidden');
  }
}

// Handle login submissions
function initAdminLoginForm() {
  const form = document.getElementById('admin-login-form');
  const errorBox = document.getElementById('admin-login-error');
  const errorMsg = document.getElementById('admin-login-error-msg');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'عذراً! فشل الاتصال ببوابة التحقق.');
      }

      // Save credentials token
      state.token = data.token;
      localStorage.setItem('smart_horizon_admin_token', data.token);
      
      // Clear inputs
      form.reset();
      
      // Toggle Dashboard panels
      checkAdminDashboardAuth();

    } catch (err) {
      errorMsg.textContent = err.message;
      errorBox.classList.remove('hidden');
    }
  });
}

// Handle administrative logging out
function handleAdminLogout() {
  state.token = null;
  localStorage.removeItem('smart_horizon_admin_token');
  checkAdminDashboardAuth();
}

// Switch tabs inside Admin Control Dashboard
function switchAdminTab(tabName) {
  state.activeTab = tabName;
  
  // Toggle tab buttons classes
  const btns = document.querySelectorAll('.admin-tab-btn');
  btns.forEach(btn => {
    btn.classList.remove('border-neonCyan', 'text-neonCyan', 'text-white');
    btn.classList.add('border-transparent', 'text-slate-400');
  });

  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('border-transparent', 'text-slate-400');
    activeBtn.classList.add('border-neonCyan', 'text-neonCyan', 'text-white');
  }

  // Hide/Show dynamic tab divs
  const tabContents = document.querySelectorAll('.admin-tab-content');
  tabContents.forEach(content => content.classList.add('hidden'));

  const activeTabDiv = document.getElementById(`admin-tab-${tabName}`);
  if (activeTabDiv) activeTabDiv.classList.remove('hidden');

  // Trigger loads based on active selection
  if (tabName === 'projects') loadAdminProjects();
  if (tabName === 'members') loadAdminMembers();
  if (tabName === 'roadmap') loadAdminIdeas();
  if (tabName === 'submissions') loadAdminSubmissions();
}

// Fetch headers helper
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`
  };
}

// --- ADMIN 1: PROJECTS ACTIONS ---
async function loadAdminProjects() {
  const tbody = document.getElementById('admin-projects-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch animate-spin me-1 text-neonCyan"></i> جاري الاتصال بقاعدة بيانات المشاريع...</td></tr>`;

  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    state.projects = projects;

    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">سجل المشاريع فارغ تماماً! انقر على "إضافة مشروع" للبدء.</td></tr>`;
      return;
    }

    tbody.innerHTML = projects.map(proj => `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-all text-start">
        <td class="px-6 py-4">
          <img src="${proj.image}" alt="${proj.title}" class="w-12 h-12 object-cover rounded-lg border border-white/10">
        </td>
        <td class="px-6 py-4 font-semibold text-white">${proj.title}</td>
        <td class="px-6 py-4 flex flex-wrap gap-1 mt-3">
          ${proj.tags.map(t => `<span class="bg-neonCyan/10 text-neonCyan text-[9px] px-1.5 py-0.5 rounded font-bold">${t}</span>`).join('')}
        </td>
        <td class="px-6 py-4 max-w-xs truncate">${proj.description}</td>
        <td class="px-6 py-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="openProjectModal('${proj.id}')" class="p-2 rounded bg-neonBlue/10 hover:bg-neonBlue/30 text-neonBlue text-xs transition-all"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
            <button onclick="deleteProject('${proj.id}')" class="p-2 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs transition-all"><i class="fa-solid fa-trash-can"></i> حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-400">فشل الاتصال بجداول المشاريع.</td></tr>`;
  }
}

// --- ADMIN 2: TEAM MEMBERS ACTIONS ---
async function loadAdminMembers() {
  const tbody = document.getElementById('admin-members-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch animate-spin me-1 text-neonBlue"></i> جاري تحميل بيانات الهيكل التنظيمي...</td></tr>`;

  try {
    const res = await fetch('/api/members');
    const members = await res.json();
    state.members = members;

    if (members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">لا يوجد أعضاء مسجلين. انقر على "إضافة عضو" للبدء.</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(mem => `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-all text-start">
        <td class="px-6 py-4">
          <img src="${mem.image}" alt="${mem.name}" class="w-10 h-10 object-cover rounded-full border border-white/10">
        </td>
        <td class="px-6 py-4 font-semibold text-white">${mem.name}</td>
        <td class="px-6 py-4 text-xs text-neonBlue font-semibold">${mem.role}</td>
        <td class="px-6 py-4 text-xs max-w-xs truncate">${mem.skills.join(', ')}</td>
        <td class="px-6 py-4 text-center font-mono font-bold text-slate-400">${mem.order || '-'}</td>
        <td class="px-6 py-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="openMemberModal('${mem.id}')" class="p-2 rounded bg-neonBlue/10 hover:bg-neonBlue/30 text-neonBlue text-xs transition-all"><i class="fa-solid fa-user-pen"></i> تعديل</button>
            <button onclick="deleteMember('${mem.id}')" class="p-2 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs transition-all"><i class="fa-solid fa-trash-can"></i> حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-400">فشل الاتصال بجداول أعضاء الفريق.</td></tr>`;
  }
}

// --- ADMIN 3: ROADMAP ACTIONS ---
async function loadAdminIdeas() {
  const tbody = document.getElementById('admin-ideas-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch animate-spin me-1 text-neonEmerald"></i> جاري استعراض البنود المستقبلية...</td></tr>`;

  try {
    const res = await fetch('/api/ideas');
    const ideas = await res.json();
    state.ideas = ideas;

    if (ideas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">خريطة الطريق فارغة تماماً. انقر على "إضافة فكرة مستقبلية".</td></tr>`;
      return;
    }

    tbody.innerHTML = ideas.map(idea => `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-all text-start">
        <td class="px-6 py-4 font-semibold text-white">${idea.title}</td>
        <td class="px-6 py-4 text-center text-xs font-bold text-neonCyan font-mono">${idea.quarter}</td>
        <td class="px-6 py-4 text-center">
          <span class="badge-status badge-status-planning text-[9px] font-bold">${idea.status}</span>
        </td>
        <td class="px-6 py-4 max-w-xs truncate">${idea.description}</td>
        <td class="px-6 py-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="openIdeaModal('${idea.id}')" class="p-2 rounded bg-neonBlue/10 hover:bg-neonBlue/30 text-neonBlue text-xs transition-all"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
            <button onclick="deleteIdea('${idea.id}')" class="p-2 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs transition-all"><i class="fa-solid fa-trash-can"></i> حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-red-400">فشل الاتصال ببنود خريطة الطريق.</td></tr>`;
  }
}

// --- ADMIN 4: RECRUITMENT APPLICANTS VIEW ---
async function loadAdminSubmissions() {
  const tbody = document.getElementById('admin-submissions-tbody');
  const countBadge = document.getElementById('submissions-count-badge');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch animate-spin me-1 text-neonCyan"></i> جاري استرداد طلبات التوظيف...</td></tr>`;

  try {
    const res = await fetch('/api/submissions', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const submissions = await res.json();
    state.submissions = submissions;

    // Update count indicator
    if (countBadge) countBadge.textContent = submissions.length;

    if (submissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">لا توجد طلبات توظيف مقدمة حالياً. بوابتكم بانتظار الكفاءات!</td></tr>`;
      return;
    }

    renderSubmissionsRows(submissions);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-red-400">فشل استرداد طلبات التوظيف. تأكد من صلاحية المشرف.</td></tr>`;
  }
}

function renderSubmissionsRows(subs) {
  const tbody = document.getElementById('admin-submissions-tbody');
  if (!tbody) return;

  tbody.innerHTML = subs.map(sub => {
    const dateFormatted = new Date(sub.createdAt).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-all text-start applicant-row" data-specialization="${sub.specialization}">
        <td class="px-6 py-4 font-semibold text-white">${sub.name}</td>
        <td class="px-6 py-4 text-xs font-semibold text-neonCyan">${sub.specialization}</td>
        <td class="px-6 py-4 text-xs text-slate-400 font-mono">${sub.email}</td>
        <td class="px-6 py-4 text-xs font-mono text-slate-400 text-center" dir="ltr">${sub.phone}</td>
        <td class="px-6 py-4 text-xs text-slate-500 text-center">${dateFormatted}</td>
        <td class="px-6 py-4 text-center">
          <button onclick="downloadCV('${sub.cvPath}', '${sub.cvName}')" class="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/30 text-neonEmerald text-xs font-bold transition-all inline-flex items-center gap-1.5">
            <i class="fa-solid fa-file-arrow-down text-sm"></i> تحميل الملف
          </button>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="deleteSubmission('${sub.id}')" class="p-2 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs transition-all"><i class="fa-solid fa-trash-can"></i> استبعاد</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Download applicant CV securely sending auth token
function downloadCV(apiRoute, originalName) {
  fetch(apiRoute, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("الملف غير متوفر أو غير مصرح لك بتحميله.");
    return res.blob();
  })
  .catch(err => alert(err.message))
  .then(blob => {
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName || 'CV_Smart_Horizon.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  });
}

// Filter applicants based on selection
function filterApplicants() {
  const select = document.getElementById('applicant-filter-select');
  if (!select) return;
  const value = select.value.toLowerCase();
  const rows = document.querySelectorAll('.applicant-row');

  rows.forEach(row => {
    const spec = row.getAttribute('data-specialization').toLowerCase();
    if (value === 'all' || spec.includes(value)) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
}

// ==========================================
// 6. MODALS CRUD TRIGGER OPERATIONS
// ==========================================

// Global overlays controllers
const overlay = document.getElementById('modal-overlay');
const projectModal = document.getElementById('project-modal');
const memberModal = document.getElementById('member-modal');
const ideaModal = document.getElementById('idea-modal');

function closeModal() {
  if (overlay) overlay.classList.add('hidden');
  if (projectModal) projectModal.classList.add('hidden');
  if (memberModal) memberModal.classList.add('hidden');
  if (ideaModal) ideaModal.classList.add('hidden');
}

// Ensure clicking backdrop closes modal
if (overlay) {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

// --- PROJECT MODAL CRUD TRIGGERS ---
function openProjectModal(id = null) {
  if (!overlay || !projectModal) return;
  
  const form = document.getElementById('project-modal-form');
  const modalTitle = document.getElementById('project-modal-title');
  const submitLabel = document.getElementById('project-modal-submit-label');
  
  if (form) form.reset();
  document.getElementById('modal-project-id').value = id || '';

  if (id) {
    modalTitle.textContent = "تعديل بيانات المشروع";
    submitLabel.textContent = "حفظ التعديلات";
    
    // Populate form fields from state
    const proj = state.projects.find(p => p.id === id);
    if (proj) {
      document.getElementById('modal-project-title').value = proj.title;
      document.getElementById('modal-project-desc').value = proj.description;
      document.getElementById('modal-project-image').value = proj.image;
      document.getElementById('modal-project-tags').value = proj.tags.join(', ');
    }
  } else {
    modalTitle.textContent = "إضافة مشروع جديد";
    submitLabel.textContent = "تأكيد وإضافة المشروع";
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  projectModal.classList.remove('hidden');
}

// --- MEMBER MODAL CRUD TRIGGERS ---
function openMemberModal(id = null) {
  if (!overlay || !memberModal) return;

  const form = document.getElementById('member-modal-form');
  const modalTitle = document.getElementById('member-modal-title');
  const submitLabel = document.getElementById('member-modal-submit-label');

  if (form) form.reset();
  document.getElementById('modal-member-id').value = id || '';

  if (id) {
    modalTitle.textContent = "تعديل بيانات العضو";
    submitLabel.textContent = "حفظ التعديلات";

    const mem = state.members.find(m => m.id === id);
    if (mem) {
      document.getElementById('modal-member-name').value = mem.name;
      document.getElementById('modal-member-role').value = mem.role;
      document.getElementById('modal-member-bio').value = mem.bio;
      document.getElementById('modal-member-image').value = mem.image;
      document.getElementById('modal-member-skills').value = mem.skills.join(', ');
      document.getElementById('modal-member-order').value = mem.order || '';
    }
  } else {
    modalTitle.textContent = "إضافة عضو فريق جديد";
    submitLabel.textContent = "تأكيد وإضافة العضو";
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  memberModal.classList.remove('hidden');
}

// --- ROADMAP IDEA MODAL CRUD TRIGGERS ---
function openIdeaModal(id = null) {
  if (!overlay || !ideaModal) return;

  const form = document.getElementById('idea-modal-form');
  const modalTitle = document.getElementById('idea-modal-title');
  const submitLabel = document.getElementById('idea-modal-submit-label');

  if (form) form.reset();
  document.getElementById('modal-idea-id').value = id || '';

  if (id) {
    modalTitle.textContent = "تعديل فكرة الجدول الزمني";
    submitLabel.textContent = "حفظ التعديلات";

    const idea = state.ideas.find(i => i.id === id);
    if (idea) {
      document.getElementById('modal-idea-title').value = idea.title;
      document.getElementById('modal-idea-quarter').value = idea.quarter;
      document.getElementById('modal-idea-status').value = idea.status;
      document.getElementById('modal-idea-desc').value = idea.description;
    }
  } else {
    modalTitle.textContent = "إضافة فكرة مستقبلية جديدة";
    submitLabel.textContent = "تأكيد وإضافة الفكرة";
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  ideaModal.classList.remove('hidden');
}

// Bind admin CRUD forms event submissions
function initAdminCrudSubmitForms() {
  
  // 1. PROJECT SAVE SUBMISSION
  const projForm = document.getElementById('project-modal-form');
  if (projForm) {
    projForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('modal-project-id').value;
      const title = document.getElementById('modal-project-title').value;
      const description = document.getElementById('modal-project-desc').value;
      let image = document.getElementById('modal-project-image').value;
    // If a file is selected, upload it and use the returned path
    const projectFileInput = document.getElementById('modal-project-file');
    if (projectFileInput && projectFileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('image', projectFileInput.files[0]);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('فشل رفع صورة المشروع!');
      const uploadData = await uploadRes.json();
      image = uploadData.path; // assuming server returns { path: '...' }
    }
      const tags = document.getElementById('modal-project-tags').value;

      const body = { title, description, image, tags };
      const url = id ? `/api/projects/${id}` : '/api/projects';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("فشل حفظ تفاصيل المشروع!");
        
        closeModal();
        loadAdminProjects(); // refresh projects list
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // 2. MEMBER SAVE SUBMISSION
  const memForm = document.getElementById('member-modal-form');
  if (memForm) {
    memForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('modal-member-id').value;
      const name = document.getElementById('modal-member-name').value;
      const role = document.getElementById('modal-member-role').value;
      const bio = document.getElementById('modal-member-bio').value;
      let image = document.getElementById('modal-member-image').value;
    // If a file is selected, upload it and use the returned path
    const memberFileInput = document.getElementById('modal-member-file');
    if (memberFileInput && memberFileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('image', memberFileInput.files[0]);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('فشل رفع صورة العضو!');
      const uploadData = await uploadRes.json();
      image = uploadData.path;
    }
      const skills = document.getElementById('modal-member-skills').value;
      const order = document.getElementById('modal-member-order').value;

      const body = { name, role, bio, image, skills, order };
      const url = id ? `/api/members/${id}` : '/api/members';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("فشل حفظ تفاصيل العضو!");

        closeModal();
        loadAdminMembers();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // 3. ROADMAP IDEA SAVE SUBMISSION
  const ideaForm = document.getElementById('idea-modal-form');
  if (ideaForm) {
    ideaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('modal-idea-id').value;
      const title = document.getElementById('modal-idea-title').value;
      const quarter = document.getElementById('modal-idea-quarter').value;
      const status = document.getElementById('modal-idea-status').value;
      const description = document.getElementById('modal-idea-desc').value;

      const body = { title, quarter, status, description };
      const url = id ? `/api/ideas/${id}` : '/api/ideas';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("فشل حفظ تفاصيل الفكرة الجديدة!");

        closeModal();
        loadAdminIdeas();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

// --- DELETE OPERATIONS IMPLEMENTATIONS ---

async function deleteProject(id) {
  if (!confirm("هل أنت متأكد تماماً من حذف هذا المشروع نهائياً من سجلات الفريق؟")) return;
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("فشل إتمام عملية حذف المشروع.");
    loadAdminProjects();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteMember(id) {
  if (!confirm("هل أنت متأكد من رغبتك في حذف هذا العضو من الفريق؟")) return;
  try {
    const res = await fetch(`/api/members/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("فشل استبعاد العضو.");
    loadAdminMembers();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteIdea(id) {
  if (!confirm("هل ترغب بالفعل في حذف هذه الفكرة من الجدول الزمني؟")) return;
  try {
    const res = await fetch(`/api/ideas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("فشل إتمام حذف البند.");
    loadAdminIdeas();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteSubmission(id) {
  if (!confirm("هل أنت متأكد من استبعاد هذا المتقدم وحذف سيرته الذاتية بالكامل من السيرفر؟")) return;
  try {
    const res = await fetch(`/api/submissions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("فشل حذف طلب الانضمام.");
    loadAdminSubmissions();
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================
// 7. INITIALIZE THE ENTIRE SPA APPLICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  
  // Hide loader
  const loader = document.getElementById('global-loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 600);
  }

  // Initialize Canvas Particles background
  new ParticleNetwork();

  // Initialize Router and Mobile Actions
  initSPARouter();
  initMobileMenu();

  // Load Recruitment form triggers
  initRecruitmentForm();

  // Initialize Administration gates and triggers
  initAdminLoginForm();
  initAdminCrudSubmitForms();

  // Set up Scroll reveals using custom Intersection Observer
  const revealElements = document.querySelectorAll('.reveal-element');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // trigger animation only once
      }
    });
  }, {
    threshold: 0.1
  });

  revealElements.forEach(el => observer.observe(el));
});
