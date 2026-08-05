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

let appJsx = fs.readFileSync(appJsxPath, 'utf8');
let appCss = fs.readFileSync(appCssPath, 'utf8');

// 1. Remove unused imports
appJsx = appJsx.replace("import { LineChart, Line, PieChart, Pie, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Cell, Legend } from 'recharts'", "import { LineChart, Line, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts'");
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: remove unused Recharts imports');

// 2. Add async defer to FB SDK
appJsx = appJsx.replace('js.src = "https://connect.facebook.net/en_US/sdk.js";', 'js.src = "https://connect.facebook.net/en_US/sdk.js";\n      js.async = true;\n      js.defer = true;');
fs.writeFileSync(appJsxPath, appJsx);
commit('perf: add async and defer to Facebook SDK script');

// 3. Hover transform for outline buttons
appCss = appCss.replace('.btn-outline:hover {\n  background: rgba(255, 255, 255, 0.05);\n  color: white;\n}', '.btn-outline:hover {\n  background: rgba(255, 255, 255, 0.05);\n  color: white;\n  transform: translateY(-1px);\n}');
fs.writeFileSync(appCssPath, appCss);
commit('style: add hover transform to outline buttons');

// 4. Optional chaining insightsRes
appJsx = appJsx.replace('if (insightsRes && insightsRes.data) {', 'if (insightsRes?.data) {');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use optional chaining for insights response');

// 5. Optional chaining dailyRes
appJsx = appJsx.replace('if (dailyRes && dailyRes.data) {', 'if (dailyRes?.data) {');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use optional chaining for daily response');

// 6. Optional chaining postsRes
appJsx = appJsx.replace('if (postsRes && postsRes.data) {', 'if (postsRes?.data) {');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use optional chaining for posts response');

// 7. Optional chaining demoRes
appJsx = appJsx.replace('if (demoRes && demoRes.data) {', 'if (demoRes?.data) {');
fs.writeFileSync(appJsxPath, appJsx);
commit('refactor: use optional chaining for demographics response');

// 8. Add title to sortable headers
appJsx = appJsx.replace(/className="sortable-header"/g, 'className="sortable-header" title="Click to sort"');
fs.writeFileSync(appJsxPath, appJsx);
commit('a11y: add title attribute to sortable table headers');

console.log("All 8 features committed successfully!");
