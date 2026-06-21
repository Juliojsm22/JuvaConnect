const fs = require('fs');
const cssContent = `
/* ==========================================
   SKELETON LOADERS
   ========================================== */
.skeleton {
  background: linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--radius-sm);
  color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton * {
  visibility: hidden;
}

/* ==========================================
   MOBILE RESPONSIVE (MEDIA QUERIES)
   ========================================== */
@media (max-width: 768px) {
  .mobile-menu-btn { display: block !important; }
  
  .nav-links {
    position: fixed;
    top: 66px;
    left: 0;
    right: 0;
    background: var(--surface);
    flex-direction: column;
    padding: 20px;
    box-shadow: var(--shadow);
    display: none;
  }
  
  .nav-links.show-mobile {
    display: flex;
  }
  
  .dashboard {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    padding: 20px;
  }
  
  .main-content {
    margin-left: 0;
    padding: 20px;
  }
  
  .dash-grid, .dash-grid-3 {
    grid-template-columns: 1fr !important;
  }
  
  .hero {
    grid-template-columns: 1fr;
    padding: 40px 20px;
    text-align: center;
  }
  
  .hero-actions {
    justify-content: center;
  }
  
  .hero-stats {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .hero-visual {
    display: none;
  }
  
  .companies-strip {
    justify-content: center;
  }
  
  .search-section {
    padding: 40px 20px;
  }
}
`;
fs.appendFileSync('styles.css', cssContent);
console.log('Appended CSS');
