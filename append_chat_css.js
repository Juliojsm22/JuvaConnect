const fs = require('fs');

const css = `
/* ==========================================
   CHAT SYSTEM
   ========================================== */
.chat-container {
  display: flex;
  height: calc(100vh - 200px);
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-top: 20px;
}

.chat-sidebar {
  width: 300px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  background: var(--surface2);
}

.chat-list-item {
  padding: 15px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: center;
  transition: all 0.2s ease;
}

.chat-list-item:hover, .chat-list-item.active {
  background: var(--surface3);
}

.chat-list-info {
  flex: 1;
  overflow: hidden;
}

.chat-list-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-list-preview {
  font-size: 13px;
  color: var(--text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 16px;
  background: var(--surface);
}

.chat-history {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: var(--bg);
}

.chat-bubble {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  font-size: 14px;
  line-height: 1.4;
}

.chat-bubble.sent {
  align-self: flex-end;
  background: var(--primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-bubble.received {
  align-self: flex-start;
  background: var(--surface2);
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.chat-bubble-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 5px;
  text-align: right;
}

.chat-input-area {
  padding: 15px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
}

.chat-input-area input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg);
  color: var(--text);
}

@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
    height: calc(100vh - 100px);
  }
  .chat-sidebar {
    width: 100%;
    height: 30%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .chat-main {
    height: 70%;
  }
}
`;

fs.appendFileSync('styles.css', css);
console.log('Chat CSS added');
