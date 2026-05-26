const API_URL = 'http://localhost:3000/api';

let JOBS = [];
let currentUser = null;
let loggedIn = false;
let activeFilter = 'all';
let favorites = new Set([3, 7]);

// Cargar ofertas de trabajo desde el servidor Express + PostgreSQL
async function loadJobsFromServer() {
  try {
    const res = await fetch(`${API_URL}/jobs`);
    if (!res.ok) throw new Error('Error al conectar con la API');
    JOBS = await res.json();
    
    // Renderizar en los diferentes contenedores
    renderJobs('jobs-grid', JOBS);
    renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
    renderJobs('dash-jobs-grid', JOBS);
    renderSaved();
  } catch (err) {
    console.error('❌ Error cargando empleos de la base de datos:', err);
    showToast('error', 'No se pudo conectar al servidor local PostgreSQL. Usando datos locales temporales.');
    
    // Fallback local en caso de que el servidor no esté encendido todavía
    JOBS = [
      { id: 1, title: 'Desarrollador Frontend Jr.', company: 'TechNica Labs', icon: '💻', location: 'Managua', type: 'Remoto', salary: '$600–900', tags: ['React', 'JavaScript', 'CSS'], category: 'tech', date: 'Hace 2 días', applicants: 12, new: true, description: 'Buscamos desarrollador frontend junior.', requirements: ['HTML/CSS', 'JS ES6'], benefits: ['Remoto'] }
    ];
    renderJobs('jobs-grid', JOBS);
  }
}

function createJobCard(job, inDash = false) {
  const typeClass = job.type === 'Remoto' ? 'tag-teal' : job.type === 'Híbrido' ? 'tag-blue' : 'tag-gray';
  const favClass = favorites.has(job.id) ? 'active' : '';
  const isNew = job.new ? '<div class="new-badge">NUEVO</div>' : '';
  return `<div class="job-card" data-id="${job.id}" data-cat="${job.category}" data-type="${job.type.toLowerCase()}" onclick="viewJobDetails(${job.id})">
    ${isNew}
    <div class="jc-header">
      <div class="jc-logo">${job.icon}</div>
      <button class="jc-fav ${favClass}" onclick="toggleFav(event,${job.id})"><i class="fa-${favorites.has(job.id) ? 'solid' : 'regular'} fa-heart"></i></button>
    </div>
    <div class="jc-title">${job.title}</div>
    <div class="jc-company"><i class="fa-solid fa-building"></i> ${job.company} · ${job.location}</div>
    <div class="jc-tags">
      <span class="tag ${typeClass}">${job.type}</span>
      ${job.tags.slice(0, 2).map(t => `<span class="tag tag-gray">${t}</span>`).join('')}
    </div>
    <div class="jc-footer">
      <span class="jc-salary"><i class="fa-solid fa-dollar-sign" style="font-size:11px"></i> ${job.salary}</span>
      <div style="text-align:right">
        <div class="jc-date">${job.date}</div>
        <div class="jc-applicants"><i class="fa-solid fa-users"></i> ${job.applicants}</div>
      </div>
    </div>
    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:14px">${loggedIn ? '<i class="fa-solid fa-paper-plane"></i> Aplicar' : 'Ver detalles'}</button>
  </div>`;
}

function renderJobs(containerId, jobs) {
  const g = document.getElementById(containerId);
  if (g) g.innerHTML = jobs.map(j => createJobCard(j)).join('');
}

