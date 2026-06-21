const API_URL = 'http://localhost:3000/api';

async function fetchWithAuth(url, options = {}) {
  const token = sessionStorage.getItem('juva_token');
  if (token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(url, options);
}


let JOBS = [];
let currentUser = JSON.parse(sessionStorage.getItem('juva_currentUser')) || null;
let loggedIn = !!currentUser;
let activeFilter = 'all';

let socket = null;
function initSocket() {
  if (loggedIn && currentUser) {
    // If socket.io is loaded
    if (typeof io !== 'undefined') {
      socket = io(API_URL.replace('/api', ''));
      socket.emit('register_user', currentUser.company_id || currentUser.id);
      
      socket.on('new_notification', (data) => {
        showToast('success', `${data.title}: ${data.message}`);
        // Opcional: Actualizar contador de notificaciones si existe
      });
    }
  }
}

// Inicializar socket si ya hay sesión
if (loggedIn) {
  setTimeout(initSocket, 500); // Esperar a que cargue el script de io
}

let favorites = new Set(JSON.parse(localStorage.getItem('juva_favorites')) || [3, 7]);
let USERS = JSON.parse(localStorage.getItem('juva_users')) || [
  { id: 1, name: 'Juan Pérez', email: 'estudiante@test.com', password: '123', role: 'student', career: 'Ing. en Sistemas', university: 'UNI' },
  { id: 2, name: 'TechNica Labs', email: 'empresa@test.com', password: '123', role: 'company', company_id: 1, career: 'Tecnología', university: '-' },
  { id: 3, name: 'Administrador', email: 'admin@test.com', password: '123', role: 'admin' }
];

// Cargar ofertas de trabajo desde el servidor Express + PostgreSQL
async function loadJobsFromServer() {
  renderJobSkeletons('jobs-grid', 6);
  renderJobSkeletons('rec-jobs-grid', 4);
  try {
    const res = await fetchWithAuth(`${API_URL}/jobs`);
    if (!res.ok) throw new Error('Error al conectar con la API');
    const jsonRes = await res.json();
    JOBS = jsonRes.data || jsonRes;
    renderJobs('jobs-grid', JOBS);
    renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
    filterDashJobs();
    renderSaved();
    
    if (loggedIn && currentUser && currentUser.role === 'company') {
      renderCompanyData();
    }
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
    filterDashJobs();
    renderSaved();
  }
}

function createJobCard(job, inDash = false) {
  const typeClass = job.type === 'Remoto' ? 'tag-teal' : job.type === 'Híbrido' ? 'tag-blue' : 'tag-gray';
  const favClass = favorites.has(job.id) ? 'active' : '';
  
  let badgeHtml = '';
  if (job.matchScore && job.matchScore > 0) {
    badgeHtml = '<div class="new-badge" style="background:var(--teal); color:white; border: 1px solid var(--teal-pale);">RECOMENDADO</div>';
  } else if (job.new) {
    badgeHtml = '<div class="new-badge">NUEVO</div>';
  }
  const isNew = badgeHtml;
  
  const userId = currentUser ? currentUser.id : 'guest';
  const apps = JSON.parse(localStorage.getItem('juva_apps_' + userId)) || [];
  const alreadyApplied = apps.some(app => app.id === job.id);
  
  const btnStyle = alreadyApplied ? 'width:100%; margin-top:14px; opacity:0.7; cursor:not-allowed;' : 'width:100%; margin-top:14px;';
  const btnHtml = loggedIn 
    ? (alreadyApplied ? '<i class="fa-solid fa-check"></i> Ya aplicaste' : '<i class="fa-solid fa-paper-plane"></i> Aplicar') 
    : 'Ver detalles';

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
    <button class="btn btn-primary btn-sm" style="${btnStyle}" ${alreadyApplied ? 'disabled' : ''} onclick="${alreadyApplied ? 'event.stopPropagation();' : ''}">${btnHtml}</button>
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
  document.querySelector('#job-modal .modal-company-info p').textContent = `${job.company} — ${job.location}`;
  const btn = document.getElementById('job-modal-company-btn');
  if (btn) btn.setAttribute('onclick', `viewCompanyProfile(${job.company_id})`);
  
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
  
  // Actualizar el estado del botón Guardar en el modal
  const saveBtn = document.querySelector('#job-modal .modal-footer .btn-ghost');
  if (saveBtn) {
    if (favorites.has(job.id)) {
      saveBtn.innerHTML = '<i class="fa-solid fa-heart" style="color:var(--coral)"></i> Guardado';
    } else {
      saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Guardar';
    }
  }
  
  // Verificar si ya aplicó
  const userId = currentUser ? currentUser.id : 'guest';
  const apps = JSON.parse(localStorage.getItem('juva_apps_' + userId)) || [];
  const alreadyApplied = apps.some(app => app.id === id);

  const applyBtn = document.querySelector('#job-modal .btn-primary');
  if (applyBtn) {
    if (alreadyApplied) {
      applyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Ya aplicaste';
      applyBtn.disabled = true;
      applyBtn.style.opacity = '0.7';
      applyBtn.style.cursor = 'not-allowed';
      applyBtn.onclick = null;
    } else {
      applyBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Aplicar';
      applyBtn.disabled = false;
      applyBtn.style.opacity = '1';
      applyBtn.style.cursor = 'pointer';
      applyBtn.onclick = openApplyModal;
    }
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

function filterDashJobs() {
  const q = document.getElementById('dash-search-input')?.value?.toLowerCase() || '';
  const typeFilter = document.getElementById('dash-filter-type')?.value || 'all';
  const catFilter = document.getElementById('dash-filter-cat')?.value || 'all';
  
  let filtered = JOBS.filter(j => {
    const matchType = typeFilter === 'all' || j.type === typeFilter;
    const matchCat = catFilter === 'all' || j.category === catFilter;
    const matchQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    return matchType && matchCat && matchQ;
  });
  
  // Calcular puntaje de recomendación para ordenar
  if (currentUser) {
    const userCareer = (currentUser.career || '').toLowerCase();
    filtered.forEach(j => {
      j.matchScore = 0;
      if (userCareer) {
        if (j.category && userCareer.includes(j.category.substring(0,3))) j.matchScore += 2;
        if (j.title.toLowerCase().includes(userCareer)) j.matchScore += 2;
        if (j.tags.some(t => userCareer.includes(t.toLowerCase()))) j.matchScore += 1;
      }
    });
    filtered.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  renderJobs('dash-jobs-grid', filtered);
}

function selectFilter(filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.filter-btn[onclick="selectFilter('${filter}')"]`).classList.add('active');
  activeFilter = filter;
  filterDashJobs();
}

async function viewCompanyProfile(company_id) {
  if (!company_id) {
    showToast('error', 'Información de empresa no disponible.');
    return;
  }
  showToast('info', 'Cargando perfil de la empresa...');
  try {
    const res = await fetchWithAuth(`${API_URL}/companies/${company_id}`);
    if (!res.ok) throw new Error('Empresa no encontrada');
    const company = await res.json();
    
    document.getElementById('pc-name').textContent = company.name;
    document.getElementById('pc-location-sector').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${company.location || 'Nicaragua'} &bull; ${company.sector || 'Tecnología'}`;
    document.getElementById('pc-desc').textContent = company.description || 'Descripción no disponible.';
    document.getElementById('pc-size').textContent = company.company_size || 'No especificado';
    document.getElementById('pc-founded').textContent = company.founded_year || 'No especificado';
    
    const logoEl = document.getElementById('pc-logo');
    if (company.logo_url) {
      logoEl.textContent = '';
      logoEl.style.backgroundImage = `url(${company.logo_url})`;
    } else {
      logoEl.style.backgroundImage = 'none';
      logoEl.textContent = company.logo_emoji || company.name[0].toUpperCase();
    }
    
    const bannerEl = document.getElementById('pc-banner');
    if (company.banner_url) {
      bannerEl.style.backgroundImage = `url(${company.banner_url})`;
    } else {
      bannerEl.style.backgroundImage = `linear-gradient(135deg, var(--blue) 0%, #1e3a8a 100%)`;
    }
    
    const websiteEl = document.getElementById('pc-website');
    if (company.website) {
      websiteEl.innerHTML = `<a href="${company.website.startsWith('http') ? company.website : 'http://'+company.website}" target="_blank" style="color:inherit;text-decoration:none;">Visitar web <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i></a>`;
    } else {
      websiteEl.textContent = 'No disponible';
    }
    
    const socialLinks = document.getElementById('pc-social-links');
    socialLinks.innerHTML = '';
    if (company.facebook_url) socialLinks.innerHTML += `<a href="${company.facebook_url}" target="_blank" style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#3b5998;text-decoration:none;"><i class="fa-brands fa-facebook-f"></i></a>`;
    if (company.twitter_url) socialLinks.innerHTML += `<a href="${company.twitter_url}" target="_blank" style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#1da1f2;text-decoration:none;"><i class="fa-brands fa-twitter"></i></a>`;
    if (company.instagram_url) socialLinks.innerHTML += `<a href="${company.instagram_url}" target="_blank" style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#e1306c;text-decoration:none;"><i class="fa-brands fa-instagram"></i></a>`;
    
    const benefitsContainer = document.getElementById('pc-benefits-container');
    const benefitsList = document.getElementById('pc-benefits');
    if (company.benefits) {
      const benefitsArr = company.benefits.split(',').map(b => b.trim()).filter(b => b);
      if (benefitsArr.length > 0) {
        benefitsList.innerHTML = benefitsArr.map(b => `<span class="tag tag-teal" style="font-size:14px; padding:6px 14px;"><i class="fa-solid fa-check"></i> ${b}</span>`).join('');
        benefitsContainer.style.display = 'block';
      } else {
        benefitsContainer.style.display = 'none';
      }
    } else {
      benefitsContainer.style.display = 'none';
    }
    
    const galleryContainer = document.getElementById('pc-gallery-container');
    const galleryGrid = document.getElementById('pc-gallery');
    galleryGrid.innerHTML = '';
    if (company.gallery_urls) {
      try {
        const urls = JSON.parse(company.gallery_urls);
        if (urls && urls.length > 0) {
          galleryGrid.innerHTML = urls.map(url => `<div style="width:100%; height:120px; border-radius:8px; background-image:url(${url}); background-size:cover; background-position:center; border:1px solid var(--border);"></div>`).join('');
          galleryContainer.style.display = 'block';
        } else {
          galleryContainer.style.display = 'none';
        }
      } catch(e) { galleryContainer.style.display = 'none'; }
    } else {
      galleryContainer.style.display = 'none';
    }
    
    const videoContainer = document.getElementById('pc-video-container');
    const videoBtn = document.getElementById('pc-video');
    if (company.video_url) {
      videoBtn.href = company.video_url;
      videoContainer.style.display = 'block';
    } else {
      videoContainer.style.display = 'none';
    }
    
    openModal('public-company-modal');
  } catch (err) {
    console.error('Error al cargar perfil de empresa:', err);
    showToast('error', 'Error al cargar los datos de la empresa.');
  }
}

function setFilter(el, cat) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeFilter = cat;
  filterJobs();
}

function toggleFav(e, id) {
  if(e) e.stopPropagation();
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  localStorage.setItem('juva_favorites', JSON.stringify(Array.from(favorites)));
  filterJobs();
  renderJobs('dash-jobs-grid', JOBS);
  renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
  renderSaved();
  updateSidebarBadges();
  
  const statVals = document.querySelectorAll('#tab-overview .stat-val');
  if (statVals.length >= 3) statVals[2].textContent = favorites.size;

  showToast('success', favorites.has(id) ? 'Empleo guardado en favoritos' : 'Eliminado de favoritos');
}

function toggleFavFromModal(e) {
  const modalTitle = document.querySelector('#job-modal h2').textContent;
  const selectedJob = JOBS.find(j => j.title === modalTitle);
  if (selectedJob) {
    toggleFav(null, selectedJob.id);
    const btn = e.currentTarget;
    if (favorites.has(selectedJob.id)) {
      btn.innerHTML = '<i class="fa-solid fa-heart" style="color:var(--coral)"></i> Guardado';
    } else {
      btn.innerHTML = '<i class="fa-regular fa-heart"></i> Guardar';
    }
  }
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
    sessionStorage.setItem('juva_token', data.token);
    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
    initSocket();
    initSocket();
    
    closeModal('auth-modal');
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    if (navAvatar) {
      navAvatar.style.backgroundImage = 'none';
      if (currentUser.role === 'company' && currentUser.company_logo_url) {
        navAvatar.style.backgroundImage = `url(${currentUser.company_logo_url})`;
        navAvatar.style.backgroundSize = 'cover';
        navAvatar.style.backgroundPosition = 'center';
        navAvatar.textContent = '';
      } else {
        navAvatar.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      }
    }
    
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
    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
    
    closeModal('auth-modal');
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    if (navAvatar) {
      navAvatar.style.backgroundImage = 'none';
      if (currentUser.role === 'company' && currentUser.company_logo_url) {
        navAvatar.style.backgroundImage = `url(${currentUser.company_logo_url})`;
        navAvatar.style.backgroundSize = 'cover';
        navAvatar.style.backgroundPosition = 'center';
        navAvatar.textContent = '';
      } else {
        navAvatar.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      }
    }
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
    
    showToast('success', `¡Sesión iniciada! Bienvenido ${currentUser.name}`);
  }
}

function goToDashboard() {
  if (!loggedIn || !currentUser) {
    openModal('auth-modal');
    return;
  }
  if (currentUser.role === 'company') showPage('company-dash');
  else if (currentUser.role === 'admin') showPage('admin-dash');
  else showPage('student-dash');
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
  let ruc = null;
  let website = null;
  let logo = null;
  let founded = null;
  let description = null;
  let sector = null;
  
  if (isCompany) {
    const companyNameInput = document.getElementById('reg-company-name');
    name = companyNameInput ? companyNameInput.value.trim() : '';
    const sectorInput = document.getElementById('reg-company-sector');
    career = sectorInput ? sectorInput.value.trim() : 'Industria';
    
    const rucInput = document.getElementById('reg-company-ruc');
    ruc = rucInput ? rucInput.value.trim() : null;
    
    const phoneInput = document.getElementById('reg-company-phone');
    phone = phoneInput ? phoneInput.value.trim() : null;
    
    const addressInput = document.getElementById('reg-company-address');
    address = addressInput ? addressInput.value.trim() : null;
    
    const websiteInput = document.getElementById('reg-company-website');
    website = websiteInput ? websiteInput.value.trim() : null;
    
    const logoInput = document.getElementById('reg-company-logo');
    logo = logoInput && logoInput.files[0] ? logoInput.files[0].name : null;
    
    const foundedInput = document.getElementById('reg-company-founded');
    founded = foundedInput ? foundedInput.value.trim() : null;
    
    const descInput = document.getElementById('reg-company-desc');
    description = descInput ? descInput.value.trim() : null;

    sector = sectorInput ? sectorInput.value.trim() : null;
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
  
  if (!email.includes('@')) {
    showToast('error', 'Por favor, ingresa un correo electrónico válido (debe contener "@").');
    return;
  }
  
  if (isCompany) {
    if (!ruc || !phone || !address) {
      showToast('error', 'Por favor, completa los campos obligatorios de la empresa (RUC, Teléfono, Dirección).');
      return;
    }
  }
  
  if (password !== passwordConfirm) {
    showToast('error', 'Las contraseñas no coinciden.');
    return;
  }
  
  if (!isCompany) {
    // Validar teléfono nicaragüense: opcional +505, seguido de 8 dígitos empezando con 2, 5, 7 u 8
    const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';
    if (cleanPhone && !/^(?:\+505)?[2578]\d{7}$/.test(cleanPhone)) {
      showToast('error', 'El número telefónico es inválido. Debe ser un número nicaragüense (8 dígitos, ej: 88888888).');
      return;
    }
    
    // Validar cédula nicaragüense
    if (cedula && !/^\d{3}-?\d{6}-?\d{4}[A-Za-z]$/.test(cedula)) {
      showToast('error', 'El formato de cédula nicaragüense es inválido (ej: 000-000000-0000A).');
      return;
    }
    
    // Validar fecha de nacimiento
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      // Resetear hora de hoy para comparar solo fechas
      today.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        showToast('error', 'La fecha de nacimiento no puede ser una fecha futura.');
        return;
      }
    }
    
    if (age !== null && age < 15) {
      showToast('error', 'Debes ser mayor de 15 años para registrarte.');
      return;
    }
  }
  
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, career, university, phone, dob, age, address, cedula, ruc, website, logo, founded, description, sector })
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
    sessionStorage.setItem('juva_token', data.token);
    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
    
    closeModal('auth-modal');
    document.querySelectorAll('#auth-modal input').forEach(i => i.value = '');
    document.getElementById('nav-auth-btns').classList.add('hide');
    document.getElementById('nav-user-btns').classList.remove('hide');
    
    const navAvatar = document.querySelector('.nav-avatar');
    if (navAvatar) {
      navAvatar.style.backgroundImage = 'none';
      if (currentUser.role === 'company' && currentUser.company_logo_url) {
        navAvatar.style.backgroundImage = `url(${currentUser.company_logo_url})`;
        navAvatar.style.backgroundSize = 'cover';
        navAvatar.style.backgroundPosition = 'center';
        navAvatar.textContent = '';
      } else {
        navAvatar.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      }
    }
    
    if (currentUser.role === 'company') showPage('company-dash');
    else if (currentUser.role === 'admin') showPage('admin-dash');
    else showPage('student-dash');
  } catch (err) {
    console.error('Error al registrar:', err);
    showToast('error', 'Error al crear la cuenta. Verifica que el servidor esté activo.');
  }
}

