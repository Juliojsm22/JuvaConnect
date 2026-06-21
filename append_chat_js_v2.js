const fs = require('fs');

const chatLogic = `
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
    const res = await fetchWithAuth(\`\${API_URL}/messages/conversations\`);
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
        return \`
          <div class="chat-list-item" onclick="loadChat(\${c.other_user_id}, '\${c.other_user_name}')">
            <div class="candidate-avatar" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;font-size:14px;background:var(--blue-pale);color:var(--blue)">\${init}</div>
            <div class="chat-list-info">
              <div style="display:flex; justify-content:space-between">
                <div class="chat-list-name">\${c.other_user_name}</div>
                <div style="font-size:11px;color:var(--text-soft)">\${dateStr}</div>
              </div>
              <div class="chat-list-preview">\${prefix}\${c.last_message}</div>
            </div>
          </div>
        \`;
      }).join('');
    }
  } catch (err) {
    console.error('Error cargando conversaciones', err);
  }
}

async function loadChat(userId, userName) {
  currentChatUserId = userId;
  currentChatUserName = userName;
  
  const prefix = currentUser.role === 'company' ? 'company-' : 'student-';
  const emptyState = document.getElementById(\`\${prefix}chat-empty-state\`);
  const mainArea = document.getElementById(\`\${prefix}chat-main-area\`);
  const headerName = document.getElementById(\`\${prefix}chat-header-name\`);
  
  if (emptyState) emptyState.style.display = 'none';
  if (mainArea) mainArea.style.display = 'flex';
  if (headerName) headerName.textContent = userName;
  
  const historyContainer = document.getElementById(\`\${prefix}chat-history\`);
  if (!historyContainer) return;
  historyContainer.innerHTML = '<div style="text-align:center; padding:20px">Cargando mensajes...</div>';
  
  try {
    const res = await fetchWithAuth(\`\${API_URL}/messages/\${userId}\`);
    if (res.ok) {
      const msgs = await res.json();
      renderChatHistory(msgs, prefix);
    }
  } catch(err) {
    console.error('Error cargando chat', err);
    historyContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--coral)">Error al cargar mensajes</div>';
  }
}

function renderChatHistory(msgs, prefix) {
  const historyContainer = document.getElementById(\`\${prefix}chat-history\`);
  if (!historyContainer) return;

  if (msgs.length === 0) {
    historyContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-soft)">Envía un mensaje para comenzar la conversación</div>';
    return;
  }
  
  historyContainer.innerHTML = msgs.map(m => {
    const isSent = m.sender_id === currentUser.id;
    const timeStr = new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return \`
      <div class="chat-bubble \${isSent ? 'sent' : 'received'}">
        <div>\${m.content}</div>
        <div class="chat-bubble-time">\${timeStr}</div>
      </div>
    \`;
  }).join('');
  
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function sendChatMessage() {
  if (!currentChatUserId) return;
  const prefix = currentUser.role === 'company' ? 'company-' : 'student-';
  const input = document.getElementById(\`\${prefix}chat-input\`);
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
  const historyContainer = document.getElementById(\`\${prefix}chat-history\`);
  if (!historyContainer) return;
  
  // Si estaba vacio, limpiamos el texto "Envía un mensaje"
  if (historyContainer.innerHTML.includes('comenzar la conversación')) {
    historyContainer.innerHTML = '';
  }
  
  const timeStr = new Date(m.created_at || new Date()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  historyContainer.insertAdjacentHTML('beforeend', \`
    <div class="chat-bubble \${isSent ? 'sent' : 'received'}">
      <div>\${m.content}</div>
      <div class="chat-bubble-time">\${timeStr}</div>
    </div>
  \`);
  historyContainer.scrollTop = historyContainer.scrollHeight;
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
`;

fs.appendFileSync('script.js', chatLogic);
console.log('Chat logic appended to script.js');