function viewJobDetails(id) {
  const job = JOBS.find(j => j.id === id);
  if (!job) return;
  
  // Rellenar modal con datos reales
  document.querySelector('#job-modal h2').textContent = job.title;
  document.querySelector('#job-modal .modal-company-logo').textContent = job.icon;
  document.querySelector('#job-modal .modal-company-info p').textContent = `${job.company} · ${job.location}`;
  
  // Actualizar tags
  const modalTags = document.querySelector('#job-modal .modal-tags');
  modalTags.innerHTML = `
    <span class="tag tag-teal"><i class="fa-solid fa-wifi"></i> ${job.type}</span>
    <span class="tag tag-blue">Tiempo completo</span>
    <span class="tag tag-gray">${job.category.toUpperCase()}</span>
    <span class="tag tag-amber"><i class="fa-solid fa-dollar-sign"></i> ${job.salary}/mes</span>
  `;
  
  // Descripción
  document.querySelector('#job-modal .detail-section p').textContent = job.description;
  
  // Requisitos
  const reqList = document.querySelector('#job-modal .detail-section:nth-child(2) ul');
  if (reqList) {
    reqList.innerHTML = (Array.isArray(job.requirements) ? job.requirements : [job.requirements])
      .map(r => r ? `<li>${r}</li>` : '')
      .join('');
  }
  
  // Beneficios
  const benList = document.querySelector('#job-modal .detail-section:nth-child(3) ul');
  if (benList) {
    benList.innerHTML = (Array.isArray(job.benefits) ? job.benefits : [job.benefits])
      .map(b => b ? `<li>${b}</li>` : '')
      .join('');
  }
  
  // Habilidades
  const skillsGrid = document.querySelector('#job-modal .skills-grid');
  if (skillsGrid) {
    skillsGrid.innerHTML = job.tags.map(t => `<span class="skill-tag">${t}</span>`).join('');
  }
  
  openModal('job-modal');
}

function filterJobs() {
  const q = document.getElementById('search-input')?.value?.toLowerCase() || '';
  let filtered = JOBS.filter(j => {
    const matchCat = activeFilter === 'all' || j.category === activeFilter || (activeFilter === 'remote' && j.type === 'Remoto') || (activeFilter === 'internship' && j.salary.includes('350') || j.salary === '$300');
    const matchQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchQ;
  });
  renderJobs('jobs-grid', filtered);
}

function setFilter(el, cat) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeFilter = cat;
  filterJobs();
}

function toggleFav(e, id) {
  e.stopPropagation();
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  filterJobs();
  renderJobs('dash-jobs-grid', JOBS);
  renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
  renderSaved();
  showToast('success', favorites.has(id) ? 'Empleo guardado en favoritos' : 'Eliminado de favoritos');
}

function renderSaved() {
  const saved = JOBS.filter(j => favorites.has(j.id));
  renderJobs('saved-jobs-grid', saved);
}

// MODALS
function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', function (e) { if (e.target === this) closeModal(this.id); }));

// AUTH
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login-btn').classList.toggle('active', isLogin);
  document.getElementById('tab-register-btn').classList.toggle('active', !isLogin);
  document.getElementById('login-form').classList.toggle('hide', !isLogin);
  document.getElementById('register-form').classList.toggle('hide', isLogin);
  document.getElementById('auth-modal-title').textContent = isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis';
}

