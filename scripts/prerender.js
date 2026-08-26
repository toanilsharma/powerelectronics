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
    description: 'IEEE 519 compliant harmonic analysis simulator featuring passive tuned LC filters, Active Power Filters (APF), and real-time FFT spectrum analyzer.',
    h1: 'Harmonics & APF Filter Simulator',
    activeSimulator: 'Harmonics & APF Filter',
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

  // Content Snapshot to inject inside <div id="root"></div>
  const contentSnapshot = `
    <header style="padding: 16px 24px; background: rgba(10,16,32,0.95); border-bottom: 1px solid rgba(30,41,59,0.8); display: flex; items-center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-weight: 900; font-size: 18px; color: #38bdf8;">⚡ Power Electronics Lab</span>
        <span style="background: #2563eb; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">LAB</span>
      </div>
      <nav style="display: flex; gap: 16px; font-size: 14px; color: #94a3b8;">
        <span>Foundation Lab</span>
        <span>6-Pulse Charger</span>
        <span>Dual Charger</span>
        <span>Static Switch</span>
        <span>Soft Starter</span>
        <span>Harmonics Filter</span>
      </nav>
    </header>

    <main style="max-width: 1200px; margin: 40px auto; padding: 0 24px; color: #f8fafc; font-family: sans-serif;">
      <section style="margin-bottom: 32px;">
        <h1 style="font-size: 32px; font-weight: 800; color: #38bdf8; margin-bottom: 12px;">${route.h1}</h1>
        <p style="font-size: 18px; color: #cbd5e1; max-width: 800px; line-height: 1.6;">${route.description}</p>
      </section>

      <section style="margin-top: 40px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #60a5fa; margin-bottom: 20px;">6 Interactive Power Electronics Simulators</h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #38bdf8; margin-top: 0;">🧪 Foundation Lab</h3>
            <p style="color: #94a3b8; font-size: 14px;">Diode, Thyristor SCR, BJT/MOSFET &amp; Controlled Rectifier fundamentals with real-time waveform visualization.</p>
            <span style="font-size: 11px; background: #0f172a; color: #38bdf8; padding: 4px 8px; border-radius: 4px;">IEEE 519 | IEC 60146</span>
          </article>

          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #fbbf24; margin-top: 0;">⚡ Single 6-Pulse Charger</h3>
            <p style="color: #94a3b8; font-size: 14px;">3-Phase SCR bridge rectifier with &alpha;-firing control, LC ripple filter, protection relays, and fault injection.</p>
            <span style="font-size: 11px; background: #0f172a; color: #fbbf24; padding: 4px 8px; border-radius: 4px;">415VAC / 110VDC 100A</span>
          </article>

          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #facc15; margin-top: 0;">🔋 Dual Charger Scheme</h3>
            <p style="color: #94a3b8; font-size: 14px;">Substation 220VDC dual charger system with bus tie breaker, earth fault relay 64G, and battery bank management.</p>
            <span style="font-size: 11px; background: #0f172a; color: #facc15; padding: 4px 8px; border-radius: 4px;">IEEE 946 | IEEE 1188</span>
          </article>

          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #f43f5e; margin-top: 0;">⚡ Static Transfer Switch (STS)</h3>
            <p style="color: #94a3b8; font-size: 14px;">Sub-cycle &lt;4ms dual AC source transfer switch with phase-lock synchronization and bumpless matrix.</p>
            <span style="font-size: 11px; background: #0f172a; color: #f43f5e; padding: 4px 8px; border-radius: 4px;">IEC 62040-3 | IEEE 1547</span>
          </article>

          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #14b8a6; margin-top: 0;">🚀 Solid-State Soft Starter</h3>
            <p style="color: #94a3b8; font-size: 14px;">Thyristor voltage ramp starter for heavy induction motors with current limit, thermal modeling, and water hammer mitigation.</p>
            <span style="font-size: 11px; background: #0f172a; color: #14b8a6; padding: 4px 8px; border-radius: 4px;">IEC 60947-4 | IEEE 841</span>
          </article>

          <article style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="font-size: 18px; color: #a855f7; margin-top: 0;">📊 Harmonics &amp; APF Filter</h3>
            <p style="color: #94a3b8; font-size: 14px;">Passive tuned LC filter &amp; Active Power Filter (APF) with real-time FFT THD spectrum scanner aligned with IEEE 519.</p>
            <span style="font-size: 11px; background: #0f172a; color: #a855f7; padding: 4px 8px; border-radius: 4px;">IEEE 519-2022</span>
          </article>
        </div>
      </section>

      <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 14px;">
        <p>Power Electronics Lab — Designed &amp; Developed by Anil Sharma</p>
      </footer>
    </main>
  `;

  // Inject content snapshot inside <div id="root"></div>
  const finalHtml = pageHtml.replace(
    '<div id="root"></div>',
    `<div id="root">${contentSnapshot}</div>`
  );

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
