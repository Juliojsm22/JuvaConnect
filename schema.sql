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
    phone VARCHAR(20),
    dob DATE,
    age INT,
    address VARCHAR(255),
    cedula VARCHAR(20),
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
-- DATOS DE PRUEBA (SEED DATA) - +150 FILAS EN TOTAL
-- ============================================================================

-- Limpiar tablas
TRUNCATE TABLE companies, users RESTART IDENTITY CASCADE;

-- 1. Insertar Empresas (30)
INSERT INTO companies (name, logo_emoji, sector, location, verified) VALUES
('TechNica Labs', '💻', 'Tecnología', 'Managua', TRUE),
('Banco LAFISE', '📊', 'Finanzas', 'Granada', TRUE),
('Agencia Pixel', '🎨', 'Diseño', 'León', TRUE),
('Claro Nicaragua', '📱', 'Telecom', 'Managua', TRUE),
('Grupo Pellas', '💼', 'Corporativo', 'Managua', TRUE),
('EAAI Consulting', '🌿', 'Medio Ambiente', 'Masaya', FALSE),
('La Colonia', '🏪', 'Retail', 'Managua', TRUE),
('Pharmedic', '💊', 'Salud', 'Estelí', TRUE),
('Cargill', '🏭', 'Agroindustria', 'Chinandega', TRUE),
('Cemex', '🏗️', 'Construcción', 'Managua', TRUE),
('Tigo', '📡', 'Telecom', 'Managua', TRUE),
('Sitel', '🎧', 'BPO', 'Managua', TRUE),
('Concentrix', '🎧', 'BPO', 'Managua', FALSE),
('KPMG', '📉', 'Consultoría', 'Managua', TRUE),
('PwC', '📈', 'Consultoría', 'Managua', TRUE),
('Gala', '👗', 'Moda', 'Granada', FALSE),
('Flor de Caña', '🥃', 'Bebidas', 'Chichigalpa', TRUE),
('Tip Top', '🍗', 'Alimentos', 'Managua', TRUE),
('Sinsa', '🛠️', 'Construcción', 'Managua', TRUE),
('Casa Pellas', '🚗', 'Automotriz', 'Managua', TRUE),
('Banpro', '🏦', 'Finanzas', 'Managua', TRUE),
('BAC Credomatic', '💳', 'Finanzas', 'Managua', TRUE),
('Ficohsa', '🏧', 'Finanzas', 'Managua', TRUE),
('Avianca', '✈️', 'Turismo', 'Managua', TRUE),
('Hispamer', '📚', 'Educación', 'Managua', FALSE),
('AutoLote', '🚕', 'Automotriz', 'León', FALSE),
('UAM', '🎓', 'Educación', 'Managua', TRUE),
('UNI', '🎓', 'Educación', 'Managua', TRUE),
('Keiser University', '🏫', 'Educación', 'San Marcos', TRUE),
('Hospital Metropolitano', '🏥', 'Salud', 'Managua', TRUE);