function selectRole(el) {
  document.querySelectorAll('.role-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

// Iniciar sesión interactuando con PostgreSQL backend
async function loginAs(role) {
  const emailInput = document.querySelector('#login-form input[type="email"]');
  const passwordInput = document.querySelector('#login-form input[type="password"]');
  
  const email = emailInput ? emailInput.value : '';
  const password = passwordInput ? passwordInput.value : '';
  
  if (!email || !password) {
    showToast('error', 'Por favor, introduce tu correo y contraseña.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    currentUser = data.user;
    loggedIn = true;
    
    closeModal('auth-modal');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    // Actualizar nombre y avatar en navbar
    const navAvatar = document.querySelector('.nav-avatar');
    const sidebarAvatar = document.querySelector('.sidebar-avatar-init');
    const sidebarName = document.querySelector('.sidebar-name');
    const sidebarCareer = document.querySelector('.sidebar-career');
    
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (navAvatar) navAvatar.textContent = initials;
    
    // Actualizar datos del estudiante en su Dashboard
    const profileAvatar = document.querySelector('.profile-avatar');
    const profileName = document.querySelector('.profile-name');
    const profileRole = document.querySelector('.profile-role');
    
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileName) profileName.textContent = currentUser.name;
    if (profileRole) profileRole.textContent = `${currentUser.career} · ${currentUser.university}`;
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
    
    showToast('success', `¡Sesión iniciada exitosamente! Bienvenido ${currentUser.name}`);
  } catch (err) {
    console.error(err);
    showToast('error', 'Error al conectar con el servidor.');
  }
}

// Registrar nuevo usuario en PostgreSQL
async function registerUser() {
  const firstNameInput = document.querySelector('#register-form input[placeholder="Juan Carlos"]');
  const lastNameInput = document.querySelector('#register-form input[placeholder="Pérez García"]');
  const emailInput = document.querySelector('#register-form input[type="email"]');
  const careerInput = document.querySelector('#register-form input[placeholder="UNI · Ing. en Sistemas"]');
  const passwordInput = document.querySelector('#register-form input[type="password"]');
  const activeRoleOpt = document.querySelector('#register-form .role-opt.active span');
  
  const name = `${firstNameInput ? firstNameInput.value : ''} ${lastNameInput ? lastNameInput.value : ''}`.trim();
  const email = emailInput ? emailInput.value : '';
  const careerText = careerInput ? careerInput.value : '';
  const password = passwordInput ? passwordInput.value : '';
  const role = activeRoleOpt && activeRoleOpt.textContent === 'Empresa' ? 'company' : 'student';
  
  let university = 'UNI';
  let career = careerText;
  if (careerText.includes('·')) {
    const parts = careerText.split('·');
    university = parts[0].trim();
    career = parts[1].trim();
  } else if (careerText.includes('-')) {
    const parts = careerText.split('-');
    university = parts[0].trim();
    career = parts[1].trim();
  }
  
  if (!name || !email || !password) {
    showToast('error', 'Por favor, completa los campos requeridos.');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, career, university })
    });
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    showToast('success', '¡Registro exitoso!');
    
    // Iniciar sesión inmediatamente
    currentUser = data.user;
    loggedIn = true;
    
    closeModal('auth-modal');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (navAvatar) navAvatar.textContent = initials;
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
  } catch (err) {
    console.error(err);
    showToast('error', 'Error al registrar el usuario.');
  }
}

function logout() {
  loggedIn = false;
  currentUser = null;
  document.getElementById('nav-auth-btns').classList.remove('hide');
  document.getElementById('nav-user-btns').classList.add('hide');
  showPage('landing');
  showToast('', 'Sesión cerrada');
}

// Aplicar de forma real guardando en PostgreSQL
async function applyJob() {
  if (!loggedIn || !currentUser) { closeModal('job-modal'); openModal('auth-modal'); return; }
  
  const modalTitle = document.querySelector('#job-modal h2').textContent;
  const selectedJob = JOBS.find(j => j.title === modalTitle);
  const job_id = selectedJob ? selectedJob.id : 1;
  
  try {
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, job_id })
    });
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    closeModal('job-modal');
    showToast('success', '¡Postulación registrada de forma real en la Base de Datos!');
  } catch (err) {
    console.error(err);
    showToast('error', 'Error al postularse.');
  }
}

