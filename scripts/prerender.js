import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const routes = [
  {
    path: '/',
    title: 'PowerElectronics Lab V2.4 - 6 Interactive Simulators',
    description: 'Real-time SCR firing, 6-Pulse Charger, STS <4ms Transfer, Soft Starter, Harmonics Filter with FFT. Built for students & substation engineers.',
    h1: 'Power Electronics Lab',
    activeSimulator: 'Suite Overview',
  },
  {
    path: '/foundation-lab',
    title: 'Foundation Lab - Power Electronics Simulator | SCR, Diode & Controlled Rectifiers',
    description: 'Explore diode, thyristor SCR, BJT/MOSFET, and controlled rectifier fundamentals with real-time waveform visualization in the Power Electronics Foundation Lab.',
    h1: 'Foundation Lab - Power Electronics Simulator',
    activeSimulator: 'PowerElectronics Foundation Lab',
  },
  {
    path: '/single-6-pulse-charger',
    title: '6-Pulse Battery Charger Simulator | 3-Phase SCR Rectifier & Ripple Filter',
    description: 'Interactive 3-Phase 6-Pulse SCR bridge rectifier simulator with alpha-firing angle control, LC ripple filter, protection relays, and fault injection.',
    h1: 'Single 6-Pulse Battery Charger Simulator',
    activeSimulator: 'Single 6-Pulse Charger',
  },
  {
    path: '/dual-charger-scheme',
    title: 'Dual Battery Charger Scheme Simulator | Substation 220VDC Auxiliary System',
    description: 'Industrial 220VDC dual battery charger system simulator with bus tie breaker, earth fault detection relay 64G, and station battery management.',
    h1: 'Dual Battery Charger Scheme Simulator',
    activeSimulator: 'Dual Charger Scheme',
  },
  {
    path: '/static-switch',
    title: 'Static Transfer Switch (STS) Simulator | Sub-Cycle AC Source Transfer <4ms',
    description: 'Sub-cycle <4ms dual AC source static transfer switch simulator with phase-lock synchronization, bumpless transfer matrix, and fault ride-through.',
    h1: 'Static Transfer Switch (STS) Simulator',
    activeSimulator: 'Static Transfer Switch',
  },
  {
    path: '/soft-starter',
    title: 'Solid-State Soft Starter Simulator | Thyristor Motor Ramp & Torque Control',
    description: 'Thyristor voltage ramp soft starter simulator for 3-phase induction motors with current limit, thermal modeling, torque-speed curves, and water hammer mitigation.',
    h1: 'Solid-State Soft Starter Simulator',
    activeSimulator: 'Solid-State Soft Starter',
  },
  {
    path: '/harmonics-filter',
    title: 'Harmonics & APF Filter Simulator | IEEE 519 THD & Active Power Quality',
    description: 'Harmonic analysis simulator referenced to IEEE 519 guidelines, featuring passive tuned LC filters, Active Power Filters (APF), and real-time FFT spectrum analyzer.',
    h1: 'Harmonics & APF Filter Simulator',
    activeSimulator: 'Harmonics & APF Filter',
  },
  {
    path: '/dc-dc-converter',
    title: 'DC-DC Converter Simulator | Buck, Boost, Buck-Boost & SEPIC Laboratory',
    description: 'Interactive DC-DC converter simulator featuring Buck, Boost, Buck-Boost, and SEPIC topologies with CCM/DCM boundary analysis, inductor ripple, and efficiency mapping.',
    h1: 'DC-DC Converter Laboratory Simulator',
    activeSimulator: 'DC-DC Converter Lab',
  },
  {
    path: '/disclaimer',
    title: 'Educational Simulation Notice & Accuracy Disclaimer | Power Electronics Lab',
    description: 'Educational simulation notice, numerical modeling accuracy limitations, non-affiliation statement (IEEE, IEC, NFPA, OSHA), and peer-review feedback contact.',
    h1: 'Educational Simulation Notice & Accuracy Disclaimer',
    activeSimulator: 'Accuracy Disclaimer',
  },
];

const templatePath = path.join(distDir, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('dist/index.html not found! Please run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(templatePath, 'utf-8');

routes.forEach((route) => {
  let pageHtml = baseHtml;

  // Replace Title & Description in Head
  pageHtml = pageHtml.replace(
    /<title>.*?<\/title>/s,
    `<title>${route.title}</title>`
  );
  pageHtml = pageHtml.replace(
    /<meta name="description" content=".*?" \/>/s,
    `<meta name="description" content="${route.description}" />`
  );

  // Keep <div id="root"></div> clean so users directly load the React application
  const finalHtml = pageHtml;

  if (route.path === '/') {
    fs.writeFileSync(templatePath, finalHtml, 'utf-8');
    console.log('✓ Prerendered dist/index.html');
  } else {
    const routeDir = path.join(distDir, route.path.replace('/', ''));
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), finalHtml, 'utf-8');
    console.log(`✓ Prerendered dist${route.path}/index.html`);
  }
});

console.log('Static prerendering completed successfully!');
