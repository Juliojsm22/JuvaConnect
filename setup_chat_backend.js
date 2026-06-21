const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Modificar socket.io para escuchar send_message
const socketLogic = `
  socket.on('disconnect', () => {
    for (let [key, value] of activeUsers.entries()) {
      if (value === socket.id) {
        activeUsers.delete(key);
        break;
      }
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { senderId, receiverId, content } = data;
      // Guardar en DB
      const query = 'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *';
      const res = await pool.query(query, [senderId, receiverId, content]);
      const savedMessage = res.rows[0];

      // Emitir al destinatario si está conectado
      const receiverSocket = activeUsers.get(String(receiverId));
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_message', savedMessage);
      }
      // Emitir confirmación al sender
      socket.emit('message_sent', savedMessage);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  });
`;

code = code.replace(`  socket.on('disconnect', () => {
    for (let [key, value] of activeUsers.entries()) {
      if (value === socket.id) {
        activeUsers.delete(key);
        break;
      }
    }
  });`, socketLogic);

// Agregar los Endpoints REST antes de app.listen
const endpoints = `
// ==========================================
// CHAT ENDPOINTS
// ==========================================

// Obtener la lista de conversaciones (último mensaje con cada usuario)
app.get('/api/messages/conversations', async (req, res) => {
  try {
    // Usamos el token para saber quién pide
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const query = \`
      SELECT 
        u.id as other_user_id,
        u.name as other_user_name,
        u.role as other_user_role,
        m.content as last_message,
        m.created_at as last_message_date,
        m.sender_id
      FROM users u
      JOIN (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as contact_id,
          MAX(created_at) as max_date
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY 1
      ) max_m ON u.id = max_m.contact_id
      JOIN messages m ON (
        (m.sender_id = $1 AND m.receiver_id = u.id) OR 
        (m.sender_id = u.id AND m.receiver_id = $1)
      ) AND m.created_at = max_m.max_date
      ORDER BY m.created_at DESC
    \`;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Obtener el historial de un chat
app.get('/api/messages/:otherId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const { otherId } = req.params;

    const query = \`
      SELECT * FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    \`;
    const result = await pool.query(query, [userId, otherId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

server.listen(PORT`;

code = code.replace("server.listen(PORT", endpoints);

fs.writeFileSync('server.js', code);
console.log('Chat backend endpoints added to server.js');