-- 2. Insertar Estudiantes (50)
-- Generaremos 50 estudiantes reales variando carreras.
INSERT INTO users (name, email, password_hash, role, career, university, location, profile_completion) VALUES
('Ana Gómez', 'ana.gomez@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería en Sistemas', 'UNI', 'Managua', 90),
('Carlos Ruiz', 'carlos.ruiz@yahoo.com', '$2b$10$placeholder', 'student', 'Administración de Empresas', 'UAM', 'Managua', 75),
('María López', 'maria.lopez@hotmail.com', '$2b$10$placeholder', 'student', 'Diseño Gráfico', 'UPOLI', 'León', 85),
('Luis Martínez', 'luis.martinez@gmail.com', '$2b$10$placeholder', 'student', 'Contabilidad', 'UNAN', 'Granada', 60),
('Elena Torres', 'elena.torres@yahoo.com', '$2b$10$placeholder', 'student', 'Marketing', 'UCA', 'Managua', 95),
('Pedro Sánchez', 'pedro.sanchez@gmail.com', '$2b$10$placeholder', 'student', 'Derecho', 'UCA', 'Masaya', 80),
('Sofía Ramírez', 'sofia.ramirez@hotmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Industrial', 'UNI', 'Managua', 70),
('Jorge Castro', 'jorge.castro@gmail.com', '$2b$10$placeholder', 'student', 'Medicina', 'UNAN', 'León', 90),
('Lucía Fernández', 'lucia.fernandez@yahoo.com', '$2b$10$placeholder', 'student', 'Arquitectura', 'UNI', 'Managua', 88),
('Diego Medina', 'diego.medina@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Civil', 'UNI', 'Managua', 82),
('Valentina Rojas', 'valentina.rojas@hotmail.com', '$2b$10$placeholder', 'student', 'Psicología', 'UCA', 'Managua', 78),
('Mateo Vargas', 'mateo.vargas@gmail.com', '$2b$10$placeholder', 'student', 'Economía', 'UNAN', 'Granada', 85),
('Camila Silva', 'camila.silva@yahoo.com', '$2b$10$placeholder', 'student', 'Relaciones Internacionales', 'UAM', 'Managua', 92),
('Andrés Ortiz', 'andres.ortiz@gmail.com', '$2b$10$placeholder', 'student', 'Comunicación Social', 'UCA', 'Managua', 80),
('Isabella Ríos', 'isabella.rios@hotmail.com', '$2b$10$placeholder', 'student', 'Farmacia', 'UNAN', 'León', 86),
('Gabriel Morales', 'gabriel.morales@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Mecánica', 'UNI', 'Managua', 79),
('Daniela Núñez', 'daniela.nunez@yahoo.com', '$2b$10$placeholder', 'student', 'Biología', 'UNAN', 'Managua', 84),
('Sebastián Herrera', 'sebastian.herrera@gmail.com', '$2b$10$placeholder', 'student', 'Turismo', 'UAM', 'Granada', 88),
('Natalia Peña', 'natalia.pena@hotmail.com', '$2b$10$placeholder', 'student', 'Odontología', 'UNAN', 'León', 95),
('Samuel Cruz', 'samuel.cruz@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Química', 'UNI', 'Managua', 81),
('Valeria Navarro', 'valeria.navarro@yahoo.com', '$2b$10$placeholder', 'student', 'Sociología', 'UCA', 'Managua', 77),
('Martín Aguilar', 'martin.aguilar@gmail.com', '$2b$10$placeholder', 'student', 'Historia', 'UNAN', 'Managua', 75),
('Renata Mendoza', 'renata.mendoza@hotmail.com', '$2b$10$placeholder', 'student', 'Traducción', 'UCA', 'Managua', 89),
('José Salazar', 'jose.salazar@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Electrónica', 'UNI', 'Managua', 83),
('Ximena Arias', 'ximena.arias@yahoo.com', '$2b$10$placeholder', 'student', 'Pedagogía', 'UNAN', 'Estelí', 86),
('Hugo Montes', 'hugo.montes@gmail.com', '$2b$10$placeholder', 'student', 'Artes Plásticas', 'UPOLI', 'Masaya', 70),
('Emilia Paredes', 'emilia.paredes@hotmail.com', '$2b$10$placeholder', 'student', 'Trabajo Social', 'UNAN', 'Managua', 82),
('Nicolás Campos', 'nicolas.campos@gmail.com', '$2b$10$placeholder', 'student', 'Matemáticas', 'UNAN', 'León', 91),
('Mariana Vega', 'mariana.vega@yahoo.com', '$2b$10$placeholder', 'student', 'Estadística', 'UNI', 'Managua', 85),
('Ángel Fuentes', 'angel.fuentes@gmail.com', '$2b$10$placeholder', 'student', 'Física', 'UNAN', 'Managua', 78),
('Romina Cárdenas', 'romina.cardenas@hotmail.com', '$2b$10$placeholder', 'student', 'Química', 'UNAN', 'León', 84),
('Esteban Miranda', 'esteban.miranda@gmail.com', '$2b$10$placeholder', 'student', 'Nutrición', 'UCA', 'Managua', 87),
('Fátima Blanco', 'fatima.blanco@yahoo.com', '$2b$10$placeholder', 'student', 'Geología', 'UNAN', 'Managua', 80),
('Felipe Escobar', 'felipe.escobar@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería Agrónoma', 'UNA', 'Managua', 83),
('Paula Rosales', 'paula.rosales@hotmail.com', '$2b$10$placeholder', 'student', 'Medicina Veterinaria', 'UCC', 'Managua', 88),
('Simón Guzmán', 'simon.guzman@gmail.com', '$2b$10$placeholder', 'student', 'Desarrollo Local', 'UCA', 'Matagalpa', 79),
('Victoria Pineda', 'victoria.pineda@yahoo.com', '$2b$10$placeholder', 'student', 'Diseño de Interiores', 'UAM', 'Managua', 92),
('Julián Orozco', 'julian.orozco@gmail.com', '$2b$10$placeholder', 'student', 'Animación Digital', 'UAM', 'Managua', 86),
('Andrea Cabrera', 'andrea.cabrera@hotmail.com', '$2b$10$placeholder', 'student', 'Periodismo', 'UCA', 'Managua', 84),
('Leonardo Ríos', 'leonardo.rios@gmail.com', '$2b$10$placeholder', 'student', 'Ciencias Políticas', 'UCA', 'Managua', 81),
('Antonia Soto', 'antonia.soto@yahoo.com', '$2b$10$placeholder', 'student', 'Literatura', 'UNAN', 'León', 75),
('Emilio Cordero', 'emilio.cordero@gmail.com', '$2b$10$placeholder', 'student', 'Filosofía', 'UCA', 'Managua', 70),
('Diana Mejía', 'diana.mejia@hotmail.com', '$2b$10$placeholder', 'student', 'Antropología', 'UNAN', 'Managua', 78),
('Fernando Aguilar', 'fernando.aguilar@gmail.com', '$2b$10$placeholder', 'student', 'Arqueología', 'UNAN', 'Managua', 82),
('Julia Santana', 'julia.santana@yahoo.com', '$2b$10$placeholder', 'student', 'Enfermería', 'UPOLI', 'Managua', 94),
('Joaquín Valdés', 'joaquin.valdes@gmail.com', '$2b$10$placeholder', 'student', 'Terapia Física', 'UNAN', 'Managua', 87),
('Alicia Navarro', 'alicia.navarro@hotmail.com', '$2b$10$placeholder', 'student', 'Optometría', 'UNAN', 'Managua', 85),
('Maximiliano Cruz', 'maximiliano.cruz@gmail.com', '$2b$10$placeholder', 'student', 'Ingeniería en Computación', 'UNI', 'Managua', 89),
('Lorena Mora', 'lorena.mora@yahoo.com', '$2b$10$placeholder', 'student', 'Seguridad Informática', 'UAM', 'Managua', 91),
('Mauricio Gil', 'mauricio.gil@gmail.com', '$2b$10$placeholder', 'student', 'Mecatrónica', 'UNI', 'Managua', 88);


