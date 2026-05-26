-- Base de Datos para JuvaConnect
-- Motor: PostgreSQL

-- Habilitar extensión para UUIDs opcionalmente (útil para IDs más seguros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE EMPRESAS (COMPANIES)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo_emoji VARCHAR(10) DEFAULT '🏢',
    sector VARCHAR(50),
    location VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE USUARIOS (USERS - Estudiantes, Reclutadores, Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Guardará la contraseña cifrada
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'company', 'admin')),
    
    -- Campos específicos de Estudiantes
    career VARCHAR(100),
    university VARCHAR(100),
    location VARCHAR(100),
    profile_completion INT DEFAULT 0,
    
    -- Relación opcional con Empresa si el rol es 'company'
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE HABILIDADES DE ESTUDIANTES (STUDENT SKILLS)
CREATE TABLE student_skills (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(50) NOT NULL,
    UNIQUE (user_id, skill_name)
);

-- 4. TABLA DE EXPERIENCIA LABORAL (STUDENT EXPERIENCE)
CREATE TABLE student_experience (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL si es el trabajo actual
    current_job BOOLEAN DEFAULT FALSE,
    description TEXT
);

-- 5. TABLA DE EDUCACIÓN (STUDENT EDUCATION)
CREATE TABLE student_education (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    degree VARCHAR(100) NOT NULL,
    institution VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE
);

-- 6. TABLA DE PROYECTOS (STUDENT PROJECTS)
CREATE TABLE student_projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    technologies VARCHAR(255),
    project_url VARCHAR(255),
    description TEXT
);

-- 7. TABLA DE VACANTES / EMPLEOS (JOBS)
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    location VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Remoto', 'Híbrido', 'Presencial')),
    employment_type VARCHAR(30) CHECK (employment_type IN ('Tiempo completo', 'Medio tiempo', 'Pasantía', 'Por proyecto')),
    salary_min NUMERIC(10, 2),
    salary_max NUMERIC(10, 2),
    category VARCHAR(50) NOT NULL CHECK (category IN ('tech', 'finance', 'design', 'marketing', 'admin', 'health')),
    description TEXT NOT NULL,
    requirements TEXT, -- Lista de requisitos
    benefits TEXT,     -- Lista de beneficios
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE HABILIDADES REQUERIDAS POR VACANTE (JOB SKILLS)
CREATE TABLE job_skills (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(50) NOT NULL,
    UNIQUE (job_id, skill_name)
);

-- 9. TABLA DE POSTULACIONES / APLICACIONES (APPLICATIONS)
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'accepted', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id) -- Un estudiante solo aplica una vez por vacante
);

-- 10. TABLA DE FAVORITOS / GUARDADOS (SAVED JOBS)
CREATE TABLE saved_jobs (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, job_id)
);


-- ============================================================================
-- DATOS DE PRUEBA (SEED DATA)
-- ============================================================================

-- Insertar empresas de prueba
INSERT INTO companies (name, logo_emoji, sector, location, verified) VALUES
('TechNica Labs', '💻', 'Tecnología', 'Managua, Nicaragua', TRUE),
('Banco LAFISE', '📊', 'Finanzas', 'Granada, Nicaragua', TRUE),
('Agencia Pixel', '🎨', 'Diseño', 'León, Nicaragua', TRUE),
('Claro Nicaragua', '📱', 'Telecomunicaciones', 'Managua, Nicaragua', TRUE),
('Grupo Pellas', '💼', 'Corporativo', 'Managua, Nicaragua', TRUE);

-- Insertar estudiantes de prueba
-- Nota: En producción, las contraseñas se guardan encriptadas con bcrypt, etc.
INSERT INTO users (name, email, password_hash, role, career, university, location, profile_completion) VALUES
('Juan Carlos Pérez', 'juan.perez@uni.edu.ni', '$2b$10$xyz...', 'student', 'Ing. en Sistemas de Información', 'Universidad Nacional de Ingeniería (UNI)', 'Managua, NI', 85),
('María Rodríguez', 'maria.r@unan.edu.ni', '$2b$10$abc...', 'student', 'Ing. Industrial', 'UNAN Managua', 'León, NI', 90);

-- Insertar habilidades
INSERT INTO student_skills (user_id, skill_name) VALUES
(1, 'JavaScript'), (1, 'React'), (1, 'Node.js'), (1, 'MySQL'), (1, 'Python'), (1, 'Git'),
(2, 'Python'), (2, 'Excel'), (2, 'SQL'), (2, 'PowerBI');

-- Insertar vacantes de prueba
INSERT INTO jobs (title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits) VALUES
('Desarrollador Frontend Jr.', 1, 'Managua', 'Remoto', 'Tiempo completo', 600.00, 900.00, 'tech', 
 'Buscamos un desarrollador Frontend junior apasionado con conocimientos en React y JavaScript moderno para unirse a nuestro equipo de producto.',
 'Conocimientos en HTML5, CSS3, JavaScript ES6+\nExperiencia o proyectos con React.js\nFamiliaridad con Git\nEstudiante de últimos años o recién graduado',
 'Salario competitivo en USD\nTrabajo 100% remoto con horario flexible\nPlan de carrera y mentoría'),
 
('Analista de Datos', 2, 'Granada', 'Híbrido', 'Tiempo completo', 800.00, 1200.00, 'finance', 
 'Buscamos un profesional para realizar análisis de métricas financieras y visualización de datos comerciales.',
 'Dominio avanzado de Microsoft Excel\nConocimiento en Python y consultas SQL\nCapacidad de análisis y trabajo en equipo',
 'Seguro médico privado\nOportunidades de crecimiento interno\nEstabilidad laboral');

-- Insertar habilidades de vacantes
INSERT INTO job_skills (job_id, skill_name) VALUES
(1, 'React.js'), (1, 'JavaScript'), (1, 'HTML/CSS'), (1, 'Git'),
(2, 'Excel'), (2, 'Python'), (2, 'SQL');

-- Insertar postulaciones de prueba
INSERT INTO applications (user_id, job_id, status) VALUES
(1, 1, 'review'),
(1, 2, 'accepted');
