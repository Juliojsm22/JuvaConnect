const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  maxHttpBufferSize: 1e7 // 10 MB limit for images
});

// Socket.io logic
const activeUsers = new Map();
io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado: ' + socket.id);
  socket.on('register_user', (userId) => {
    activeUsers.set(String(userId), socket.id);
    console.log(`👤 Usuario registrado en socket: ${userId}`);
    io.emit('user_status_change', { userId, status: 'online' });
  });

  socket.on('typing', (data) => {
    const receiverSocket = activeUsers.get(String(data.receiverId));
    if (receiverSocket) {
      io.to(receiverSocket).emit('typing', { senderId: data.senderId });
    }
  });

  socket.on('stop_typing', (data) => {
    const receiverSocket = activeUsers.get(String(data.receiverId));
    if (receiverSocket) {
      io.to(receiverSocket).emit('stop_typing', { senderId: data.senderId });
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (let [key, value] of activeUsers.entries()) {
      if (value === socket.id) {
        disconnectedUserId = key;
        activeUsers.delete(key);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('user_status_change', { userId: disconnectedUserId, status: 'offline' });
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { senderId, receiverId, content, imageUrl, image_url } = data;
      const finalImgUrl = imageUrl || image_url;
      // Guardar en DB
      const query = 'INSERT INTO messages (sender_id, receiver_id, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *';
      const res = await pool.query(query, [senderId, receiverId, content, finalImgUrl || null]);
      const savedMessage = res.rows[0];

      // Insertar notificación en la DB
      try {
        const notifQuery = 'INSERT INTO notifications (user_id, title, message, icon, color) VALUES ($1, $2, $3, $4, $5)';
        await pool.query(notifQuery, [receiverId, 'Nuevo Mensaje', 'Has recibido un nuevo mensaje', 'fa-solid fa-comments', 'var(--blue)']);
      } catch (nErr) {
        console.error('Error insertando notificacion de mensaje:', nErr);
      }

      // Emitir al destinatario si está conectado
      const receiverSocket = activeUsers.get(String(receiverId));
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_message', savedMessage);
        io.to(receiverSocket).emit('new_notification', {
          title: 'Nuevo Mensaje',
          message: 'Has recibido un nuevo mensaje'
        });
      }
      // Emitir confirmación al sender
      socket.emit('message_sent', savedMessage);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  });

});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-juva-key-2026';

// Configuración de middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limite de 10MB para PDFs

// Conexión a la base de datos PostgreSQL usando el Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Probar la conexión a la base de datos al arrancar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('⚡ Conexión exitosa a PostgreSQL local. Hora del servidor:', res.rows[0].now);
  }
});

// ============================================================================
// RUTAS DE LA API (REST API ENDPOINTS)
// ============================================================================