-- 3. Insertar Experiencia (30)
INSERT INTO student_experience (user_id, title, company_name, location, start_date, end_date, current_job, description) VALUES
(1, 'Pasante de Sistemas', 'TechNica Labs', 'Managua', '2025-01-01', NULL, TRUE, 'Mantenimiento de redes y soporte técnico.'),
(2, 'Auxiliar Administrativo', 'Banco LAFISE', 'Granada', '2024-06-01', '2024-12-31', FALSE, 'Gestión de documentos y atención al cliente.'),
(3, 'Diseñador Gráfico Jr.', 'Agencia Pixel', 'León', '2025-03-01', NULL, TRUE, 'Creación de material publicitario para redes sociales.'),
(4, 'Pasante de Contabilidad', 'Grupo Pellas', 'Managua', '2024-01-01', '2024-06-30', FALSE, 'Apoyo en elaboración de estados financieros.'),
(5, 'Asistente de Marketing', 'Claro Nicaragua', 'Managua', '2025-02-01', NULL, TRUE, 'Ejecución de campañas publicitarias BTL.'),
(6, 'Asistente Legal', 'KPMG', 'Managua', '2024-08-01', '2025-01-31', FALSE, 'Revisión de contratos y documentación legal.'),
(7, 'Pasante de Operaciones', 'Cargill', 'Chinandega', '2025-04-01', NULL, TRUE, 'Optimización de procesos de logística.'),
(8, 'Interno Rotatorio', 'Hospital Metropolitano', 'Managua', '2024-05-01', '2025-05-01', FALSE, 'Rotaciones en pediatría, cirugía y medicina interna.'),
(9, 'Dibujante CAD', 'Cemex', 'Managua', '2025-01-15', NULL, TRUE, 'Elaboración de planos estructurales.'),
(10, 'Auxiliar de Topografía', 'Sinsa', 'Managua', '2024-03-01', '2024-10-31', FALSE, 'Levantamientos topográficos para proyectos de construcción.'),
(11, 'Asistente de Recursos Humanos', 'Sitel', 'Managua', '2025-02-15', NULL, TRUE, 'Filtro de currículums y entrevistas preliminares.'),
(12, 'Analista de Datos Jr.', 'Banpro', 'Managua', '2024-09-01', '2025-03-31', FALSE, 'Análisis de riesgo crediticio y limpieza de datos.'),
(13, 'Asistente de Proyectos', 'EAAI Consulting', 'Masaya', '2025-05-01', NULL, TRUE, 'Apoyo en gestión de proyectos ambientales.'),
(14, 'Community Manager', 'Gala', 'Granada', '2024-11-01', '2025-04-30', FALSE, 'Gestión de perfiles de Facebook e Instagram.'),
(15, 'Regente Farmacéutico Jr.', 'Pharmedic', 'Estelí', '2025-01-10', NULL, TRUE, 'Control de inventario de medicamentos controlados.'),
(16, 'Mecánico de Mantenimiento', 'Casa Pellas', 'Managua', '2024-02-01', '2024-08-31', FALSE, 'Mantenimiento preventivo de flota vehicular.'),
(17, 'Asistente de Laboratorio', 'UNAN', 'Managua', '2025-03-15', NULL, TRUE, 'Preparación de muestras para cultivos.'),
(18, 'Guía Turístico', 'Avianca', 'Managua', '2024-07-01', '2024-12-31', FALSE, 'Atención a turistas en rutas coloniales.'),
(19, 'Asistente Dental', 'Clínica Sonrisas', 'León', '2025-04-10', NULL, TRUE, 'Esterilización de equipo y asistencia en cirugías.'),
(20, 'Pasante de Control de Calidad', 'Flor de Caña', 'Chichigalpa', '2024-01-15', '2024-07-15', FALSE, 'Análisis de laboratorio de muestras de producción.'),
(21, 'Encuestador', 'UCA', 'Managua', '2025-02-01', '2025-03-01', FALSE, 'Levantamiento de encuestas de opinión pública.'),
(22, 'Auxiliar de Archivo', 'Hispamer', 'Managua', '2024-08-15', '2024-12-15', FALSE, 'Clasificación y catalogación de libros.'),
(23, 'Traductor Freelance', 'Concentrix', 'Managua', '2025-01-01', NULL, TRUE, 'Traducción de manuales técnicos Inglés-Español.'),
(24, 'Técnico de Reparación', 'Claro Nicaragua', 'Managua', '2024-05-01', '2024-11-30', FALSE, 'Reparación de terminales móviles.'),
(25, 'Tutor de Matemáticas', 'UCA', 'Managua', '2025-03-01', NULL, TRUE, 'Clases de reforzamiento para alumnos de primer ingreso.'),
(26, 'Ilustrador Digital', 'Agencia Pixel', 'León', '2024-09-01', '2025-02-28', FALSE, 'Diseño de personajes para campaña publicitaria.'),
(27, 'Asistente Comunitario', 'Alcaldía de Managua', 'Managua', '2025-01-15', NULL, TRUE, 'Organización de actividades sociales en barrios.'),
(28, 'Auxiliar de Contabilidad', 'La Colonia', 'Managua', '2024-04-01', '2024-10-31', FALSE, 'Arqueo de cajas y facturación.'),
(29, 'Asistente de Investigación', 'UNI', 'Managua', '2025-02-15', NULL, TRUE, 'Recolección de datos estadísticos para proyecto de IA.'),
(30, 'Recepcionista', 'AutoLote', 'León', '2024-06-01', '2024-12-31', FALSE, 'Atención al cliente y gestión de llamadas.');

