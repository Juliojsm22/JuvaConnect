const fs = require('fs');
let html = fs.readFileSync('Juva Connect.html', 'utf8');

// 1. Añadir botón al sidebar de ESTUDIANTE
const studentNotifBtn = `<button class="sidebar-item" onclick="switchDashTab('notifications')"><i class="fa-solid fa-bell"></i>
            Notificaciones <span class="sidebar-badge"><span class="badge badge-coral" id="badge-notifications">2</span></span></button>`;
const studentChatBtn = `          <button class="sidebar-item" onclick="switchDashTab('messages')"><i class="fa-solid fa-comments"></i>
            Mensajes <span class="sidebar-badge"><span class="badge badge-primary" id="badge-student-messages" style="display:none">0</span></span></button>`;
html = html.replace(studentNotifBtn, studentNotifBtn + '\n' + studentChatBtn);

// 2. Añadir botón al sidebar de EMPRESA
const companyProfileBtn = `<button class="sidebar-item" onclick="switchCompanyTab('company-profile')"><i class="fa-solid fa-building"></i>
            Perfil Digital</button>`;
const companyChatBtn = `          <button class="sidebar-item" onclick="switchCompanyTab('company-messages')"><i class="fa-solid fa-comments"></i>
            Mensajes <span class="sidebar-badge"><span class="badge badge-primary" id="badge-company-messages" style="display:none">0</span></span></button>`;
html = html.replace(companyProfileBtn, companyProfileBtn + '\n' + companyChatBtn);

// 3. Crear el tab de mensajes para ESTUDIANTE (dentro de dash-main)
const studentMessagesTab = `
        <!-- MESSAGES TAB (STUDENT) -->
        <div class="dash-tab" id="tab-messages">
          <div class="dash-header">
            <div class="dash-title">Mensajes</div>
          </div>
          <div class="chat-container">
            <div class="chat-sidebar">
              <div id="student-chat-list"></div>
            </div>
            <div class="chat-main" id="student-chat-main-area" style="display:none;">
              <div class="chat-header">
                <div class="chat-contact-info" id="student-chat-header-name">Contacto</div>
              </div>
              <div class="chat-history" id="student-chat-history"></div>
              <div class="chat-input-area">
                <input type="text" id="student-chat-input" placeholder="Escribe un mensaje...">
                <button class="btn btn-primary" onclick="sendChatMessage()"><i class="fa-solid fa-paper-plane"></i></button>
              </div>
            </div>
            <div class="chat-main" id="student-chat-empty-state" style="display:flex; justify-content:center; align-items:center; flex-direction:column; color:var(--text-soft)">
              <i class="fa-solid fa-comments" style="font-size:48px; margin-bottom:15px"></i>
              <p>Selecciona un chat para comenzar</p>
            </div>
          </div>
        </div>
`;
// Add before closing main for student
html = html.replace('      </main>\n    </div>\n  </div>\n\n  <!-- ===== COMPANY DASHBOARD ===== -->', studentMessagesTab + '      </main>\n    </div>\n  </div>\n\n  <!-- ===== COMPANY DASHBOARD ===== -->');

// 4. Crear el tab de mensajes para EMPRESA
const companyMessagesTab = `
        <!-- MESSAGES TAB (COMPANY) -->
        <div class="dash-tab" id="tab-company-messages">
          <div class="dash-header">
            <div class="dash-title">Mensajes Directos</div>
          </div>
          <div class="chat-container">
            <div class="chat-sidebar">
              <div id="company-chat-list"></div>
            </div>
            <div class="chat-main" id="company-chat-main-area" style="display:none;">
              <div class="chat-header">
                <div class="chat-contact-info" id="company-chat-header-name">Contacto</div>
              </div>
              <div class="chat-history" id="company-chat-history"></div>
              <div class="chat-input-area">
                <input type="text" id="company-chat-input" placeholder="Escribe un mensaje...">
                <button class="btn btn-primary" onclick="sendChatMessage()"><i class="fa-solid fa-paper-plane"></i></button>
              </div>
            </div>
            <div class="chat-main" id="company-chat-empty-state" style="display:flex; justify-content:center; align-items:center; flex-direction:column; color:var(--text-soft)">
              <i class="fa-solid fa-comments" style="font-size:48px; margin-bottom:15px"></i>
              <p>Selecciona un chat para comenzar</p>
            </div>
          </div>
        </div>
`;
// Add before closing main for company
html = html.replace('      </main>\n    </div>\n  </div>\n\n  <!-- ===== MODALS ===== -->', companyMessagesTab + '      </main>\n    </div>\n  </div>\n\n  <!-- ===== MODALS ===== -->');

// 5. Botón Contactar en tabla candidatos
// Reemplazar la tabla estática de Juva Connect.html que tal vez no importe mucho ya que se sobrescribe en js, pero mejor en JS.

fs.writeFileSync('Juva Connect.html', html);
console.log('Chat UI added to HTML');
