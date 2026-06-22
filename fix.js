const fs = require('fs');
let html = fs.readFileSync('Juva Connect.html', 'utf8');

html = html.replace(/style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; outline:none;"/g,
  `style="width:100%; padding:10px 12px; border:1px solid var(--border-mid); border-radius:8px; outline:none; background:var(--surface); color:var(--text);"`);

html = html.replace(/style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; outline:none; background:#fff;"/g,
  `style="width:100%; padding:10px 12px; border:1px solid var(--border-mid); border-radius:8px; outline:none; background:var(--surface); color:var(--text);"`);

html = html.replace(/style="width:50%; padding:8px; border:1px solid #e2e8f0; border-radius:8px; outline:none; background:#fff;"/g,
  `style="width:50%; padding:8px; border:1px solid var(--border-mid); border-radius:8px; outline:none; background:var(--surface); color:var(--text);"`);

html = html.replace(/style="width:50%; padding:8px; border:1px solid #e2e8f0; border-radius:8px; outline:none; background:#f8fafc;"/g,
  `style="width:50%; padding:8px; border:1px solid var(--border-mid); border-radius:8px; outline:none; background:var(--surface2); color:var(--text);"`);

html = html.replace(/style="width:100%; min-height:80px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; font-family:'Inter',sans-serif; font-size:14px; outline:none; resize:vertical;"/g,
  `style="width:100%; min-height:80px; padding:12px; border:1px solid var(--border-mid); border-radius:8px; font-family:'Inter',sans-serif; font-size:14px; outline:none; resize:vertical; background:var(--surface); color:var(--text);"`);

html = html.replace(/style="width:100%;padding:12px;border:1px solid var\(--border\);border-radius:8px;background:#f9fbfd;font-family:'Inter',sans-serif;font-size:14px;color:var\(--text-dark\);outline:none;transition:border-color 0\.2s"/g,
  `style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-family:'Inter',sans-serif;font-size:14px;color:var(--text);outline:none;transition:border-color 0.2s"`);

html = html.replace(/style="background:#f9fafb;"/g,
  `style="background:var(--surface2);color:var(--text);"`);

fs.writeFileSync('Juva Connect.html', html);
console.log('Fixed inline styles');