-- 4. Insertar Habilidades de Estudiantes (80 filas)
-- Simulando unas 80 habilidades entre los 50 estudiantes
INSERT INTO student_skills (user_id, skill_name) VALUES
(1, 'Java'), (1, 'Python'), (1, 'SQL'),
(2, 'Excel'), (2, 'PowerBI'), (2, 'Administración'),
(3, 'Photoshop'), (3, 'Illustrator'), (3, 'Figma'),
(4, 'Contabilidad'), (4, 'Auditoría'),
(5, 'SEO'), (5, 'Google Analytics'), (5, 'Redes Sociales'),
(6, 'Derecho Civil'), (6, 'Redacción Legal'),
(7, 'AutoCAD'), (7, 'Lean Manufacturing'),
(8, 'Primeros Auxilios'), (8, 'Suturas'),
(9, 'Revit'), (9, 'SketchUp'),
(10, 'Topografía'), (10, 'Project Management'),
(11, 'Pruebas Psicométricas'), (11, 'Entrevistas'),
(12, 'Macroeconomía'), (12, 'R'),
(13, 'Negociación'), (13, 'Inglés'),
(14, 'Edición de Video'), (14, 'Redacción'),
(15, 'Farmacología'), (15, 'Atención al Cliente'),
(16, 'Mantenimiento Preventivo'), (16, 'Soldadura'),
(17, 'Microscopía'), (17, 'Cultivos Celulares'),
(18, 'Inglés Avanzado'), (18, 'Historia de Nicaragua'),
(19, 'Profilaxis'), (19, 'Radiografías Dentales'),
(20, 'Control de Calidad'), (20, 'Química Analítica'),
(21, 'Análisis Cualitativo'), (21, 'SPSS'),
(22, 'Archivística'), (22, 'Investigación Histórica'),
(23, 'Traducción Simultánea'), (23, 'Francés'),
(24, 'Electrónica Básica'), (24, 'Circuitos'),
(25, 'Planificación de Clases'), (25, 'Didáctica'),
(26, 'Pintura Acrílica'), (26, 'Escultura'),
(27, 'Mediación'), (27, 'Gestión de Casos'),
(28, 'Álgebra Lineal'), (28, 'Cálculo'),
(29, 'Análisis Estadístico'), (29, 'Python'),
(30, 'Física Clásica'), (30, 'Laboratorio'),
(31, 'Química Orgánica'), (31, 'Espectroscopía'),
(32, 'Dietética'), (32, 'Evaluación Nutricional'),
(33, 'Mapeo Geológico'), (33, 'Mineralogía'),
(34, 'Manejo de Cultivos'), (34, 'Sistemas de Riego'),
(35, 'Cirugía Veterinaria'), (35, 'Vacunación'),
(36, 'Planificación Comunitaria'), (36, 'Evaluación de Proyectos'),
(37, 'Renderizado 3D'), (37, 'AutoCAD'),
(38, 'Blender'), (38, 'Maya'),
(39, 'Reportaje'), (39, 'Locución'),
(40, 'Análisis Político'), (40, 'Relaciones Públicas'),
(41, 'Crítica Literaria'), (41, 'Gramática Avanzada'),
(42, 'Lógica Formal'), (42, 'Ética'),
(43, 'Excavación Arqueológica'), (43, 'Catalogación'),
(44, 'Epigrafía'), (44, 'Conservación'),
(45, 'Signos Vitales'), (45, 'Inyectología'),
(46, 'Rehabilitación'), (46, 'Masoterapia'),
(47, 'Refracción'), (47, 'Lentes de Contacto'),
(48, 'C++'), (48, 'Java'),
(49, 'Ciberseguridad'), (49, 'Redes'),
(50, 'Automatización'), (50, 'Robótica');

