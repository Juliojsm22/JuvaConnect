const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Add fetchWithAuth function
const apiVarDec = "const API_URL = 'http://localhost:3000/api';";
const fetchWithAuthFunc = `
async function fetchWithAuth(url, options = {}) {
  const token = sessionStorage.getItem('juva_token');
  if (token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(url, options);
}
`;

if (!code.includes('function fetchWithAuth')) {
  code = code.replace(apiVarDec, apiVarDec + '\n' + fetchWithAuthFunc);
}

// Replace fetches
// This regex specifically targets await fetch(`${API_URL}...
code = code.replace(/await fetch\(`\$\{API_URL\}/g, 'await fetchWithAuth(`${API_URL}');
// Revert login and register back to fetch because we don't have token yet (or we are acquiring it)
code = code.replace(/await fetchWithAuth\(`\$\{API_URL\}\/login`/g, 'await fetch(`${API_URL}/login`');
code = code.replace(/await fetchWithAuth\(`\$\{API_URL\}\/register`/g, 'await fetch(`${API_URL}/register`');

fs.writeFileSync('script.js', code);
console.log('Refactor complete');
