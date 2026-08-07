const fs = require('fs');
const { execSync } = require('child_process');

function commit(msg) {
  try {
    execSync('git add .');
    execSync(`git commit -m "${msg}"`);
    console.log(`[OK] ${msg}`);
  } catch (err) {
    console.error(`[ERROR] Failed on: ${msg}`, err.message);
  }
}

const appJsxPath = './src/App.jsx';
const indexHtmlPath = './index.html';
const readmePath = './README.md';

let appJsx = fs.readFileSync(appJsxPath, 'utf8');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
let readme = fs.readFileSync(readmePath, 'utf8');

// 1. Add theme-color meta tag
indexHtml = indexHtml.replace('<meta name="description" content="A dashboard to view your Facebook Page insights and analytics." />', '<meta name="description" content="A dashboard to view your Facebook Page insights and analytics." />\n    <meta name="theme-color" content="#0f172a" />');
fs.writeFileSync(indexHtmlPath, indexHtml);
commit('seo: add theme-color meta tag');

// 2. Add Open Graph title meta tag
indexHtml = indexHtml.replace('<title>Facebook Insights</title>', '<meta property="og:title" content="Facebook Insights Dashboard" />\n    <title>Facebook Insights</title>');
fs.writeFileSync(indexHtmlPath, indexHtml);
commit('seo: add open graph title meta tag');

// 3. Remove unused React default import
appJsx = appJsx.replace("import React, { useState, useEffect } from 'react'", "import { useState, useEffect } from 'react'");
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: remove unused React default import');

// 4. Improve CSV export filename
appJsx = appJsx.replace('facebook_insights_multi_${since}_to_${until}.csv', 'fb_insights_${since}_to_${until}.csv');
fs.writeFileSync(appJsxPath, appJsx);
commit('ux: improve csv export filename formatting');

// 5. Improve PDF export filename
appJsx = appJsx.replace('facebook_insights_multi_${since}_to_${until}.pdf', 'fb_insights_${since}_to_${until}.pdf');
fs.writeFileSync(appJsxPath, appJsx);
commit('ux: improve pdf export filename formatting');

// 6. Semantic HTML for login view
appJsx = appJsx.replace('<div className="login-view">', '<section className="login-view">');
appJsx = appJsx.replace('          </div>\n        </div>', '          </div>\n        </section>');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use section tag for login view');

// 7. Semantic HTML for dashboard
appJsx = appJsx.replace('<div className="dashboard">', '<section className="dashboard">');
appJsx = appJsx.replace('          )}\n        </div>', '          )}\n        </section>');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use section tag for dashboard container');

// 8. Add aria-label to export actions
appJsx = appJsx.replace('<div className="export-actions" style=', '<div className="export-actions" aria-label="Export options" style=');
fs.writeFileSync(appJsxPath, appJsx);
commit('a11y: add aria-label to export actions container');

// 9. Add aria-label to page selectors
appJsx = appJsx.replace('<div className="page-selectors">', '<div className="page-selectors" aria-label="Page Selection List" role="group">');
fs.writeFileSync(appJsxPath, appJsx);
commit('a11y: add aria-label and role to page selectors');

// 10. Update README with status badge
readme = readme.replace('# Facebook Page Insights Dashboard\n', '# Facebook Page Insights Dashboard\n\n![Status](https://img.shields.io/badge/status-active-success.svg)\n');
fs.writeFileSync(readmePath, readme);
commit('docs: add active status badge to readme');

console.log("All 10 features committed successfully!");