-- 5. Insertar Vacantes (40)
INSERT INTO jobs (title, company_id, location, type, employment_type, salary_min, salary_max, category, description, requirements, benefits) VALUES
('Desarrollador Full Stack Junior', 1, 'Managua', 'Remoto', 'Tiempo completo', 700, 1000, 'tech', 'Únete a nuestro equipo desarrollando aplicaciones web innovadoras.', 'React, Node.js, PostgreSQL\nInglés B1', 'Trabajo remoto\nBono anual'),
('Analista Financiero', 2, 'Granada', 'Híbrido', 'Tiempo completo', 800, 1200, 'finance', 'Análisis de riesgos y elaboración de proyecciones.', 'Excel avanzado\nConocimiento en PowerBI', 'Seguro médico\nOportunidad de crecimiento'),
('Diseñador UX/UI', 3, 'León', 'Presencial', 'Medio tiempo', 400, 600, 'design', 'Diseño de interfaces atractivas y funcionales.', 'Figma\nAdobe XD', 'Horario flexible\nAmbiente creativo'),
('Especialista en Redes Sociales', 4, 'Managua', 'Remoto', 'Por proyecto', 300, 500, 'marketing', 'Gestión de campañas en Facebook e Instagram.', 'Experiencia comprobada en Ads\nCreatividad', 'Pago por proyecto\nTrabajo remoto'),
('Asistente Administrativo', 5, 'Managua', 'Presencial', 'Tiempo completo', 500, 700, 'admin', 'Soporte en tareas administrativas y logísticas.', 'Manejo de Office\nOrganización', 'Prestaciones de ley\nEstabilidad'),
('Consultor Ambiental Jr.', 6, 'Masaya', 'Híbrido', 'Pasantía', 200, 300, 'tech', 'Apoyo en estudios de impacto ambiental.', 'Estudiante de últimos años\nDisponibilidad de viajar', 'Viáticos\nOportunidad de contratación'),
('Cajero(a)', 7, 'Managua', 'Presencial', 'Tiempo completo', 400, 500, 'admin', 'Atención al cliente y cobro en caja.', 'Experiencia en caja\nServicio al cliente', 'Bonos por meta\nUniforme'),
('Regente Farmacéutico', 8, 'Estelí', 'Presencial', 'Tiempo completo', 600, 900, 'health', 'Supervisión de farmacia y control de inventario.', 'Licenciatura en Farmacia\nLicencia vigente', 'Seguro de vida\nDescuentos en medicinas'),
('Ingeniero de Producción', 9, 'Chinandega', 'Presencial', 'Tiempo completo', 900, 1400, 'tech', 'Optimización de líneas de producción agroindustrial.', 'Ingeniería Industrial/Mecánica\nExperiencia previa', 'Transporte\nAlimentación'),
('Arquitecto Junior', 10, 'Managua', 'Híbrido', 'Tiempo completo', 700, 1100, 'design', 'Diseño de planos y supervisión de obras pequeñas.', 'AutoCAD\nRevit\nDisponibilidad inmediata', 'Crecimiento profesional\nBonos por proyecto'),
('Agente de Servicio al Cliente (Inglés)', 12, 'Managua', 'Presencial', 'Tiempo completo', 650, 850, 'admin', 'Atención telefónica a clientes en EEUU.', 'Inglés avanzado (C1)\nEmpatía', 'Bono por desempeño\nClínica médica'),
('Analista de Datos (Entry Level)', 14, 'Managua', 'Remoto', 'Tiempo completo', 750, 1000, 'tech', 'Limpieza y análisis exploratorio de datos.', 'Python, SQL\nPensamiento analítico', 'Trabajo 100% remoto\nSeguro privado'),
('Auditor Junior', 15, 'Managua', 'Híbrido', 'Tiempo completo', 600, 800, 'finance', 'Apoyo en auditorías externas.', 'Lic. en Contabilidad Pública\nManejo de normativas', 'Capacitación continua\nPlan de carrera'),
('Community Manager Fashion', 16, 'Granada', 'Remoto', 'Medio tiempo', 300, 450, 'marketing', 'Gestión de redes para marca de ropa.', 'Pasión por la moda\nExcelentes habilidades de redacción', 'Descuentos en productos\nHorario flexible'),
('Técnico en Control de Calidad', 17, 'Chichigalpa', 'Presencial', 'Tiempo completo', 500, 700, 'tech', 'Análisis de laboratorio en destilería.', 'Técnico en Química o afín\nAtención al detalle', 'Transporte\nSeguro de salud'),
('Supervisor de Ventas', 18, 'Managua', 'Presencial', 'Tiempo completo', 600, 1000, 'marketing', 'Supervisión de rutas de distribución.', 'Experiencia en ventas\nLiderazgo', 'Comisiones\nVehículo asignado'),
('Ingeniero Residente', 19, 'Managua', 'Presencial', 'Por proyecto', 800, 1200, 'tech', 'Supervisión directa en campo de proyectos de construcción.', 'Ing. Civil o Arquitectura\nManejo de presupuestos', 'Bono de fin de proyecto\nCelular corporativo'),
('Ejecutivo de Ventas Corporativas', 20, 'Managua', 'Híbrido', 'Tiempo completo', 500, 1500, 'marketing', 'Venta de flotas vehiculares a empresas.', 'Experiencia B2B\nHabilidades de negociación', 'Excelentes comisiones\nCapacitación'),
('Analista de Riesgo Crediticio', 21, 'Managua', 'Presencial', 'Tiempo completo', 700, 1000, 'finance', 'Evaluación de solicitudes de crédito.', 'Lic. en Finanzas/Economía\nCapacidad analítica', 'Seguro médico\nTasa preferencial en créditos'),
('Ejecutivo de Cuenta', 22, 'Managua', 'Híbrido', 'Tiempo completo', 600, 900, 'finance', 'Manejo de cartera de clientes premium.', 'Experiencia en banca\nExcelente presencia', 'Bonos\nPlan de carrera'),
('Pasante de RRHH', 23, 'Managua', 'Presencial', 'Pasantía', 250, 300, 'admin', 'Apoyo en reclutamiento y selección.', 'Estudiante de Psicología/RRHH\nProactividad', 'Oportunidad de plaza fija\nAyuda de transporte'),
('Agente de Viajes', 24, 'Managua', 'Híbrido', 'Tiempo completo', 500, 800, 'marketing', 'Venta de paquetes turísticos y boletos.', 'Experiencia en turismo\nInglés intermedio', 'Comisiones por venta\nViajes de familiarización'),
('Tutor Académico', 25, 'Managua', 'Remoto', 'Medio tiempo', 300, 400, 'admin', 'Tutorías en línea para estudiantes de secundaria.', 'Dominio de matemáticas/física\nPaciencia', 'Horario flexible\nTrabajo desde casa'),
('Mecánico Automotriz', 26, 'León', 'Presencial', 'Tiempo completo', 400, 600, 'tech', 'Diagnóstico y reparación de vehículos.', 'Técnico automotriz\nUso de escáner', 'Uniformes\nBonos de productividad'),
('Profesor de Inglés Adjunto', 27, 'Managua', 'Presencial', 'Por proyecto', 400, 600, 'admin', 'Impartición de clases de inglés en nivel pregrado.', 'Certificación TEFL/TESOL\nExperiencia docente', 'Uso de instalaciones\nCapacitación'),
('Desarrollador Backend Node.js', 1, 'Managua', 'Remoto', 'Tiempo completo', 800, 1200, 'tech', 'Creación de APIs escalables y seguras.', 'Node.js, Express, MongoDB\nDocker', 'Home office 100%\nBono de internet'),
('Analista Contable', 2, 'Granada', 'Presencial', 'Tiempo completo', 600, 800, 'finance', 'Registro de operaciones y conciliaciones bancarias.', 'Lic. Contabilidad\nManejo de software contable', 'Estabilidad laboral\nSeguro de vida'),
('Ilustrador Freelance', 3, 'León', 'Remoto', 'Por proyecto', 200, 500, 'design', 'Creación de ilustraciones para cuentos infantiles.', 'Portafolio sólido\nCreatividad', 'Pago por ilustración\nCrédito en publicación'),
('Especialista SEO', 4, 'Managua', 'Remoto', 'Tiempo completo', 600, 900, 'marketing', 'Optimización de posicionamiento orgánico.', 'Conocimiento de algoritmos de Google\nHerramientas SEO', 'Capacitación en marketing digital\nHorario flexible'),
('Coordinador de Logística', 5, 'Managua', 'Presencial', 'Tiempo completo', 700, 1000, 'admin', 'Coordinación de despachos y manejo de bodega.', 'Experiencia logística\nManejo de SAP', 'Bono de alimentación\nSeguro médico'),
('Técnico en Redes', 11, 'Managua', 'Presencial', 'Tiempo completo', 500, 700, 'tech', 'Instalación y mantenimiento de redes corporativas.', 'Técnico en Computación/Redes\nCCNA básico', 'Vehículo asignado\nViáticos'),
('Soporte Técnico Nivel 1', 12, 'Managua', 'Remoto', 'Tiempo completo', 400, 600, 'tech', 'Resolución de incidencias de usuarios vía ticket.', 'Conocimiento de SO Windows/Mac\nPaciencia', 'Trabajo remoto\nOportunidad de crecimiento'),
('Copywriter Creativo', 16, 'Granada', 'Remoto', 'Medio tiempo', 350, 500, 'marketing', 'Redacción de textos persuasivos para blogs y ads.', 'Excelente ortografía\nIngenio', 'Trabajo flexible\nBonos por resultados'),
('Asesor de Crédito', 21, 'Managua', 'Presencial', 'Tiempo completo', 400, 800, 'finance', 'Colocación de productos financieros.', 'Experiencia en ventas de intangibles\nFacilidad de palabra', 'Altas comisiones\nMetas alcanzables'),
('Enfermero(a) Profesional', 30, 'Managua', 'Presencial', 'Tiempo completo', 600, 900, 'health', 'Cuidado directo de pacientes hospitalizados.', 'Licenciatura en Enfermería\nDisponibilidad de turnos', 'Seguro de riesgos profesionales\nBonos nocturnos'),
('Nutricionista Clínico', 30, 'Managua', 'Híbrido', 'Medio tiempo', 400, 600, 'health', 'Evaluación nutricional de pacientes.', 'Lic. Nutrición\nExperiencia clínica', 'Uso de consultorio\nDescuentos hospitalarios'),
('Administrador de Base de Datos', 1, 'Managua', 'Remoto', 'Tiempo completo', 1000, 1500, 'tech', 'Mantenimiento y optimización de bases de datos PostgreSQL y MySQL.', 'SQL Avanzado\nTuning de BDD', 'Certificaciones pagadas\nRemoto'),
('Diseñador 3D Junior', 10, 'Managua', 'Híbrido', 'Por proyecto', 500, 800, 'design', 'Modelado y renderizado de proyectos arquitectónicos.', 'SketchUp, V-Ray, Lumion\nPortafolio', 'Pago por modelo\nFlexibilidad'),
('Psicólogo(a) Organizacional', 13, 'Managua', 'Presencial', 'Tiempo completo', 600, 900, 'admin', 'Clima laboral, reclutamiento y capacitaciones.', 'Lic. Psicología\nExperiencia en RRHH', 'Excelente clima laboral\nBeneficios de ley'),
('Abogado Junior Corporativo', 14, 'Managua', 'Híbrido', 'Tiempo completo', 700, 1000, 'admin', 'Redacción de contratos y trámites mercantiles.', 'Inscrito en la CSJ\nInglés avanzado', 'Bono de fin de año\nCrecimiento profesional');