// 1. Obtener todas las vacantes de empleo con sus tags/habilidades
app.get('/api/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Keeping limit high to not break frontend immediately if they don't pass limit
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) FROM jobs WHERE is_active = TRUE OR is_active IS NULL';
    const countResult = await pool.query(countQuery);
    const totalJobs = parseInt(countResult.rows[0].count, 10);

    const jobsQuery = `
      SELECT 
        j.id, 
        j.title, 
        c.name as company, 
        c.logo_emoji as icon, 
        j.location, 
        j.type, 
        '$' || j.salary_min || '–' || j.salary_max as salary,
        j.category, 
        'Reciente' as date,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants,
        true as new, 
        j.description, 
        j.requirements, 
        j.benefits,
        j.company_id,
        j.employment_type
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = TRUE OR j.is_active IS NULL
      ORDER BY j.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const jobsResult = await pool.query(jobsQuery, [limit, offset]);
    
    // Obtener habilidades/tags asociadas a las vacantes
    const skillsQuery = `SELECT job_id, skill_name FROM job_skills`;
    const skillsResult = await pool.query(skillsQuery);
    
    const formattedJobs = jobsResult.rows.map(job => {
      // Filtrar las habilidades que pertenecen a esta vacante
      const tags = skillsResult.rows
        .filter(s => s.job_id === job.id)
        .map(s => s.skill_name);
        
      job.tags = tags.length > 0 ? tags : ['General'];
      job.requirements = job.requirements ? job.requirements.split('\n') : [];
      job.benefits = job.benefits ? job.benefits.split('\n') : [];
      // Asegurarse que applicants sea número para el front
      job.applicants = parseInt(job.applicants, 10);
      return job;
    });
    
    res.json({
      data: formattedJobs,
      pagination: {
        total: totalJobs,
        page,
        limit,
        totalPages: Math.ceil(totalJobs / limit)
      }
    });
  } catch (err) {
    console.error('Error al obtener vacantes:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 1.5 Obtener todos los estudiantes (pasantes)
app.get('/api/students', async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, career, university, location, avatar
      FROM users 
      WHERE role = 'student'
    `;
    const result = await pool.query(query);
    const students = result.rows;
    
    // Fetch skills
    const userIds = students.map(s => s.id);
    if (userIds.length > 0) {
      const skillsRes = await pool.query('SELECT user_id, skill_name FROM student_skills WHERE user_id = ANY($1::int[])', [userIds]);
      students.forEach(s => {
        s.skills = skillsRes.rows.filter(sk => sk.user_id === s.id).map(sk => sk.skill_name);
        
        // Generate mock data for missing fields to ensure UI doesn't break
        s.avatar = s.avatar || s.name.substring(0, 2).toUpperCase();
        s.career = s.career || 'Sin especificar';
        s.university = s.university || 'Sin especificar';
        s.location = s.location || 'Nicaragua';
        
        // Assign a consistent color based on ID
        const colors = ['var(--blue)', 'var(--teal)', 'var(--coral)', 'var(--amber)', 'var(--navy)'];
        s.color = colors[s.id % colors.length];
      });
    }
    
    res.json(students);
  } catch (err) {
    console.error('Error al obtener estudiantes:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 1.8 Recuperar contraseña (interno)
app.post('/api/recover-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const existsQuery = `SELECT id FROM users WHERE email = $1`;
    const existsResult = await pool.query(existsQuery, [email]);
    if (existsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Correo electrónico no registrado.' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const updateQuery = `UPDATE users SET password_hash = $1 WHERE email = $2`;
    await pool.query(updateQuery, [password_hash, email]);

    console.log(`🔐 Contraseña recuperada/actualizada para: ${email}`);
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('Error en recover-password:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET ONLINE USERS
app.get('/api/users/online', (req, res) => {
  res.json(Array.from(activeUsers.keys()));
});

// 2. Iniciar sesión (Login)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userQuery = `
      SELECT u.*, c.logo_url AS company_logo_url, c.subscription_plan AS subscription_plan
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.email = $1
    `;
    const result = await pool.query(userQuery, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo electrónico no registrado.' });
    }
    
    const user = result.rows[0];
    
    // Comparar contraseña segura (con fallback a texto plano para usuarios legacy)
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword && user.password_hash !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }
    
    // Generar Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`🔐 Login exitoso para usuario: ${email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        career: user.career,
        university: user.university,
        location: user.location,
        phone: user.phone,
        dob: user.dob,
        age: user.age,
        address: user.address,
        cedula: user.cedula,
        profile_completion: user.profile_completion || 85,
        company_id: user.company_id,
        avatar: user.avatar,
        company_logo_url: user.company_logo_url,
        subscription_plan: user.subscription_plan || 'gratis'
      }
    });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3. Registrar nuevo usuario
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, career, university, phone, dob, age, address, cedula, ruc, website, logo, founded, description, sector } = req.body;
    
    // Verificar si el usuario ya existe
    const existsQuery = `SELECT id FROM users WHERE email = $1`;
    const existsResult = await pool.query(existsQuery, [email]);
    if (existsResult.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }
    
    // Si es empresa, crear el registro de empresa primero
    let companyId = null;
    if (role === 'company') {
      const insertCompanyQuery = `
        INSERT INTO companies (name, ruc, phone, location, website, logo_filename, founded_year, description, sector, verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
        RETURNING id
      `;
      const companyResult = await pool.query(insertCompanyQuery, [
        name, ruc, phone, address, website, logo, founded, description, sector
      ]);
      companyId = companyResult.rows[0].id;
    }
    
    // Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, career, university, phone, dob, age, address, cedula, location, profile_completion, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Managua, NI', 85, $12)
      RETURNING id, name, email, role, career, university, phone, dob, age, address, cedula, location, profile_completion, company_id, avatar
    `;
    const result = await pool.query(insertUserQuery, [name, email, password_hash, role, career, university, phone, dob, age, address, cedula, companyId]);
    const newUser = result.rows[0];
    
    if (role === 'company') {
      newUser.subscription_plan = 'gratis';
    }
    
    // Generar Token JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`👤 Nuevo usuario registrado: ${email} (${role})`);
    res.json({ success: true, token, user: newUser });
  } catch (err) {
    console.error('Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================================================
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }
      req.user = decoded;
      next();
    });
  } else {
    // Por ahora permitimos peticiones sin token para compatibilidad
    // En el futuro cambiar a: return res.status(401).json({ error: 'Acceso denegado' });
    next();
  }
}

// 3.5. Actualizar perfil de usuario
app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, career, university, phone, cedula, dob, age, address, avatar } = req.body;
    
    const updateQuery = `
      UPDATE users
      SET name = $1, career = $2, university = $3, phone = $4, cedula = $5, dob = $6, age = $7, address = $8, avatar = $9
      WHERE id = $10
      RETURNING id, name, email, role, career, university, phone, dob, age, address, cedula, location, profile_completion, company_id, avatar
    `;
    const result = await pool.query(updateQuery, [name, career, university, phone, cedula, dob, age, address, avatar, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar perfil:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3.6. Obtener perfil de empresa
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `SELECT * FROM companies WHERE id = $1`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener empresa:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3.7. Actualizar perfil de empresa
app.put('/api/companies/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, ruc, phone, location, website, sector, founded_year, description, logo_filename,
      logo_url, banner_url, gallery_urls, company_size, benefits, facebook_url,
      instagram_url, twitter_url, video_url, contact_name, contact_email 
    } = req.body;
    
    const updateQuery = `
      UPDATE companies
      SET name = $1, ruc = $2, phone = $3, location = $4, website = $5, sector = $6, founded_year = $7, description = $8, logo_filename = $9,
          logo_url = $11, banner_url = $12, gallery_urls = $13, company_size = $14, benefits = $15, facebook_url = $16,
          instagram_url = $17, twitter_url = $18, video_url = $19, contact_name = $20, contact_email = $21
      WHERE id = $10
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [
      name, ruc, phone, location, website, sector, founded_year, description, logo_filename, id,
      logo_url, banner_url, gallery_urls, company_size, benefits, facebook_url,
      instagram_url, twitter_url, video_url, contact_name, contact_email
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Actualizar también el nombre en la tabla users para que se mantenga sincronizado
    if (name) {
      await pool.query('UPDATE users SET name = $1, location = $2 WHERE company_id = $3', [name, location, id]);
    }
    
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar empresa:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3.7.1 Actualizar suscripción de empresa
app.post('/api/companies/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    if (!['gratis', 'basico', 'plus', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }
    const result = await pool.query(
      'UPDATE companies SET subscription_plan = $1 WHERE id = $2 RETURNING *',
      [plan, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({ message: 'Suscripción actualizada exitosamente', plan: result.rows[0].subscription_plan });
  } catch (err) {
    console.error('Error al actualizar suscripción:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3.8 Obtener candidatos de una empresa
app.get('/api/companies/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        a.id as application_id,
        u.id as user_id,
        u.name, 
        u.career, 
        u.university, 
        j.id as job_id,
        j.title as role, 
        a.status,
        a.applied_at as date
      FROM applications a
      JOIN users u ON a.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = $1
      ORDER BY a.applied_at DESC
    `;
    const result = await pool.query(query, [id]);
    const candidates = result.rows;
    
    if (candidates.length > 0) {
      // Obtener skills de las vacantes
      const jobIds = [...new Set(candidates.map(c => c.job_id))];
      const jobSkillsRes = await pool.query('SELECT job_id, skill_name FROM job_skills WHERE job_id = ANY($1::int[])', [jobIds]);
      
      // Obtener skills de los estudiantes
      const userIds = [...new Set(candidates.map(c => c.user_id))];
      const userSkillsRes = await pool.query('SELECT user_id, skill_name FROM student_skills WHERE user_id = ANY($1::int[])', [userIds]);
      
      candidates.forEach(c => {
        const jSkills = jobSkillsRes.rows.filter(s => s.job_id === c.job_id).map(s => s.skill_name.toLowerCase());
        const uSkills = userSkillsRes.rows.filter(s => s.user_id === c.user_id).map(s => s.skill_name.toLowerCase());
        
        if (jSkills.length === 0) {
          c.match_score = 100; // Si no pide skills, es 100%
        } else {
          let matchCount = 0;
          jSkills.forEach(reqSkill => {
            if (uSkills.includes(reqSkill)) matchCount++;
          });
          c.match_score = Math.round((matchCount / jSkills.length) * 100);
        }
      });
    }

    res.json(candidates);
  } catch (err) {
    console.error('Error al obtener candidatos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 4.2 Crear una nueva vacante de empleo (Empresa)
app.post('/api/jobs', async (req, res) => {
  try {
    const { title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, skills } = req.body;
    
    // Usar una transacción para insertar el empleo y sus habilidades asociadas
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const targetCompanyId = company_id || 1;
      
      // Validar límite de vacantes
      const companyRes = await client.query('SELECT subscription_plan FROM companies WHERE id = $1', [targetCompanyId]);
      const currentPlan = companyRes.rows.length > 0 ? (companyRes.rows[0].subscription_plan || 'gratis') : 'gratis';
      
      const activeJobsRes = await client.query('SELECT COUNT(*) as count FROM jobs WHERE company_id = $1 AND is_active = true', [targetCompanyId]);
      const activeJobsCount = parseInt(activeJobsRes.rows[0].count);
      
      const planLimits = { 'gratis': 1, 'basico': 10, 'plus': 20, 'premium': 50 };
      const maxJobs = planLimits[currentPlan] || 1;
      
      if (activeJobsCount >= maxJobs) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: `Has alcanzado el límite de ${maxJobs} vacantes activas de tu plan ${currentPlan.toUpperCase()}.` });
      }
      
      const insertJobQuery = `
        INSERT INTO jobs (title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING id
      `;
      const jobResult = await client.query(insertJobQuery, [
        title, 
        targetCompanyId, // Si no hay company_id, por defecto TechNica (ID 1)
        location || 'Managua', 
        type || 'Remoto', 
        employment_type || 'Tiempo completo', 
        salary_min || 400.00, 
        salary_max || 800.00, 
        category || 'tech', 
        description, 
        requirements, 
        benefits
      ]);
      const jobId = jobResult.rows[0].id;
      
      // Insertar habilidades requeridas si existen
      if (skills && Array.isArray(skills)) {
        for (const skill of skills) {
          await client.query(
            `INSERT INTO job_skills (job_id, skill_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [jobId, skill]
          );
        }
      }
      
      await client.query('COMMIT');
      console.log(`💼 Nueva vacante creada con ID: ${jobId}`);
      res.json({ success: true, id: jobId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al publicar vacante:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 4.3 Eliminar una vacante
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar vacante:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 4.4 Editar una vacante
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, skills } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updateJobQuery = `
        UPDATE jobs
        SET title = $1, location = $2, type = $3, employment_type = $4, salary_min = $5, salary_max = $6, category = $7, description = $8, requirements = $9, benefits = $10
        WHERE id = $11
        RETURNING id
      `;
      const result = await client.query(updateJobQuery, [
        title, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, id
      ]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Vacante no encontrada' });
      }

      await client.query('DELETE FROM job_skills WHERE job_id = $1', [id]);
      
      if (skills && Array.isArray(skills)) {
        for (const skill of skills) {
          await client.query(
            `INSERT INTO job_skills (job_id, skill_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, skill]
          );
        }
      }
      
      await client.query('COMMIT');
      res.json({ success: true, id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al editar vacante:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 5. Aplicar / Postular a una vacante
app.post('/api/applications', async (req, res) => {
  try {
    const { user_id, job_id } = req.body;
    
    const applyQuery = `
      INSERT INTO applications (user_id, job_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, job_id) DO UPDATE SET applied_at = NOW()
    `;
    
    await pool.query(applyQuery, [user_id, job_id]);
    
    // Buscar company_id para notificar
    const jobRes = await pool.query('SELECT company_id, title FROM jobs WHERE id = $1', [job_id]);
    if (jobRes.rows.length > 0) {
      const companyId = jobRes.rows[0].company_id;
      const socketId = activeUsers.get(String(companyId));
      if (socketId) {
        io.to(socketId).emit('new_notification', {
          title: 'Nueva Aplicación',
          message: `Un candidato ha aplicado a ${jobRes.rows[0].title}`
        });
      }
    }

    
    console.log(`📩 Estudiante con ID ${user_id} aplicó a vacante ${job_id}`);
    res.json({ success: true, message: 'Aplicación enviada con éxito' });
  } catch (err) {
    console.error('Error al aplicar a vacante:', err.message);
    res.status(500).json({ error: 'Error del servidor al enviar aplicación' });
  }
});

// 5.1 Actualizar estado de postulación
app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check current status
    const currentStatusRes = await pool.query('SELECT status FROM applications WHERE id = $1', [id]);
    if (currentStatusRes.rowCount === 0) {
      return res.status(404).json({ error: 'Aplicación no encontrada' });
    }
    
    if (currentStatusRes.rows[0].status === 'accepted' && status === 'rejected') {
      return res.status(400).json({ error: 'No se puede rechazar a un candidato que ya ha sido aceptado.' });
    }
    
    const query = `
      UPDATE applications 
      SET status = $1 
      WHERE id = $2 
      RETURNING id, status, user_id, job_id
    `;
    const result = await pool.query(query, [status, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Aplicación no encontrada' });
    }

    // Crear notificación si es aceptado o rechazado
    if (status === 'accepted' || status === 'rejected') {
      const jobQuery = `
        SELECT j.title, c.name as company_name
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
        WHERE j.id = $1
      `;
      const jobResult = await pool.query(jobQuery, [result.rows[0].job_id]);
      if (jobResult.rowCount > 0) {
        const { title, company_name } = jobResult.rows[0];
        
        const notifTitle = status === 'accepted' ? '¡Aplicación Aceptada!' : 'Aplicación Rechazada';
        const notifMessage = status === 'accepted' 
          ? `La empresa ${company_name} ha aceptado tu aplicación para el puesto de ${title}. ¡Felicidades!`
          : `${company_name} ha actualizado el estado de tu aplicación para ${title} a rechazado.`;
        const notifIcon = status === 'accepted' ? 'fa-check' : 'fa-xmark';
        const notifColor = status === 'accepted' ? 'teal' : 'coral';
        
        await pool.query(
          'INSERT INTO notifications (user_id, title, message, icon, color) VALUES ($1, $2, $3, $4, $5)',
          [result.rows[0].user_id, notifTitle, notifMessage, notifIcon, notifColor]
        );
      }
    }

    res.json({ success: true, status: result.rows[0].status });
  } catch (err) {
    console.error('Error actualizando estado:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 5.2 Obtener notificaciones del usuario
app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo notificaciones:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 5.3 Marcar notificación como leída
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1
    `;
    await pool.query(query, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marcando notificación como leída:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 5. Subir CV del Estudiante (Base64 a PostgreSQL)
app.post('/api/upload-cv', async (req, res) => {
  try {
    const { userId, filename, fileData } = req.body;
    if (!userId || !fileData) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const updateQuery = `
      UPDATE users 
      SET cv_filename = $1, cv_file = $2 
      WHERE id = $3
      RETURNING id
    `;
    const result = await pool.query(updateQuery, [filename, fileData, userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`📄 CV de ${filename} guardado para el estudiante ${userId}`);
    res.json({ success: true, message: 'CV guardado en la base de datos' });
  } catch (err) {
    console.error('Error guardando CV:', err.message);
    res.status(500).json({ error: 'Error del servidor al guardar el CV' });
  }
});

// Parsear PDF
app.post('/api/parse-cv', async (req, res) => {
  try {
    const { fileData } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data' });

    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const data = await pdfParse(buffer);
    const text = data.text;
    
    // Simple regex extraction
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const phoneMatch = text.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/);
    
    let skills = [];
    if (text.toLowerCase().includes('javascript')) skills.push('JavaScript');
    if (text.toLowerCase().includes('react')) skills.push('React');
    if (text.toLowerCase().includes('node')) skills.push('Node.js');
    if (text.toLowerCase().includes('python')) skills.push('Python');
    if (text.toLowerCase().includes('sql')) skills.push('SQL');
    if (text.toLowerCase().includes('html')) skills.push('HTML');
    if (text.toLowerCase().includes('css')) skills.push('CSS');
    if (text.toLowerCase().includes('excel')) skills.push('Excel');
    if (text.toLowerCase().includes('java ')) skills.push('Java');
    if (text.toLowerCase().includes('marketing')) skills.push('Marketing');
    if (text.toLowerCase().includes('diseño')) skills.push('Diseño UI/UX');
    
    res.json({
      success: true,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      skills: skills.join(', '),
      rawText: text.substring(0, 500)
    });
  } catch (e) {
    console.error('Error parseando CV:', e);
    res.status(500).json({ error: 'Error interno al parsear el PDF' });
  }
});

// 6. Descargar/Ver CV del Estudiante
app.get('/api/cv/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const query = `SELECT cv_filename, cv_file FROM users WHERE id = $1`;
    const result = await pool.query(query, [userId]);

    if (result.rowCount === 0 || !result.rows[0].cv_file) {
      return res.status(404).json({ error: 'CV no encontrado para este usuario' });
    }

    const { cv_filename, cv_file } = result.rows[0];
    
    // El frontend espera el JSON con la data base64
    res.json({ success: true, filename: cv_filename, fileData: cv_file });
  } catch (err) {
    console.error('Error al obtener CV:', err.message);
    res.status(500).json({ error: 'Error del servidor al obtener el CV' });
  }
});

// Servir la API en el puerto especificado


// ==========================================
// CHAT ENDPOINTS
// ==========================================

// Obtener cantidad de mensajes sin leer
app.get('/api/messages/unread', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const query = 'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND read_at IS NULL';
    const result = await pool.query(query, [userId]);
    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error fetching unread messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Obtener la lista de conversaciones (último mensaje con cada usuario)
app.get('/api/messages/conversations', async (req, res) => {
  try {
    // Usamos el token para saber quién pide
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const query = `
      SELECT 
        u.id as other_user_id,
        u.name as other_user_name,
        u.role as other_user_role,
        m.content as last_message,
        m.image_url as last_message_image,
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
    `;
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

    // Marcar los mensajes entrantes como leídos
    await pool.query('UPDATE messages SET read_at = NOW() WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL', [otherId, userId]);

    const query = `
      SELECT * FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [userId, otherId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
