const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Add HTTP and Socket.io
code = code.replace("const express = require('express');", "const express = require('express');\nconst http = require('http');\nconst { Server } = require('socket.io');");

// Initialize server and io
code = code.replace("const app = express();", "const app = express();\nconst server = http.createServer(app);\nconst io = new Server(server, {\n  cors: {\n    origin: '*',\n    methods: ['GET', 'POST', 'PUT', 'DELETE']\n  }\n});\n\n// Socket.io logic\nconst activeUsers = new Map();\nio.on('connection', (socket) => {\n  console.log('🔗 Cliente conectado: ' + socket.id);\n  socket.on('register_user', (userId) => {\n    activeUsers.set(String(userId), socket.id);\n    console.log(`👤 Usuario registrado en socket: ${userId}`);\n  });\n  socket.on('disconnect', () => {\n    for (let [key, value] of activeUsers.entries()) {\n      if (value === socket.id) {\n        activeUsers.delete(key);\n        break;\n      }\n    }\n  });\n});");

// Replace app.listen
code = code.replace("app.listen(PORT", "server.listen(PORT");

// Emit notification on new application
const applyEndpointStart = "app.post('/api/applications', async (req, res) => {";
// We need to inject logic to emit the notification
// First, find the end of the query execution in that endpoint
const applyQueryExec = "await pool.query(applyQuery, [user_id, job_id]);";
const applyEmitLogic = `
    await pool.query(applyQuery, [user_id, job_id]);
    
    // Buscar company_id para notificar
    const jobRes = await pool.query('SELECT company_id, title FROM jobs WHERE id = $1', [job_id]);
    if (jobRes.rows.length > 0) {
      const companyId = jobRes.rows[0].company_id;
      const socketId = activeUsers.get(String(companyId));
      if (socketId) {
        io.to(socketId).emit('new_notification', {
          title: 'Nueva Aplicación',
          message: \`Un candidato ha aplicado a \${jobRes.rows[0].title}\`
        });
      }
    }
`;
code = code.replace(applyQueryExec, applyEmitLogic);

fs.writeFileSync('server.js', code);
console.log('Socket.io integrated into server.js');