-- 6. Insertar Habilidades de Vacantes (job_skills)
INSERT INTO job_skills (job_id, skill_name) VALUES
(1, 'React'), (1, 'Node.js'), (1, 'PostgreSQL'), (1, 'Git'),
(2, 'Excel Avanzado'), (2, 'PowerBI'), (2, 'Análisis Financiero'),
(3, 'Figma'), (3, 'Adobe XD'), (3, 'Prototipado'),
(4, 'Facebook Ads'), (4, 'Instagram Ads'), (4, 'Copywriting'),
(5, 'Microsoft Office'), (5, 'Organización'), (5, 'Atención al Cliente'),
(6, 'Evaluación de Impacto Ambiental'), (6, 'Legislación Ambiental'),
(7, 'Manejo de Caja'), (7, 'Servicio al Cliente'),
(8, 'Regencia Farmacéutica'), (8, 'Control de Inventario'),
(9, 'Optimización de Procesos'), (9, 'Lean Manufacturing'),
(10, 'AutoCAD'), (10, 'Revit'), (10, 'Presupuestos'),
(11, 'Inglés Avanzado'), (11, 'Atención Telefónica'),
(12, 'Python'), (12, 'SQL'), (12, 'Limpieza de Datos'),
(13, 'Auditoría Contable'), (13, 'Normativas NIIF'),
(14, 'Gestión de Redes Sociales'), (14, 'Moda'), (14, 'Redacción Creativa'),
(15, 'Análisis de Laboratorio'), (15, 'Química Analítica'),
(16, 'Gestión de Ventas'), (16, 'Liderazgo'),
(17, 'Supervisión de Obra'), (17, 'Gestión de Presupuestos'),
(18, 'Ventas Corporativas B2B'), (18, 'Negociación'),
(19, 'Análisis de Riesgo Crediticio'), (19, 'Finanzas'),
(20, 'Atención VIP'), (20, 'Gestión de Cartera'),
(21, 'Reclutamiento y Selección'), (21, 'Psicología Organizacional'),
(22, 'Sistemas de Reservas Turísticas'), (22, 'Ventas Turísticas'),
(23, 'Matemáticas Avanzadas'), (23, 'Didáctica'),
(24, 'Mecánica Automotriz'), (24, 'Uso de Escáner Automotriz'),
(25, 'TEFL/TESOL'), (25, 'Enseñanza del Inglés'),
(26, 'Node.js'), (26, 'Express'), (26, 'MongoDB'), (26, 'Docker'),
(27, 'Contabilidad'), (27, 'Conciliaciones Bancarias'), (27, 'Software Contable'),
(28, 'Ilustración Digital'), (28, 'Adobe Illustrator'),
(29, 'SEO'), (29, 'Google Analytics'), (29, 'Marketing Digital'),
(30, 'Logística'), (30, 'SAP'), (30, 'Gestión de Bodegas'),
(31, 'Redes Cisco CCNA'), (31, 'Instalación de Redes'),
(32, 'Soporte Técnico IT'), (32, 'Windows/Mac OS'),
(33, 'Copywriting'), (33, 'Redacción Persuasiva'),
(34, 'Venta de Intangibles'), (34, 'Asesoría de Créditos'),
(35, 'Cuidado de Pacientes'), (35, 'Enfermería Hospitalaria'),
(36, 'Evaluación Nutricional Clínica'), (36, 'Dietoterapia'),
(37, 'PostgreSQL Avanzado'), (37, 'MySQL'), (37, 'Tuning de Bases de Datos'),
(38, 'SketchUp'), (38, 'V-Ray'), (38, 'Modelado 3D'),
(39, 'Clima Laboral'), (39, 'Gestión de Talento Humano'),
(40, 'Derecho Corporativo'), (40, 'Redacción de Contratos Mercantiles');

-- 7. Insertar Aplicaciones (15)
-- Simulación de que algunos estudiantes aplicaron a las vacantes
INSERT INTO applications (user_id, job_id, status) VALUES
(1, 1, 'review'),
(1, 26, 'pending'),
(2, 2, 'accepted'),
(3, 3, 'review'),
(5, 4, 'pending'),
(4, 5, 'rejected'),
(6, 40, 'review'),
(8, 35, 'accepted'),
(9, 10, 'pending'),
(11, 39, 'review'),
(12, 12, 'pending'),
(14, 33, 'rejected'),
(20, 9, 'review'),
(28, 27, 'accepted'),
(49, 37, 'pending');

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
