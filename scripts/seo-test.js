import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distIndexPath = path.resolve(__dirname, '../dist/index.html');

console.log('----------------------------------------------------');
console.log(' Running SEO & Crawlability Automated Test Suite... ');
console.log('----------------------------------------------------\n');

if (!fs.existsSync(distIndexPath)) {
  console.error('FAIL: dist/index.html does not exist. Run "npm run build" first.');
  process.exit(1);
}

const html = fs.readFileSync(distIndexPath, 'utf-8');
let totalFailures = 0;

function runCheck(label, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}${details ? ` - ${details}` : ''}`);
    totalFailures++;
  }
}

// 1. <title> tag check
runCheck(
  '<title> tag exists and is non-empty',
  /<title>[\s\S]+?<\/title>/i.test(html)
);

// 2. Meta description check
runCheck(
  '<meta name="description"> exists and is non-empty',
  /<meta\s+name="description"\s+content="[^"]+"/i.test(html) ||
    /<meta\s+content="[^"]+"\s+name="description"/i.test(html)
);

// 3. Open Graph tags check
runCheck(
  'Open Graph og:title tag exists',
  /<meta\s+property="og:title"\s+content="[^"]+"/i.test(html)
);
runCheck(
  'Open Graph og:description tag exists',
  /<meta\s+property="og:description"\s+content="[^"]+"/i.test(html)
);
runCheck(
  'Open Graph og:image tag exists',
  /<meta\s+property="og:image"\s+content="[^"]+"/i.test(html)
);
runCheck(
  'Open Graph og:url tag exists',
  /<meta\s+property="og:url"\s+content="[^"]+"/i.test(html)
);
runCheck(
  'Open Graph og:type tag exists',
  /<meta\s+property="og:type"\s+content="[^"]+"/i.test(html)
);

// 4. Twitter card check
runCheck(
  'Twitter card meta tag exists',
  /<meta\s+name="twitter:card"\s+content="[^"]+"/i.test(html)
);

// 5. <noscript> block check
runCheck(
  '<noscript> fallback section exists',
  /<noscript>[\s\S]+?<\/noscript>/i.test(html)
);

// 6. JSON-LD structured data check
runCheck(
  'JSON-LD structured data with author Anil Sharma exists',
  /application\/ld\+json/i.test(html) && html.includes('Anil Sharma')
);

// 7. Check for all 6 simulator names
const simulatorNames = [
  'Foundation Lab',
  '6-Pulse Charger',
  'Dual Charger',
  'Static Transfer Switch',
  'Soft Starter',
  'Harmonics',
];

console.log('\n--- Simulator Name Verification ---');
simulatorNames.forEach((simName) => {
  runCheck(
    `Simulator name "${simName}" present in static HTML`,
    html.includes(simName)
  );
});

console.log('\n----------------------------------------------------');
if (totalFailures === 0) {
  console.log(' All SEO & Crawlability checks PASSED successfully!');
  console.log('----------------------------------------------------\n');
  process.exit(0);
} else {
  console.error(` FAIL: ${totalFailures} SEO check(s) failed.`);
  console.log('----------------------------------------------------\n');
  process.exit(1);
}
