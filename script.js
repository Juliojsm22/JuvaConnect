const API_URL = 'http://localhost:3000/api';

let JOBS = [];
let currentUser = null;
let loggedIn = false;
let activeFilter = 'all';
let favorites = new Set([3, 7]);
let USERS = JSON.parse(localStorage.getItem('juva_users')) || [
  { id: 1, name: 'Juan Pérez', email: 'estudiante@test.com', password: '123', role: 'student', career: 'Ing. en Sistemas', university: 'UNI' },
  { id: 2, name: 'TechNica Labs', email: 'empresa@test.com', password: '123', role: 'company', company_id: 1, career: 'Tecnología', university: '-' },
  { id: 3, name: 'Administrador', email: 'admin@test.com', password: '123', role: 'admin' }
];

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
    // Silenciosamente activar el fallback local si no hay backend
    // console.log('Modo local activado: Usando datos de prueba para los empleos.');
    
    // Fallback local en caso de que el servidor no esté encendido todavía
    JOBS = JSON.parse(localStorage.getItem('juva_jobs')) || [
      { id: 1, title: 'Desarrollador Frontend Jr.', company: 'TechNica Labs', icon: '💻', location: 'Managua', type: 'Remoto', salary: '$600–900', tags: ['React', 'JavaScript', 'CSS'], category: 'tech', date: 'Hace 2 días', applicants: 12, new: true, description: 'Buscamos desarrollador frontend junior.', requirements: ['HTML/CSS', 'JS ES6'], benefits: ['Remoto'] },
      { id: 2, title: 'Analista de Datos', company: 'Banco LAFISE', icon: '📊', location: 'Granada', type: 'Híbrido', salary: '$800–1,200', tags: ['Excel', 'Python', 'SQL'], category: 'finance', date: 'Hace 3 días', applicants: 28, new: false, description: 'Buscamos analista de datos junior.', requirements: ['Excel avanzado', 'Python'], benefits: ['Seguro médico'] },
      { id: 3, title: 'Diseñador UI/UX', company: 'Agencia Creativa', icon: '🎨', location: 'León', type: 'Presencial', salary: '$500–700', tags: ['Figma', 'Illustrator'], category: 'design', date: 'Hace 5 días', applicants: 15, new: false, description: 'Diseñador UI/UX creativo.', requirements: ['Figma', 'Portafolio'], benefits: ['Bono anual'] },
      { id: 4, title: 'Especialista en Marketing', company: 'Claro Nicaragua', icon: '📱', location: 'Managua', type: 'Híbrido', salary: '$700–1,000', tags: ['SEO', 'Google Ads'], category: 'marketing', date: 'Hace 1 semana', applicants: 45, new: false, description: 'Especialista en marketing digital.', requirements: ['Experiencia en Ads'], benefits: ['Híbrido'] },
      { id: 5, title: 'Desarrollador Backend Node.js', company: 'TechNica Labs', icon: '💻', location: 'Managua', type: 'Remoto', salary: '$800–1,200', tags: ['Node.js', 'PostgreSQL'], category: 'tech', date: 'Justo ahora', applicants: 5, new: true, description: 'Desarrollador backend para proyecto nuevo.', requirements: ['Node.js', 'SQL'], benefits: ['Flexibilidad'] },
      { id: 6, title: 'Asistente Administrativo', company: 'Grupo Pellas', icon: '🏗️', location: 'Managua', type: 'Presencial', salary: '$400–600', tags: ['Administración', 'Excel'], category: 'admin', date: 'Hace 2 semanas', applicants: 120, new: false, description: 'Asistente para gerencia general.', requirements: ['Manejo de Office'], benefits: ['Prestaciones de ley'] }
    ];
    renderJobs('jobs-grid', JOBS);
    renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
    renderJobs('dash-jobs-grid', JOBS);
    renderSaved();
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
  const isCompany = el.textContent.includes('Empresa');
  document.querySelectorAll('.student-fields').forEach(f => f.classList.toggle('hide', isCompany));
  document.querySelectorAll('.company-fields').forEach(f => f.classList.toggle('hide', !isCompany));
}

