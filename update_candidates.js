const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldEndpoint = "app.get('/api/companies/:id/candidates', async (req, res) => {";
// Since the function is complex, we will replace the whole block by finding it.
// We'll write a regex or just replace the string.

const blockOld = `app.get('/api/companies/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const query = \`
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
    \`;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener candidatos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});`;

const blockNew = `app.get('/api/companies/:id/candidates', async (req, res) => {
  try {
    const { id } = req.params;
    const query = \`
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
    \`;
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
});`;

code = code.replace(blockOld, blockNew);
fs.writeFileSync('server.js', code);
console.log('Candidates endpoint updated with Match Algorithm');