// Crear nueva vacante en PostgreSQL
async function createJob() {
  if (!loggedIn || !currentUser) { showToast('error', 'Debes iniciar sesión para publicar.'); return; }
  
  const titleInput = document.querySelector('#tab-new-vacancy input[placeholder="Ej: Desarrollador Frontend Jr."]');
  const categorySelect = document.querySelector('#tab-new-vacancy select');
  const descTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[0];
  const reqTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[1];
  const typeSelect = document.querySelectorAll('#tab-new-vacancy select')[1];
  const empTypeSelect = document.querySelectorAll('#tab-new-vacancy select')[2];
  const salMinInput = document.querySelectorAll('#tab-new-vacancy input')[1];
  const salMaxInput = document.querySelectorAll('#tab-new-vacancy input')[2];
  const locInput = document.querySelectorAll('#tab-new-vacancy input')[3];
  
  const title = titleInput ? titleInput.value : '';
  const category = categorySelect ? categorySelect.value.toLowerCase() === 'tecnología' ? 'tech' : categorySelect.value.toLowerCase() === 'finanzas' ? 'finance' : categorySelect.value.toLowerCase() === 'diseño' ? 'design' : categorySelect.value.toLowerCase() === 'marketing' ? 'marketing' : 'admin' : 'tech';
  const description = descTextarea ? descTextarea.value : '';
  const requirements = reqTextarea ? reqTextarea.value : '';
  const type = typeSelect ? typeSelect.value : 'Remoto';
  const employment_type = empTypeSelect ? empTypeSelect.value : 'Tiempo completo';
  const salary_min = salMinInput ? parseFloat(salMinInput.value) || 400 : 400;
  const salary_max = salMaxInput ? parseFloat(salMaxInput.value) || 800 : 800;
  const location = locInput ? locInput.value : 'Managua, Nicaragua';
  
  if (!title || !description) {
    showToast('error', 'Por favor, completa el título y la descripción.');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        company_id: currentUser.company_id || 1,
        location,
        type,
        employment_type,
        salary_min,
        salary_max,
        category,
        description,
        requirements,
        benefits: 'Prestaciones de ley\nExcelente ambiente',
        skills: ['React', 'JavaScript', 'Git']
      })
    });
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    showToast('success', '¡Vacante publicada y guardada en PostgreSQL!');
    
    if (titleInput) titleInput.value = '';
    if (descTextarea) descTextarea.value = '';
    if (reqTextarea) reqTextarea.value = '';
    if (salMinInput) salMinInput.value = '';
    if (salMaxInput) salMaxInput.value = '';
    if (locInput) locInput.value = '';
    
    await loadJobsFromServer();
    switchCompanyTab('company-overview');
  } catch (err) {
    console.error(err);
    showToast('error', 'Error al guardar la vacante.');
  }
}

// PAGES
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'student-dash') { initStudentCharts(); }
  if (name === 'company-dash') { initCompanyCharts(); renderCompanyData(); }
  if (name === 'admin-dash') { initAdminCharts(); }
}

function scrollTo(sel) {
  setTimeout(() => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100);
}

