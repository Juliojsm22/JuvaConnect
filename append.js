const fs = require('fs');
const content = `
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
`;
fs.appendFileSync('script.js', content);
console.log('Appended theme and mobile logic');