function logout() {
  loggedIn = false;
  currentUser = null;
  sessionStorage.removeItem('juva_currentUser');
  sessionStorage.removeItem('juva_token');
  if (socket) { socket.disconnect(); socket = null; }
  document.getElementById('nav-auth-btns').classList.remove('hide');
  document.getElementById('nav-user-btns').classList.add('hide');
  const navAvatar = document.querySelector('.nav-avatar');
  if (navAvatar) {
    navAvatar.style.backgroundImage = 'none';
    navAvatar.textContent = 'JP';
  }
  showPage('landing');
  showToast('', 'Sesión cerrada');
}

let currentApplyStep = 1;
const totalApplySteps = 5;

function openApplyModal() {
  if (!loggedIn || !currentUser) { closeModal('job-modal'); openModal('auth-modal'); return; }
  
  const modalTitle = document.querySelector('#job-modal h2').textContent;
  const companyInfo = document.querySelector('#job-modal .modal-company-info p').textContent.split(' · ')[0];
  
  document.getElementById('apply-job-title').textContent = modalTitle;
  document.getElementById('apply-job-company').textContent = companyInfo;
  
  // Pre-llenar campos de contacto
  const names = currentUser.name.split(' ');
  document.getElementById('apply-fn').value = names[0] || '';
  document.getElementById('apply-ln').value = names.slice(1).join(' ') || '';
  document.getElementById('apply-phone').value = currentUser.phone || '';
  document.getElementById('apply-email').value = currentUser.email || '';
  document.getElementById('apply-city').value = currentUser.address || 'Managua, Nicaragua';
  
  // Limpiar otros campos
  const clEl = document.getElementById('apply-cover-letter');
  if(clEl) clEl.value = '';
  const etEl = document.getElementById('apply-exp-title');
  if(etEl) etEl.value = '';
  const ecEl = document.getElementById('apply-exp-company');
  if(ecEl) ecEl.value = '';
  const eciEl = document.getElementById('apply-exp-city');
  if(eciEl) eciEl.value = '';
  const edEl = document.getElementById('apply-exp-desc');
  if(edEl) edEl.value = '';
  const cvfEl = document.getElementById('apply-cv-filename');
  if(cvfEl) cvfEl.textContent = '';
  const clfEl = document.getElementById('apply-cl-filename');
  if(clfEl) clfEl.textContent = '';
  
  // Pre-llenar educación
  const schoolEl = document.getElementById('apply-edu-school');
  if(schoolEl) schoolEl.textContent = currentUser.university || '--';
  const careerEl = document.getElementById('apply-edu-career');
  if(careerEl) careerEl.textContent = currentUser.career || '--';
  
  currentApplyStep = 1;
  updateApplyStepUI();
  
  openModal('apply-modal');
}

function updateApplyStepUI() {
  // Ocultar todos los pasos
  for (let i = 1; i <= totalApplySteps; i++) {
    const stepEl = document.getElementById('apply-step-' + i);
    if (stepEl) {
      if (i === currentApplyStep) {
        stepEl.classList.remove('hide');
      } else {
        stepEl.classList.add('hide');
      }
    }
  }
  
  // Actualizar barra de progreso y label
  const progressText = document.getElementById('apply-progress-text');
  const progressBar = document.getElementById('apply-progress-bar');
  const stepLabel = document.getElementById('apply-step-label');
  
  const percentage = (currentApplyStep / totalApplySteps) * 100;
  if (progressBar) progressBar.style.width = percentage + '%';
  if (progressText) progressText.textContent = Math.round(percentage) + '%';
  
  const labels = [
    'Información de contacto',
    'Currículum',
    'Carta de presentación',
    'Experiencia laboral',
    'Educación'
  ];
  if (stepLabel) stepLabel.textContent = labels[currentApplyStep - 1] || '';
  
  // Actualizar botones
  const btnBack = document.getElementById('apply-btn-back');
  const btnNext = document.getElementById('apply-btn-next');
  
  if (currentApplyStep === 1) {
    if (btnBack) btnBack.classList.add('hide');
  } else {
    if (btnBack) btnBack.classList.remove('hide');
  }
  
  if (currentApplyStep === totalApplySteps) {
    if (btnNext) {
      btnNext.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar solicitud';
      btnNext.onclick = confirmApplyJob;
    }
  } else {
    if (btnNext) {
      btnNext.innerHTML = 'Siguiente';
      btnNext.onclick = nextApplyStep;
    }
  }
}

function nextApplyStep() {
  const currentStepContainer = document.getElementById('apply-step-' + currentApplyStep);
  if (currentStepContainer) {
    const requiredInputs = currentStepContainer.querySelectorAll('input[required], textarea[required], select[required]');
    for (let input of requiredInputs) {
      if (!input.value.trim()) {
        showToast('error', 'Por favor, rellena todos los campos obligatorios.');
        input.focus();
        return;
      }
    }
  }

  if (currentApplyStep === 2) {
    const cvFile = document.getElementById('apply-cv-file');
    if (!cvFile || cvFile.files.length === 0) {
      showToast('error', 'Por favor, sube tu currículum (obligatorio).');
      return;
    }
  }
  
  if (currentApplyStep === 3) {
    const clFile = document.getElementById('apply-cl-file');
    const clText = document.getElementById('apply-cover-letter');
    if ((!clFile || clFile.files.length === 0) && (!clText || clText.value.trim() === '')) {
      showToast('error', 'Por favor, sube o escribe tu carta de presentación.');
      return;
    }
  }

  if (currentApplyStep < totalApplySteps) {
    currentApplyStep++;
    updateApplyStepUI();
  }
}

function prevApplyStep() {
  if (currentApplyStep > 1) {
    currentApplyStep--;
    updateApplyStepUI();
  }
}

function toggleEndDate() {
  const isChecked = document.getElementById('apply-exp-current').checked;
  const toContainer = document.getElementById('apply-exp-to-container');
  if (toContainer) {
    if (isChecked) {
      toContainer.style.opacity = '0.5';
      toContainer.style.pointerEvents = 'none';
    } else {
      toContainer.style.opacity = '1';
      toContainer.style.pointerEvents = 'auto';
    }
  }
}

function updateFileName(input, targetId) {
  const target = document.getElementById(targetId);
  if (input.files && input.files.length > 0 && target) {
    target.textContent = input.files[0].name;
  }
}