// DASH TABS
function switchDashTab(tab) {
  document.querySelectorAll('#page-student-dash .sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#page-student-dash .dash-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'jobs') renderJobs('dash-jobs-grid', JOBS);
  if (tab === 'saved') renderSaved();
}
function switchCompanyTab(tab) {
  document.querySelectorAll('#page-company-dash .sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#page-company-dash .dash-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}
function switchAdminTab(tab) {
  document.querySelectorAll('#page-admin-dash .sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#page-admin-dash .dash-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// COMPANY DATA (RENDER CONSOLIDADO)
function renderCompanyData() {
  const vacList = document.getElementById('vacancies-list');
  if (vacList) vacList.innerHTML = [
    { t: 'Frontend Developer Jr.', m: 'Remoto', type: 'Tiempo completo', n: 12, status: 'active' },
    { t: 'Backend Developer Node.js', m: 'Remoto', type: 'Tiempo completo', n: 18, status: 'active' },
    { t: 'Diseñador UI/UX', m: 'Híbrido', type: 'Medio tiempo', n: 5, status: 'active' },
    { t: 'Data Analyst Intern', m: 'Presencial', type: 'Pasantía', n: 30, status: 'inactive' },
  ].map(v => `<div class="vacancy-card">
    <div class="vacancy-info">
      <div class="vacancy-title">${v.t}</div>
      <div class="vacancy-meta">
        <span><i class="fa-solid fa-wifi"></i> ${v.m}</span>
        <span><i class="fa-solid fa-clock"></i> ${v.type}</span>
        <span><i class="fa-solid fa-users"></i> ${v.n} candidatos</span>
      </div>
    </div>
    <span class="status-pill status-${v.status}">${v.status === 'active' ? 'Activa' : 'Cerrada'}</span>
    <div class="vacancy-actions">
      <button class="btn btn-ghost btn-sm"><i class="fa-solid fa-edit"></i> Editar</button>
      <button class="btn btn-primary btn-sm" onclick="switchCompanyTab('candidates')"><i class="fa-solid fa-users"></i> Ver candidatos</button>
    </div>
  </div>`).join('');

  const rc = document.getElementById('recent-candidates');
  if (rc) rc.innerHTML = [
    { n: 'Juan Pérez', c: 'Ing. en Sistemas · UNI', role: 'Frontend Developer Jr.', status: 'review', init: 'JP', bg: 'blue' },
    { n: 'María Rodríguez', c: 'Ing. Industrial · UNAN', role: 'Backend Developer', status: 'pending', init: 'MR', bg: 'teal' },
    { n: 'Carlos López', c: 'Diseño Gráfico · UAM', role: 'Full Stack Developer', status: 'accepted', init: 'CL', bg: 'coral' },
  ].map(c => `<div class="candidate-card">
    <div class="candidate-avatar" style="background:var(--${c.bg}-pale);color:var(--${c.bg})">${c.init}</div>
    <div class="candidate-info">
      <div class="candidate-name">${c.n}</div>
      <div class="candidate-career">${c.c} · ${c.role}</div>
    </div>
    <span class="status-pill status-${c.status}">${c.status === 'review' ? 'En revisión' : c.status === 'pending' ? 'Pendiente' : 'Aceptado'}</span>
    <div class="candidate-actions">
      <button class="btn btn-ghost btn-sm">Ver CV</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('success','Estado actualizado')">Gestionar</button>
    </div>
  </div>`).join('');
}

// TOASTS
function showToast(type, msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', '': `fa-info-circle` };
  t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-info-circle'}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

// CHARTS
let chartsInit = {};
function makeChart(id, type, labels, datasets, opts = {}) {
  if (chartsInit[id]) { chartsInit[id].destroy(); }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  chartsInit[id] = new Chart(ctx, { type, data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { family: 'DM Sans', size: 12 } } } }, scales: type === 'bar' || type === 'line' ? { x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'DM Sans', size: 11 } } } } : {}, ...opts } });
}
function initStudentCharts() {
  makeChart('overviewChart', 'line', ['Ene', 'Feb', 'Mar', 'Abr', 'May'], [{ label: 'Aplicaciones', data: [1, 2, 1, 3, 8], borderColor: '#1D5CFF', backgroundColor: 'rgba(29,92,255,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#1D5CFF', pointRadius: 4 }]);
  makeChart('statusChart', 'doughnut', ['Pendiente', 'En revisión', 'Aceptado', 'Rechazado'], [{ data: [3, 2, 1, 2], backgroundColor: ['#F59E0B', '#1D5CFF', '#00B89C', '#FF5449'], borderWidth: 0, hoverOffset: 4 }]);
}
function initCompanyCharts() {
  makeChart('companyChart1', 'bar', ['Frontend Jr.', 'Backend Dev', 'UI/UX', 'Data Analyst'], [{ label: 'Candidatos', data: [12, 18, 5, 30], backgroundColor: '#1D5CFF', borderRadius: 6 }]);
  makeChart('companyChart2', 'doughnut', ['Pendiente', 'En revisión', 'Aceptado', 'Rechazado'], [{ data: [20, 15, 8, 4], backgroundColor: ['#F59E0B', '#1D5CFF', '#00B89C', '#FF5449'], borderWidth: 0 }]);
}
function initAdminCharts() {
  makeChart('adminChart1', 'line', ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'], [
    { label: 'Estudiantes', data: [9800, 10200, 10800, 11400, 11900, 12450], borderColor: '#1D5CFF', backgroundColor: 'rgba(29,92,255,0.06)', tension: 0.4, fill: true, pointRadius: 3 },
    { label: 'Vacantes', data: [1800, 1950, 2050, 2180, 2300, 2410], borderColor: '#00B89C', backgroundColor: 'rgba(0,184,156,0.06)', tension: 0.4, fill: true, pointRadius: 3 }
  ]);
  makeChart('adminChart2', 'bar', ['Tecnología', 'Finanzas', 'Marketing', 'Diseño', 'Admin', 'Salud'], [{ label: 'Vacantes', data: [780, 420, 380, 310, 280, 240], backgroundColor: ['#1D5CFF', '#00B89C', '#FF5449', '#F59E0B', '#8B5CF6', '#EC4899'], borderRadius: 6 }], { plugins: { legend: { display: false } } });
}

// NAVBAR SCROLL
window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20); });

// Inicializar la carga de datos reales
loadJobsFromServer();