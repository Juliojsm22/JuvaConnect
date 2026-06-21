const fs = require('fs');

// Update Juva Connect.html
let html = fs.readFileSync('Juva Connect.html', 'utf8');
const scriptTag = '<script src="http://localhost:3000/socket.io/socket.io.js"></script>\n  <script src="script.js"></script>';
html = html.replace('<script src="script.js"></script>', scriptTag);
fs.writeFileSync('Juva Connect.html', html);

// Update script.js
let code = fs.readFileSync('script.js', 'utf8');

const socketLogic = `
let socket = null;
function initSocket() {
  if (loggedIn && currentUser) {
    // If socket.io is loaded
    if (typeof io !== 'undefined') {
      socket = io(API_URL.replace('/api', ''));
      socket.emit('register_user', currentUser.company_id || currentUser.id);
      
      socket.on('new_notification', (data) => {
        showToast('success', \`\${data.title}: \${data.message}\`);
        // Opcional: Actualizar contador de notificaciones si existe
      });
    }
  }
}

// Inicializar socket si ya hay sesión
if (loggedIn) {
  setTimeout(initSocket, 500); // Esperar a que cargue el script de io
}
`;

// Insert the socket logic below variables
code = code.replace("let activeFilter = 'all';", "let activeFilter = 'all';\n" + socketLogic);

// Call initSocket on login
code = code.replace("sessionStorage.setItem('juva_token', data.token);\n    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));", "sessionStorage.setItem('juva_token', data.token);\n    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));\n    initSocket();");

// Call initSocket on register
code = code.replace("sessionStorage.setItem('juva_token', data.token);\n    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));", "sessionStorage.setItem('juva_token', data.token);\n    sessionStorage.setItem('juva_currentUser', JSON.stringify(currentUser));\n    initSocket();");

// Clear socket on logout
code = code.replace("sessionStorage.removeItem('juva_token');", "sessionStorage.removeItem('juva_token');\n  if (socket) { socket.disconnect(); socket = null; }");

fs.writeFileSync('script.js', code);
console.log('Socket.io frontend configured');