// Confirmar aplicación desde el formulario nuevo
async function confirmApplyJob() {

  const modalTitle = document.getElementById('apply-job-title').textContent;
  const selectedJob = JOBS.find(j => j.title === modalTitle);
  const job_id = selectedJob ? selectedJob.id : 1;
  
  try {
    const res = await fetchWithAuth(`${API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, job_id })
    });
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    finalizeApplication(selectedJob);
  } catch (err) {
    // Fallback applyJob local activado
    finalizeApplication(selectedJob);
  }
}

function finalizeApplication(selectedJob) {
  closeModal('apply-modal');
  closeModal('job-modal');
  showToast('success', '¡Postulación enviada exitosamente!');
  
  const userId = currentUser ? currentUser.id : 'guest';
  let apps = JSON.parse(localStorage.getItem('juva_apps_' + userId)) || [];
  apps.unshift({
    id: selectedJob ? selectedJob.id : 1,
    icon: selectedJob ? selectedJob.icon : '💼',
    company: selectedJob ? selectedJob.company : 'Empresa',
    title: selectedJob ? selectedJob.title : 'Vacante',
    type: selectedJob ? selectedJob.type : 'Remoto',
    date: new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'}),
    status: 'En revisión'
  });
  localStorage.setItem('juva_apps_' + userId, JSON.stringify(apps));

  const compId = selectedJob ? selectedJob.company_id : 1;
  let companyApps = JSON.parse(localStorage.getItem('juva_company_apps_' + compId)) || [];
  companyApps.unshift({
    name: currentUser ? currentUser.name : 'Usuario Anónimo',
    career: currentUser ? currentUser.career : 'Estudiante',
    university: currentUser ? currentUser.university : 'Universidad',
    role: selectedJob ? selectedJob.title : 'Vacante',
    status: 'pending',
    date: new Date().toISOString()
  });
  localStorage.setItem('juva_company_apps_' + compId, JSON.stringify(companyApps));
  
  loadStudentApplications();
  
  // Re-renderizar grids para actualizar el estado de los botones a "Ya aplicaste"
  if (typeof JOBS !== 'undefined') {
    renderJobs('jobs-grid', JOBS);
    renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
    renderJobs('dash-jobs-grid', JOBS);
  }
}

function loadStudentApplications() {
  const userId = currentUser ? currentUser.id : 'guest';
  let apps = JSON.parse(localStorage.getItem('juva_apps_' + userId));
  
  if (!apps) {
    if (userId === 1) {
      apps = [
        { id: 2, icon: '🎨', company: 'TechNica', title: 'Diseñador UI/UX Junior', type: 'Remoto', date: '12 May 2026', status: 'En revisión' },
        { id: 4, icon: '📊', company: 'DataNica', title: 'Analista de Datos Junior', type: 'Híbrido', date: '10 May 2026', status: 'Pendiente' }
      ];
    } else {
      apps = [];
    }
    localStorage.setItem('juva_apps_' + userId, JSON.stringify(apps));
  }
  
  const appTableBody = document.querySelector('#tab-applications tbody');
  if (appTableBody) {
    if (apps.length === 0) {
      appTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-soft)">No tienes aplicaciones todavía.</td></tr>';
    } else {
      appTableBody.innerHTML = apps.map(app => `
        <tr>
          <td>
            <div class="company-cell">
              <div class="cell-icon">${app.icon}</div><span>${app.company}</span>
            </div>
          </td>
          <td>${app.title}</td>
          <td>${app.date}</td>
          <td><span class="tag tag-teal">${app.type}</span></td>
          <td><span class="status-pill status-review"><i class="fa-solid fa-circle" style="font-size:6px"></i> ${app.status}</span></td>
          <td><button class="btn btn-ghost btn-sm" onclick="viewJobDetails(${app.id})">Ver</button></td>
        </tr>
      `).join('');
    }
  }
  
  // Actualizar dashboard stats de aplicaciones
  const statVals = document.querySelectorAll('#tab-overview .stat-val');
  if (statVals.length >= 4) {
    statVals[0].textContent = apps.length;
  }
  const statTrends = document.querySelectorAll('#tab-overview .stat-trend');
  if (statTrends.length >= 1) {
    if (apps.length > 0) {
      statTrends[0].innerHTML = '<i class="fa-solid fa-arrow-up"></i> Activo esta semana';
      statTrends[0].className = 'stat-trend positive';
    } else {
      statTrends[0].innerHTML = 'Sin actividad reciente';
      statTrends[0].className = 'stat-trend';
    }
  }
  
  updateSidebarBadges();
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
    const payload = {
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
    };

    let res;
    if (window.currentEditJobId) {
      res = await fetchWithAuth(`${API_URL}/jobs/${window.currentEditJobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetchWithAuth(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    const data = await res.json();
    if (data.error) {
      showToast('error', data.error);
      return;
    }
    
    showToast('success', window.currentEditJobId ? '¡Vacante actualizada!' : '¡Vacante publicada y guardada en PostgreSQL!');
    
    if (window.currentDraftId) {
      deleteDraft(window.currentDraftId, true);
    }
    
    window.currentEditJobId = null;
    const dashTitle = document.querySelector('#tab-new-vacancy .dash-title');
    if (dashTitle) dashTitle.textContent = 'Publicar nueva vacante';
    const publishBtn = document.querySelector('#tab-new-vacancy button.btn-primary');
    if (publishBtn) publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar vacante';
    
    if (titleInput) titleInput.value = '';
    if (descTextarea) descTextarea.value = '';
    if (reqTextarea) reqTextarea.value = '';
    if (salMinInput) salMinInput.value = '';
    if (salMaxInput) salMaxInput.value = '';
    if (locInput) locInput.value = '';
    
    await loadJobsFromServer();
    renderCompanyData();
    switchCompanyTab('company-overview');
  } catch (err) {
    console.error('Error al crear vacante:', err);
    
    // Fallback local
    if (window.currentEditJobId) {
      const idx = JOBS.findIndex(j => j.id === window.currentEditJobId);
      if (idx !== -1) {
        JOBS[idx] = { ...JOBS[idx], title, location, type, employment_type, salary: `$${salary_min}–${salary_max}`, category, description, requirements: requirements ? requirements.split('\n') : [] };
        localStorage.setItem('juva_jobs', JSON.stringify(JOBS));
        showToast('success', '¡Vacante actualizada localmente!');
      }
    } else {
      const newJob = {
        id: Date.now(),
        title,
        company: currentUser.name,
        company_id: currentUser.company_id || 1,
        icon: '💼',
        location,
        type,
        employment_type,
        salary: `$${salary_min}–${salary_max}`,
        category,
        date: 'Justo ahora',
        applicants: 0,
        new: true,
        description,
        requirements: requirements ? requirements.split('\n') : [],
        benefits: ['Prestaciones de ley', 'Excelente ambiente'],
        tags: ['General']
      };
      JOBS.unshift(newJob);
      localStorage.setItem('juva_jobs', JSON.stringify(JOBS));
      showToast('success', '¡Vacante publicada localmente!');
    }
    
    if (window.currentDraftId) {
      deleteDraft(window.currentDraftId, true);
    }
    
    window.currentEditJobId = null;
    const dashTitle = document.querySelector('#tab-new-vacancy .dash-title');
    if (dashTitle) dashTitle.textContent = 'Publicar nueva vacante';
    const publishBtn = document.querySelector('#tab-new-vacancy button.btn-primary');
    if (publishBtn) publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar vacante';
    
    if (titleInput) titleInput.value = '';
    if (descTextarea) descTextarea.value = '';
    if (reqTextarea) reqTextarea.value = '';
    if (salMinInput) salMinInput.value = '';
    if (salMaxInput) salMaxInput.value = '';
    if (locInput) locInput.value = '';
    
    renderJobs('jobs-grid', JOBS);
    renderJobs('rec-jobs-grid', JOBS.slice(0, 4));
    filterDashJobs();
    renderCompanyData();
    switchCompanyTab('vacancies');
  }
}

window.currentDraftId = null;

function saveDraftJob() {
  if (!currentUser) return;
  
  const titleInput = document.querySelector('#tab-new-vacancy input[placeholder="Ej: Desarrollador Frontend Jr."]');
  const categorySelect = document.querySelector('#tab-new-vacancy select');
  const descTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[0];
  const reqTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[1];
  const typeSelect = document.querySelectorAll('#tab-new-vacancy select')[1];
  const empTypeSelect = document.querySelectorAll('#tab-new-vacancy select')[2];
  const salMinInput = document.querySelectorAll('#tab-new-vacancy input')[1];
  const salMaxInput = document.querySelectorAll('#tab-new-vacancy input')[2];
  const locInput = document.querySelectorAll('#tab-new-vacancy input')[3];
  
  const draft = {
    id: window.currentDraftId || ('draft_' + Date.now()),
    title: titleInput ? titleInput.value : '',
    category: categorySelect ? categorySelect.value : '',
    description: descTextarea ? descTextarea.value : '',
    requirements: reqTextarea ? reqTextarea.value : '',
    type: typeSelect ? typeSelect.value : 'Remoto',
    employment_type: empTypeSelect ? empTypeSelect.value : 'Tiempo completo',
    salary_min: salMinInput ? salMinInput.value : '',
    salary_max: salMaxInput ? salMaxInput.value : '',
    location: locInput ? locInput.value : ''
  };
  
  let drafts = JSON.parse(localStorage.getItem('juva_drafts_' + (currentUser.company_id || 1))) || [];
  
  const existingIndex = drafts.findIndex(d => d.id === draft.id);
  if (existingIndex !== -1) {
    drafts[existingIndex] = draft;
  } else {
    drafts.unshift(draft);
  }
  
  localStorage.setItem('juva_drafts_' + (currentUser.company_id || 1), JSON.stringify(drafts));
  window.currentDraftId = null;
  
  showToast('success', 'Borrador guardado en Mis Vacantes');
  
  if (titleInput) titleInput.value = '';
  if (descTextarea) descTextarea.value = '';
  if (reqTextarea) reqTextarea.value = '';
  if (salMinInput) salMinInput.value = '';
  if (salMaxInput) salMaxInput.value = '';
  if (locInput) locInput.value = '';
  
  renderCompanyData();
  switchCompanyTab('vacancies');
}

function editDraft(id) {
  let drafts = JSON.parse(localStorage.getItem('juva_drafts_' + (currentUser.company_id || 1))) || [];
  const draft = drafts.find(d => d.id === id);
  if (!draft) return;
  
  window.currentDraftId = id;
  
  document.querySelector('#tab-new-vacancy input[placeholder="Ej: Desarrollador Frontend Jr."]').value = draft.title || '';
  const catSel = document.querySelector('#tab-new-vacancy select');
  if (catSel && draft.category) catSel.value = draft.category;
  
  document.querySelectorAll('#tab-new-vacancy textarea')[0].value = draft.description || '';
  document.querySelectorAll('#tab-new-vacancy textarea')[1].value = draft.requirements || '';
  
  const typeSel = document.querySelectorAll('#tab-new-vacancy select')[1];
  if (typeSel && draft.type) typeSel.value = draft.type;
  
  const empTypeSel = document.querySelectorAll('#tab-new-vacancy select')[2];
  if (empTypeSel && draft.employment_type) empTypeSel.value = draft.employment_type;
  
  document.querySelectorAll('#tab-new-vacancy input')[1].value = draft.salary_min || '';
  document.querySelectorAll('#tab-new-vacancy input')[2].value = draft.salary_max || '';
  document.querySelectorAll('#tab-new-vacancy input')[3].value = draft.location || '';
  
  switchCompanyTab('new-vacancy');
}

function deleteDraft(id, skipConfirm = false) {
  if (!skipConfirm && !confirm('¿Estás seguro de eliminar este borrador?')) return;
  let drafts = JSON.parse(localStorage.getItem('juva_drafts_' + (currentUser.company_id || 1))) || [];
  drafts = drafts.filter(d => d.id !== id);
  localStorage.setItem('juva_drafts_' + (currentUser.company_id || 1), JSON.stringify(drafts));
  
  if (window.currentDraftId === id) window.currentDraftId = null;
  
  if (!skipConfirm) {
    showToast('success', 'Borrador eliminado');
    renderCompanyData();
  }
}

// PAGES
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'student-dash') { initStudentCharts(); renderStudentData(); checkSavedCV(); }
  if (name === 'company-dash') { initCompanyCharts(); renderCompanyData(); }
  if (name === 'admin-dash') { initAdminCharts(); }
}

async function checkSavedCV() {
  const userId = currentUser ? currentUser.id : 1;
  try {
    const response = await fetch(`http://localhost:3000/api/cv/${userId}`);
    if (response.ok) {
      const viewBtn = document.getElementById('view-cv-btn');
      if (viewBtn) viewBtn.style.display = 'inline-block';
    }
  } catch (error) {
    // console.log('No se pudo verificar el CV guardado');
  }
}

function scrollToSection(sel) {
  setTimeout(() => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100);
}

// DASH TABS
function switchDashTab(tab) {
  document.querySelectorAll('#page-student-dash .sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#page-student-dash .dash-tab').forEach(t => t.classList.remove('active'));
  if (typeof event !== 'undefined' && event.currentTarget) event.currentTarget.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'jobs') filterDashJobs();
  if (tab === 'saved') renderSaved();
  if (tab === 'notifications') loadNotifications();
  if (tab === 'messages') loadConversations();
}
function switchCompanyTab(tab) {
  document.querySelectorAll('#page-company-dash .sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#page-company-dash .dash-tab').forEach(t => t.classList.remove('active'));
  if (typeof event !== 'undefined' && event.currentTarget) event.currentTarget.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'company-profile') loadCompanyProfile();
  if (tab === 'company-messages') loadConversations();
  if (tab === 'explore-interns') {
    if (!internsLoaded) {
      loadInternsFromServer();
    } else {
      filterInterns();
    }
  }
  
  if (tab === 'new-vacancy' && typeof event !== 'undefined' && event.currentTarget && event.currentTarget.textContent.includes('Nueva vacante')) {
    window.currentEditJobId = null;
    const dashTitle = document.querySelector('#tab-new-vacancy .dash-title');
    if (dashTitle) dashTitle.textContent = 'Publicar nueva vacante';
    const publishBtn = document.querySelector('#tab-new-vacancy button.btn-primary');
    if (publishBtn) publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar vacante';
    
    const titleInput = document.querySelector('#tab-new-vacancy input[placeholder="Ej: Desarrollador Frontend Jr."]');
    if (titleInput) titleInput.value = '';
    const descTextareas = document.querySelectorAll('#tab-new-vacancy textarea');
    if (descTextareas.length > 0) descTextareas[0].value = '';
    if (descTextareas.length > 1) descTextareas[1].value = '';
    const inputs = document.querySelectorAll('#tab-new-vacancy input');
    if (inputs.length > 1) inputs[1].value = '';
    if (inputs.length > 2) inputs[2].value = '';
    if (inputs.length > 3) inputs[3].value = '';
  }
}

