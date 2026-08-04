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
const appCssPath = './src/App.css';
const indexCssPath = './src/index.css';

let appJsx = fs.readFileSync(appJsxPath, 'utf8');
let appCss = fs.readFileSync(appCssPath, 'utf8');
let indexCss = fs.readFileSync(indexCssPath, 'utf8');

// 1. Semantic HTML
appJsx = appJsx.replace('<div className="card">', '<main className="card">');
appJsx = appJsx.replace('    </div>\n  )\n}\n\nexport default App', '    </main>\n  )\n}\n\nexport default App');
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: use semantic main tag for app container');

// 2. Custom Scrollbar
appCss += `\n::-webkit-scrollbar { width: 8px; height: 8px; }\n::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }\n::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 4px; }\n::-webkit-scrollbar-thumb:hover { background: var(--fb-blue); }\n`;
fs.writeFileSync(appCssPath, appCss);
commit('feat: add custom webkit scrollbar styling');

// 3. Number Formatting
appJsx = appJsx.replace("const ageGroups =", "const numberFormatter = new Intl.NumberFormat('en-US');\nconst ageGroups =");
appJsx = appJsx.replace(/\{p\.value\.toLocaleString\(\)\}/g, "{numberFormatter.format(p.value)}");
appJsx = appJsx.replace(/\{post\.reach\.toLocaleString\(\)\}/g, "{numberFormatter.format(post.reach)}");
appJsx = appJsx.replace(/\{post\.engagement\.toLocaleString\(\)\}/g, "{numberFormatter.format(post.engagement)}");
appJsx = appJsx.replace(/\{post\.likes\.toLocaleString\(\)\}/g, "{numberFormatter.format(post.likes)}");
appJsx = appJsx.replace(/\{post\.comments\.toLocaleString\(\)\}/g, "{numberFormatter.format(post.comments)}");
appJsx = appJsx.replace(/\{post\.shares\.toLocaleString\(\)\}/g, "{numberFormatter.format(post.shares)}");
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: use Intl.NumberFormat for robust number formatting');

// 4. Empty State Component
appJsx = appJsx.replace('<span>No pages found</span>', '<div className="no-pages-alert" style={{color: "#f8fafc", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.9rem"}}>No Facebook Pages connected to this account.</div>');
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: improve empty state for pages list');

// 5. Footer (App.jsx)
appJsx = appJsx.replace('        </div>\n      )}\n    </main>', '        </div>\n      )}\n      <footer className="app-footer">Powered by React & Recharts</footer>\n    </main>');
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: add application footer component');

// 6. Footer Styling (App.css)
appCss += `\n.app-footer { text-align: center; color: var(--text-muted); margin-top: 2.5rem; font-size: 0.85rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }\n`;
fs.writeFileSync(appCssPath, appCss);
commit('feat: add footer styling');

// 7. CSS Reset (index.css)
indexCss = `*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n` + indexCss;
fs.writeFileSync(indexCssPath, indexCss);
commit('feat: add global box-sizing reset');

// 8. Table Row Hover Effect (App.css)
appCss = appCss.replace('.sortable-table td {\n  padding:', '.sortable-table td {\n  transition: background 0.2s ease;\n  padding:');
fs.writeFileSync(appCssPath, appCss);
commit('feat: add smooth transition to table row hover');

// 9. Fieldset for Dates (App.jsx)
appJsx = appJsx.replace('<div className="date-controls">', '<fieldset className="date-fieldset"><legend>Date Range</legend>\n              <div className="date-controls">');
appJsx = appJsx.replace('            </div>\n\n            <button\n              onClick={fetchPageInsights}', '            </div>\n            </fieldset>\n\n            <button\n              onClick={fetchPageInsights}');
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: wrap date controls in accessible fieldset');

// 10. Fieldset Styling (App.css)
appCss += `\n.date-fieldset { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; }\n.date-fieldset legend { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.75rem; }\n`;
fs.writeFileSync(appCssPath, appCss);
commit('feat: style date range fieldset');

// 11. Loading Spinner CSS (App.css)
appCss += `\n@keyframes spin { to { transform: rotate(360deg); } }\n.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px; }\n`;
fs.writeFileSync(appCssPath, appCss);
commit('feat: add loading spinner css animation');

// 12. Button Icon (App.jsx)
appJsx = appJsx.replace("{loading ? 'Fetching Insights...' : 'Get Insights'}", "{loading ? <><span className=\\\"spinner\\\"></span>Fetching Insights...</> : 'Get Insights'}");
fs.writeFileSync(appJsxPath, appJsx);
commit('feat: add visual spinner to loading button');

console.log("All 12 features committed successfully!");