// Iniciar sesión interactuando con PostgreSQL backend
async function login() {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  
  const email = emailInput ? emailInput.value.trim() : '';
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
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (navAvatar) navAvatar.textContent = initials;
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
    
    showToast('success', `¡Sesión iniciada exitosamente! Bienvenido ${currentUser.name}`);
  } catch (err) {
    // Fallback login local activado
    const foundUser = USERS.find(u => u.email === email && u.password === password);
    if (!foundUser) {
      showToast('error', 'Credenciales incorrectas (Modo Local). Prueba estudiante@test.com o empresa@test.com y clave: 123');
      return;
    }
    
    currentUser = { ...foundUser };
    loggedIn = true;
    
    closeModal('auth-modal');
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    if (navAvatar) navAvatar.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
    
    showToast('success', `¡Sesión iniciada! Bienvenido ${currentUser.name}`);
  }
}

// Registrar nuevo usuario en PostgreSQL
async function registerUser() {
  const activeRoleOpt = document.querySelector('#register-form .role-opt.active span');
  const isCompany = activeRoleOpt && activeRoleOpt.textContent === 'Empresa';
  const role = isCompany ? 'company' : 'student';
  
  let name = '';
  let career = '';
  let university = '-';
  let phone = null;
  let dob = null;
  let age = null;
  let address = null;
  let cedula = null;
  
  if (isCompany) {
    const companyNameInput = document.getElementById('reg-company-name');
    name = companyNameInput ? companyNameInput.value.trim() : '';
    const sectorInput = document.getElementById('reg-company-sector');
    career = sectorInput ? sectorInput.value.trim() : 'Industria';
  } else {
    const firstNameInput = document.getElementById('reg-student-first');
    const lastNameInput = document.getElementById('reg-student-last');
    name = `${firstNameInput ? firstNameInput.value : ''} ${lastNameInput ? lastNameInput.value : ''}`.trim();
    const careerInput = document.getElementById('reg-student-career');
    career = careerInput ? careerInput.value.trim() : '';
    const uniInput = document.getElementById('reg-student-university');
    if (uniInput && uniInput.value === 'Otra') {
      const otherInput = document.getElementById('reg-student-university-other');
      university = otherInput ? otherInput.value.trim() : 'Otra';
    } else {
      university = uniInput ? uniInput.value : '';
    }
    
    const phoneInput = document.getElementById('reg-student-phone');
    phone = phoneInput ? phoneInput.value.trim() : '';
    
    const dobInput = document.getElementById('reg-student-dob');
    dob = dobInput ? dobInput.value : null;
    if (!dob) dob = null; // para postgres date
    
    const ageInput = document.getElementById('reg-student-age');
    age = ageInput ? parseInt(ageInput.value) : null;
    if (isNaN(age)) age = null;
    
    const addressInput = document.getElementById('reg-student-address');
    address = addressInput ? addressInput.value.trim() : '';
    
    const cedulaInput = document.getElementById('reg-student-cedula');
    cedula = cedulaInput ? cedulaInput.value.trim() : null;
  }
  
  const emailInput = document.getElementById('reg-email');
  const email = emailInput ? emailInput.value : '';
  
  const passwordInput = document.getElementById('reg-password');
  const password = passwordInput ? passwordInput.value : '';
  
  const passwordConfirmInput = document.getElementById('reg-password-confirm');
  const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value : '';
  
  if (!name || !email || !password) {
    showToast('error', 'Por favor, completa los campos requeridos.');
    return;
  }
  
  if (password !== passwordConfirm) {
    showToast('error', 'Las contraseñas no coinciden.');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, career, university, phone, dob, age, address, cedula })
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
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (navAvatar) navAvatar.textContent = initials;
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
  } catch (err) {
    // Fallback register local activado
    showToast('success', '¡Registro exitoso!');
    
    const newUser = {
      id: Date.now(),
      name: name || 'Nuevo Usuario',
      email: email,
      password: password,
      role: role,
      career: career,
      university: university,
      phone: phone,
      dob: dob,
      age: age,
      address: address,
      cedula: cedula,
      company_id: role === 'company' ? Date.now() : null
    };
    USERS.push(newUser);
    localStorage.setItem('juva_users', JSON.stringify(USERS));
    
    currentUser = { ...newUser };
    loggedIn = true;
    
    closeModal('auth-modal');
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (navAvatar) navAvatar.textContent = initials;
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
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
    // Fallback applyJob local activado
    closeModal('job-modal');
    showToast('success', '¡Postulación registrada exitosamente!');
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
    // Fallback createJob local activado
    showToast('success', '¡Vacante publicada exitosamente!');
    
    if (titleInput) titleInput.value = '';
    if (descTextarea) descTextarea.value = '';
    if (reqTextarea) reqTextarea.value = '';
    if (salMinInput) salMinInput.value = '';
    if (salMaxInput) salMaxInput.value = '';
    if (locInput) locInput.value = '';
    
    const newJob = {
      id: Date.now(),
      title,
      company: currentUser.name,
      icon: '🏢',
      location,
      type,
      salary: `$${salary_min}–${salary_max}`,
      tags: ['Nuevo'],
      category,
      date: 'Justo ahora',
      applicants: 0,
      new: true,
      description,
      requirements: requirements.split('\n'),
      benefits: ['Prestaciones de ley']
    };
    JOBS.unshift(newJob);
    localStorage.setItem('juva_jobs', JSON.stringify(JOBS));
    
    renderJobs('jobs-grid', JOBS);
    switchCompanyTab('company-overview');
  }
}

