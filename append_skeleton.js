const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const skeletonLogic = `
// ==========================================
// SKELETON LOADERS
// ==========================================
function renderJobSkeletons(containerId, count = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  for (let i = 0; i < count; i++) {
    html += \`
      <div class="job-card skeleton" style="min-height: 160px; margin-bottom: 20px;">
        <div class="jc-header"><div class="jc-logo"></div></div>
        <div class="jc-title">Loading title</div>
        <div class="jc-company">Loading company</div>
      </div>
    \`;
  }
  container.innerHTML = html;
}

function renderCandidateSkeletons() {
  const rc = document.getElementById('recent-candidates');
  if (rc) {
    let html = '';
    for(let i=0; i<3; i++){
       html += '<div class="candidate-card skeleton" style="min-height: 80px; margin-bottom: 10px;"></div>';
    }
    rc.innerHTML = html;
  }
  const tb = document.querySelector('#tab-candidates tbody');
  if(tb) {
     tb.innerHTML = '<tr><td colspan="6"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>';
  }
}
`;

fs.appendFileSync('script.js', skeletonLogic);

// Insert the skeleton calls
code = fs.readFileSync('script.js', 'utf8');
code = code.replace(
  'async function loadJobsFromServer() {\n  try {', 
  'async function loadJobsFromServer() {\n  renderJobSkeletons(\'jobs-grid\', 6);\n  renderJobSkeletons(\'rec-jobs-grid\', 4);\n  try {'
);

code = code.replace(
  '  let candidates = [];\n  \n  try {',
  '  let candidates = [];\n  renderCandidateSkeletons();\n  try {'
);

fs.writeFileSync('script.js', code);
console.log('Skeleton logic injected');
