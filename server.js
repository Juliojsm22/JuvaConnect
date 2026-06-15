const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    `;
    const jobsResult = await pool.query(jobsQuery);
    
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
    
    res.json(formattedJobs);
  } catch (err) {
    console.error('Error al obtener vacantes:', err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 2. Iniciar sesión (Login)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userQuery = `
      SELECT u.*, c.logo_url AS company_logo_url 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.email = $1
    `;
    const result = await pool.query(userQuery, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo electrónico no registrado.' });
    }
    
    const user = result.rows[0];
    
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }
    
    console.log(`🔐 Login exitoso para usuario: ${email}`);
    
    res.json({
      success: true,
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
        company_logo_url: user.company_logo_url
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
    
    // Insertar usuario
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, career, university, phone, dob, age, address, cedula, location, profile_completion, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Managua, NI', 85, $12)
      RETURNING id, name, email, role, career, university, phone, dob, age, address, cedula, location, profile_completion, company_id, avatar
    `;
    const result = await pool.query(insertUserQuery, [name, email, password, role, career, university, phone, dob, age, address, cedula, companyId]);
    const newUser = result.rows[0];
    
    console.log(`👤 Nuevo usuario registrado: ${email} (${role})`);
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
    res.json(result.rows);
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
      
      const insertJobQuery = `
        INSERT INTO jobs (title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING id
      `;
      const jobResult = await client.query(insertJobQuery, [
        title, 
        company_id || 1, // Si no hay company_id, por defecto TechNica (ID 1)
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
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
