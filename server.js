const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middlewares
app.use(cors());
app.use(express.json());

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
      SELECT j.id, j.title, j.location, j.type, j.employment_type, 
             j.salary_min, j.salary_max, j.category, j.description, 
             j.requirements, j.benefits, c.name AS company, c.logo_emoji AS icon
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = TRUE
      ORDER BY j.id DESC
    `;
    const jobsResult = await pool.query(jobsQuery);
    
    // Obtener habilidades/tags asociadas a las vacantes
    const skillsQuery = `SELECT job_id, skill_name FROM job_skills`;
    const skillsResult = await pool.query(skillsQuery);
    
    // Formatear las vacantes para que coincidan con la estructura del frontend
    const formattedJobs = jobsResult.rows.map(job => {
      // Filtrar las habilidades que pertenecen a esta vacante
      const tags = skillsResult.rows
        .filter(s => s.job_id === job.id)
        .map(s => s.skill_name);
        
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        icon: job.icon || '🏢',
        location: job.location,
        type: job.type,
        salary: `$${Math.round(job.salary_min)}–${Math.round(job.salary_max)}`,
        tags: tags.length > 0 ? tags : ['General'],
        category: job.category,
        date: 'Reciente',
        applicants: 10 + (job.id % 7), // Simulado o dinámico
        new: job.id === 1 || job.id === 3 || job.id === 7, // Algunos marcados como nuevos
        description: job.description,
        requirements: job.requirements ? job.requirements.split('\n') : [],
        benefits: job.benefits ? job.benefits.split('\n') : []
      };
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
    
    const userQuery = `SELECT * FROM users WHERE email = $1`;
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
        profile_completion: user.profile_completion || 85
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
    const { name, email, password, role, career, university, phone, dob, age, address, cedula } = req.body;
    
    // Verificar si el usuario ya existe
    const existsQuery = `SELECT id FROM users WHERE email = $1`;
    const existsResult = await pool.query(existsQuery, [email]);
    if (existsResult.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }
    
    // Insertar usuario
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, career, university, phone, dob, age, address, cedula, location, profile_completion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Managua, NI', 85)
      RETURNING id, name, email, role, career, university, phone, dob, age, address, cedula, location, profile_completion
    `;
    const result = await pool.query(insertUserQuery, [name, email, password, role, career, university, phone, dob, age, address, cedula]);
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
    const { name, career, university, phone, cedula, dob, age, address } = req.body;
    
    const updateQuery = `
      UPDATE users
      SET name = $1, career = $2, university = $3, phone = $4, cedula = $5, dob = $6, age = $7, address = $8
      WHERE id = $9
      RETURNING id, name, email, role, career, university, phone, dob, age, address, cedula, location, profile_completion
    `;
    const result = await pool.query(updateQuery, [name, career, university, phone, cedula, dob, age, address, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar perfil:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 4. Crear una nueva vacante de empleo (Empresa)
app.post('/api/jobs', async (req, res) => {
  try {
    const { title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits, skills } = req.body;
    
    // Usar una transacción para insertar el empleo y sus habilidades asociadas
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertJobQuery = `
        INSERT INTO jobs (title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

// Servir la API en el puerto especificado
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
