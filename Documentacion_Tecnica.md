# Documentación Técnica: JuvaConnect

## 1. Descripción del Sistema
JuvaConnect es una plataforma web (Bolsa de Empleo Universitaria) diseñada bajo un modelo **Cliente-Servidor**. Está enfocada en facilitar la interacción entre estudiantes universitarios y empresas para la publicación y gestión de vacantes, pasantías y empleos. Utiliza un stack de desarrollo ligero basado en Node.js, Express, PostgreSQL y Vanilla JS en el frontend.

## 2. Requisitos del Sistema y Entorno
- **Entorno de ejecución**: Node.js v16.0 o superior.
- **Base de Datos**: PostgreSQL 12 o superior.
- **Gestor de paquetes**: npm o yarn.
- **Navegador Web**: Cualquier navegador moderno con soporte para ES6+, CSS Grid y Flexbox (Chrome, Firefox, Safari, Edge).

## 3. Arquitectura
La arquitectura sigue un patrón de API REST clásico:
- **Frontend (Cliente)**: Es una Single Page Application (SPA) manejada completamente por `bolsa_empleo_universitaria.html`, `styles.css` y `script.js`. El estado (visibilidad de pantallas, modales, alertas) se maneja en el DOM de forma dinámica sin el uso de frameworks externos como React o Angular. Las peticiones al servidor se realizan mediante la Fetch API nativa.
- **Backend (Servidor)**: Aplicación construida en Node.js utilizando `Express.js`. Provee la lógica de negocio y comunicación con la base de datos a través de una API REST.
- **Base de Datos**: Base de datos relacional PostgreSQL. Se comunica con el backend a través de la librería `pg` (Node-Postgres) utilizando un Pool de conexiones.

## 4. Estructura de la Base de Datos (`schema.sql`)
La base de datos se encuentra altamente normalizada e incluye 10 tablas principales:
1. `companies`: Almacena la información de las empresas reclutadoras.
2. `users`: Entidad central para autenticación y perfiles (estudiantes y empresas), diferenciados por el atributo `role`.
3. `jobs`: Ofertas laborales publicadas por las empresas.
4. `applications`: Tabla pivote que maneja la relación N:M entre `users` y `jobs` (Estado de la postulación).
5. Tablas de Perfil Estudiantil: `student_skills`, `student_experience`, `student_education`, `student_projects`.
6. Tablas de Ofertas: `job_skills` (habilidades requeridas) y `saved_jobs` (ofertas favoritas).

## 5. Endpoints de la API REST (`server.js`)
El servidor escucha en el puerto definido por el entorno (`PORT`) y expone:

- `GET /api/jobs`
  - **Uso**: Obtiene el listado completo de vacantes activas.
  - **Respuesta**: Array de objetos JSON combinando los datos de la tabla `jobs`, `companies` y `job_skills`.
  
- `POST /api/login`
  - **Uso**: Autenticación de usuario.
  - **Cuerpo**: `{ "email": "...", "password": "..." }`
  - **Respuesta**: Objeto de usuario autenticado con su rol.

- `POST /api/register`
  - **Uso**: Creación de un nuevo estudiante.
  - **Cuerpo**: Datos básicos, universidad, carrera.
  - **Respuesta**: Objeto del usuario recién creado.

- `POST /api/jobs`
  - **Uso**: Permite a una empresa crear una vacante.
  - **Cuerpo**: Detalles del puesto y array de habilidades.
  - **Respuesta**: ID de la vacante generada.
  
- `POST /api/applications`
  - **Uso**: Postulación de un estudiante a una oferta (Upsert para actualizar fecha si ya existe).
  - **Cuerpo**: `{ "user_id": 1, "job_id": 5 }`

## 6. Variables de Entorno (`.env`)
El proyecto requiere un archivo `.env` en la raíz con la siguiente configuración:
```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/nombre_base_de_datos
```

## 7. Ejecución y Despliegue Local
1. Clonar el repositorio.
2. Ejecutar `npm install` para instalar dependencias (`express`, `pg`, `cors`, `dotenv`).
3. Ejecutar el script `schema.sql` en el gestor PostgreSQL para construir la estructura y el *seed data*.
4. Ejecutar `npm run dev` para iniciar el servidor con *Nodemon*.
5. Abrir `bolsa_empleo_universitaria.html` en el navegador (o mediante una extensión como Live Server).