let tempCompanyImages = { logo: null, banner: null, gal1: null, gal2: null, gal3: null };
let currentCompanyProfile = {};

function previewCompanyImage(event, previewId, key) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      tempCompanyImages[key] = e.target.result;
      const preview = document.getElementById(previewId);
      if (preview) {
        preview.style.backgroundImage = `url(${e.target.result})`;
        preview.textContent = '';
      }
    }
    reader.readAsDataURL(file);
  }
}

async function loadCompanyProfile() {
  if (!currentUser || !currentUser.company_id) return;
  try {
    const res = await fetchWithAuth(`${API_URL}/companies/${currentUser.company_id}`);
    if (!res.ok) throw new Error('Empresa no encontrada');
    const company = await res.json();
    currentCompanyProfile = company;
    
    // Limpiar temporales
    tempCompanyImages = { logo: null, banner: null, gal1: null, gal2: null, gal3: null };
    
    document.getElementById('edit-comp-name').value = company.name || '';
    document.getElementById('edit-comp-ruc').value = company.ruc || '';
    document.getElementById('edit-comp-phone').value = company.phone || '';
    document.getElementById('edit-comp-location').value = company.location || '';
    document.getElementById('edit-comp-website').value = company.website || '';
    document.getElementById('edit-comp-sector').value = company.sector || '';
    document.getElementById('edit-comp-founded').value = company.founded_year || '';
    document.getElementById('edit-comp-desc').value = company.description || '';
    
    // Nuevos campos
    if (document.getElementById('edit-comp-size')) document.getElementById('edit-comp-size').value = company.company_size || '';
    if (document.getElementById('edit-comp-benefits')) document.getElementById('edit-comp-benefits').value = company.benefits || '';
    if (document.getElementById('edit-comp-facebook')) document.getElementById('edit-comp-facebook').value = company.facebook_url || '';
    if (document.getElementById('edit-comp-twitter')) document.getElementById('edit-comp-twitter').value = company.twitter_url || '';
    if (document.getElementById('edit-comp-instagram')) document.getElementById('edit-comp-instagram').value = company.instagram_url || '';
    if (document.getElementById('edit-comp-video')) document.getElementById('edit-comp-video').value = company.video_url || '';
    if (document.getElementById('edit-comp-contact-name')) document.getElementById('edit-comp-contact-name').value = company.contact_name || '';
    if (document.getElementById('edit-comp-contact-email')) document.getElementById('edit-comp-contact-email').value = company.contact_email || '';
    
    // Cargar previsualizaciones de imágenes
    const updatePreview = (id, url, text) => {
      const el = document.getElementById(id);
      if (el) {
        if (url) {
          el.style.backgroundImage = `url(${url})`;
          el.textContent = '';
        } else {
          el.style.backgroundImage = 'none';
          el.textContent = text;
        }
      }
    };
    
    updatePreview('edit-comp-logo-preview', company.logo_url, 'Sin Logo');
    updatePreview('edit-comp-banner-preview', company.banner_url, 'Sin Banner');
    
    let gallery = [];
    try {
      if (company.gallery_urls) gallery = JSON.parse(company.gallery_urls);
    } catch(e){}
    
    updatePreview('edit-comp-gal1-preview', gallery[0], 'Foto 1');
    updatePreview('edit-comp-gal2-preview', gallery[1], 'Foto 2');
    updatePreview('edit-comp-gal3-preview', gallery[2], 'Foto 3');
    
    // Reset inputs de archivo
    ['edit-comp-logo','edit-comp-banner','edit-comp-gal1','edit-comp-gal2','edit-comp-gal3'].forEach(id => {
      if (document.getElementById(id)) document.getElementById(id).value = '';
    });
  } catch (err) {
    console.error('Error cargando perfil de empresa:', err);
    showToast('error', 'No se pudo cargar el perfil de la empresa.');
  }
}