// PAGES
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'student-dash') { initStudentCharts(); renderStudentData(); }
  if (name === 'company-dash') { initCompanyCharts(); renderCompanyData(); }
  if (name === 'admin-dash') { initAdminCharts(); }
}

function scrollToSection(sel) {
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

// STUDENT DATA RENDER
function renderStudentData() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const profileAvatar = document.querySelector('.profile-avatar');
  const profileName = document.querySelector('.profile-name');
  const profileRole = document.querySelector('.profile-role');
  
  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileName) profileName.textContent = currentUser.name;
  if (profileRole) profileRole.textContent = `${currentUser.career} · ${currentUser.university}`;
  
  const profileEmail = document.querySelector('.profile-email');
  if (profileEmail) profileEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${currentUser.email}`;
  
  const welcomeTitle = document.getElementById('student-welcome-title');
  if (welcomeTitle) welcomeTitle.textContent = `Bienvenido, ${currentUser.name.split(' ')[0]} 👋`;
  
  const sidebarAvatar = document.querySelector('.sidebar-avatar-init');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  const sidebarName = document.querySelector('.sidebar-name');
  if (sidebarName) sidebarName.textContent = currentUser.name;
  const sidebarCareer = document.querySelector('.sidebar-career');
  if (sidebarCareer) sidebarCareer.textContent = currentUser.career;
  
  const profilePhone = document.getElementById('profile-phone');
  if (profilePhone) profilePhone.textContent = currentUser.phone || 'No especificado';
  
  const profileCedula = document.getElementById('profile-cedula');
  if (profileCedula) profileCedula.textContent = currentUser.cedula || 'No especificada';
  
  const profileDob = document.getElementById('profile-dob');
  if (profileDob) profileDob.textContent = currentUser.dob ? new Date(currentUser.dob).toLocaleDateString() : 'No especificada';
  
  const profileAge = document.getElementById('profile-age');
  if (profileAge) profileAge.textContent = currentUser.age || 'No especificada';
  
  const profileAddress = document.getElementById('profile-address');
  if (profileAddress) profileAddress.textContent = currentUser.address || 'No especificada';

  if (currentUser.id !== 1) {
    const statVals = document.querySelectorAll('#tab-overview .stat-val');
    if (statVals.length >= 4) { statVals[0].textContent='0'; statVals[1].textContent='0'; statVals[2].textContent='0'; statVals[3].textContent='20%'; }
    const statTrends = document.querySelectorAll('#tab-overview .stat-trend');
    if (statTrends.length >= 2) { statTrends[0].innerHTML='Sin actividad reciente'; statTrends[0].className='stat-trend'; statTrends[1].innerHTML='Sin actividad reciente'; statTrends[1].className='stat-trend'; }
    
    const appTable = document.querySelector('#tab-applications tbody');
    if (appTable) appTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-soft)">No tienes aplicaciones todavía.</td></tr>';
    
    const skillsCloud = document.querySelector('#tab-profile .skills-cloud');
    if (skillsCloud) skillsCloud.innerHTML = '<div style="color:var(--text-soft);font-size:13px;padding:10px 0">No has agregado habilidades.</div>';
    
    const timelines = document.querySelectorAll('#tab-profile .timeline');
    if (timelines.length >= 2) {
      timelines[0].innerHTML = '<div style="color:var(--text-soft);font-size:13px">No has agregado experiencia laboral.</div>';
      timelines[1].innerHTML = `<li><div class="timeline-header"><div><div class="timeline-title">${currentUser.career}</div><div class="timeline-sub">${currentUser.university}</div></div><div class="timeline-date">Presente</div></div></li>`;
    }
    
    const projectsList = document.querySelector('#tab-profile .card:nth-child(3) > div:not(.card-header)');
    if (projectsList) projectsList.innerHTML = '<div style="color:var(--text-soft);font-size:13px;padding:10px 0">No has agregado proyectos.</div>';
    
    const notifList = document.querySelector('#tab-notifications .notif-list');
    if (notifList) notifList.innerHTML = '<li class="notif-item"><div class="notif-icon" style="background:var(--teal-pale)"><i class="fa-solid fa-check" style="color:var(--teal)"></i></div><div class="notif-content"><p>Bienvenido a JuvaConnect. Tu perfil ha sido creado exitosamente.</p><span>Justo ahora</span></div></li>';
    
    const charts = document.querySelectorAll('#tab-overview .chart-container');
    charts.forEach(c => c.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-soft);font-size:13px">No hay suficientes datos todavía</div>');
  }
}

// COMPANY DATA (RENDER CONSOLIDADO)
function renderCompanyData() {
  if (!currentUser) return;
  const initEl = document.querySelector('#page-company-dash .sidebar-section .fa-laptop')?.parentElement || document.querySelector('#page-company-dash .sidebar-section div[style*="font-size:20px"]');
  if (initEl) initEl.textContent = currentUser.name[0].toUpperCase();
  const nameEl = document.querySelector('#page-company-dash .sidebar-section div[style*="font-weight:600"]');
  if (nameEl) nameEl.textContent = currentUser.name;
  
  const companySubtitle = document.getElementById('company-welcome-subtitle');
  if (companySubtitle) companySubtitle.textContent = `${currentUser.name} — Managua, Nicaragua`;

  if (currentUser.id !== 2) {
    const vacList = document.getElementById('vacancies-list');
    if (vacList) vacList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft)">No tienes vacantes publicadas.</div>';
    
    const rc = document.getElementById('recent-candidates');
    if (rc) rc.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft)">Aún no tienes candidatos.</div>';
    
    const statVals = document.querySelectorAll('#tab-company-overview .stat-val');
    if (statVals.length >= 4) { statVals[0].textContent='0'; statVals[1].textContent='0'; statVals[2].textContent='0'; statVals[3].textContent='0'; }
    
    const charts = document.querySelectorAll('#tab-company-overview .chart-container');
    charts.forEach(c => c.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-soft);font-size:13px">No hay suficientes datos todavía</div>');
    return;
  }
  
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

function handleUniversityChange(select) {
  const otherInput = document.getElementById('reg-student-university-other');
  if (select.value === 'Otra') {
    otherInput.style.display = 'block';
  } else {
    otherInput.style.display = 'none';
  }
}

// ========================
// EDICIÓN DE PERFIL
// ========================
function openEditProfileModal() {
  if (!currentUser) return;
  document.getElementById('edit-name').value = currentUser.name || '';
  document.getElementById('edit-career').value = currentUser.career || '';
  document.getElementById('edit-phone').value = currentUser.phone || '';
  document.getElementById('edit-cedula').value = currentUser.cedula || '';
  
  if (currentUser.dob) {
    document.getElementById('edit-dob').value = currentUser.dob.split('T')[0];
  } else {
    document.getElementById('edit-dob').value = '';
  }
  
  document.getElementById('edit-age').value = currentUser.age || '';
  document.getElementById('edit-address').value = currentUser.address || '';
  
  openModal('edit-profile-modal');
}

async function saveProfile() {
  if (!currentUser) return;
  
  const name = document.getElementById('edit-name').value.trim();
  const career = document.getElementById('edit-career').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const cedula = document.getElementById('edit-cedula').value.trim();
  const dob = document.getElementById('edit-dob').value;
  const ageVal = document.getElementById('edit-age').value;
  const age = ageVal ? parseInt(ageVal) : null;
  const address = document.getElementById('edit-address').value.trim();
  
  try {
    const res = await fetch(`${API_URL}/users/${currentUser.id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        career,
        university: currentUser.university,
        phone,
        cedula,
        dob: dob || null,
        age,
        address
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      
      // Update fallback if exists
      const userIndex = USERS.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        USERS[userIndex] = { ...USERS[userIndex], ...data.user };
      }
      
      closeModal('edit-profile-modal');
      showToast('success', 'Perfil actualizado exitosamente');
      renderStudentData();
    } else {
      showToast('error', data.error || 'Error al actualizar perfil');
    }
  } catch (err) {
    console.error(err);
    showToast('error', 'Error de conexión con el servidor');
  }
}