async function deleteJob(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta vacante?')) return;
  try {
    const res = await fetchWithAuth(`${API_URL}/jobs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar');
    showToast('success', 'Vacante eliminada exitosamente');
    await loadJobsFromServer();
    renderCompanyData();
  } catch(err) {
    console.error('Error al eliminar:', err);
    showToast('error', 'No se pudo eliminar la vacante');
  }
}

window.currentEditJobId = null;

function editJob(id) {
  const job = JOBS.find(j => j.id === id);
  if (!job) return;
  
  window.currentEditJobId = id;
  
  const titleInput = document.querySelector('#tab-new-vacancy input[placeholder="Ej: Desarrollador Frontend Jr."]');
  if (titleInput) titleInput.value = job.title || '';
  
  const categorySelect = document.querySelector('#tab-new-vacancy select');
  if (categorySelect && job.category) {
    if(job.category === 'tech') categorySelect.value = 'Tecnología';
    else if(job.category === 'finance') categorySelect.value = 'Finanzas';
    else if(job.category === 'design') categorySelect.value = 'Diseño';
    else if(job.category === 'marketing') categorySelect.value = 'Marketing';
    else categorySelect.value = 'Admin';
  }
  
  const descTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[0];
  if (descTextarea) descTextarea.value = job.description || '';
  
  const reqTextarea = document.querySelectorAll('#tab-new-vacancy textarea')[1];
  if (reqTextarea) reqTextarea.value = Array.isArray(job.requirements) ? job.requirements.join('\n') : (job.requirements || '');
  
  const typeSelect = document.querySelectorAll('#tab-new-vacancy select')[1];
  if (typeSelect && job.type) typeSelect.value = job.type;
  
  const empTypeSelect = document.querySelectorAll('#tab-new-vacancy select')[2];
  if (empTypeSelect && job.employment_type) empTypeSelect.value = job.employment_type;
  
  const salMinInput = document.querySelectorAll('#tab-new-vacancy input')[1];
  if (salMinInput) salMinInput.value = (job.salary_min || job.salary ? String(job.salary).replace(/[^0-9–]/g,'').split('–')[0] : '');
  
  const salMaxInput = document.querySelectorAll('#tab-new-vacancy input')[2];
  if (salMaxInput) salMaxInput.value = (job.salary_max || job.salary ? String(job.salary).replace(/[^0-9–]/g,'').split('–')[1] || '' : '');
  
  const locInput = document.querySelectorAll('#tab-new-vacancy input')[3];
  if (locInput) locInput.value = job.location || '';
  
  const dashTitle = document.querySelector('#tab-new-vacancy .dash-title');
  if (dashTitle) dashTitle.textContent = 'Editar vacante';
  const publishBtn = document.querySelector('#tab-new-vacancy button.btn-primary');
  if (publishBtn) publishBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar cambios';
  
  switchCompanyTab('new-vacancy');
}

async function saveCompanyProfile() {
  if (!currentUser || !currentUser.company_id) return;
  
  let galleryArr = [];
  try { if (currentCompanyProfile.gallery_urls) galleryArr = JSON.parse(currentCompanyProfile.gallery_urls); } catch(e){}
  
  const finalGal1 = tempCompanyImages.gal1 || galleryArr[0] || null;
  const finalGal2 = tempCompanyImages.gal2 || galleryArr[1] || null;
  const finalGal3 = tempCompanyImages.gal3 || galleryArr[2] || null;
  const finalGallery = [finalGal1, finalGal2, finalGal3].filter(Boolean);
  
  const payload = {
    name: document.getElementById('edit-comp-name')?.value.trim() || '',
    ruc: document.getElementById('edit-comp-ruc')?.value.trim() || '',
    phone: document.getElementById('edit-comp-phone')?.value.trim() || '',
    location: document.getElementById('edit-comp-location')?.value.trim() || '',
    website: document.getElementById('edit-comp-website')?.value.trim() || '',
    sector: document.getElementById('edit-comp-sector')?.value.trim() || '',
    founded_year: document.getElementById('edit-comp-founded')?.value.trim() ? parseInt(document.getElementById('edit-comp-founded').value) : null,
    description: document.getElementById('edit-comp-desc')?.value.trim() || '',
    
    company_size: document.getElementById('edit-comp-size')?.value || '',
    benefits: document.getElementById('edit-comp-benefits')?.value.trim() || '',
    facebook_url: document.getElementById('edit-comp-facebook')?.value.trim() || '',
    twitter_url: document.getElementById('edit-comp-twitter')?.value.trim() || '',
    instagram_url: document.getElementById('edit-comp-instagram')?.value.trim() || '',
    video_url: document.getElementById('edit-comp-video')?.value.trim() || '',
    contact_name: document.getElementById('edit-comp-contact-name')?.value.trim() || '',
    contact_email: document.getElementById('edit-comp-contact-email')?.value.trim() || '',
    
    logo_filename: null,
    logo_url: tempCompanyImages.logo || currentCompanyProfile.logo_url || null,
    banner_url: tempCompanyImages.banner || currentCompanyProfile.banner_url || null,
    gallery_urls: finalGallery.length > 0 ? JSON.stringify(finalGallery) : null
  };
  
  try {
    const res = await fetchWithAuth(`${API_URL}/companies/${currentUser.company_id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Error al actualizar');
    showToast('success', 'Perfil de la empresa actualizado exitosamente.');
    
    // Actualizar la UI visualmente
    const subtitle = document.getElementById('company-welcome-subtitle');
    if (subtitle) subtitle.textContent = `${payload.name || currentUser.name} - ${payload.location || 'Managua, Nicaragua'}`;
    
    const nameEl = document.querySelector('#page-company-dash .sidebar-section div[style*="font-weight:600"]');
    if (nameEl && payload.name) nameEl.textContent = payload.name;
    
    currentUser.company_logo_url = payload.logo_url || currentCompanyProfile.logo_url;
    if (payload.name) currentUser.name = payload.name;
    if (payload.location) currentUser.location = payload.location;
    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
    
    const initEl = document.querySelector('#page-company-dash .sidebar-section .fa-laptop')?.parentElement || document.querySelector('#page-company-dash .sidebar-section div[style*="font-size:20px"]');
    if (initEl) {
      if (currentUser.company_logo_url) {
        initEl.textContent = '';
        initEl.style.backgroundImage = `url(${currentUser.company_logo_url})`;
        initEl.style.backgroundSize = 'cover';
        initEl.style.backgroundPosition = 'center';
      } else {
        initEl.textContent = (payload.name || currentUser.name)[0].toUpperCase();
        initEl.style.backgroundImage = 'none';
      }
    }
  } catch (err) {
    console.error('Error actualizando perfil de empresa:', err);
    showToast('error', 'Error al guardar los cambios.');
  }
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
  
  const avatars = [
    document.querySelector('.profile-avatar'),
    document.querySelector('.sidebar-avatar-init'),
    document.querySelector('.nav-avatar')
  ];
  
  avatars.forEach(av => {
    if (av) {
      if (currentUser.avatar) {
        av.style.backgroundImage = `url(${currentUser.avatar})`;
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
        av.textContent = '';
      } else {
        av.style.backgroundImage = 'none';
        av.textContent = initials;
      }
    }
  });

  if (profileName) profileName.textContent = currentUser.name;
  if (profileRole) profileRole.textContent = `${currentUser.career} · ${currentUser.university}`;
  
  const profileEmail = document.querySelector('.profile-email');
  if (profileEmail) profileEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${currentUser.email}`;
  
  const welcomeTitle = document.getElementById('student-welcome-title');
  if (welcomeTitle) welcomeTitle.textContent = `Bienvenido, ${currentUser.name.split(' ')[0]} 👋`;
  
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

  // Calcular perfil completado
  let profileScore = 20; // 20% base
  if (currentUser.phone) profileScore += 20;
  if (currentUser.cedula) profileScore += 20;
  if (currentUser.dob) profileScore += 20;
  if (currentUser.address) profileScore += 20;

  const statVals = document.querySelectorAll('#tab-overview .stat-val');
  if (statVals.length >= 4) {
    statVals[1].textContent = currentUser.id === 1 ? '124' : '0'; // mock vistas
    statVals[2].textContent = favorites ? favorites.size : 0;
    statVals[3].textContent = profileScore + '%';
  }

  if (currentUser.id !== 1) {
    const statTrends = document.querySelectorAll('#tab-overview .stat-trend');
    if (statTrends.length >= 2) { statTrends[1].innerHTML='Sin actividad reciente'; statTrends[1].className='stat-trend'; }
    
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
    
    // Load fresh notifications from DB
    loadNotifications();

    const charts = document.querySelectorAll('#tab-overview .chart-container');
    charts.forEach(c => c.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-soft);font-size:13px">No hay suficientes datos todavía</div>');
  }
  
  loadStudentApplications();
}

// COMPANY DATA (RENDER CONSOLIDADO)
function renderCompanyData() {
  if (!currentUser) return;
  const initEl = document.querySelector('#page-company-dash .sidebar-section .fa-laptop')?.parentElement || document.querySelector('#page-company-dash .sidebar-section div[style*="font-size:20px"]');
  if (initEl) {
    if (currentUser.company_logo_url) {
      initEl.textContent = '';
      initEl.style.backgroundImage = `url(${currentUser.company_logo_url})`;
      initEl.style.backgroundSize = 'cover';
      initEl.style.backgroundPosition = 'center';
    } else {
      initEl.textContent = currentUser.name[0].toUpperCase();
      initEl.style.backgroundImage = 'none';
    }
  }
  const nameEl = document.querySelector('#page-company-dash .sidebar-section div[style*="font-weight:600"]');
  if (nameEl) nameEl.textContent = currentUser.name;
  
  // Actualizar UI de suscripciones
  updateSubscriptionUI(currentUser.subscription_plan || 'gratis');

  const companySubtitle = document.getElementById('company-welcome-subtitle');
  if (companySubtitle) {
    companySubtitle.textContent = `${currentUser.name} — ${currentUser.location || 'Managua, Nicaragua'}`;
  }

  const myJobs = JOBS.filter(j => j.company_id === currentUser.company_id || j.company === currentUser.name);
  let drafts = JSON.parse(localStorage.getItem('juva_drafts_' + (currentUser.company_id || 1))) || [];

  const vacTitle = document.querySelector('#tab-vacancies .dash-title');
  if (vacTitle) {
    vacTitle.innerHTML = `Mis Vacantes <span style="font-size: 14px; font-weight: normal; color: var(--text-soft); margin-left: 8px;">(${myJobs.length} activas, ${drafts.length} borradores)</span>`;
  }

  const vacList = document.getElementById('vacancies-list');
  if (vacList) {
    if (myJobs.length === 0 && drafts.length === 0) {
      vacList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft)">No tienes vacantes publicadas ni borradores.</div>';
    } else {
      let html = '';
      
      // Render drafts first
      html += drafts.map(v => `<div class="vacancy-card" style="border-left: 4px solid var(--amber);">
        <div class="vacancy-info">
          <div class="vacancy-title">${v.title || '(Borrador sin título)'}</div>
          <div class="vacancy-meta">
            <span><i class="fa-solid fa-wifi"></i> ${v.type || 'Remoto'}</span>
            <span><i class="fa-solid fa-clock"></i> ${v.employment_type || 'Tiempo completo'}</span>
            <span><i class="fa-solid fa-file-lines"></i> Borrador</span>
          </div>
        </div>
        <span class="status-pill status-pending" style="color: var(--amber); background: var(--amber-pale);">Borrador</span>
        <div class="vacancy-actions">
          <button class="btn btn-ghost btn-sm" onclick="editDraft('${v.id}')"><i class="fa-solid fa-edit"></i> Continuar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--coral)" onclick="deleteDraft('${v.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
      
      // Render active jobs
      html += myJobs.map(v => `<div class="vacancy-card">
        <div class="vacancy-info">
          <div class="vacancy-title">${v.title}</div>
          <div class="vacancy-meta">
            <span><i class="fa-solid fa-wifi"></i> ${v.type || 'Remoto'}</span>
            <span><i class="fa-solid fa-clock"></i> ${v.employment_type || 'Tiempo completo'}</span>
            <span><i class="fa-solid fa-users"></i> ${v.applicants || 0} candidatos</span>
          </div>
        </div>
        <span class="status-pill status-active">Activa</span>
        <div class="vacancy-actions">
          <button class="btn btn-ghost btn-sm" onclick="editJob(${v.id})"><i class="fa-solid fa-edit"></i> Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--coral)" onclick="deleteJob(${v.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
      
      vacList.innerHTML = html;
    }
  }

  loadCandidates();
}

async function loadCandidates() {
  if (!currentUser) return;
  const rc = document.getElementById('recent-candidates');
  const candidatesTableBody = document.querySelector('#tab-candidates tbody');
  const compId = currentUser.company_id || 1;
  let candidates = [];
  renderCandidateSkeletons();
  try {
    const res = await fetchWithAuth(`${API_URL}/companies/${compId}/candidates`);
    if (res.ok) {
      candidates = await res.json();
    } else {
      throw new Error('Fallback local');
    }
  } catch (err) {
    // Fallback local
    candidates = JSON.parse(localStorage.getItem('juva_company_apps_' + compId)) || [];
    if (candidates.length === 0 && currentUser.id === 2) {
      candidates = [
        { name: 'Juan Pérez', career: 'Ing. en Sistemas', university: 'UNI', role: 'Frontend Developer Jr.', status: 'review', date: new Date().toISOString() },
        { name: 'María Rodríguez', career: 'Ing. Industrial', university: 'UNAN', role: 'Backend Developer', status: 'pending', date: new Date().toISOString() },
        { name: 'Carlos López', career: 'Diseño Gráfico', university: 'UAM', role: 'Full Stack Developer', status: 'accepted', date: new Date().toISOString() }
      ];
      localStorage.setItem('juva_company_apps_' + compId, JSON.stringify(candidates));
    }
  }

  const statVals = document.querySelectorAll('#tab-company-overview .stat-val');
  if (statVals.length >= 4) { 
    const myJobs = JOBS.filter(j => j.company_id === currentUser.company_id || j.company === currentUser.name);
    statVals[0].textContent = myJobs.length; 
    statVals[1].textContent = candidates.length; 
    statVals[2].textContent = myJobs.length > 0 ? (myJobs.length * 12 + candidates.length * 3) : 0; 
    statVals[3].textContent = candidates.filter(c => c.status === 'accepted').length; 
  }
  
  const badgeCandidates = document.getElementById('badge-company-candidates');
  if (badgeCandidates) {
    badgeCandidates.textContent = candidates.length;
    badgeCandidates.style.display = candidates.length > 0 ? 'inline-block' : 'none';
  }

  const chipTodos = document.getElementById('chip-todos');
  const chipPending = document.getElementById('chip-pending');
  const chipReview = document.getElementById('chip-review');
  const chipAccepted = document.getElementById('chip-accepted');
  const chipRejected = document.getElementById('chip-rejected');

  if (chipTodos) chipTodos.textContent = `Todos (${candidates.length})`;
  if (chipPending) chipPending.textContent = `Pendientes (${candidates.filter(c => c.status === 'pending').length})`;
  if (chipReview) chipReview.textContent = `En revisión (${candidates.filter(c => c.status === 'review').length})`;
  if (chipAccepted) chipAccepted.textContent = `Aceptados (${candidates.filter(c => c.status === 'accepted').length})`;
  if (chipRejected) chipRejected.textContent = `Rechazados (${candidates.filter(c => c.status === 'rejected').length})`;


  // Update Charts Dynamically
  const myJobs = JOBS.filter(j => j.company_id === currentUser.company_id || j.company === currentUser.name);
  if (document.getElementById('companyChart1')) {
    const jobLabels = [];
    const jobData = [];
    if (myJobs.length === 0) {
      jobLabels.push('Sin vacantes');
      jobData.push(0);
    } else {
      myJobs.forEach(job => {
        jobLabels.push(job.title.length > 15 ? job.title.substring(0,15) + '...' : job.title);
        jobData.push(candidates.filter(c => c.role === job.title).length);
      });
    }
    makeChart('companyChart1', 'bar', jobLabels, [{ label: 'Candidatos', data: jobData, backgroundColor: '#1D5CFF', borderRadius: 6 }]);
  }

  if (document.getElementById('companyChart2')) {
    const pending = candidates.filter(c => c.status === 'pending').length;
    const review = candidates.filter(c => c.status === 'review').length;
    const accepted = candidates.filter(c => c.status === 'accepted').length;
    const rejected = candidates.filter(c => c.status === 'rejected').length;
    
    if (candidates.length === 0) {
      makeChart('companyChart2', 'doughnut', ['Sin candidatos'], [{ data: [1], backgroundColor: ['#E2E8F0'], borderWidth: 0 }]);
    } else {
      makeChart('companyChart2', 'doughnut', ['Pendiente', 'En revisión', 'Aceptado', 'Rechazado'], [{ data: [pending, review, accepted, rejected], backgroundColor: ['#F59E0B', '#1D5CFF', '#00B89C', '#FF5449'], borderWidth: 0 }]);
    }
  }

  if (candidates.length === 0) {
    if (rc) rc.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft)">Aún no tienes candidatos.</div>';
    if (candidatesTableBody) candidatesTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay candidatos</td></tr>';
    return;
  }
  
  if (rc) {
    rc.innerHTML = candidates.slice(0, 5).map(c => {
      const init = c.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      let bg = 'blue';
      if (c.status === 'pending') bg = 'teal';
      else if (c.status === 'accepted') bg = 'coral';
      
      return `<div class="candidate-card">
        <div class="candidate-avatar" style="background:var(--${bg}-pale);color:var(--${bg})">${init}</div>
        <div class="candidate-info">
          <div class="candidate-name">${c.name}</div>
          <div class="candidate-career">${c.career} · ${c.role}</div>
        </div>
        <span class="status-pill status-${c.status}">${c.status === 'pending' ? 'Pendiente' : c.status === 'accepted' ? 'Aceptado' : c.status === 'rejected' ? 'Rechazado' : 'En revisión'}</span>
        <div class="candidate-actions">
          <button class="btn btn-ghost btn-sm" onclick="viewCandidateCV('${c.user_id || c.name}')">Ver CV</button>
          ${c.status !== 'accepted' ? `<button class="btn btn-primary btn-sm" onclick="updateCandidateStatus('${c.application_id || c.name}', 'accepted')">Aceptar</button>` : ''}
          ${c.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" style="color:var(--coral);" onclick="updateCandidateStatus('${c.application_id || c.name}', 'rejected')">Rechazar</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  
  if (candidatesTableBody) {
    candidatesTableBody.innerHTML = candidates.map(c => {
      const init = c.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      let bg = 'blue';
      if (c.status === 'pending') bg = 'teal';
      else if (c.status === 'accepted') bg = 'coral';
      const dateStr = new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      
      return `<tr>
        <td>
          <div class="company-cell">
            <div class="candidate-avatar" style="display:inline-flex;width:32px;height:32px;font-size:12px;background:var(--${bg}-pale);color:var(--${bg})">${init}</div>
            <span style="margin-left:8px">${c.name}</span>
          </div>
        </td>
        <td>${c.role}</td>
        <td>${c.university}</td>
        <td>${dateStr}</td>
        <td><span class="status-pill status-${c.status}">${c.status === 'pending' ? 'Pendiente' : c.status === 'accepted' ? 'Aceptado' : c.status === 'rejected' ? 'Rechazado' : 'En revisión'}</span></td>
        <td>
          <span style="font-weight:600; color: ${c.match_score >= 80 ? 'var(--primary)' : c.match_score >= 50 ? 'var(--warning, orange)' : 'var(--text-soft)'};">
            ${c.match_score !== undefined ? c.match_score + '%' : '-'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="viewCandidateCV('${c.user_id || c.name}')">Ver CV</button>
            ${c.status !== 'accepted' ? `<button class="btn btn-primary btn-sm" onclick="updateCandidateStatus('${c.application_id || c.name}', 'accepted')">Aceptar</button>` : ''}
            ${c.status !== 'rejected' ? `<button class="btn btn-ghost btn-sm" style="color:var(--coral);" onclick="updateCandidateStatus('${c.application_id || c.name}', 'rejected')">Rechazar</button>` : ''}
            <button class="btn btn-ghost btn-sm" style="color:var(--blue)" onclick="startChatWithCandidate(${c.user_id}, '${c.name}')"><i class="fa-solid fa-comment"></i> Contactar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
}

async function viewCandidateCV(userIdOrName) {
  if (!userIdOrName) return;
  try {
    let userId = userIdOrName;
    if (typeof userId === 'string' && isNaN(parseInt(userId))) {
      userId = 1; // Default to student ID 1 for mock data
    }
    const res = await fetchWithAuth(`${API_URL}/cv/${userId}`);
    const data = await res.json();
    if (data.fileData) {
      // Use fetch to convert data URI to blob
      fetch(data.fileData)
        .then(res => res.blob())
        .then(blob => {
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');
        });
      showToast('success', 'Abriendo CV del candidato...');
    } else {
      showToast('info', 'El candidato no ha subido un CV.');
    }
  } catch (err) {
    console.error('Error al ver CV:', err);
    showToast('info', 'El candidato no ha subido un CV. (Sin conexión al servidor)');
  }
}

async function updateCandidateStatus(idOrName, newStatus) {
  if (!idOrName) return;
  let isUpdated = false;

  try {
    if (!isNaN(parseInt(idOrName))) {
      const res = await fetchWithAuth(`${API_URL}/applications/${idOrName}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.error) {
        showToast('error', data.error);
        return; // Detener ejecución si hay error (ej: ya estaba aceptado)
      } else {
        isUpdated = true;
      }
    }
  } catch (err) {
    console.error('Error API, intentando fallback local', err);
  }

  if (!isUpdated && currentUser) {
    // Fallback local
    const compId = currentUser.company_id || 1;
    let candidates = JSON.parse(localStorage.getItem('juva_company_apps_' + compId)) || [];
    let modified = false;
    candidates = candidates.map(c => {
      if ((c.application_id && c.application_id == idOrName) || c.name === idOrName) {
        c.status = newStatus;
        modified = true;
      }
      return c;
    });
    if (modified) {
      localStorage.setItem('juva_company_apps_' + compId, JSON.stringify(candidates));
      isUpdated = true;
    }
  }

  if (isUpdated) {
    showToast('success', 'Estado del candidato actualizado');
    loadCandidates(); // Recargar la tabla
  } else {
    showToast('error', 'Error al actualizar el estado');
  }
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
  // Los gráficos ahora se inicializan y actualizan dinámicamente en loadCandidates()
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

// Restaurar sesión de UI si existe
if (loggedIn && currentUser) {
  document.getElementById('nav-auth-btns').classList.add('hide');
  document.getElementById('nav-user-btns').classList.remove('hide');
  
  const navAvatar = document.querySelector('.nav-avatar');
  if (navAvatar) {
    navAvatar.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  if (currentUser.role === 'company') showPage('company-dash');
  else if (currentUser.role === 'admin') showPage('admin-dash');
  else showPage('student-dash');
}

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
let tempAvatarDataUrl = null;

function previewAvatar(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      tempAvatarDataUrl = e.target.result;
      const preview = document.getElementById('edit-avatar-preview');
      if (preview) {
        preview.style.backgroundImage = `url(${tempAvatarDataUrl})`;
        preview.textContent = '';
      }
    };
    reader.readAsDataURL(file);
  }
}

function openEditProfileModal() {
  if (!currentUser) return;
  
  tempAvatarDataUrl = null;
  const preview = document.getElementById('edit-avatar-preview');
  if (preview) {
    if (currentUser.avatar) {
      preview.style.backgroundImage = `url(${currentUser.avatar})`;
      preview.textContent = '';
    } else {
      preview.style.backgroundImage = 'none';
      preview.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
  }
  const fileInput = document.getElementById('edit-avatar');
  if (fileInput) fileInput.value = '';

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
  
  if (phone && !/^\d{8}$/.test(phone)) {
    showToast('error', 'El número telefónico es inválido. Debe tener exactamente 8 dígitos.');
    return;
  }
  if (cedula && !/^\d{3}-\d{6}-\d{4}[A-Za-z]$/.test(cedula)) {
    showToast('error', 'El formato de cédula es inválido (ej: 000-000000-0000A).');
    return;
  }
  if (age !== null && age < 18) {
    showToast('error', 'Debes ser mayor de 18 años.');
    return;
  }
  
  try {
    const res = await fetchWithAuth(`${API_URL}/users/${currentUser.id}/profile`, {
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
        address,
        avatar: tempAvatarDataUrl || currentUser.avatar
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      currentUser = { ...data.user, avatar: tempAvatarDataUrl || currentUser.avatar };
      sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
      
      // Update fallback if exists
      const userIndex = USERS.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        USERS[userIndex] = { ...USERS[userIndex], ...data.user, avatar: tempAvatarDataUrl || currentUser.avatar };
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

// ========================
// AGREGAR ITEMS AL CV
// ========================
let currentAddType = '';

function openAddItemModal(type) {
  currentAddType = type;
  const title = document.getElementById('add-item-title');
  const form = document.getElementById('add-item-form');
  
  if (type === 'experience') {
    title.textContent = 'Agregar Experiencia';
    form.innerHTML = `
      <div class="form-group"><label>Cargo</label><input type="text" id="add-exp-title" placeholder="Ej: Desarrollador Web"></div>
      <div class="form-group"><label>Empresa</label><input type="text" id="add-exp-company" placeholder="Ej: TechNica"></div>
      <div class="form-row">
        <div class="form-group"><label>Fecha Inicio</label><input type="month" id="add-exp-start"></div>
        <div class="form-group"><label>Fecha Fin</label><input type="month" id="add-exp-end"></div>
      </div>
      <div class="form-group"><label>Descripción</label><textarea id="add-exp-desc" placeholder="Tus responsabilidades..."></textarea></div>
    `;
  } else if (type === 'education') {
    title.textContent = 'Agregar Educación';
    form.innerHTML = `
      <div class="form-group"><label>Título</label><input type="text" id="add-edu-title" placeholder="Ej: Ing. en Sistemas"></div>
      <div class="form-group"><label>Institución</label><input type="text" id="add-edu-inst" placeholder="Ej: UNI"></div>
      <div class="form-row">
        <div class="form-group"><label>Año Inicio</label><input type="number" id="add-edu-start" placeholder="2020"></div>
        <div class="form-group"><label>Año Fin</label><input type="number" id="add-edu-end" placeholder="2025"></div>
      </div>
    `;
  } else if (type === 'project') {
    title.textContent = 'Agregar Proyecto';
    form.innerHTML = `
      <div class="form-group"><label>Nombre del Proyecto</label><input type="text" id="add-proj-title" placeholder="Ej: Sistema de inventario"></div>
      <div class="form-group"><label>Tecnologías (separadas por coma)</label><input type="text" id="add-proj-tech" placeholder="Ej: React, Node.js, MySQL"></div>
      <div class="form-group"><label>Enlace (Opcional)</label><input type="url" id="add-proj-url" placeholder="https://github.com/..."></div>
      <div class="form-group"><label>Descripción</label><textarea id="add-proj-desc" placeholder="Breve descripción del proyecto..."></textarea></div>
    `;
  } else if (type === 'skill') {
    title.textContent = 'Agregar Habilidad';
    form.innerHTML = `
      <div class="form-group"><label>Nombre de la Habilidad</label><input type="text" id="add-skill-title" placeholder="Ej: Liderazgo"></div>
    `;
  } else if (type === 'apply-education') {
    title.textContent = 'Agregar Educación';
    form.innerHTML = `
      <div class="form-group"><label>Institución educativa *</label><input type="text" id="add-apply-edu-inst" placeholder="Ej: UNI"></div>
      <div class="form-group"><label>Campo de estudio</label><input type="text" id="add-apply-edu-career" placeholder="Ej: Ing. en Sistemas"></div>
      <div class="form-row">
        <div class="form-group"><label>Año Inicio</label><input type="number" id="add-apply-edu-start" placeholder="2020"></div>
        <div class="form-group"><label>Año Fin</label><input type="number" id="add-apply-edu-end" placeholder="2025"></div>
      </div>
    `;
  }
  
  openModal('add-item-modal');
}

function saveNewItem() {
  if (currentAddType === 'experience') {
    const title = document.getElementById('add-exp-title')?.value;
    const company = document.getElementById('add-exp-company')?.value;
    const start = document.getElementById('add-exp-start')?.value;
    const end = document.getElementById('add-exp-end')?.value || 'Presente';
    const desc = document.getElementById('add-exp-desc')?.value;
    
    if (!title || !company) return showToast('error', 'Llena los campos obligatorios');
    
    const html = `
      <li>
        <div class="timeline-header">
          <div>
            <div class="timeline-title">${title}</div>
            <div class="timeline-sub">${company}</div>
          </div>
          <div class="timeline-date">${start} – ${end}</div>
        </div>
        <p style="font-size:13px;color:var(--text-mid)">${desc}</p>
      </li>
    `;
    const list = document.querySelectorAll('.timeline')[0];
    if (list) list.insertAdjacentHTML('afterbegin', html);
    
  } else if (currentAddType === 'education') {
    const title = document.getElementById('add-edu-title')?.value;
    const inst = document.getElementById('add-edu-inst')?.value;
    const start = document.getElementById('add-edu-start')?.value;
    const end = document.getElementById('add-edu-end')?.value;
    
    if (!title || !inst) return showToast('error', 'Llena los campos obligatorios');
    
    const html = `
      <li>
        <div class="timeline-header">
          <div>
            <div class="timeline-title">${title}</div>
            <div class="timeline-sub">${inst}</div>
          </div>
          <div class="timeline-date">${start} – ${end}</div>
        </div>
      </li>
    `;
    const list = document.querySelectorAll('.timeline')[1];
    if (list) list.insertAdjacentHTML('afterbegin', html);
    
  } else if (currentAddType === 'project') {
    const title = document.getElementById('add-proj-title')?.value;
    const tech = document.getElementById('add-proj-tech')?.value || '';
    const url = document.getElementById('add-proj-url')?.value;
    const desc = document.getElementById('add-proj-desc')?.value;
    
    if (!title) return showToast('error', 'El nombre del proyecto es obligatorio');
    
    const html = `
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px; margin-bottom: 14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--navy)">${title}</div>
            <div style="font-size:12px;color:var(--text-soft);margin-top:2px">${tech.split(',').map(t => t.trim()).join(' · ')}</div>
          </div>
          ${url ? `<a href="${url}" target="_blank" style="color:var(--blue);font-size:13px"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
        </div>
        ${desc ? `<p style="font-size:13px;color:var(--text-mid);margin-top:8px">${desc}</p>` : ''}
      </div>
    `;
    const listCard = Array.from(document.querySelectorAll('.card-title')).find(el => el.textContent.includes('Proyectos'))?.parentElement.parentElement;
    if (listCard) {
      const container = listCard.querySelector('div:not(.card-header)');
      if (container) container.insertAdjacentHTML('afterbegin', html);
    }
  } else if (currentAddType === 'skill') {
    const title = document.getElementById('add-skill-title')?.value;
    if (!title) return showToast('error', 'El nombre de la habilidad es obligatorio');
    
    const html = `<div class="skill-tag-edit">${title} <i class="fa-solid fa-xmark"></i></div>`;
    const list = document.querySelector('.skills-cloud');
    if (list) list.insertAdjacentHTML('beforeend', html);
  } else if (currentAddType === 'apply-education') {
    const inst = document.getElementById('add-apply-edu-inst')?.value;
    const career = document.getElementById('add-apply-edu-career')?.value || '--';
    const start = document.getElementById('add-apply-edu-start')?.value || '--';
    const end = document.getElementById('add-apply-edu-end')?.value || '--';
    
    if (!inst) return showToast('error', 'La institución educativa es obligatoria');
    
    const innerHtml = `
      <div style="font-size:14px; margin-bottom:4px;"><strong style="color:var(--text-soft); font-weight:500;">Institución educativa *</strong> <span>${inst}</span></div>
      <div style="font-size:14px; margin-bottom:4px;"><strong style="color:var(--text-soft); font-weight:500;">Ciudad </strong> --</div>
      <div style="font-size:14px; margin-bottom:4px;"><strong style="color:var(--text-soft); font-weight:500;">Título </strong> --</div>
      <div style="font-size:14px; margin-bottom:4px;"><strong style="color:var(--text-soft); font-weight:500;">Campo de estudio </strong> <span>${career}</span></div>
      <div style="font-size:14px;"><strong style="color:var(--text-soft); font-weight:500;">Fechas de asistencia </strong> ${start} – ${end}</div>
      
      <div style="display:flex; justify-content:space-between; margin-top:16px; border-top:1px solid #f1f5f9; padding-top:12px;">
        <span style="font-size:12px; color:var(--text-soft);">Editado</span>
        <div style="display:flex; gap:12px; font-size:13px; font-weight:600; color:var(--blue); cursor:pointer;">
          <span onclick="this.closest('#apply-edu-list > div').style.display='none'; showToast('success', 'Educación eliminada');">Eliminar</span>
          <span onclick="window.currentEditEduElement = this.closest('#apply-edu-list > div'); openAddItemModal('apply-education')">Editar</span>
        </div>
      </div>
    `;

    if (window.currentEditEduElement) {
      window.currentEditEduElement.innerHTML = innerHtml;
      window.currentEditEduElement = null; // reset
      showToast('success', 'Educación actualizada');
    } else {
      const fullHtml = `<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">${innerHtml}</div>`;
      const list = document.getElementById('apply-edu-list');
      if (list) list.insertAdjacentHTML('beforeend', fullHtml);
      showToast('success', 'Educación guardada');
    }
    
    closeModal('add-item-modal');
    return;
  }
  
  closeModal('add-item-modal');
  showToast('success', 'Añadido exitosamente al CV');
}

async function handleCVUpload(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Validar tamaño (5MB máx) para cuidar la base de datos
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'El archivo es muy pesado. Máximo 5MB.');
      input.value = '';
      return;
    }

    showToast('success', 'Preparando archivo...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target.result;
      const userId = currentUser ? currentUser.id : 1;
      
      try {
        const response = await fetch('http://localhost:3000/api/upload-cv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, filename: file.name, fileData })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showToast('success', `¡CV "${file.name}" guardado en la base de datos!`);
          const viewBtn = document.getElementById('view-cv-btn');
          if(viewBtn) viewBtn.style.display = 'inline-block';
        } else {
          showToast('error', data.error || 'Error al guardar el CV');
        }
      } catch (error) {
        console.error('Error subiendo CV:', error);
        showToast('error', 'Error de conexión con el servidor');
      }
      
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
}

async function downloadSavedCV() {
  const userId = currentUser ? currentUser.id : 1;
  showToast('success', 'Buscando CV en la base de datos...');
  
  try {
    const response = await fetch(`http://localhost:3000/api/cv/${userId}`);
    const data = await response.json();
    
    if (response.ok && data.fileData) {
      const link = document.createElement('a');
      link.href = data.fileData;
      link.download = data.filename || 'Mi_CV_JuvaConnect.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('success', 'Descarga iniciada');
    } else {
      showToast('error', data.error || 'No se encontró tu CV');
    }
  } catch (error) {
    console.error('Error descargando CV:', error);
    showToast('error', 'Error de conexión con el servidor');
  }
}

function updateSidebarBadges() {
  const badgeApp = document.getElementById('badge-applications');
  const badgeSaved = document.getElementById('badge-saved');
  const badgeNotif = document.getElementById('badge-notifications');
  
  if (badgeApp) {
    let appCount = 0;
    const appRows = document.querySelectorAll('#tab-applications tbody tr');
    // Si hay filas y no es la fila de "No tienes aplicaciones"
    if (appRows.length > 0 && !appRows[0].textContent.includes('No tienes aplicaciones')) {
      appCount = appRows.length;
    }
    badgeApp.textContent = appCount;
    if (appCount === 0) {
      badgeApp.parentElement.style.display = 'none';
    } else {
      badgeApp.parentElement.style.display = 'inline-block';
    }
  }
  
  if (badgeSaved) {
    const savedCount = favorites ? favorites.size : 0;
    badgeSaved.textContent = savedCount;
    if (savedCount === 0) {
      badgeSaved.parentElement.style.display = 'none';
    } else {
      badgeSaved.parentElement.style.display = 'inline-block';
    }
  }
  
  if (badgeNotif) {
    // Simulamos 0 notificaciones reales por ahora
    const notifCount = 0;
    badgeNotif.textContent = notifCount;
    if (notifCount === 0) {
      badgeNotif.parentElement.style.display = 'none';
    } else {
      badgeNotif.parentElement.style.display = 'inline-block';
    }
  }
}

async function loadNotifications() {
  if (!currentUser || currentUser.role !== 'student') return;
  const notifList = document.querySelector('#tab-notifications .notif-list');
  if (!notifList) return;

  try {
    const res = await fetchWithAuth(`${API_URL}/users/${currentUser.id}/notifications`);
    if (res.ok) {
      const data = await res.json();
      if (data.length === 0) {
        notifList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-soft)">No tienes nuevas notificaciones.</div>';
      } else {
        notifList.innerHTML = data.map(n => `<li class="notif-item">
          <div class="notif-icon" style="background:var(--${n.color}-pale)"><i class="fa-solid ${n.icon}" style="color:var(--${n.color})"></i></div>
          <div class="notif-content" style="flex:1;">
            <p>${n.message}</p>
            <span>${new Date(n.created_at).toLocaleString()}</span>
          </div>
          ${!n.is_read ? `<button class="btn btn-ghost btn-sm" onclick="markNotifAsRead(${n.id})" title="Marcar como leída" style="margin-right:10px;"><i class="fa-solid fa-check"></i></button><div class="notif-dot"></div>` : ''}
        </li>`).join('');
      }
      
      // Actualizar badge del sidebar
      const badgeNotif = document.getElementById('badge-notifications');
      if (badgeNotif) {
        const unreadCount = data.filter(n => !n.is_read).length;
        badgeNotif.textContent = unreadCount;
        if (unreadCount === 0) {
          badgeNotif.parentElement.style.display = 'none';
        } else {
          badgeNotif.parentElement.style.display = 'inline-block';
        }
      }
    }
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

async function markNotifAsRead(id) {
  try {
    const res = await fetchWithAuth(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
    if (res.ok) {
      loadNotifications();
      showToast('success', 'Notificación leída');
    }
  } catch (err) {
    console.error('Error marking notification as read:', err);
    showToast('error', 'Error al actualizar notificación');
  }
}

// ==========================================
// TEMA OSCURO
// ==========================================
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('juva_theme', newTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

// INICIALIZAR TEMA
const savedTheme = localStorage.getItem('juva_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});

// ==========================================
// MENU MOVIL (RESPONSIVE)
// ==========================================
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('show-mobile');
  }
}

// ==========================================
// SKELETON LOADERS
// ==========================================
function renderJobSkeletons(containerId, count = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="job-card skeleton" style="min-height: 160px; margin-bottom: 20px;">
        <div class="jc-header"><div class="jc-logo"></div></div>
        <div class="jc-title">Loading title</div>
        <div class="jc-company">Loading company</div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderCandidateSkeletons() {
  const rc = document.getElementById('recent-candidates');
  if (rc) {
    let html = '';
    for(let i=0; i<3; i++){
       html += '<div class="candidate-card skeleton" style="min-height: 80px; margin-bottom: 10px;"></div>';
    }
    rc.innerHTML = html;
  }
  const tb = document.querySelector('#tab-candidates tbody');
  if(tb) {
     tb.innerHTML = '<tr><td colspan="6"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>';
  }
}

// ==========================================
// CHAT SYSTEM LOGIC
// ==========================================
let currentChatUserId = null;
let currentChatUserName = '';

async function loadConversations() {
  if (!loggedIn) return;
  const listContainer = document.getElementById(currentUser.role === 'company' ? 'company-chat-list' : 'student-chat-list');
  if (!listContainer) return;
  
  try {
    const res = await fetchWithAuth(`${API_URL}/messages/conversations`);
    if (res.ok) {
      const convos = await res.json();
      if (convos.length === 0) {
        listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-soft)">No tienes mensajes aún</div>';
        return;
      }
      listContainer.innerHTML = convos.map(c => {
        const init = c.other_user_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
        const dateStr = new Date(c.last_message_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const prefix = c.sender_id === currentUser.id ? 'Tú: ' : '';
        return `
          <div class="chat-list-item" onclick="loadChat(${c.other_user_id}, '${c.other_user_name}')">
            <div class="candidate-avatar" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;font-size:14px;background:var(--blue-pale);color:var(--blue)">${init}</div>
            <div class="chat-list-info">
              <div style="display:flex; justify-content:space-between">
                <div class="chat-list-name">${c.other_user_name}</div>
                <div style="font-size:11px;color:var(--text-soft)">${dateStr}</div>
              </div>
              <div class="chat-list-preview">${prefix}${c.last_message_image ? '📷 Foto' : c.last_message}</div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      console.error('API Error fetching conversations');
    }
  } catch (err) {
    console.error('Error cargando conversaciones', err);
  }
}

async function loadChat(userId, userName) {
  currentChatUserId = userId;
  currentChatUserName = userName;
  
  const prefix = currentUser.role === 'company' ? 'company-' : 'student-';
  const emptyState = document.getElementById(`${prefix}chat-empty-state`);
  const mainArea = document.getElementById(`${prefix}chat-main-area`);
  const headerName = document.getElementById(`${prefix}chat-header-name`);
  
  if (emptyState) emptyState.style.display = 'none';
  if (mainArea) mainArea.style.display = 'flex';
  if (headerName) headerName.textContent = userName;
  
  const historyContainer = document.getElementById(`${prefix}chat-history`);
  if (!historyContainer) return;
  historyContainer.innerHTML = '<div style="text-align:center; padding:20px">Cargando mensajes...</div>';
  
  try {
    const res = await fetchWithAuth(`${API_URL}/messages/${userId}`);
    if (res.ok) {
      const msgs = await res.json();
      renderChatHistory(msgs, prefix);
    } else {
      throw new Error('Error en API: ' + res.status);
    }
  } catch(err) {
    console.error('Error cargando chat', err);
    historyContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--coral)">Error al cargar mensajes</div>';
  }
}

function renderChatHistory(msgs, prefix) {
  const historyContainer = document.getElementById(`${prefix}chat-history`);
  if (!historyContainer) return;

  if (msgs.length === 0) {
    historyContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-soft)">Envía un mensaje para comenzar la conversación</div>';
    return;
  }
  
  historyContainer.innerHTML = msgs.map(m => {
    const isSent = m.sender_id === currentUser.id;
    const timeStr = new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="chat-bubble ${isSent ? 'sent' : 'received'}">
        ${m.image_url ? `<img src="${m.image_url}" style="max-width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:5px; cursor:pointer;" onclick="window.open('${m.image_url}')">` : ''}
        ${m.content ? `<div>${m.content}</div>` : ''}
        <div class="chat-bubble-time">${timeStr}</div>
      </div>
    `;
  }).join('');
  
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function sendChatMessage() {
  if (!currentChatUserId) return;
  const prefix = currentUser.role === 'company' ? 'company-' : 'student-';
  const input = document.getElementById(`${prefix}chat-input`);
  if (!input) return;

  const content = input.value.trim();
  
  if (!content) return;
  
  const msgObj = {
    senderId: currentUser.id,
    receiverId: currentChatUserId,
    content: content,
    created_at: new Date().toISOString()
  };
  
  if (socket) {
    socket.emit('send_message', msgObj);
    // Optimistic render
    appendMessageToUI(msgObj, true);
    input.value = '';
    loadConversations(); // Update side list preview
  }
}

function appendMessageToUI(m, isSent) {
  const prefix = currentUser.role === 'company' ? 'company-' : 'student-';
  const historyContainer = document.getElementById(`${prefix}chat-history`);
  if (!historyContainer) return;
  
  // Si estaba vacio, limpiamos el texto "Envía un mensaje"
  if (historyContainer.innerHTML.includes('comenzar la conversación')) {
    historyContainer.innerHTML = '';
  }
  
  const timeStr = new Date(m.created_at || new Date()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  historyContainer.insertAdjacentHTML('beforeend', `
    <div class="chat-bubble ${isSent ? 'sent' : 'received'}">
      ${m.image_url ? `<img src="${m.image_url}" style="max-width:100%; max-height:250px; object-fit:cover; border-radius:8px; margin-bottom:5px; cursor:pointer;" onclick="window.open('${m.image_url}')">` : ''}
      ${m.content ? `<div>${m.content}</div>` : ''}
      <div class="chat-bubble-time">${timeStr}</div>
    </div>
  `);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function previewChatImage(event, role) {
  const file = event.target.files[0];
  if (!file) return;
  if (!currentChatUserId) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Img = e.target.result;
    
    const msgObj = {
      senderId: currentUser.id,
      receiverId: currentChatUserId,
      content: '',
      image_url: base64Img,
      created_at: new Date().toISOString()
    };
    
    if (socket) {
      socket.emit('send_message', msgObj);
      appendMessageToUI(msgObj, true);
      loadConversations();
    }
  };
  reader.readAsDataURL(file);
  event.target.value = ''; // Reset input
}

function startChatWithCandidate(userId, name) {
  switchCompanyTab('company-messages');
  loadChat(userId, name);
}

// Sobrescribir receive_message listener si existe
const originalInitSocket = typeof initSocket === 'function' ? initSocket : function(){};
initSocket = function() {
  originalInitSocket();
  if (socket) {
    // Evitar múltiples listeners
    socket.off('receive_message'); 
    socket.on('receive_message', (data) => {
      // Si el chat actual está abierto con el remitente
      if (currentChatUserId == data.sender_id) {
        appendMessageToUI(data, false);
      } else {
        showToast('info', 'Nuevo mensaje recibido');
        // Aumentar badge (simple update)
        const badgeId = currentUser.role === 'company' ? 'badge-company-messages' : 'badge-student-messages';
        const badge = document.getElementById(badgeId);
        if (badge) {
          badge.style.display = 'inline-block';
          badge.textContent = parseInt(badge.textContent || 0) + 1;
        }
      }
      loadConversations();
    });
  }
}

// ==========================================
// SUSCRIPCIONES Y PAGOS (EMPRESAS)
// ==========================================
function openCheckoutModal(planId, price) {
  const planNames = { 'basico': 'Plan Básico', 'plus': 'Plan Plus', 'premium': 'Plan Premium' };
  document.getElementById('checkout-plan-name').textContent = planNames[planId] || 'Plan';
  document.getElementById('checkout-plan-price').textContent = `$${price}`;
  document.getElementById('checkout-plan-id').value = planId;
  document.getElementById('checkout-form').reset();
  
  openModal('checkout-modal');
}

async function processCheckout(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-process-checkout');
  const originalHtml = btn.innerHTML;
  
  // Simular estado de carga
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando pago...';
  
  // Simular retraso de transacción bancaria (2 segundos)
  setTimeout(async () => {
    try {
      const planId = document.getElementById('checkout-plan-id').value;
      const companyId = currentUser.company_id || currentUser.id; // Asumiendo que el usuario es una empresa
      
      const response = await fetch(`http://localhost:3000/api/companies/${companyId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al procesar el pago');
      
      showToast('success', '¡Pago exitoso! Tu suscripción ha sido actualizada.');
      closeModal('checkout-modal');
      currentUser.subscription_plan = planId;
      sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
      updateSubscriptionUI(planId);
      
    } catch (error) {
      showToast('error', error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }, 2000);
}

function updateSubscriptionUI(planId) {
  const displayNames = { 'gratis': 'Gratis', 'basico': 'Básico', 'plus': 'Plus', 'premium': 'Premium' };
  const currentPlanDisplay = document.getElementById('current-plan-display');
  if(currentPlanDisplay) currentPlanDisplay.textContent = displayNames[planId] || planId;
  
  // Resetear estilos de todos los botones
  ['gratis', 'basico', 'plus', 'premium'].forEach(p => {
    const card = document.getElementById(`plan-card-${p}`);
    const btn = document.getElementById(`btn-plan-${p}`);
    if(!card || !btn) return;
    
    card.style.borderColor = 'transparent';
    card.style.background = 'var(--surface)';
    
    if (p === planId) {
      card.style.borderColor = 'var(--primary)';
      card.style.background = 'var(--blue-pale)';
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Plan Actual';
      btn.disabled = true;
      btn.onclick = null;
    } else {
      btn.disabled = false;
      if(p === 'gratis') {
        btn.className = 'btn btn-secondary';
        btn.textContent = 'Cambiar a Gratis';
        // Simulamos que volver a gratis es gratis y directo
        btn.onclick = () => processCheckoutFree('gratis');
      } else {
        btn.className = 'btn btn-primary';
        btn.textContent = `Adquirir ${displayNames[p]}`;
        const price = p === 'plus' ? 10 : (p === 'premium' ? 20 : 5);
        btn.onclick = () => openCheckoutModal(p, price);
      }
    }
  });
}

async function processCheckoutFree(planId) {
  try {
    const companyId = currentUser.company_id || currentUser.id;
    const response = await fetch(`http://localhost:3000/api/companies/${companyId}/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId })
    });
    if(response.ok) {
      showToast('success', 'Suscripción cambiada a Gratis');
      currentUser.subscription_plan = planId;
      sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));
      updateSubscriptionUI('gratis');
    }
  } catch(e) {
    showToast('error', 'Error al cambiar plan');
  }
}

let MOCK_INTERNS_DATA = [
  { id: 101, name: 'Carlos Mendoza', career: 'Ing. en Sistemas', university: 'UNI', skills: ['React', 'Node.js', 'Python'], location: 'Managua', avatar: 'CM', color: 'var(--blue)' },
  { id: 102, name: 'Ana Silva', career: 'Marketing Digital', university: 'UAM', skills: ['SEO', 'Google Ads', 'Redes Sociales'], location: 'León', avatar: 'AS', color: 'var(--teal)' },
  { id: 103, name: 'Luis García', career: 'Diseño Gráfico', university: 'UCA', skills: ['Figma', 'Illustrator', 'UI/UX'], location: 'Granada', avatar: 'LG', color: 'var(--coral)' },
  { id: 104, name: 'María Fernanda', career: 'Administración', university: 'UNAN', skills: ['Contabilidad', 'Excel Avanzado'], location: 'Managua', avatar: 'MF', color: 'var(--amber)' },
  { id: 105, name: 'José López', career: 'Ing. en Sistemas', university: 'UNI', skills: ['Java', 'Spring Boot', 'SQL'], location: 'Estelí', avatar: 'JL', color: 'var(--navy)' },
  { id: 106, name: 'Sofía Reyes', career: 'Finanzas', university: 'UCC', skills: ['Análisis Financiero', 'Power BI'], location: 'Managua', avatar: 'SR', color: 'var(--blue)' }
];

let INTERNS_DATA = [];
let internsLoaded = false;

async function loadInternsFromServer() {
  if (internsLoaded) return;
  try {
    const res = await fetchWithAuth(`${API_URL}/students`);
    if (res.ok) {
      INTERNS_DATA = await res.json();
    } else {
      INTERNS_DATA = [...MOCK_INTERNS_DATA];
    }
  } catch (err) {
    INTERNS_DATA = [...MOCK_INTERNS_DATA];
  }
  internsLoaded = true;
  filterInterns();
}


function createInternCard(intern) {
  let avatarHtml = '';
  if (intern.avatar && intern.avatar.length > 10) {
    avatarHtml = `<div style="width:48px; height:48px; border-radius:50%; background-image:url('${intern.avatar}'); background-size:cover; background-position:center; border:2px solid ${intern.color}20; flex-shrink:0;"></div>`;
  } else {
    avatarHtml = `<div style="width:48px; height:48px; border-radius:50%; background:${intern.color}20; color:${intern.color}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; flex-shrink:0;">${intern.avatar}</div>`;
  }

  return `<div class="job-card" style="display:flex; flex-direction:column;">
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
      ${avatarHtml}
      <div style="overflow:hidden;">
        <div style="font-weight:700; font-size:16px; color:var(--navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${intern.name}</div>
        <div style="font-size:13px; color:var(--text-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-graduation-cap"></i> ${intern.career} &bull; ${intern.university}</div>
      </div>
    </div>
    <div style="font-size:13px; color:var(--text-mid); margin-bottom:12px;"><i class="fa-solid fa-location-dot"></i> ${intern.location}</div>
    <div class="jc-tags" style="margin-bottom:16px;">
      ${intern.skills.map(s => `<span class="tag tag-gray">${s}</span>`).join('')}
    </div>
    <div style="display:flex; gap:8px; margin-top:auto;">
      <button class="btn btn-outline btn-sm" style="flex:1; padding: 8px 0;" onclick="viewStudentProfile(${intern.id})"><i class="fa-solid fa-user"></i> Perfil</button>
      <button class="btn btn-primary btn-sm" style="flex:1; padding: 8px 0;" onclick="showToast('success', 'Solicitud de contacto enviada a ${intern.name}')"><i class="fa-solid fa-envelope"></i> Contactar</button>
    </div>
  </div>`;
}

function renderInterns(containerId, interns) {
  const g = document.getElementById(containerId);
  if (g) {
    if (interns.length === 0) {
      g.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-soft);">No se encontraron pasantes con esos criterios.</div>';
    } else {
      g.innerHTML = interns.map(i => createInternCard(i)).join('');
    }
  }
}

function filterInterns() {
  const q = (document.getElementById('dash-interns-search')?.value || '').toLowerCase();
  const cat = document.getElementById('dash-interns-cat')?.value || 'all';
  
  let filtered = INTERNS_DATA.filter(i => {
    const matchCat = cat === 'all' || i.career.includes(cat);
    const matchQ = !q || i.name.toLowerCase().includes(q) || i.career.toLowerCase().includes(q) || i.skills.some(s => s.toLowerCase().includes(q));
    return matchCat && matchQ;
  });
  
  renderInterns('interns-grid', filtered);
}

function viewStudentProfile(id) {
  const student = INTERNS_DATA.find(i => i.id === id);
  if (!student) return;

  const avatarEl = document.getElementById('ps-avatar');
  if (student.avatar && student.avatar.length > 10) {
    avatarEl.textContent = '';
    avatarEl.style.backgroundImage = `url('${student.avatar}')`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
  } else {
    avatarEl.style.backgroundImage = 'none';
    avatarEl.textContent = student.avatar;
    avatarEl.style.color = student.color;
  }
  document.getElementById('ps-banner').style.background = `linear-gradient(135deg, ${student.color} 0%, #1e3a8a 100%)`;
  
  document.getElementById('ps-name').textContent = student.name;
  document.getElementById('ps-career-uni').innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${student.career} &bull; ${student.university}`;
  document.getElementById('ps-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${student.location}`;
  
  document.getElementById('ps-skills').innerHTML = student.skills.map(s => `<span class="tag tag-gray">${s}</span>`).join('');
  
  document.getElementById('ps-contact-btn').onclick = () => {
    showToast('success', `Mensaje enviado a ${student.name}`);
    closeModal('public-student-modal');
  };
  
  document.getElementById('ps-view-cv').onclick = () => viewStudentCV(student.id);
  
  openModal('public-student-modal');
}

async function viewStudentCV(userId) {
  try {
    const res = await fetch(`${API_URL}/cv/${userId}`);
    if (!res.ok) {
      showToast('error', 'Este pasante no ha subido su CV todavía.');
      return;
    }
    const data = await res.json();
    if (data.success && data.fileData) {
      const fileData = data.fileData;
      let pdfWindow = window.open("");
      if (pdfWindow) {
        pdfWindow.document.body.style.margin = "0";
        if (fileData.startsWith('data:application/pdf')) {
          pdfWindow.document.write(`<iframe width='100%' height='100%' src='${fileData}' style='border:none;'></iframe>`);
        } else if (fileData.startsWith('data:image')) {
          pdfWindow.document.write(`<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f2f5;"><img src='${fileData}' style='max-width:100%;max-height:100vh;box-shadow:0 4px 12px rgba(0,0,0,0.1);'></div>`);
        } else {
          pdfWindow.document.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64,${fileData}' style='border:none;'></iframe>`);
        }
        pdfWindow.document.title = "Currículum Vitae";
      } else {
        showToast('error', 'Por favor permite las ventanas emergentes (pop-ups) para ver el CV.');
      }
    } else {
      showToast('error', 'El pasante no tiene un CV adjunto válido.');
    }
  } catch (err) {
    console.error('Error fetching CV:', err);
    showToast('error', 'Hubo un error al intentar abrir el CV.');
  }
}

