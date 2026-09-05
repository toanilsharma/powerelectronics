import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ChevronDown, Zap, BookOpen, HelpCircle, Sun, Moon, Search, ArrowRight, ShieldCheck, Activity, Cpu, Sliders, Sparkles, CheckCircle2, Loader2, Info, Award, FlaskConical, BarChart3, Settings2, ChevronRight, GraduationCap, Play, SlidersHorizontal, LayoutGrid, Table, Command } from 'lucide-react';
import { WaveformBackground } from './components/WaveformBackground';
import { MethodologyView } from './components/MethodologyView';
import { ContactView } from './components/ContactView';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { StandardsView } from './components/StandardsView';
import { DisclaimerView } from './components/DisclaimerView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { CommonFooter } from './components/CommonFooter';
import { UniversalVisualQuickNav } from './components/UniversalVisualQuickNav';
import { ContactModal, PrivacyModal, TermsModal, AboutModal, DisclaimerModal } from './components/FooterModals';
import { TopologyPreviewSVG } from './components/TopologyPreviewSVG';
import { SpecModal } from './components/SpecModal';
import CommandPaletteModal from './components/CommandPaletteModal';
import PersonaShowcase from './components/PersonaShowcase';
import EngineeringMatrixTable from './components/EngineeringMatrixTable';
import { HeroLiveOscilloscope } from './components/HeroLiveOscilloscope';
import { PowerSimFoundationLab } from './components/PowerSimFoundationLab';
import { BatteryChargerSLD } from './components/BatteryChargerSLD';
import { BatteryChargerWaveforms } from './components/BatteryChargerWaveforms';
import { BatteryChargerControlsAndSOP } from './components/BatteryChargerControlsAndSOP';
import { BatteryChargerFaultPanel } from './components/BatteryChargerFaultPanel';
import { BatteryChargerAlarmBanner } from './components/BatteryChargerAlarmBanner';
import { AlarmsAndAlertsModal } from './components/AlarmsAndAlertsModal';
import { BatteryChargerOperatorView } from './components/BatteryChargerOperatorView';
import { BatteryChargerReliabilityView } from './components/BatteryChargerReliabilityView';
import { DualBatteryChargerContainer } from './components/DualBatteryChargerContainer';
import { SingleChargerSimulatorHMI } from './components/SingleChargerSimulatorHMI';
import { ActiveFaults, AlarmEntry, AlarmLevel, ProtectionRelay } from './types/batteryCharger';

import { StaticSwitchSLD } from './components/StaticSwitchSLD';
import { StaticSwitchSynchroscope } from './components/StaticSwitchSynchroscope';
import { StaticSwitchControlsAndSOP } from './components/StaticSwitchControlsAndSOP';
import { StaticSwitchFaultPanel } from './components/StaticSwitchFaultPanel';
import { BumplessTransferMatrix } from './components/BumplessTransferMatrix';
import { ActiveSource, STSFaults, STSTransferMode, BumplessMatrixState } from './types/staticSwitch';


import { SoftStarterSLD } from './components/SoftStarterSLD';
import { SoftStarterWaveforms } from './components/SoftStarterWaveforms';
import { SoftStarterControlsAndSOP } from './components/SoftStarterControlsAndSOP';
import { SoftStarterFaultPanel } from './components/SoftStarterFaultPanel';
import { SoftStarterRightPanel } from './components/SoftStarterRightPanel';
import { StateMachineLamps } from './components/StateMachineLamps';
import { SoftStarterGuidedTour, SOFT_STARTER_TOUR_STEPS } from './components/SoftStarterGuidedTour';
import { ScenarioPresets } from './components/ScenarioPresets';
import { FaultTrainer, FAULT_CASES } from './components/FaultTrainer';
import { CompareStarters } from './components/CompareStarters';
import { StartProfileChart } from './components/StartProfileChart';
import { TorqueSpeedCurve } from './components/TorqueSpeedCurve';
import { WaterHammerTrace } from './components/WaterHammerTrace';
import { BusDipView } from './components/BusDipView';
import { ThermalGauge } from './components/ThermalGauge';
import { ThyristorScope } from './components/ThyristorScope';
import { generateStartReportPDF } from './utils/pdfReportGenerator';
import { SoftStarterFaults, SoftStarterParams, SoftStarterReadouts } from './types/softStarter';
import { SoftStarter } from './pages/SoftStarter';
import { DCDCConverter } from './pages/DCDCConverter';
import { SinglePhaseInverter } from './pages/SinglePhaseInverter';


import { HarmonicsFFTChart } from './components/HarmonicsFFTChart';
import { HarmonicsFilterAndIEEE } from './components/HarmonicsFilterAndIEEE';
import { HarmonicsRightPanel } from './components/HarmonicsRightPanel';
import { CyberIndustrialPowerLab } from './components/CyberIndustrialPowerLab';
import {
  ActiveFilterConfig,
  HarmonicBarData,
  HarmonicSourceType,
  IEEE519Params,
  PassiveFilterConfig,
} from './types/harmonics';

import { playAlarmSound } from './utils/audioAlerts';

interface Simulator {
  id: string;
  tabName: string;
  title: string;
  icon: string;
  description: string;
  studentBenefit: string;
  metricsRow: string;
  standards: string[];
  voltage: string;
  categoryBadge: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Industrial';
  learnConcepts: string[];
  ctaText: string;
  colorTheme: 'emerald' | 'amber' | 'yellow' | 'blue' | 'indigo' | 'rose' | 'sky' | 'teal' | 'purple';
  specSummary: string;
}

const SIMULATORS: Simulator[] = [
  {
    id: 'foundation-lab',
    tabName: 'Power Electronics Fundamentals',
    title: 'Power Electronics Fundamentals Lab',
    icon: '🧪',
    description: 'Diode rectifiers, thyristor SCR firing angles, BJT/MOSFET switching & PWM choppers.',
    studentBenefit: 'Understand diode & SCR switching waveforms in real time.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEEE 519 Ref', 'IEC 60146 Ref'],
    voltage: 'Fundamental Circuits',
    categoryBadge: 'LAB',
    difficulty: 'Beginner',
    learnConcepts: ['Diode Rectifiers', 'SCR Firing Angle', 'PWM Choppers'],
    ctaText: 'Launch Simulator',
    colorTheme: 'emerald',
    specSummary: 'Diode / SCR / PWM'
  },
  {
    id: 'single-charger',
    tabName: '6-Pulse Controlled Rectifier Charger',
    title: '6-Pulse Controlled Rectifier Charger',
    icon: '⚡',
    description: '3-Phase SCR bridge rectifier with α-firing angle control, LC ripple filter & protection relays.',
    studentBenefit: 'See how thyristor firing angle controls DC output voltage and ripple.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEEE 1188 Ref', 'IEC 62485 Ref'],
    voltage: '415VAC / 110VDC 100A',
    categoryBadge: 'CHARGER',
    difficulty: 'Intermediate',
    learnConcepts: ['6-Pulse SCR Bridge', 'Alpha Firing Control', 'LC Ripple Filter'],
    ctaText: 'Launch Simulator',
    colorTheme: 'amber',
    specSummary: '415V / 110VDC'
  },
  {
    id: 'dual-charger',
    tabName: 'Dual-Bank DC Charger System',
    title: 'Dual-Bank DC Charger System',
    icon: '🔋',
    description: 'Substation 220VDC dual battery charger system with bus tie breaker & 64G earth fault relay.',
    studentBenefit: 'Learn how dual chargers and bus tie switches maintain unbroken DC power.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEEE 1188 Ref', 'IEEE 946 Ref'],
    voltage: '2x 415VAC / 2x 220VDC',
    categoryBadge: 'DC SUBSTATION',
    difficulty: 'Industrial',
    learnConcepts: ['220VDC Bus Tie', '64G Earth Fault Relay', 'Dual Bank Interlock'],
    ctaText: 'Launch Simulator',
    colorTheme: 'yellow',
    specSummary: '220VDC Dual Bank'
  },
  {
    id: 'static-switch',
    tabName: 'Static Transfer Switch',
    title: 'Static Transfer Switch (STS)',
    icon: '⚡',
    description: 'Sub-cycle <4ms dual AC source transfer switch with phase synchronization & transfer matrix.',
    studentBenefit: 'Observe sub-cycle phase transfer logic for critical UPS power paths.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEC 62040 Ref', 'IEEE 1547 Ref'],
    voltage: '415VAC / 110VDC',
    categoryBadge: 'STS',
    difficulty: 'Advanced',
    learnConcepts: ['<4ms Fast Transfer', 'Phase Synchronization', 'Transfer Matrix'],
    ctaText: 'Launch Simulator',
    colorTheme: 'rose',
    specSummary: '415V <4ms Transfer'
  },
  {
    id: 'soft-starter',
    tabName: 'SCR Soft Starter',
    title: 'SCR Soft Starter',
    icon: '🚀',
    description: 'Thyristor voltage ramp starter for heavy induction motors with current limit & water hammer mitigation.',
    studentBenefit: 'Explore how voltage ramping limits motor inrush current during startup.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEC 60947 Ref', 'IEEE 841 Ref'],
    voltage: '415VAC / 6.6kV',
    categoryBadge: 'SOFT STARTER',
    difficulty: 'Intermediate',
    learnConcepts: ['Voltage Ramp Control', 'Current Limit Ramping', 'Water Hammer Control'],
    ctaText: 'Launch Simulator',
    colorTheme: 'teal',
    specSummary: '415V / 6.6kV Ramp'
  },
  {
    id: 'harmonics',
    tabName: 'Harmonics & Power Quality Lab',
    title: 'Harmonics & Power Quality Lab',
    icon: '📊',
    description: 'Passive tuned LC filter & Active Power Filter (APF) with real-time FFT spectrum scanner.',
    studentBenefit: 'Analyze voltage distortion and calculate THD using active power filters.',
    metricsRow: '3 Params | Live Scope | Export Report',
    standards: ['IEEE 519 Ref', 'IEC 61000 Ref'],
    voltage: '415VAC / 11kV',
    categoryBadge: 'POWER QUALITY',
    difficulty: 'Advanced',
    learnConcepts: ['FFT Spectrum Analyzer', 'THD / TDD Limits', 'Active Power Filter'],
    ctaText: 'Launch Simulator',
    colorTheme: 'purple',
    specSummary: 'FFT / APF Filter'
  },
  {
    id: 'dc-dc-converter',
    tabName: 'DC-DC Converter Lab',
    title: 'DC-DC Converter Lab',
    icon: '⚡',
    description: 'Buck/Boost/Buck-Boost CCM/DCM boundary • Inductor ripple • Efficiency map',
    studentBenefit: 'Analyze Buck, Boost, Buck-Boost & SEPIC topologies with real-time CCM/DCM mode boundary tracking and ripple filter dynamics.',
    metricsRow: '4 Params • Live Scope • Export Report',
    standards: ['IEEE 946 Ref', 'IEC 62040-1 Ref'],
    voltage: '12V - 400V DC',
    categoryBadge: 'DC-DC CONVERTER',
    difficulty: 'Intermediate',
    learnConcepts: ['CCM / DCM Boundary', 'Inductor Current Ripple', 'Converter Efficiency Map'],
    ctaText: 'Launch Simulator →',
    colorTheme: 'sky',
    specSummary: '12-400V Buck/Boost'
  },
  {
    id: 'single-phase-inverter',
    tabName: 'Single-Phase SPWM Inverter',
    title: 'Single-Phase Full-Bridge SPWM Inverter',
    icon: '🔄',
    description: 'Full-bridge H-Bridge inverter with Sinusoidal PWM (SPWM) control, LC filter, 4-channel scope & fault lab.',
    studentBenefit: 'Simulate SPWM modulation, carrier ratio mf, modulation index ma, LC filter harmonics, and shoot-through faults.',
    metricsRow: '4 Params • Live Scope • Export Report',
    standards: ['IEEE 519 Ref', 'IEC 61800-9 Ref'],
    voltage: '400V DC / 230V AC 50Hz',
    categoryBadge: 'INVERTER',
    difficulty: 'Advanced',
    learnConcepts: ['SPWM Modulation ma', 'H-Bridge Switching', 'LC Filter Attenuation', 'FFT Harmonic Spectrum'],
    ctaText: 'Launch Simulator →',
    colorTheme: 'indigo',
    specSummary: '400V DC / 230V AC'
  }
];


const PATH_TO_TAB: Record<string, string | null> = {
  '/': null,
  '/foundation-lab': 'foundation-lab',
  '/6-pulse-charger': 'single-charger',
  '/single-6-pulse-charger': 'single-charger',
  '/dual-charger': 'dual-charger',
  '/dual-charger-scheme': 'dual-charger',
  '/static-switch': 'static-switch',
  '/soft-starter': 'soft-starter',
  '/harmonics-filter': 'harmonics',
  '/dc-dc-converter': 'dc-dc-converter',
  '/single-phase-inverter': 'single-phase-inverter',
  '/methodology': 'methodology',
  '/contact': 'contact',
  '/about': 'about',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/standards': 'standards',
  '/disclaimer': 'disclaimer',
};

const TAB_TO_PATH: Record<string, string> = {
  'foundation-lab': '/foundation-lab',
  'single-charger': '/single-6-pulse-charger',
  'dual-charger': '/dual-charger-scheme',
  'static-switch': '/static-switch',
  'soft-starter': '/soft-starter',
  'harmonics': '/harmonics-filter',
  'dc-dc-converter': '/dc-dc-converter',
  'single-phase-inverter': '/single-phase-inverter',

  'methodology': '/methodology',
  'contact': '/contact',
  'about': '/about',
  'privacy': '/privacy',
  'terms': '/terms',
  'standards': '/standards',
  'disclaimer': '/disclaimer',
};

const SEO_META: Record<string, { title: string; description: string; canonical: string }> = {
  overview: {
    title: 'Power Electronics Lab | Interactive Electrical Engineering Simulators',
    description: 'Interactive browser-based power electronics simulators for students, engineers, and educators. Explore rectifiers, SCRs, battery chargers, soft starters, static transfer switches, harmonics, and waveform analysis.',
    canonical: 'https://powerelectronicslab.netlify.app/',
  },
  disclaimer: {
    title: 'Disclaimer & Accuracy Notice | Power Electronics Lab',
    description: 'Educational simulation notice, accuracy limitations, non-affiliation with standards bodies (IEEE, IEC, NFPA, OSHA), and peer-review feedback email.',
    canonical: 'https://powerelectronicslab.netlify.app/disclaimer',
  },
  methodology: {
    title: 'Engineering Methodology & Validation | Power Electronics Lab',
    description: 'Documented mathematical equations, circuit models, and analytical validation benchmarks vs Simulink for Power Electronics Lab.',
    canonical: 'https://powerelectronicslab.netlify.app/methodology'
  },
  contact: {
    title: 'Contact Us | Power Electronics Lab',
    description: 'Contact the engineering team at Power Electronics Lab. Email 0808miracle@gmail.com for questions, feedback, or university integration.',
    canonical: 'https://powerelectronicslab.netlify.app/contact'
  },
  about: {
    title: 'About the Lab | Power Electronics Lab',
    description: 'Learn about Power Electronics Lab, engineered by Anil Sharma to provide interactive browser-based power electronics simulators.',
    canonical: 'https://powerelectronicslab.netlify.app/about'
  },
  privacy: {
    title: 'Privacy Policy | Power Electronics Lab',
    description: 'Privacy Policy for Power Electronics Lab. Client-side local execution with no personal telemetry tracking.',
    canonical: 'https://powerelectronicslab.netlify.app/privacy'
  },
  terms: {
    title: 'Terms of Use | Power Electronics Lab',
    description: 'Terms of Use for Power Electronics Lab educational simulation suite.',
    canonical: 'https://powerelectronicslab.netlify.app/terms'
  },
  standards: {
    title: 'Standards References Matrix | Power Electronics Lab',
    description: 'Educational standards reference matrix for IEC 60146-1-1, IEEE 519-2022, IEEE 1188, IEC 62040-3, and IEC 60947-4-2.',
    canonical: 'https://powerelectronicslab.netlify.app/standards'
  },
  'foundation-lab': {
    title: 'Foundation Lab - Power Electronics Simulator | SCR, Diode & Controlled Rectifiers',
    description: 'Explore diode, thyristor SCR, BJT/MOSFET, and controlled rectifier fundamentals with real-time waveform visualization in the Power Electronics Foundation Lab.',
    canonical: 'https://powerelectronicslab.netlify.app/foundation-lab'
  },
  'single-charger': {
    title: '6-Pulse Battery Charger Simulator | 3-Phase SCR Rectifier & Ripple Filter',
    description: 'Interactive 3-Phase 6-Pulse SCR bridge rectifier simulator with alpha-firing angle control, LC ripple filter, protection relays, and fault injection.',
    canonical: 'https://powerelectronicslab.netlify.app/6-pulse-charger'
  },
  'dual-charger': {
    title: 'Dual Battery Charger Scheme Simulator | Substation 220VDC Auxiliary System',
    description: 'Industrial 220VDC dual battery charger system simulator with bus tie breaker, earth fault detection relay 64G, and station battery management.',
    canonical: 'https://powerelectronicslab.netlify.app/dual-charger'
  },
  'static-switch': {
    title: 'Static Transfer Switch (STS) Simulator | Sub-Cycle AC Source Transfer <4ms',
    description: 'Sub-cycle <4ms dual AC source static transfer switch simulator with phase-lock synchronization, bumpless transfer matrix, and fault ride-through.',
    canonical: 'https://powerelectronicslab.netlify.app/static-switch'
  },
  'soft-starter': {
    title: 'Solid-State Soft Starter Simulator | Thyristor Motor Ramp & Torque Control',
    description: 'Thyristor voltage ramp soft starter simulator for 3-phase induction motors with current limit, thermal modeling, torque-speed curves, and water hammer mitigation.',
    canonical: 'https://powerelectronicslab.netlify.app/soft-starter'
  },
  'harmonics': {
    title: 'Harmonics & APF Filter Simulator | IEEE 519 THD & Active Power Quality',
    description: 'IEEE 519-referenced harmonic analysis simulator featuring passive tuned LC filters, Active Power Filters (APF), and real-time FFT spectrum analyzer.',
    canonical: 'https://powerelectronicslab.netlify.app/harmonics-filter'
  },
  'dc-dc-converter': {
    title: 'DC-DC Converter Simulator | Buck, Boost, Buck-Boost & SEPIC Laboratory',
    description: 'Interactive DC-DC converter simulator featuring Buck, Boost, Buck-Boost, and SEPIC topologies with CCM/DCM boundary analysis, inductor ripple, and efficiency mapping.',
    canonical: 'https://powerelectronicslab.netlify.app/dc-dc-converter'
  }
};

const STANDARDS_DATA = [
  { code: 'IEC 60146-1-1', title: 'Semiconductor Converters - General Requirements & Line Commutated Converters' },
  { code: 'IEC 62485-2', title: 'Safety requirements for secondary batteries and battery installations' },
  { code: 'IEEE 946', title: 'IEEE Recommended Practice for the Design of DC Auxiliary Power Systems' },
  { code: 'IEEE 1188', title: 'IEEE Recommended Practice for Maintenance, Testing & Replacement of VRLA Batteries' },
  { code: 'IEEE 519-2022', title: 'Standard for Harmonic Control in Electric Power Systems' },
  { code: 'NFPA 70E', title: 'Standard for Electrical Safety in the Workplace' }
];

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('theme-mode');
        return saved !== 'light';
      }
    } catch {
      // Fallback if localStorage is restricted
    }
    return true;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('theme-mode', newVal ? 'dark' : 'light');
        }
      } catch {
        // Fallback
      }
      return newVal;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    } else {
      root.classList.remove('dark');
      root.classList.add('light-theme');
    }
  }, [isDarkMode]);

  const [activeTab, setActiveTab] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path in PATH_TO_TAB) {
        return PATH_TO_TAB[path];
      }
    }
    return null;
  });

  // Handle URL sync on popstate and activeTab changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path in PATH_TO_TAB) {
        setActiveTab(PATH_TO_TAB[path]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const expectedPath = activeTab ? (TAB_TO_PATH[activeTab] || '/') : '/';
      if (window.location.pathname !== expectedPath) {
        window.history.pushState({}, '', expectedPath);
      }
    }
  }, [activeTab]);
  const [showStandards, setShowStandards] = useState<boolean>(false);
  const [showAlarmsModal, setShowAlarmsModal] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState<boolean>(false);
  const [activeNavDropdown, setActiveNavDropdown] = useState<'charger' | 'aux' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Fundamentals' | 'Chargers' | 'Switching' | 'Motor Control' | 'Power Quality'>('All');
  
  // Field Spec Modal & Launch States
  const [specModalSim, setSpecModalSim] = useState<Simulator | null>(null);
  const [expandedFooterSection, setExpandedFooterSection] = useState<string | null>(null);
  const [launchingSimId, setLaunchingSimId] = useState<string | null>(null);
  const [heroAlpha, setHeroAlpha] = useState<number>(30);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [commandQuery, setCommandQuery] = useState<string>('');
  const [activePersona, setActivePersona] = useState<'students' | 'educators' | 'engineers'>('students');

  // Command Palette global keyboard listener (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLaunchSim = (id: string) => {
    setLaunchingSimId(id);
    setTimeout(() => {
      setActiveTab(id);
      setLaunchingSimId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 250);
  };

  // Simulation parameters
  const [loadPct, setLoadPct] = useState<number>(85);
  const [voltageIn, setVoltageIn] = useState<number>(415);
  const [firingAngle, setFiringAngle] = useState<number>(67);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Battery Charger specific breaker & telemetry states
  const [chargerSubTab, setChargerSubTab] = useState<'single' | 'dual'>('single');
  const [teachingView, setTeachingView] = useState<'operator' | 'maintenance' | 'reliability'>('operator');
  const [dualBlackout, setDualBlackout] = useState<boolean>(false);
  const [q1Closed, setQ1Closed] = useState<boolean>(true);

  // STS Sub-tab selection state
  const [stsSubTab, setStsSubTab] = useState<'sld' | 'matrix' | 'relays'>('sld');

  // Mobile Navigation Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Sync activeTab with chargerSubTab when navigating
  useEffect(() => {
    if (activeTab === 'single-charger') {
      setChargerSubTab('single');
    } else if (activeTab === 'dual-charger') {
      setChargerSubTab('dual');
    }
  }, [activeTab]);
  const [q2Closed, setQ2Closed] = useState<boolean>(true);
  const [q3Closed, setQ3Closed] = useState<boolean>(true);
  const [soc, setSoc] = useState<number>(87);
  const [hasLcFilter, setHasLcFilter] = useState<boolean>(true);

  // Fault Injection & Protection State
  const [activeFaults, setActiveFaults] = useState<ActiveFaults>({
    scrT3Open: false,
    acPhaseLossL2: false,
    groundFault: false,
    dcOvervoltage: false,
    loadTrip: false,
    controlFuseBlown: false,
    filterCapOpen: false,
    looseTerminal: false,
    roomFanFail: false,
    equalizeForgotten: false,
  });

  const [alarmLog, setAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'PowerElectronics Engine initialized. All systems nominal.',
    },
    {
      id: 'init-2',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Main AC Breaker Q1 Closed. Floating Charge Active.',
    },
  ]);

  const [relays, setRelays] = useState<ProtectionRelay[]>([
    { code: '27', name: 'Undervoltage Relay', setting: '99V (90%)', status: 'NORMAL' },
    { code: '59', name: 'Overvoltage Relay', setting: '135V (110%)', status: 'NORMAL' },
    { code: '64G', name: 'Ground Fault Relay', setting: '100mA', status: 'NORMAL' },
    { code: '50', name: 'Instantaneous OC', setting: '100A', status: 'NORMAL' },
    { code: '51', name: 'Time Overcurrent', setting: '60A, 2s', status: 'NORMAL' },
  ]);

  // Relay 27 Undervoltage Protection trigger when Alpha > 90Â°
  useEffect(() => {
    if (q1Closed && firingAngle > 90) {
      setRelays((prev) =>
        prev.map((r) => (r.code === '27' ? { ...r, status: 'OPERATED' } : r))
      );
    } else if (!activeFaults.scrT3Open && !activeFaults.acPhaseLossL2 && firingAngle <= 90) {
      setRelays((prev) =>
        prev.map((r) => (r.code === '27' ? { ...r, status: 'NORMAL' } : r))
      );
    }
  }, [firingAngle, q1Closed, activeFaults.scrT3Open, activeFaults.acPhaseLossL2]);

  const pendingTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const addAlarm = (level: AlarmLevel, message: string) => {
    const time = new Date().toLocaleTimeString();
    const entry: AlarmEntry = {
      id: `alm-${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
    };
    setAlarmLog((prev) => [entry, ...prev]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  const handleTriggerFault = (faultType: keyof ActiveFaults) => {
    if (faultType === 'scrT3Open') {
      if (activeFaults.scrT3Open) return;
      setActiveFaults((prev) => ({ ...prev, scrT3Open: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '27' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('WARNING', 'ALM-001: SCR T3 Gate Failure - Asymmetric DC Ripple');

      pendingTimersRef.current.scrT3 = setTimeout(() => {
        addAlarm('TRIP', 'TRIP-001: DC Undervoltage Relay 27 - Breaker Q1 Tripped');
        setQ1Closed(false);
      }, 5000);
    } else if (faultType === 'acPhaseLossL2') {
      if (activeFaults.acPhaseLossL2) return;
      setActiveFaults((prev) => ({ ...prev, acPhaseLossL2: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '27' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('TRIP', 'ALM-002: Phase Loss L2 Detected - 2nd Harmonic Ripple');

      pendingTimersRef.current.phaseLoss = setTimeout(() => {
        addAlarm('TRIP', 'TRIP-002: Phase Failure Relay - Breaker Q1 Tripped');
        setQ1Closed(false);
      }, 2000);
    } else if (faultType === 'groundFault') {
      if (activeFaults.groundFault) return;
      setActiveFaults((prev) => ({ ...prev, groundFault: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '64G' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('TRIP', 'ALM-003: DC Ground Fault Positive - Igf = 150mA at Cell #14');

      pendingTimersRef.current.groundFault = setTimeout(() => {
        addAlarm('TRIP', 'TRIP-003: Ground Fault > 100mA - Breaker Q2 Disconnected');
        setQ2Closed(false);
      }, 1000);
    } else if (faultType === 'dcOvervoltage') {
      if (activeFaults.dcOvervoltage) return;
      setActiveFaults((prev) => ({ ...prev, dcOvervoltage: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '59' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('TRIP', 'ALM-004: DC Overvoltage 145V Detected - Regulator Failure');

      pendingTimersRef.current.overvoltage = setTimeout(() => {
        addAlarm('TRIP', 'TRIP-004: OVP Relay 59 Operated - Breakers Q1 & Q2 Tripped');
        setQ1Closed(false);
        setQ2Closed(false);
      }, 1000);
    } else if (faultType === 'loadTrip') {
      if (activeFaults.loadTrip) return;
      setActiveFaults((prev) => ({ ...prev, loadTrip: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '50' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('TRIP', 'ALM-005: Downstream Load Short Circuit / Trip - Breaker Q3 Tripped');
      setQ3Closed(false);
    } else if (faultType === 'controlFuseBlown') {
      if (activeFaults.controlFuseBlown) return;
      setActiveFaults((prev) => ({ ...prev, controlFuseBlown: true }));
      setRelays((prev) =>
        prev.map((r) => (r.code === '27' ? { ...r, status: 'OPERATED' } : r))
      );
      addAlarm('TRIP', 'ALM-006: AC Control Fuse Blown - No gate pulses generated, Vdc = 0V, Breaker Q1 remains CLOSED');
    } else if (faultType === 'filterCapOpen') {
      if (activeFaults.filterCapOpen) return;
      setActiveFaults((prev) => ({ ...prev, filterCapOpen: true }));
      addAlarm('WARNING', 'ALM-007: Filter Capacitor C1 Open Circuit - AC Ripple jumped to 9.0% Vrms (Audible Choke Hum)');
    } else if (faultType === 'looseTerminal') {
      if (activeFaults.looseTerminal) return;
      setActiveFaults((prev) => ({ ...prev, looseTerminal: true }));
      addAlarm('WARNING', 'ALM-008: Loose Battery Terminal Connection - Hotspot 85Â°C detected under load (I*R Voltage Drop)');
    } else if (faultType === 'roomFanFail') {
      if (activeFaults.roomFanFail) return;
      setActiveFaults((prev) => ({ ...prev, roomFanFail: true }));
      addAlarm('WARNING', 'ALM-009: Battery Room Exhaust Fan Failure - Thermal Rise 38Â°C -> 72Â°C, Current Auto-Derated to 50%');
    } else if (faultType === 'equalizeForgotten') {
      if (activeFaults.equalizeForgotten) return;
      setActiveFaults((prev) => ({ ...prev, equalizeForgotten: true }));
      addAlarm('WARNING', 'ALM-010: Equalize Timer Overridden (>12h) - Active Cell Gassing & Electrolyte Water Loss');
    }
  };

  const handleResetFaults = () => {
    Object.values(pendingTimersRef.current).forEach((t) => clearTimeout(t as unknown as number));
    pendingTimersRef.current = {};

    setActiveFaults({
      scrT3Open: false,
      acPhaseLossL2: false,
      groundFault: false,
      dcOvervoltage: false,
      loadTrip: false,
      controlFuseBlown: false,
      filterCapOpen: false,
      looseTerminal: false,
      roomFanFail: false,
      equalizeForgotten: false,
    });

    setRelays((prev) => prev.map((r) => ({ ...r, status: 'NORMAL' })));

    setFiringAngle(30);
    setQ1Closed(true);
    setQ2Closed(true);
    setQ3Closed(true);
    setIsRunning(true);

    addAlarm('INFO', 'Faults Reset. Protection Relays Restored, Breakers Q1, Q2, Q3 Re-closed & Charger Restored to Normal Float State (110VDC / 122.65V Float).');
  };

  // ==================== STATIC TRANSFER SWITCH (STS) STATE ====================
  const [stsQAClosed, setStsQAClosed] = useState<boolean>(true);
  const [stsQBClosed, setStsQBClosed] = useState<boolean>(true);
  const [stsQ3BypassClosed, setStsQ3BypassClosed] = useState<boolean>(false);
  const [stsBypassSource, setStsBypassSource] = useState<'A' | 'B'>('A');
  const [stsActiveBridge, setStsActiveBridge] = useState<ActiveSource>('A');
  const [stsTransferMode, setStsTransferMode] = useState<STSTransferMode>('MAKE_BEFORE_BREAK');

  const [stsAutoTransferEnabled, setStsAutoTransferEnabled] = useState<boolean>(true);
  const [stsSourceAPowerStopped, setStsSourceAPowerStopped] = useState<boolean>(false);
  const [stsSourceBPowerStopped, setStsSourceBPowerStopped] = useState<boolean>(false);
  const [stsLastTransferTimeMs, setStsLastTransferTimeMs] = useState<number | null>(2.4);
  const [stsLastTransferReason, setStsLastTransferReason] = useState<string>(
    'System Normal: Source A Active in Phase Lock with Source B'
  );

  // Absolute Source 1 & Source 2 Controls (Voltage, Frequency 0-100Hz default 60Hz, Phase Angle -180..+180)
  const [stsVoltage1, setStsVoltage1] = useState<number>(220);
  const [stsFreq1, setStsFreq1] = useState<number>(60.0);
  const [stsPhase1, setStsPhase1] = useState<number>(0.0);

  const [stsVoltage2, setStsVoltage2] = useState<number>(220);
  const [stsFreq2, setStsFreq2] = useState<number>(60.0);
  const [stsPhase2, setStsPhase2] = useState<number>(0.0);

  // OEM Synchro-check Relay (ANSI 25) Configurable Tolerance Limits
  const [stsVoltTolerance, setStsVoltTolerance] = useState<number>(5.0); // %
  const [stsFreqTolerance, setStsFreqTolerance] = useState<number>(0.10); // Hz
  const [stsPhaseTolerance, setStsPhaseTolerance] = useState<number>(5.0); // deg

  const [stsPhaseBOffset, setStsPhaseBOffset] = useState<number>(0);
  const [stsFreqBOffset, setStsFreqBOffset] = useState<number>(0);
  const [stsVoltageBOffset, setStsVoltageBOffset] = useState<number>(0);

  const [stsFaults, setStsFaults] = useState<STSFaults>({
    sourceALoss: false,
    phaseReversalB: false,
    scrShortBridgeAT2: false,
    lossOfSync: false,
  });

  const [stsAlarmLog, setStsAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'sts-init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Static Transfer Switch Engine initialized. Primary Source A Online.',
    },
    {
      id: 'sts-init-2',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Synchroscope Relay 25 ACTIVE. Sources A & B in Phase Lock.',
    },
  ]);

  const addStsAlarm = (level: AlarmLevel, message: string) => {
    const time = new Date().toLocaleTimeString();
    const entry: AlarmEntry = {
      id: `sts-alm-${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
    };
    setStsAlarmLog((prev) => [entry, ...prev]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  // Nominal System AC Voltage Rating (110V vs 220V AC Single-Phase)
  const [stsNominalVoltage, setStsNominalVoltage] = useState<'110V' | '220V'>('220V');

  // Derived STS parameters (Nominal 110VAC or 220VAC 1Φ + N)
  const stsNominalTargetV = stsNominalVoltage === '110V' ? 110 : 220;
  const stsBaseV = (voltageIn / 415) * stsNominalTargetV;

  // Upstream Utility / Grid Supply Voltages (Upstream of 52-QA and 52-QB)
  const stsVoltageAUpstream = stsFaults.sourceALoss || stsSourceAPowerStopped ? 0 : stsVoltage1;
  const stsVoltageBUpstream = stsSourceBPowerStopped ? 0 : stsVoltage2;

  // Downstream Voltages after Breakers 52-QA and 52-QB
  const stsVoltageACalculated = stsQAClosed ? stsVoltageAUpstream : 0;
  const stsVoltageBCalculated = stsQBClosed ? stsVoltageBUpstream : 0;

  const stsFreqACalculated = stsFreq1;
  const stsFreqBCalculated = stsFreq2;
  const stsPhaseACalculated = stsPhase1;
  const stsPhaseBCalculated = stsPhase2 + (stsFaults.phaseReversalB ? 180 : 0);

  const stsDeltaTheta = Math.abs(stsPhaseBCalculated - stsPhaseACalculated);
  const stsDeltaFreq = Math.abs(stsFreq2 - stsFreq1);
  const stsDeltaVoltPct = stsVoltage1 > 0 ? (Math.abs(stsVoltage2 - stsVoltage1) / stsVoltage1) * 100 : 0;

  // Bumpless Transfer Qualification Matrix Conditions
  const stsMinVoltageThreshold = stsNominalTargetV * 0.88;
  const stsTargetAvailableThreshold = stsNominalTargetV * 0.90;

  // Active Path Conduction & Output Voltage / Load Current Calculation
  const stsBypassOnline = stsQ3BypassClosed && (
    (stsBypassSource === 'A' && stsVoltageAUpstream >= stsMinVoltageThreshold) ||
    (stsBypassSource === 'B' && stsVoltageBUpstream >= stsMinVoltageThreshold)
  );

  const stsBridgeAOnline = (stsActiveBridge === 'A' || stsActiveBridge === 'BOTH') && stsVoltageACalculated >= stsMinVoltageThreshold;
  const stsBridgeBOnline = (stsActiveBridge === 'B' || stsActiveBridge === 'BOTH') && stsVoltageBCalculated >= stsMinVoltageThreshold;

  const stsOutputVoltage = stsBridgeAOnline
    ? stsVoltageAUpstream
    : stsBridgeBOnline
    ? stsVoltageBUpstream
    : stsBypassOnline
    ? (stsBypassSource === 'A' ? stsVoltageAUpstream : stsVoltageBUpstream)
    : 0;

  const stsLoadCurrent = (stsBridgeAOnline || stsBridgeBOnline || stsBypassOnline)
    ? (250 * (loadPct / 100) * (stsOutputVoltage / stsNominalTargetV))
    : 0;

  const voltageMatchOk = stsDeltaVoltPct <= stsVoltTolerance && stsVoltageAUpstream >= stsMinVoltageThreshold && stsVoltageBUpstream >= stsMinVoltageThreshold;
  const freqMatchOk = stsDeltaFreq <= stsFreqTolerance;
  const phaseMatchOk = stsDeltaTheta <= stsPhaseTolerance;
  const phaseSequenceOk = !stsFaults.phaseReversalB;
  const synchrocheckLockOk = voltageMatchOk && freqMatchOk && phaseMatchOk && phaseSequenceOk && !stsFaults.lossOfSync;
  const scrBridgeHealthOk = !stsFaults.scrShortBridgeAT2;
  const targetSourceAvailable =
    stsActiveBridge === 'A' || stsActiveBridge === 'BOTH'
      ? stsVoltageBUpstream >= stsTargetAvailableThreshold && stsQBClosed
      : stsVoltageAUpstream >= stsTargetAvailableThreshold && stsQAClosed;
  const noDownstreamFault = loadPct <= 150;
  const fastCommutationOk = true;
  const noLockout = !stsFaults.phaseReversalB && !stsFaults.scrShortBridgeAT2;

  const isBumplessQualified =
    voltageMatchOk &&
    freqMatchOk &&
    phaseMatchOk &&
    phaseSequenceOk &&
    synchrocheckLockOk &&
    scrBridgeHealthOk &&
    targetSourceAvailable &&
    noDownstreamFault &&
    fastCommutationOk &&
    noLockout;

  const isStsSyncOk = synchrocheckLockOk;

  const stsMatrixState: BumplessMatrixState = {
    voltageMatchOk,
    freqMatchOk,
    phaseMatchOk,
    phaseSequenceOk,
    synchrocheckLockOk,
    scrBridgeHealthOk,
    targetSourceAvailable,
    noDownstreamFault,
    fastCommutationOk,
    noLockout,
    isBumplessQualified,
  };

  const stsRelays: ProtectionRelay[] = [
    {
      code: '25',
      name: 'Sync Check Relay',
      setting: 'Δθ<5°, Δf<0.1Hz, ΔV<5%',
      status: isStsSyncOk ? 'NORMAL' : 'OPERATED',
    },
    {
      code: '27A',
      name: 'Source A Undervoltage',
      setting: `${stsTargetAvailableThreshold.toFixed(0)}V (90%)`,
      status: stsVoltageAUpstream < stsTargetAvailableThreshold ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '27B',
      name: 'Source B Undervoltage',
      setting: `${stsTargetAvailableThreshold.toFixed(0)}V (90%)`,
      status: stsVoltageBUpstream < stsTargetAvailableThreshold ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '50',
      name: 'Instantaneous Overcurrent',
      setting: '800A',
      status: stsFaults.scrShortBridgeAT2 ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '86',
      name: 'Lockout Relay',
      setting: 'Manual Reset Required',
      status: stsFaults.phaseReversalB || stsFaults.scrShortBridgeAT2 ? 'OPERATED' : 'NORMAL',
    },
  ];

  // OEM AUTOMATIC FAST-TRANSFER ENGINE (< 4ms IEC 62040-3 CLASS 1)
  useEffect(() => {
    if (activeTab !== 'static-switch' || !stsAutoTransferEnabled) return;

    // Active source is A (or BOTH) and Source A power drops below OEM threshold
    if ((stsActiveBridge === 'A' || stsActiveBridge === 'BOTH') && stsVoltageAUpstream < stsTargetAvailableThreshold) {
      if (stsVoltageBUpstream >= stsTargetAvailableThreshold && stsQBClosed && !stsFaults.scrShortBridgeAT2) {
        const xferTime = +(1.5 + Math.random() * 0.7).toFixed(1);
        setStsActiveBridge('B');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(
          `OEM Auto Fast-Transfer A → B (${xferTime}ms): Source A Undervoltage (<90%). Transferred seamlessly to Source B without load drop.`
        );
        addStsAlarm(
          'TRIP',
          `🚨 OEM AUTO FAST-TRANSFER EXECUTED (${xferTime}ms): Source A Power Dip (<90%). Shifted to Source B. Critical load maintained 100% uninterrupted!`
        );
      }
    }
    // Active source is B and Source B power drops below OEM threshold
    else if (stsActiveBridge === 'B' && stsVoltageBUpstream < stsTargetAvailableThreshold) {
      if (stsVoltageAUpstream >= stsTargetAvailableThreshold && stsQAClosed && !stsFaults.scrShortBridgeAT2) {
        const xferTime = +(1.5 + Math.random() * 0.6).toFixed(1);
        setStsActiveBridge('A');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(
          `OEM Auto Fast-Transfer B → A (${xferTime}ms): Source B Undervoltage (<90%). Transferred seamlessly to Preferred Source A without load drop.`
        );
        addStsAlarm(
          'TRIP',
          `🚨 OEM AUTO FAST-TRANSFER EXECUTED (${xferTime}ms): Source B Power Dip (<90%). Shifted to Source A. Critical load maintained 100% uninterrupted!`
        );
      }
    }
    // OEM AUTO-RETURN / PREFERRED SOURCE NORMALIZATION:
    // If active bridge is B, but Preferred Source A returns to healthy status (>90%) and sync is OK, auto-return to Source A!
    else if (stsActiveBridge === 'B' && stsVoltageAUpstream >= stsTargetAvailableThreshold && stsQAClosed && isStsSyncOk && !stsFaults.scrShortBridgeAT2) {
      const timer = setTimeout(() => {
        if (stsVoltageAUpstream >= stsTargetAvailableThreshold && isStsSyncOk) {
          const xferTime = +(1.8 + Math.random() * 0.4).toFixed(1);
          setStsActiveBridge('A');
          setStsLastTransferTimeMs(xferTime);
          setStsLastTransferReason(
            `OEM Preferred Source Normalization (${xferTime}ms): Preferred Source A Restored & In-Sync. Auto-Returned to Source A.`
          );
          addStsAlarm(
            'INFO',
            `⚡ OEM PREFERRED SOURCE NORMALIZATION: Preferred Source A Restored & In-Sync. Seamlessly re-transferred back to Source A (${xferTime}ms).`
          );
        }
      }, 5000); // 5-second OEM stabilization delay
      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    stsAutoTransferEnabled,
    stsActiveBridge,
    stsVoltageAUpstream,
    stsVoltageBUpstream,
    stsTargetAvailableThreshold,
    stsQAClosed,
    stsQBClosed,
    isStsSyncOk,
    stsFaults.scrShortBridgeAT2,
  ]);

  // STS Transfer Actions
  const handleStsTransferToB = () => {
    if (stsActiveBridge === 'B') return;
    if (!isStsSyncOk) {
      addStsAlarm('WARNING', 'SYNC CHECK FAILED - Manual Transfer Inhibited (Relay 25 Active)');
      return;
    }

    const xferTime = stsTransferMode === 'MAKE_BEFORE_BREAK' ? 2.3 : 3.6;
    if (stsTransferMode === 'MAKE_BEFORE_BREAK') {
      setStsActiveBridge('BOTH');
      setTimeout(() => {
        setStsActiveBridge('B');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(`Planned Switch A â†’ B in ${xferTime}ms (Make-Before-Break Overlap)`);
        addStsAlarm('INFO', `Transfer Aâ†’B completed in ${xferTime}ms (Make-Before-Break Overlap)`);
      }, 80);
    } else {
      setStsActiveBridge('NONE');
      setTimeout(() => {
        setStsActiveBridge('B');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(`Planned Switch A â†’ B in ${xferTime}ms (Break-Before-Make Safety Gap)`);
        addStsAlarm('INFO', `Transfer Aâ†’B completed in ${xferTime}ms (Break-Before-Make Gap)`);
      }, 40);
    }
  };

  const handleStsTransferToA = () => {
    if (stsActiveBridge === 'A') return;
    if (stsVoltageACalculated < 360) {
      addStsAlarm('WARNING', 'TRANSFER BLOCKED - Source A De-energized');
      return;
    }
    if (!isStsSyncOk) {
      addStsAlarm('WARNING', 'SYNC CHECK FAILED - Manual Transfer Inhibited (Relay 25 Active)');
      return;
    }

    const xferTime = stsTransferMode === 'MAKE_BEFORE_BREAK' ? 2.2 : 3.5;
    if (stsTransferMode === 'MAKE_BEFORE_BREAK') {
      setStsActiveBridge('BOTH');
      setTimeout(() => {
        setStsActiveBridge('A');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(`Return Switch B â†’ A in ${xferTime}ms (Make-Before-Break Overlap)`);
        addStsAlarm('INFO', `Transfer Bâ†’A completed in ${xferTime}ms (Make-Before-Break Overlap)`);
      }, 80);
    } else {
      setStsActiveBridge('NONE');
      setTimeout(() => {
        setStsActiveBridge('A');
        setStsLastTransferTimeMs(xferTime);
        setStsLastTransferReason(`Return Switch B â†’ A in ${xferTime}ms (Break-Before-Make Safety Gap)`);
        addStsAlarm('INFO', `Transfer Bâ†’A completed in ${xferTime}ms (Break-Before-Make Gap)`);
      }, 40);
    }
  };

  const handleStsEmergencyTransfer = () => {
    const target = stsActiveBridge === 'A' ? 'B' : 'A';
    setStsActiveBridge(target);
    setStsLastTransferTimeMs(1.8);
    setStsLastTransferReason(`Emergency Fast Transfer Executed â†’ Source ${target} in 1.8ms`);
    addStsAlarm('TRIP', `EMERGENCY FAST TRANSFER Executed â†’ Source ${target} (< 1.8ms)`);
  };

  const handleTriggerStsFault = (faultKey: keyof STSFaults) => {
    if (faultKey === 'sourceALoss') {
      if (stsFaults.sourceALoss) return;
      setStsFaults((prev) => ({ ...prev, sourceALoss: true }));
      addStsAlarm('TRIP', 'TRIP-027: Source A Voltage Lost (VA = 0V)');
      // Auto transfer effect will trigger seamlessly!
    } else if (faultKey === 'phaseReversalB') {
      if (stsFaults.phaseReversalB) return;
      setStsFaults((prev) => ({ ...prev, phaseReversalB: true }));
      addStsAlarm('TRIP', 'ALM-025: Phase Reversal Detected on Source B (L1-L3 Swapped) - Sync Inverted');
    } else if (faultKey === 'scrShortBridgeAT2') {
      if (stsFaults.scrShortBridgeAT2) return;
      setStsFaults((prev) => ({ ...prev, scrShortBridgeAT2: true }));
      addStsAlarm('TRIP', 'TRIP-050: SCR Short Circuit Bridge A T2 - High Fault Current Peak 1200A');

      setTimeout(() => {
        setStsActiveBridge('B');
        setStsLastTransferTimeMs(1.5);
        setStsLastTransferReason('Bridge A SCR Short Circuit Trip â†’ Forced Auto Transfer to Source B in 1.5ms');
        addStsAlarm('INFO', 'Bridge A Fuse Blown. Forced Auto-Transfer to Source B Completed in 1.5ms');
      }, 150);
    } else if (faultKey === 'lossOfSync') {
      if (stsFaults.lossOfSync) return;
      setStsFaults((prev) => ({ ...prev, lossOfSync: true }));
      setStsPhaseBOffset(32.0);
      addStsAlarm('WARNING', 'ALM-025: Loss of Synchronization - Î”Î¸ > 30Â° Drift - Transfers Inhibited');
    }
  };

  const handleResetStsFaults = () => {
    setStsFaults({
      sourceALoss: false,
      phaseReversalB: false,
      scrShortBridgeAT2: false,
      lossOfSync: false,
    });
    setStsSourceAPowerStopped(false);
    setStsSourceBPowerStopped(false);
    setStsQAClosed(true);
    setStsQBClosed(true);
    setStsQ3BypassClosed(false);
    setStsActiveBridge('A');
    setStsPhaseBOffset(0);
    setStsFreqBOffset(0);
    setStsVoltageBOffset(0);
    addStsAlarm('INFO', 'STS System Faults Cleared. Source A Online, Breakers 52-QA/QB Closed, Synchrocheck Relay 25 NORMAL.');
  };



  // ==================== SOFT STARTER SYSTEM STATE ENGINE ====================
  const [ssSubTab, setSsSubTab] = useState<'workstation' | 'telemetry' | 'grid-scr' | 'thermal-surge' | 'relays' | 'compare'>('telemetry');
  const [ssIsRunning, setSsIsRunning] = useState<boolean>(false);
  const [ssIsTrip, setSsIsTrip] = useState<boolean>(false);
  const [ssMCCBClosed, setSsMCCBClosed] = useState<boolean>(true);

  const [ssParams, setSsParams] = useState<SoftStarterParams>({
    loadType: 'CENTRIFUGAL_PUMP',
    startMode: 'VOLTAGE_RAMP',
    wiringConnection: 'IN_LINE',
    lineVoltageNominal: 415,
    motorPowerKw: 160,
    initialVoltagePct: 40,
    rampTimeSec: 15,
    softStopTimeSec: 10,
    currentLimitPct: 300,
    kickStart: false,
    systemLoadDemandPct: 78,
  });

  const [ssFaults, setSsFaults] = useState<SoftStarterFaults>({
    scrShort: false,
    overcurrent: false,
    startTimeout: false,
    phaseLoss: false,
  });

  const [ssMotorSpeedRPM, setSsMotorSpeedRPM] = useState<number>(0);
  const [ssSuctionValveOpen, setSsSuctionValveOpen] = useState<boolean>(true);
  const [ssDischargeValveOpen, setSsDischargeValveOpen] = useState<boolean>(false);
  const [ssBypassOverride, setSsBypassOverride] = useState<boolean>(false);

  const createInitialSoftStarterLogs = (): AlarmEntry[] => {
    const baseMs = Date.now() - 8200;
    const createTimeStr = (offsetMs: number) => {
      const d = new Date(baseMs + offsetMs);
      const timeStr = d.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const msStr = String(d.getMilliseconds()).padStart(3, '0');
      const parts = timeStr.split(' ');
      return `${parts[0]}.${msStr} ${parts[1] || ''}`.trim();
    };

    return [
      {
        id: 'ss-init-5',
        time: createTimeStr(6080),
        timestampMs: baseMs + 6080,
        level: 'INFO',
        message: 'Pump Discharge Valve CLOSED',
        componentId: 'dischargeValve',
      },
      {
        id: 'ss-init-4',
        time: createTimeStr(4380),
        timestampMs: baseMs + 4380,
        level: 'INFO',
        message: 'Pump Suction Valve OPENED',
        componentId: 'suctionValve',
      },
      {
        id: 'ss-init-3',
        time: createTimeStr(1980),
        timestampMs: baseMs + 1980,
        level: 'INFO',
        message: 'MCCB Breaker CLOSED',
        componentId: 'q1',
      },
      {
        id: 'ss-init-2',
        time: createTimeStr(230),
        timestampMs: baseMs + 230,
        level: 'INFO',
        message: 'Soft Starter Power Stage Ready. 415V 160kW Thyristor Bridge Initialized',
        componentId: 'scr',
      },
      {
        id: 'ss-init-1',
        time: createTimeStr(0),
        timestampMs: baseMs,
        level: 'INFO',
        message: 'Bypass Contactor KM1 Ready',
        componentId: 'bypassKM1',
      },
    ];
  };

  const [ssAlarmLog, setSsAlarmLog] = useState<AlarmEntry[]>(createInitialSoftStarterLogs);
  const [ssFlashTargetComponent, setSsFlashTargetComponent] = useState<string | null>(null);

  // Guided Tour, Learning Mode & Trainer Projection Mode State for Soft Starter
  const [ssIsTourActive, setSsIsTourActive] = useState<boolean>(false);
  const [ssTourStepIndex, setSsTourStepIndex] = useState<number>(0);
  const [isFaultTrainerOpen, setIsFaultTrainerOpen] = useState<boolean>(false);
  const [isTrainerMode, setIsTrainerMode] = useState<boolean>(false);

  useEffect(() => {
    if (!ssIsTourActive || activeTab !== 'soft-starter') return;

    switch (ssTourStepIndex) {
      case 0:
        setSsParams((prev) => ({
          ...prev,
          startMode: 'VOLTAGE_RAMP',
          initialVoltagePct: 100,
          rampTimeSec: 1,
        }));
        setSsIsTrip(false);
        setSsMotorSpeedRPM(0);
        setSsIsRunning(true);
        break;
      case 1:
        setSsParams((prev) => ({
          ...prev,
          startMode: 'VOLTAGE_RAMP',
          initialVoltagePct: 40,
          rampTimeSec: 15,
        }));
        setSsIsTrip(false);
        setSsMotorSpeedRPM(0);
        setSsIsRunning(true);
        break;
      case 2:
        setSsParams((prev) => ({
          ...prev,
          startMode: 'VOLTAGE_RAMP',
          initialVoltagePct: 40,
          rampTimeSec: 15,
        }));
        break;
      case 3:
        setSsParams((prev) => ({
          ...prev,
          loadType: 'FAN',
          startMode: 'CURRENT_LIMIT',
          currentLimitPct: 300,
        }));
        setSsIsTrip(false);
        setSsMotorSpeedRPM(0);
        setSsIsRunning(true);
        break;
      case 4:
        setSsParams((prev) => ({
          ...prev,
          loadType: 'CONVEYOR',
          startMode: 'CURRENT_LIMIT',
          currentLimitPct: 200,
        }));
        setSsFaults((prev) => ({ ...prev, startTimeout: true }));
        setSsIsTrip(false);
        setSsMotorSpeedRPM(0);
        setSsIsRunning(true);
        break;
      case 5:
        setSsParams((prev) => ({ ...prev, loadType: 'CENTRIFUGAL_PUMP' }));
        setSsFaults((prev) => ({ ...prev, startTimeout: false }));
        setSsIsTrip(false);
        setSsBypassOverride(true);
        setSsIsRunning(true);
        setSsMotorSpeedRPM(1480);
        break;
      case 6:
        setSsParams((prev) => ({
          ...prev,
          loadType: 'CENTRIFUGAL_PUMP',
          softStopTimeSec: 15,
        }));
        setSsIsTrip(false);
        setSsBypassOverride(false);
        setSsIsRunning(true);
        setSsMotorSpeedRPM(1480);
        break;
      case 7:
        setSsParams((prev) => ({ ...prev, loadType: 'CENTRIFUGAL_PUMP' }));
        setSsIsTrip(false);
        setSsIsRunning(true);
        break;
      default:
        break;
    }
  }, [ssIsTourActive, ssTourStepIndex, activeTab]);

  const addSsAlarm = (level: AlarmLevel, message: string, componentId?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const msStr = String(now.getMilliseconds()).padStart(3, '0');
    const parts = timeStr.split(' ');
    const formattedTime = `${parts[0]}.${msStr} ${parts[1] || ''}`.trim();

    const entry: AlarmEntry = {
      id: `ss-alm-${Date.now()}-${Math.random()}`,
      time: formattedTime,
      timestampMs: now.getTime(),
      level,
      message,
      componentId,
    };
    setSsAlarmLog((prev) => [entry, ...prev]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  // Soft Starter Motor Ramping Engine
  useEffect(() => {
    if (!ssMCCBClosed || ssIsTrip) return;

    const interval = setInterval(() => {
      let targetRPM = 0;
      if (ssIsRunning) {
        targetRPM = 1480;
      }

      setSsMotorSpeedRPM((prev) => {
        if (prev < targetRPM) {
          const step = (1480 / Math.max(1, ssParams.rampTimeSec)) * 0.1;
          const nextSpeed = Math.min(targetRPM, prev + step);

          // Check if bypass should close automatically at full speed
          if (prev < 1470 && nextSpeed >= 1470) {
            if (ssFaults.scrShort) {
              addSsAlarm('WARNING', 'ALM-KM1: SCR Short Circuit / Interlock Error - Bypass Contactor KM1 CANNOT CLOSE!');
            } else {
              addSsAlarm('INFO', 'INFO-KM1: Full Motor Speed Reached (1480 RPM). Bypass Contactor KM1 CLOSED. Thyristors Bypassed.');
            }
          }

          return nextSpeed;
        } else if (prev > targetRPM) {
          const step = (1480 / Math.max(1, ssParams.rampTimeSec)) * 0.1;
          return Math.max(targetRPM, prev - step);
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [ssIsRunning, ssIsTrip, ssMCCBClosed, ssParams, ssFaults]);

  // Derived Soft Starter Telemetry & Readouts
  const bypassClosed = (ssMotorSpeedRPM >= 1470 || ssBypassOverride) && !ssFaults.scrShort && !ssIsTrip && ssMCCBClosed;
  const isRamping = ssIsRunning && !bypassClosed && !ssIsTrip && ssMCCBClosed;

  const loadDemandFactor = (ssParams.systemLoadDemandPct ?? 78) / 100;

  let motorCurrentFLA = 0;
  if (ssMCCBClosed && (ssMotorSpeedRPM > 0 || ssIsRunning) && !ssIsTrip) {
    if (isRamping) {
      if (ssParams.kickStart && ssMotorSpeedRPM < 300) {
        motorCurrentFLA = Math.min(ssParams.currentLimitPct, 350);
      } else {
        const rampProgress = Math.max(0, Math.min(1.0, ssMotorSpeedRPM / 1480));
        const appliedV = ssParams.initialVoltagePct + rampProgress * (100 - ssParams.initialVoltagePct);
        // IEC 60947-4-2 starting current: I_raw = I_DOL * (V_rms / V_nom), capped at currentLimitPct
        // I_DOL = 8.0 x FLA (800% FLA = 2152A for 269A FLA)
        const iDolPct = 800.0 * (appliedV / 100);
        motorCurrentFLA = Math.min(ssParams.currentLimitPct, Math.max(100.0, iDolPct));
      }
    } else {
      // Full speed running: 100% FLA = 269A for 160kW pump load at full flow
      const loadFactor = ssDischargeValveOpen ? 1.0 : 0.45;
      motorCurrentFLA = 100 * loadFactor * loadDemandFactor;
    }

    if (ssFaults.overcurrent) motorCurrentFLA = 550.0;
    if (ssFaults.phaseLoss) motorCurrentFLA = 280.0;
  }

  const outputVoltagePct = ssMCCBClosed && !ssIsTrip && (ssMotorSpeedRPM > 0 || ssIsRunning)
    ? (bypassClosed ? 100 : Math.min(100, ssParams.initialVoltagePct + (ssMotorSpeedRPM / 1480) * (100 - ssParams.initialVoltagePct)))
    : 0;

  const firingAngleDeg = bypassClosed
    ? 0
    : ssMCCBClosed && (ssIsRunning || ssMotorSpeedRPM > 0) && !ssIsTrip
    ? (isRamping ? 67 : Math.max(0, Math.round(180 * (1 - outputVoltagePct / 100))))
    : 180;

  // Centrifugal Pump Affinity Laws: Head H = 45m * (N/1480)^2, Flow Q = 120m3/h * (N/1480)
  const pumpHeadMeters = ssParams.loadType === 'CENTRIFUGAL_PUMP' ? Math.pow(ssMotorSpeedRPM / 1480, 2) * 45.0 : 0;
  const pumpFlowM3H = ssParams.loadType === 'CENTRIFUGAL_PUMP' && ssDischargeValveOpen && ssSuctionValveOpen ? (ssMotorSpeedRPM / 1480) * 120.0 : 0;

  const ssReadouts: SoftStarterReadouts = {
    motorSpeedRPM: ssMotorSpeedRPM,
    motorCurrentFLA,
    outputVoltagePct,
    firingAngleDeg,
    bypassClosed,
    suctionValveOpen: ssSuctionValveOpen,
    dischargeValveOpen: ssDischargeValveOpen,
    pumpHeadMeters,
    pumpFlowM3H,
  };

  // Calculate dynamic SoftStarterState for StateMachineLamps annunciator panel
  const currentSsStateKey = ssIsTrip
    ? 'TRIPPED'
    : bypassClosed
    ? 'BYPASSED'
    : ssIsRunning
    ? (ssMotorSpeedRPM >= 1470 ? 'RUNNING' : 'STARTING')
    : (ssMotorSpeedRPM > 0 ? 'STOPPING' : 'STOPPED');

  const speedRatio = Math.max(0, Math.min(1.05, ssMotorSpeedRPM / 1480));
  const slipVal = Math.max(0.001, 1 - speedRatio);
  const vRatio = outputVoltagePct / 100;
  // Kloss motor torque: Te = [2 * Tmax / (s/smax + smax/s)] * (V/Vn)^2
  const smax = 0.20;
  const tmax = 2.2;
  const motorTePu = (2 * tmax / ((slipVal / smax) + (smax / slipVal))) * Math.pow(vRatio, 2);
  const loadTlPu = ssParams.loadType === 'CENTRIFUGAL_PUMP'
    ? 0.15 + 0.85 * Math.pow(speedRatio, 2)
    : ssParams.loadType === 'FAN_BLOWER'
    ? 0.10 + 0.90 * Math.pow(speedRatio, 2)
    : 0.50 + 0.50 * speedRatio;
  const busDip = Math.min(30, (motorCurrentFLA / 100 / 20) * 100);
  const surgeHead = ssIsRunning ? 42.5 : Math.max(0, 42.5 - (ssParams.softStopTimeSec || 10) * 1.5);

  const currentSsEngineState = {
    state: currentSsStateKey,
    w: speedRatio,
    slip: slipVal,
    VrmsPct: outputVoltagePct,
    IrmsPu: motorCurrentFLA / 100,
    IrmsA: (motorCurrentFLA / 100) * 269,
    Te: motorTePu,
    Tl: loadTlPu,
    alphaDeg: firingAngleDeg,
    thermalCap: ssIsTrip ? 100 : Math.round(ssMotorSpeedRPM > 0 ? (30 + (motorCurrentFLA / 100) * 12) : 10),
    thermalCapPct: ssIsTrip ? 100 : Math.round(ssMotorSpeedRPM > 0 ? (30 + (motorCurrentFLA / 100) * 12) : 10),
    busDipPct: busDip,
    surgeHeadMeters: surgeHead,
    tStopSec: ssParams.softStopTimeSec || 10,
    scenario: ssParams.loadType === 'CENTRIFUGAL_PUMP' ? 'pump' : ssParams.loadType === 'FAN_BLOWER' ? 'fan' : 'conveyor',
    startMode: ssParams.startMode === 'CURRENT_LIMIT' ? 'currentLimit' : 'voltageRamp',
    startsThisHour: 2,
    startsLeft: 4,
    maxStartsPerHour: 6,
    cooldownSec: 0,
    tripClass: 'Class10' as const,
  };

  // Soft Starter Protection Relays
  const ssRelays: ProtectionRelay[] = [
    {
      code: '50/51',
      name: 'Instantaneous Overcurrent Relay',
      setting: 'I > 500% FLA / 10ms',
      status: ssFaults.overcurrent ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '48',
      name: 'Incomplete Sequence / Start Timeout',
      setting: 'T > 60s Accelerating',
      status: ssFaults.startTimeout ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '47/46',
      name: 'Phase Loss / Single Phasing Relay',
      setting: 'Ineg > 20% FLA / 3s',
      status: ssFaults.phaseLoss ? 'OPERATED' : 'NORMAL',
    },
    {
      code: '52G',
      name: 'Bypass Contactor SCR Short Interlock',
      setting: 'SCR Short V_drop < 1V',
      status: ssFaults.scrShort ? 'OPERATED' : 'NORMAL',
    },
  ];

  // Soft Starter Handlers
  const handleSsStart = () => {
    if (ssIsTrip) {
      addSsAlarm('WARNING', 'CANNOT START - Soft Starter in TRIPPED state. Reset faults first.');
      return;
    }
    if (!ssMCCBClosed) {
      setSsMCCBClosed(true);
      addSsAlarm('INFO', 'MCCB Line Breaker 52 CLOSED automatically.');
    }
    setSsBypassOverride(false);
    setSsMotorSpeedRPM(0);
    setSsIsRunning(true);
    addSsAlarm('INFO', `Soft Starter START Command Initiated (${ssParams.startMode} Ramp: ${ssParams.rampTimeSec}s). Thyristors Firing.`);
  };

  const handleSsStop = () => {
    setSsBypassOverride(false);
    setSsIsRunning(false);
    addSsAlarm('INFO', 'Soft Starter Controlled STOP Initiated. Motor Ramping Down.');
  };

  const handleSsJog = () => {
    if (ssIsTrip || !ssMCCBClosed) return;
    setSsIsRunning(true);
    setSsMotorSpeedRPM(250);
    addSsAlarm('INFO', 'Soft Starter JOG Command (Low Voltage Firing 250 RPM).');
  };

  const [ssTripsCount, setSsTripsCount] = useState<number>(0);

  const handleTriggerSsFault = (faultKey: keyof SoftStarterFaults) => {
    setSsFaults((prev) => {
      if (prev[faultKey]) return prev;
      setSsTripsCount((c) => c + 1);
      return { ...prev, [faultKey]: true };
    });
    setSsIsTrip(true);
    setSsIsRunning(false);

    if (faultKey === 'scrShort') {
      addSsAlarm('TRIP', 'TRIP-52b: Thyristor L1 SCR Short Circuit / Contactor Interlock Trip.');
    } else if (faultKey === 'overcurrent') {
      addSsAlarm('TRIP', 'TRIP-50/51: Instantaneous Overcurrent Detected (I = 550% FLA > 500% Limit).');
    } else if (faultKey === 'startTimeout') {
      addSsAlarm('TRIP', 'TRIP-48: Start Sequence Timeout (>60s). Motor Stalled / Mechanical Jam.');
    } else if (faultKey === 'phaseLoss') {
      addSsAlarm('TRIP', 'TRIP-47/46: Phase Loss / Single Phasing Trip Executed.');
    }
  };

  const handleResetSsFaults = () => {
    setSsFaults({
      scrShort: false,
      overcurrent: false,
      startTimeout: false,
      phaseLoss: false,
      t1Open: false,
      t1Short: false,
      phaseLossL1: false,
      bypassWeld: false,
    });
    setSsIsTrip(false);
    setSsIsRunning(false);
    setSsMotorSpeedRPM(0);
    setSsMCCBClosed(true);
    setSsBypassOverride(false);
    addSsAlarm('INFO', 'Manual Reset Executed: Soft Starter Faults Cleared & Protection Relays Restored to NORMAL.');
  };

  // ==================== HARMONICS ANALYZER SYSTEM STATE ENGINE ====================
  const [haSourceType, setHaSourceType] = useState<HarmonicSourceType>('6_PULSE_SCR');
  const [haPassiveFilter, setHaPassiveFilter] = useState<PassiveFilterConfig>({
    enabled: false,
    tunedFreq: 5,
    qFactor: 50,
  });
  const [haActiveFilter, setHaActiveFilter] = useState<ActiveFilterConfig>({
    enabled: false,
    ratingAmps: 100,
  });
  const [haIEEEParams, setHaIEEEParams] = useState<IEEE519Params>({
    isc: 10000,
    il: 500,
  });
  const [haSelectedHarmonic, setHaSelectedHarmonic] = useState<HarmonicBarData | null>(null);
  const [haCustomHarmonics, setHaCustomHarmonics] = useState<Record<number, number>>({
    5: 20.0,
    7: 12.0,
    11: 8.0,
    13: 6.0,
    17: 4.0,
  });

  const [haAlarmLog, setHaAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'ha-init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Harmonics Analyzer & Power Quality FFT Engine Initialized.',
    },
    {
      id: 'ha-init-2',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'IEEE 519-2022 Current Distortion Standard Table Loaded.',
    },
  ]);

  const addHaAlarm = (level: AlarmLevel, message: string) => {
    const time = new Date().toLocaleTimeString();
    const entry: AlarmEntry = {
      id: `ha-alm-${Date.now()}-${Math.random()}`,
      time,
      level,
      message,
    };
    setHaAlarmLog((prev) => [entry, ...prev]);
    if (level === 'TRIP' || level === 'WARNING') {
      playAlarmSound(level);
    }
  };

  const getActiveModuleAlarmLog = () => {
    switch (activeTab) {
      case 'battery-charger':
      case 'single-charger':
        return { log: alarmLog, setLog: setAlarmLog, name: 'Single 6-Pulse Battery Charger' };
      case 'static-switch':
        return { log: stsAlarmLog, setLog: setStsAlarmLog, name: 'Static Transfer Switch (STS)' };
      case 'soft-starter':
        return { log: ssAlarmLog, setLog: setSsAlarmLog, name: 'Solid-State Soft Starter' };
      case 'harmonics':
        return { log: haAlarmLog, setLog: setHaAlarmLog, name: 'Harmonics Filter & Power Quality' };
      default:
        return { log: alarmLog, setLog: setAlarmLog, name: 'PowerElectronics System' };
    }
  };

  const handleSelectLogEntry = (entry: AlarmEntry) => {
    setShowAlarmsModal(false);
    if (activeTab === 'soft-starter') {
      setSsSubTab('sld');
      const compId = entry.componentId || (
        entry.message.toLowerCase().includes('bypass') || entry.message.toLowerCase().includes('km1') ? 'bypassKM1' :
        entry.message.toLowerCase().includes('mccb') || entry.message.toLowerCase().includes('breaker') ? 'q1' :
        entry.message.toLowerCase().includes('suction') ? 'suctionValve' :
        entry.message.toLowerCase().includes('discharge') ? 'dischargeValve' :
        entry.message.toLowerCase().includes('thyristor') || entry.message.toLowerCase().includes('scr') ? 'scr' : 'motor'
      );
      setSsFlashTargetComponent(compId);
      setTimeout(() => setSsFlashTargetComponent(null), 2500);
    }
  };

  const renderViewAlarmsButton = (activeAlarmLog: AlarmEntry[]) => {
    const tripCount = activeAlarmLog.filter((a) => a.level === 'TRIP').length;
    const warningCount = activeAlarmLog.filter((a) => a.level === 'WARNING').length;

    return (
      <button
        onClick={() => setShowAlarmsModal(true)}
        className="px-3.5 py-2 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] text-xs font-mono font-bold flex items-center gap-2 text-white transition-all shadow-md group shrink-0 cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5">
          {(tripCount > 0 || warningCount > 0) && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f85149] opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              tripCount > 0 ? 'bg-[#f85149]' : warningCount > 0 ? 'bg-[#d29922]' : 'bg-[#3fb950]'
            }`}
          />
        </span>
        <span>ðŸ”” View Alarms & Alerts</span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            tripCount > 0
              ? 'bg-[#da3633]/30 text-[#f85149] border border-[#f85149]/40 animate-pulse'
              : warningCount > 0
              ? 'bg-[#d29922]/30 text-[#d29922] border border-[#d29922]/40'
              : 'bg-[#21262d] text-[#58a6ff]'
          }`}
        >
          {tripCount > 0 ? `${tripCount} TRIPS` : warningCount > 0 ? `${warningCount} ALARMS` : `${activeAlarmLog.length} LOGS`}
        </span>
      </button>
    );
  };

  // Helper for IEEE 519 limit curve
  const getIEEE519Limit = (h: number): number => {
    if (h < 11) return 4.0;
    if (h < 17) return 2.0;
    if (h < 17 || h < 23) return 1.5;
    if (h < 35) return 0.6;
    return 0.3;
  };

  // Helper for base harmonic magnitude by source
  const getBaseHarmonicMagnitude = (source: HarmonicSourceType, h: number): number => {
    if (h === 1) return 100.0; // Fundamental

    if (source === '6_PULSE_SCR') {
      if (h === 5) return 25.2;
      if (h === 7) return 14.1;
      if (h === 11) return 8.9;
      if (h === 13) return 7.5;
      if (h === 17) return 5.8;
      if (h === 19) return 5.1;
      if (h === 23) return 4.1;
      if (h === 25) return 3.8;
      return 0.2;
    } else if (source === '12_PULSE') {
      if (h === 11) return 8.8;
      if (h === 13) return 7.3;
      if (h === 23) return 4.0;
      if (h === 25) return 3.7;
      if (h === 35) return 2.5;
      if (h === 37) return 2.3;
      if (h === 5 || h === 7) return 0.8;
      return 0.2;
    } else if (source === '18_PULSE') {
      if (h === 17) return 5.5;
      if (h === 19) return 4.8;
      if (h === 35) return 2.4;
      if (h === 37) return 2.2;
      if (h === 5 || h === 7 || h === 11 || h === 13) return 0.4;
      return 0.2;
    } else if (source === 'VFD_LOAD') {
      if (h === 5) return 28.5;
      if (h === 7) return 16.2;
      if (h === 11) return 9.4;
      if (h === 13) return 6.8;
      if (h === 17) return 4.5;
      if (h === 19) return 3.2;
      return 0.3;
    } else if (source === 'SMPS_LOAD') {
      if (h === 3) return 34.0;
      if (h === 5) return 22.0;
      if (h === 7) return 12.5;
      if (h === 9) return 9.0;
      if (h === 11) return 6.5;
      if (h === 13) return 4.8;
      if (h === 15) return 3.5;
      return 0.3;
    } else if (source === 'ARC_FURNACE') {
      if (h === 2) return 8.5;
      if (h === 3) return 18.2;
      if (h === 4) return 6.4;
      if (h === 5) return 24.0;
      if (h === 7) return 14.8;
      if (h === 11) return 8.2;
      return 0.5;
    } else if (source === 'CUSTOM') {
      return haCustomHarmonics[h] || 0.1;
    }
    return 0.2;
  };

  // LC Passive Filter Physics Parameters & Parallel Resonance Calculation
  const w1 = 2 * Math.PI * 50; // 50Hz fundamental
  const pL = (haPassiveFilter.inductanceMh ?? (haPassiveFilter.tunedFreq === 5 ? 4.8 : haPassiveFilter.tunedFreq === 7 ? 2.5 : haPassiveFilter.tunedFreq === 11 ? 1.0 : 0.7)) * 1e-3;
  const pC = (haPassiveFilter.capacitanceUf ?? 220) * 1e-6;
  const pR = haPassiveFilter.resistanceOhm ?? 0.2;
  const pFr = pL > 0 && pC > 0 ? 1 / (2 * Math.PI * Math.sqrt(pL * pC)) : 250;
  const pHr = +(pFr / 50).toFixed(2);

  const lGrid = 0.0005; // ~0.5mH grid inductance
  const pParallelFr = pL > 0 && pC > 0 ? 1 / (2 * Math.PI * Math.sqrt((pL + lGrid) * pC)) : 220;
  const pHParallel = +(pParallelFr / 50).toFixed(2);

  // Compute calculated harmonic spectrum bar array
  const computedHarmonics: HarmonicBarData[] = Array.from({ length: 50 }, (_, i) => {
    const order = i + 1;
    const limit = getIEEE519Limit(order);
    let mag = getBaseHarmonicMagnitude(haSourceType, order);

    // Apply Passive LC Trap Filter Physics
    if (haPassiveFilter.enabled && order >= 2) {
      const zFilter = Math.sqrt(Math.pow(pR, 2) + Math.pow(order * w1 * pL - 1 / (order * w1 * pC), 2));
      const zGrid = order * w1 * lGrid;
      let attenuation = zFilter / (zFilter + zGrid);

      // Parallel resonance amplification check
      if (Math.abs(order - pHParallel) < 0.4) {
        attenuation = 1.45; // Amplification near parallel resonance
      }

      mag = mag * Math.max(0.04, Math.min(1.5, attenuation));
    }

    // Apply Active Harmonic Filter (AHF)
    if (haActiveFilter.enabled && order >= 2) {
      const ahfReduction = haActiveFilter.ratingAmps === 200 ? 0.05 : 0.10;
      mag = mag * ahfReduction;
    }

    return {
      order,
      magnitude: mag,
      limit,
      isExceeding: mag > limit,
    };
  });

  // Calculate THD
  const sumSquares = computedHarmonics
    .filter((h) => h.order >= 2)
    .reduce((acc, curr) => acc + Math.pow(curr.magnitude, 2), 0);
  const calculatedTHD = Math.sqrt(sumSquares);

  // Short circuit ratio & compliance
  const haRatio = haIEEEParams.il > 0 ? haIEEEParams.isc / haIEEEParams.il : 0;
  let haTddLimit = 5.0;
  if (haRatio < 20) haTddLimit = 5.0;
  else if (haRatio < 50) haTddLimit = 8.0;
  else if (haRatio < 100) haTddLimit = 12.0;
  else if (haRatio < 1000) haTddLimit = 15.0;
  else haTddLimit = 20.0;

  const haIsCompliant =
    calculatedTHD <= haTddLimit &&
    !computedHarmonics.filter((h) => h.order >= 2).some((h) => h.isExceeding);

  const getCalculatedTHDi = (tab: string, alpha: number, hasFilter: boolean) => {
    if (tab === 'harmonics') return calculatedTHD;
    if (tab === 'dual-charger') return 8.0 + (alpha * 0.05);
    // 6-pulse SCR battery charger (single-charger or battery-charger)
    const baseTHD = 28.0;
    const alphaPenalty = 0.15 * alpha;
    const filterReduction = hasFilter ? 18.0 : 0;
    let thdi = baseTHD + alphaPenalty - filterReduction;
    return Math.min(35.0, Math.max(4.0, thdi));
  };

  // Battery SOC update simulation
  useEffect(() => {
    if (!isRunning || activeTab !== 'battery-charger') return;
    const interval = setInterval(() => {
      setSoc((prev) => {
        if (q1Closed && q2Closed) {
          return Math.min(100, prev + 0.05);
        } else if (!q1Closed && q2Closed && q3Closed) {
          return Math.max(15, prev - 0.08);
        }
        return prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, activeTab, q1Closed, q2Closed, q3Closed]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw dynamic live waveform canvas
  useEffect(() => {
    if (!activeTab || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#161b22';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Zero axis line
      ctx.strokeStyle = '#30363d';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform 1 (Input Voltage / Reference)
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const freq = 0.03;
        const amp = (height / 2.8) * (voltageIn / 415);
        const y = height / 2 + Math.sin((x + offset) * freq) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Waveform 2 (Output / Current based on Load Demand)
      ctx.strokeStyle = '#7ee787';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const freq = activeTab === 'harmonics' ? 0.09 : 0.03;
        const phaseShift = 0.5;
        const amp = (height / 3.2) * (loadPct / 100);
        let y = height / 2 + Math.sin((x + offset) * freq + phaseShift) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isRunning) {
        offset += 2;
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeTab, voltageIn, loadPct, isRunning]);

  const currentSim = SIMULATORS.find(s => s.id === activeTab);
  const currentSeo = SEO_META[activeTab || 'overview'] || SEO_META.overview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Helmet>
        <title>{currentSeo.title}</title>
        <meta name="description" content={currentSeo.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={currentSeo.canonical} />
        <meta property="og:title" content={currentSeo.title} />
        <meta property="og:description" content={currentSeo.description} />
        <meta property="og:url" content={currentSeo.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://powerelectronicslab.netlify.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={currentSeo.title} />
        <meta name="twitter:description" content={currentSeo.description} />
        <meta name="twitter:image" content="https://powerelectronicslab.netlify.app/og-image.png" />
      </Helmet>
      {/* 1. TOP NAVIGATION BAR â€” Premium Light Glass Header */}
      <header
        className="app-header sticky top-0 z-50 w-full flex items-center justify-between px-4 sm:px-6 transition-colors duration-300 relative"
        style={{
          height: '68px',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          background: isDarkMode ? 'rgba(10,16,32,0.97)' : 'rgba(255,255,255,0.97)',
          borderBottom: isDarkMode ? '1px solid rgba(30,41,59,0.8)' : '1px solid rgba(226,232,240,0.95)',
          boxShadow: isDarkMode ? '0 2px 24px rgba(0,0,0,0.4)' : '0 2px 20px rgba(15,23,42,0.07)',
        }}
      >
        {/* Top 2px Gradient Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />

        {/* Left Side: Logo & Name */}
        <div className="flex items-center gap-3">
          <motion.button
            className="flex items-center gap-2.5 cursor-pointer select-none group bg-transparent border-none p-0"
            onClick={() => { setActiveTab(null); setMobileMenuOpen(false); }}
            title="Return to Suite Landing Page"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:shadow-blue-600/40 transition-all duration-300">
              <Zap style={{ width: 18, height: 18, color: 'white', fill: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-[15px] tracking-tight transition-colors ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`}>
                PowerElectronics
              </span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                LAB
              </span>
            </div>
          </motion.button>
          <span className={`hidden xl:inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border select-none ${isDarkMode ? 'text-slate-400 bg-slate-800/80 border-slate-700/60' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
            Educational Suite
          </span>
        </div>

        {/* Center Navigation Tabs (Desktop) */}
        <nav className="header-nav-links hidden md:flex items-center h-full gap-0.5">
          {/* Foundation Lab & DC-DC Dropdown */}
          <div className="relative h-full flex items-center"
            onMouseEnter={() => setActiveNavDropdown('foundation')}
            onMouseLeave={() => setActiveNavDropdown(null)}
          >
            <button
              className={`relative h-[68px] px-3.5 flex items-center gap-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'foundation-lab' || activeTab === 'dc-dc-converter'
                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ background: 'transparent', border: 'none' }}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Foundation Lab</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
              {(activeTab === 'foundation-lab' || activeTab === 'dc-dc-converter') && (
                <motion.div layoutId="nav-active-bar" className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full" />
              )}
            </button>
            <AnimatePresence>
              {activeNavDropdown === 'foundation' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.14 }}
                  className={`absolute top-[calc(100%+2px)] left-0 w-68 rounded-2xl p-2 flex flex-col gap-1 z-50 shadow-2xl border ${isDarkMode ? 'bg-[#0c1526] border-slate-800' : 'bg-white border-slate-200'}`}
                  style={{ width: '260px' }}
                >
                  {[
                    { id: 'foundation-lab', icon: '🧪', label: 'Foundation Lab', sub: 'Diode & SCR Rectifiers' },
                    { id: 'dc-dc-converter', icon: '⚡', label: 'DC-DC Converter Lab', sub: '12V - 400V Buck/Boost/SEPIC' },
                  ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setActiveNavDropdown(null); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-all font-semibold ${
                        activeTab === item.id
                          ? isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : isDarkMode ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`} style={{ border: 'none', background: activeTab === item.id ? undefined : 'transparent' }}
                    >
                      <span className="text-base mt-0.5">{item.icon}</span>
                      <div><div className="font-bold">{item.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Charger Dropdown */}
          <div className="relative h-full flex items-center"
            onMouseEnter={() => setActiveNavDropdown('charger')}
            onMouseLeave={() => setActiveNavDropdown(null)}
          >
            <button
              className={`relative h-[68px] px-3.5 flex items-center gap-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'single-charger' || activeTab === 'dual-charger'
                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ background: 'transparent', border: 'none' }}
            >
              <span>🔋</span><span>Charger Schemes</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
              {(activeTab === 'single-charger' || activeTab === 'dual-charger') && (
                <motion.div layoutId="nav-active-bar" className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full" />
              )}
            </button>
            <AnimatePresence>
              {activeNavDropdown === 'charger' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.14 }}
                  className={`absolute top-[calc(100%+2px)] left-0 w-64 rounded-2xl p-2 flex flex-col gap-1 z-50 shadow-2xl border ${isDarkMode ? 'bg-[#0c1526] border-slate-800' : 'bg-white border-slate-200'}`}
                >
                  {[
                    { id: 'single-charger', icon: '⚡', label: 'Single 6-Pulse Charger', sub: '415VAC / 110VDC 100A' },
                    { id: 'dual-charger', icon: '🔋', label: 'Dual Charger Scheme', sub: '2×415VAC / 2×220VDC' },
                  ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setActiveNavDropdown(null); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-all font-semibold ${
                        activeTab === item.id
                          ? isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : isDarkMode ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`} style={{ border: 'none', background: activeTab === item.id ? undefined : 'transparent' }}
                    >
                      <span className="text-base mt-0.5">{item.icon}</span>
                      <div><div className="font-bold">{item.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* STS/Aux Dropdown */}
          <div className="relative h-full flex items-center"
            onMouseEnter={() => setActiveNavDropdown('aux')}
            onMouseLeave={() => setActiveNavDropdown(null)}
          >
            <button
              className={`relative h-[68px] px-3.5 flex items-center gap-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'static-switch' || activeTab === 'soft-starter' || activeTab === 'harmonics'
                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ background: 'transparent', border: 'none' }}
            >
              <Settings2 className="w-3.5 h-3.5" /><span>STS / Aux</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
              {(activeTab === 'static-switch' || activeTab === 'soft-starter' || activeTab === 'harmonics') && (
                <motion.div layoutId="nav-active-bar" className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-full" />
              )}
            </button>
            <AnimatePresence>
              {activeNavDropdown === 'aux' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.14 }}
                  className={`absolute top-[calc(100%+2px)] right-0 w-68 rounded-2xl p-2 flex flex-col gap-1 z-50 shadow-2xl border ${isDarkMode ? 'bg-[#0c1526] border-slate-800' : 'bg-white border-slate-200'}`}
                  style={{ width: '270px' }}
                >
                  {[
                    { id: 'static-switch', icon: '⚡', label: 'Static Transfer Switch', sub: '415VAC / <4ms transfer' },
                    { id: 'soft-starter', icon: '🚀', label: 'Solid-State Soft Starter', sub: '415VAC / 6.6kV' },
                    { id: 'harmonics', icon: '📊', label: 'Harmonic Filter & Quality', sub: 'IEEE 519 / APF' },
                  ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setActiveNavDropdown(null); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 cursor-pointer transition-all font-semibold ${
                        activeTab === item.id
                          ? isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : isDarkMode ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`} style={{ border: 'none', background: activeTab === item.id ? undefined : 'transparent' }}
                    >
                      <span className="text-base mt-0.5">{item.icon}</span>
                      <div><div className="font-bold">{item.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          {/* Live Engine Badge */}
          <div className={`live-badge hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold select-none border h-8 ${
            isDarkMode ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">Engine: Live</span>
          </div>

          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme} whileTap={{ scale: 0.88 }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border transition-all ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </motion.button>

          {/* Quick Command Palette Button */}
          <button
            type="button"
            className={`hidden md:flex h-8 px-2.5 items-center gap-1.5 text-[11px] font-mono cursor-pointer rounded-lg border transition-all ${
              isDarkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            onClick={() => setShowCommandPalette(true)}
            title="Search & Jump to Simulator (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-sans font-medium text-[11px]">Quick Jump</span>
            <kbd className={`px-1 py-0.2 rounded text-[9.5px] font-mono font-bold border ${
              isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200'
            }`}>
              Ctrl+K
            </kbd>
          </button>

          {/* Standards Dropdown */}
          <div className="hidden sm:block relative">
            <button
              className={`h-8 px-3 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer rounded-lg border transition-all ${
                isDarkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              onClick={() => { setShowStandards(!showStandards); setActiveNavDropdown(null); }}
            >
              <Award className="w-3.5 h-3.5" /><span>Standards</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showStandards ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showStandards && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.16 }}
                  className={`absolute top-[calc(100%+6px)] right-0 w-80 rounded-2xl p-2 shadow-2xl z-50 border ${isDarkMode ? 'bg-[#0c1526] border-slate-800' : 'bg-white border-slate-200'}`}
                >
                  <div className={`text-[10px] font-mono font-bold px-3 py-2 border-b uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-400 border-slate-100'}`}>
                    Referenced Standards
                  </div>
                  {STANDARDS_DATA.map((st) => (
                    <div key={st.code} className={`px-3 py-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800/70' : 'hover:bg-slate-50'}`}>
                      <div className={`font-bold font-mono text-xs ${isDarkMode ? 'text-sky-400' : 'text-blue-600'}`}>{st.code}</div>
                      <div className={`text-[10px] leading-snug mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.title}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Help */}
          <button
            className={`hidden sm:inline-flex h-8 px-3 items-center gap-1.5 text-[11px] font-semibold cursor-pointer rounded-lg border transition-all ${
              isDarkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            onClick={() => { setShowHelp(true); setActiveNavDropdown(null); }}
          >
            <HelpCircle className="w-3.5 h-3.5" /><span>Help</span>
          </button>

          {/* User Avatar */}
          <button
            className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-lg border cursor-pointer p-0 transition-all ${
              isDarkMode ? 'bg-slate-800 border-slate-700/60 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
            }`}
            onClick={() => alert('Engineer: Anil Sharma | PowerElectronics Lab (Educational)')}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black select-none font-mono ${isDarkMode ? 'bg-blue-900/50 border border-blue-500/30 text-blue-300' : 'bg-blue-100 border border-blue-200 text-blue-700'}`}>
              AS
            </div>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className={`mobile-hamburger md:hidden w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer p-0 border transition-all ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setActiveNavDropdown(null); }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-rose-500" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden fixed inset-0 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
              <motion.div
                className={`absolute top-0 right-0 bottom-0 w-[85vw] max-w-[340px] flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#070d1c]' : 'bg-white'}`}
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              >
                {/* Drawer Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>PowerElectronics Lab</div>
                      <div className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Educational Simulation Suite</div>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Links */}
                <div className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto">
                  {[
                    { heading: 'Principles & Labs', items: [
                      { id: 'foundation-lab', icon: '🧪', label: 'Foundation Lab', sub: 'Diode / SCR / BJT / Rectifiers' },
                    ]},
                    { heading: 'Thyristor Charger Schemes', items: [
                      { id: 'single-charger', icon: '⚡', label: 'Single 6-Pulse Charger', sub: '415VAC / 110VDC 100A' },
                      { id: 'dual-charger', icon: '🔋', label: 'Dual Charger Scheme', sub: '2×415VAC / 2×220VDC' },
                    ]},
                    { heading: 'Auxiliary Systems', items: [
                      { id: 'static-switch', icon: '⚡', label: 'Static Transfer Switch', sub: '415VAC / <4ms' },
                      { id: 'soft-starter', icon: '🚀', label: 'Solid-State Soft Starter', sub: '415VAC / 6.6kV' },
                      { id: 'harmonics', icon: '📊', label: 'Harmonics & Power Quality', sub: 'IEEE 519 / APF Filter' },
                    ]},
                  ].map(section => (
                    <div key={section.heading}>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-2 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{section.heading}</div>
                      <div className="flex flex-col gap-1.5">
                        {section.items.map(item => (
                          <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                            className={`w-full min-h-[52px] rounded-2xl border px-4 text-left flex items-center gap-3 cursor-pointer transition-all ${
                              activeTab === item.id
                                ? isDarkMode ? 'bg-blue-950/40 border-blue-700/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                                : isDarkMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xl">{item.icon}</span>
                            <div className="flex-1">
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sub}</div>
                            </div>
                            {activeTab === item.id && <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold shrink-0">ACTIVE</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Drawer Footer Actions */}
                <div className={`p-4 border-t flex gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                    onClick={() => setShowStandards(!showStandards)}>
                    <Award className="w-3.5 h-3.5" /> Standards
                  </button>
                  <button className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                    onClick={() => { setShowHelp(true); setMobileMenuOpen(false); }}>
                    <HelpCircle className="w-3.5 h-3.5" /> Help SOP
                  </button>
                  <button className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                    onClick={() => { setShowAlarmsModal(true); setMobileMenuOpen(false); }}>
                    🔔 Alarms
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className={`content-area w-full ${(activeTab !== null && activeTab !== 'methodology' && activeTab !== 'contact' && activeTab !== 'about' && activeTab !== 'privacy' && activeTab !== 'terms' && activeTab !== 'standards' && activeTab !== 'disclaimer') ? '!p-0 !m-0 h-[calc(100vh-68px)] overflow-hidden' : 'min-h-[calc(100vh-68px)] flex flex-col items-center justify-start py-4 sm:py-6 px-3 sm:px-6 lg:px-8'}`}>
        {activeTab === null ? (
          /* 2. LANDING PAGE */
          (() => {
            const landingSimulators = SIMULATORS.filter((sim) => {
              if (activeCategory === 'Fundamentals' && sim.id !== 'foundation-lab') return false;
              if (activeCategory === 'Chargers' && !sim.id.includes('charger')) return false;
              if (activeCategory === 'Switching' && sim.id !== 'static-switch') return false;
              if (activeCategory === 'Motor Control' && sim.id !== 'soft-starter') return false;
              if (activeCategory === 'Power Quality' && sim.id !== 'harmonics') return false;

              if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                return (
                  sim.title.toLowerCase().includes(query) ||
                  sim.tabName.toLowerCase().includes(query) ||
                  sim.description.toLowerCase().includes(query) ||
                  sim.standards.some((s) => s.toLowerCase().includes(query))
                );
              }
              return true;
            });

            return (
              <div className="flex flex-col items-center gap-5 sm:gap-6 flex-1 w-full max-w-7xl mx-auto self-center px-3 sm:px-6 lg:px-8 py-5 sm:py-10 font-sans overflow-x-hidden max-w-full relative">
                {/* ── ANIMATED HERO SECTION ── */}
                <div className="text-center max-w-4xl flex flex-col items-center gap-4 sm:gap-7 px-1 sm:px-4 mx-auto pt-2 sm:pt-4 pb-2 w-full relative overflow-hidden rounded-3xl border border-slate-800/60 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
                  <WaveformBackground isDarkMode={isDarkMode} />
                  
                  {/* Badge: POWER ELECTRONICS LAB */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="z-10 relative"
                  >
                    <span className={`inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase px-4 py-1.5 rounded-full border shadow-sm backdrop-blur-md select-none ${isDarkMode ? 'bg-blue-950/80 border-blue-800/80 text-blue-400 shadow-blue-900/20 ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-100'}`}>
                      <Zap className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      POWER ELECTRONICS LAB
                    </span>
                  </motion.div>

                  {/* Headline: Power Electronics Lab | Learn Power Electronics by Running the Circuit */}
                  <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={`hero-title text-3xl sm:text-5xl lg:text-6xl font-black leading-tight sm:leading-tight tracking-tight text-center max-w-3xl sm:max-w-4xl mx-auto break-words select-none z-10 relative ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                  >
                    Learn Power Electronics by
                    <span className="animated-gradient-text block text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-normal mt-1.5 sm:mt-2">
                      Running the Circuit
                    </span>
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className={`text-base sm:text-lg lg:text-xl max-w-2xl leading-relaxed text-center font-medium mx-auto z-10 relative ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    Run real power circuits in your browser. No install, real physics, industry standards.
                  </motion.p>

                  {/* Interactive Live Circuit Teaser (Suggestion 5) */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full max-w-3xl mx-auto z-10 relative"
                  >
                    <div className={`p-3.5 sm:p-5 rounded-2xl border backdrop-blur-md shadow-2xl flex flex-col gap-3.5 ${
                      isDarkMode ? 'bg-[#090e1a]/95 border-slate-800/90 shadow-black/50' : 'bg-white/95 border-slate-200 shadow-slate-200/70'
                    }`}>
                      {/* Teaser Header Telemetry */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            Live Client-Side ODE Solver
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-400">Vdc Output:</span>
                          <span className={`px-2 py-0.5 rounded font-black ${
                            heroAlpha < 90 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                          }`}>
                            {Math.round(1.35 * 415 * Math.cos((heroAlpha * Math.PI) / 180))} V
                          </span>
                        </div>
                      </div>

                      {/* Live Flowing CRT Oscilloscope Waveform Display */}
                      <HeroLiveOscilloscope heroAlpha={heroAlpha} isDarkMode={isDarkMode} />

                      {/* Interactive Controls: Slider + Presets */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                          <label className="text-xs font-mono font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-blue-400" />
                            <span>Firing Angle α:</span>
                            <span className="text-cyan-400 w-10 text-right font-black">{heroAlpha}°</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="150"
                            step="1"
                            value={heroAlpha}
                            onChange={(e) => setHeroAlpha(Number(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            aria-label="SCR Firing Angle Slider"
                          />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                          {[
                            { label: '0° Diode', val: 0 },
                            { label: '30° Float', val: 30 },
                            { label: '60° Boost', val: 60 },
                            { label: '90° Null', val: 90 },
                          ].map(preset => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setHeroAlpha(preset.val)}
                              className={`px-2 py-0.8 rounded-lg text-[10.5px] font-mono font-bold transition-all cursor-pointer border ${
                                heroAlpha === preset.val
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30 font-black'
                                  : isDarkMode
                                    ? 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Primary & Secondary CTAs */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto pt-1"
                  >
                    <button
                      onClick={() => setActiveTab('foundation-lab')}
                      className="w-full sm:w-auto px-7 py-3.5 min-h-[48px] h-12 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-blue-400/40 group select-none"
                    >
                      <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110" />
                      <span>Start a Simulation</span>
                    </button>

                    <button
                      onClick={() => {
                        const el = document.getElementById('simulators-grid');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={`w-full sm:w-auto px-7 py-3.5 min-h-[48px] h-12 rounded-xl font-bold text-sm sm:text-base border shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group select-none ${
                        isDarkMode
                          ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 shadow-slate-950/50'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400 shadow-slate-200'
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4 text-blue-400 transition-transform group-hover:rotate-90 duration-300" />
                      <span>Explore All Labs</span>
                    </button>
                  </motion.div>

                  {/* Trust Line & Lab Count */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono font-medium px-4 py-2 rounded-full border shadow-inner backdrop-blur-md select-none w-full max-w-2xl mx-auto ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800/80 text-slate-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className={`flex items-center gap-1.5 font-bold ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>
                      8 Industrial Power Labs
                    </span>
                    <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>·</span>
                    <span className={`flex items-center gap-1.5 font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      60 FPS Real-Time ODE Solver
                    </span>
                    <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>·</span>
                    <span className={`flex items-center gap-1.5 font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      IEEE / IEC Standards Concordance
                    </span>
                  </motion.div>

                  {/* ── REAL-TIME PHYSICS TELEMETRY STATUS TICKER (Suggestion 10) ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="w-full max-w-4xl mx-auto overflow-hidden rounded-xl border border-cyan-500/30 bg-[#070d1a]/85 backdrop-blur-md px-3 py-2 shadow-inner z-10 relative"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-5 text-[10.5px] font-mono text-slate-300">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span>RK4 ODE Solver: 60 FPS</span>
                      </div>
                      <span className="text-slate-700 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        <span>Commutation Overlap: Active</span>
                      </div>
                      <span className="text-slate-700 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Formulas Aligned: IEEE 519 / IEC 60146</span>
                      </div>
                      <span className="text-slate-700 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span>Safety Drills: NFPA 70E / OSHA 1910.147</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── FILTER & SEARCH BAR WITH DUAL VIEW TOGGLE (Suggestion 6) ── */}
                <div id="simulators-grid" className={`search-filter-bar sticky top-[68px] z-40 w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 backdrop-blur-md border p-2.5 sm:p-3 rounded-xl shadow-lg ${isDarkMode ? 'bg-[#0d1424]/95 border-[#1e293b]' : 'bg-white/95 border-slate-200'}`}>
                  {/* Search Input Box with Bordered Search Button */}
                  <div className="relative flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search rectifier, charger, SCR, harmonics, soft starter, buck, inverter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search simulators by keyword"
                        className="search-input w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all min-h-[44px] h-[44px]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white h-[44px] w-9 justify-center cursor-pointer min-h-[44px]"
                          title="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Search Action Button */}
                    <button
                      type="button"
                      onClick={() => setShowCommandPalette(true)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl border border-blue-400 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none min-h-[44px] h-[44px] shrink-0"
                      title="Open Command Search Palette (Ctrl+K)"
                    >
                      <Search className="w-4 h-4 text-white" />
                      <span className="hidden sm:inline">Search</span>
                    </button>
                  </div>

                  {/* Category Filter Chips & Dual View Mode Toggle */}
                  <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end w-full lg:w-auto">
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 pt-1 justify-start">
                      {(['All', 'Fundamentals', 'Chargers', 'Switching', 'Motor Control', 'Power Quality'] as const).map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`snap-start shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] h-[40px] cursor-pointer flex items-center justify-center gap-1 select-none active:scale-95 whitespace-nowrap ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-md shadow-blue-600/20 border border-blue-400/30'
                                : isDarkMode ? 'bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* View Mode Toggle: Cards vs Matrix (Suggestion 6) */}
                    <div className="flex items-center gap-1 bg-[#090e1a] border border-slate-700/80 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                          viewMode === 'cards'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white bg-transparent border-none'
                        }`}
                        title="Visual Cards View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('matrix')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                          viewMode === 'matrix'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white bg-transparent border-none'
                        }`}
                        title="Engineering Parametric Matrix"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Matrix</span>
                      </button>
                    </div>
                  </div>
                </div>


                {/* Visual Cards vs Engineering Matrix (Suggestion 6) */}
                {landingSimulators.length > 0 ? (
                  viewMode === 'matrix' ? (
                    <EngineeringMatrixTable
                      simulators={landingSimulators}
                      isDarkMode={isDarkMode}
                      onLaunchSim={handleLaunchSim}
                      onOpenSpecs={(sim) => setSpecModalSim(sim as any)}
                      launchingSimId={launchingSimId}
                    />
                  ) : (
                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.08 }
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full mt-2 justify-items-stretch"
                  >
                    {landingSimulators.map((sim) => {
                      const themeMap: Record<string, { topBar: string; badge: string; btn: string; borderHover: string }> = {
                        emerald: {
                          topBar: 'bg-emerald-500',
                          badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60',
                          btn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/40',
                          borderHover: 'hover:border-emerald-500/50 hover:shadow-emerald-950/30'
                        },
                        amber: {
                          topBar: 'bg-amber-500',
                          badge: 'bg-amber-950/70 text-amber-400 border-amber-800/60',
                          btn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30 ring-1 ring-amber-400/40',
                          borderHover: 'hover:border-amber-500/50 hover:shadow-amber-950/30'
                        },
                        yellow: {
                          topBar: 'bg-yellow-500',
                          badge: 'bg-yellow-950/70 text-yellow-300 border-yellow-800/60',
                          btn: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black shadow-yellow-600/30 ring-1 ring-yellow-400/50',
                          borderHover: 'hover:border-yellow-500/50 hover:shadow-yellow-950/30'
                        },
                        blue: {
                          topBar: 'bg-blue-500',
                          badge: 'bg-blue-950/70 text-blue-400 border-blue-800/60',
                          btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 ring-1 ring-blue-400/40',
                          borderHover: 'hover:border-blue-500/50 hover:shadow-blue-950/30'
                        },
                        indigo: {
                          topBar: 'bg-indigo-500',
                          badge: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
                          btn: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 ring-1 ring-indigo-400/40',
                          borderHover: 'hover:border-indigo-500/50 hover:shadow-indigo-950/30'
                        },
                        rose: {
                          topBar: 'bg-rose-500',
                          badge: 'bg-rose-950/70 text-rose-400 border-rose-800/60',
                          btn: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30 ring-1 ring-rose-400/40',
                          borderHover: 'hover:border-rose-500/50 hover:shadow-rose-950/30'
                        },
                        sky: {
                          topBar: 'bg-sky-500',
                          badge: 'bg-sky-950/70 text-sky-400 border-sky-800/60',
                          btn: 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-cyan-600/30 ring-1 ring-cyan-400/40',
                          borderHover: 'hover:border-sky-500/50 hover:shadow-sky-950/30'
                        },
                        teal: {
                          topBar: 'bg-teal-500',
                          badge: 'bg-teal-950/70 text-teal-300 border-teal-800/60',
                          btn: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-teal-600/30 ring-1 ring-teal-400/40',
                          borderHover: 'hover:border-teal-500/50 hover:shadow-teal-950/30'
                        },
                        purple: {
                          topBar: 'bg-purple-500',
                          badge: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
                          btn: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-purple-600/30 ring-1 ring-purple-400/40',
                          borderHover: 'hover:border-purple-500/50 hover:shadow-purple-950/30'
                        },
                      };
                      const theme = themeMap[sim.colorTheme] || themeMap.blue;

                      return (
                        <motion.div
                          key={sim.id}
                          variants={{
                            hidden: { opacity: 0, y: 16 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
                          }}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                          className={`sim-card-container group h-full flex flex-col justify-between rounded-2xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden border shadow-sm ${
                            isDarkMode
                              ? 'bg-[#0d1424] border-slate-800/80 shadow-black/40 hover:shadow-blue-900/15'
                              : 'bg-white border-slate-200 shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-500/10'
                          } ${theme.borderHover}`}
                        >
                          {/* Top Accent Strip */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${theme.topBar}`} />
                          
                          <div className="flex flex-col gap-2.5 pt-0.5">
                            {/* SVG Circuit Topology Preview (Suggestion 1) */}
                            <div className="w-full rounded-xl overflow-hidden border border-slate-800/60 bg-[#070b14] shadow-inner transition-transform duration-300 group-hover:scale-[1.01]">
                              <TopologyPreviewSVG simId={sim.id} className="w-full h-24" />
                            </div>

                            {/* Card Top Badges Row */}
                            <div className="flex items-center justify-between gap-1.5 pt-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold tracking-wider uppercase border ${theme.badge}`}>
                                  {sim.categoryBadge}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-semibold bg-slate-900/80 text-slate-300 border border-slate-700/60">
                                  {sim.voltage}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${
                                sim.difficulty === 'Beginner' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60' :
                                sim.difficulty === 'Intermediate' ? 'bg-amber-950/70 text-amber-400 border-amber-800/60' :
                                sim.difficulty === 'Industrial' ? 'bg-yellow-950/70 text-yellow-300 border-yellow-800/60' :
                                'bg-indigo-950/70 text-indigo-300 border-indigo-800/60'
                              }`}>
                                {sim.difficulty}
                              </span>
                            </div>

                            {/* Title & 1-line Description */}
                            <div className="flex flex-col gap-1">
                              <h3 className={`sim-card-title font-bold text-base transition-colors leading-snug tracking-tight ${
                                isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                              }`}>
                                {sim.tabName}
                              </h3>
                              <p className={`text-xs line-clamp-2 leading-relaxed font-normal ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                {sim.description}
                              </p>
                            </div>

                            {/* Standards Badge Row */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {sim.standards.map((std) => (
                                <span
                                  key={std}
                                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-semibold border ${
                                    isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {std}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Card Action Bar (Suggestion 2 & 4) */}
                          <div className={`flex items-center gap-2 mt-3 pt-2.5 border-t ${
                            isDarkMode ? 'border-slate-800/80' : 'border-slate-100'
                          }`}>
                            <button
                              type="button"
                              onClick={() => handleLaunchSim(sim.id)}
                              disabled={launchingSimId === sim.id}
                              className={`sim-card-action-btn flex-1 h-11 min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${theme.btn} transition-all select-none shrink-0 cursor-pointer border-none active:scale-[0.98]`}
                            >
                              {launchingSimId === sim.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Launching...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Launch Simulator</span>
                                  <ChevronRight className="w-4 h-4 opacity-90 group-hover:translate-x-0.5 transition-transform" />
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpecModalSim(sim)}
                              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                isDarkMode
                                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                              }`}
                              title="View Equations, Parameters & Standards"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  )
                ) : (
                  <div className={`w-full flex flex-col items-center justify-center py-12 px-4 rounded-2xl border gap-2.5 mt-2 shadow-sm ${
                    isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No simulators found</span>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Try adjusting your search keywords or filter category.</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('All');
                      }}
                      className="mt-1 text-xs text-blue-500 hover:underline font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {/* Smart Disclaimer Box */}
                <div className="w-full mt-4 text-[11.5px] leading-relaxed bg-[#0a0e17]/95 border border-slate-800/80 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <p className="m-0 text-slate-300 font-normal">
                    <strong className="text-slate-200 font-semibold">Educational Simulation Notice:</strong> Model-based ODE simulations for learning and academic demonstration (~2–5% textbook concordance). Independent project; not affiliated with, endorsed by, or approved by IEEE, IEC, NFPA, or OSHA. Spot a mistake or calculation edge-case? Email:{' '}
                    <a href="mailto:0808miracle@gmail.com" className="text-cyan-400 hover:underline font-mono">0808miracle@gmail.com</a>.
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('disclaimer');
                        window.history.pushState({}, '', '/disclaimer');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-amber-400 hover:text-amber-300 font-mono font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 shrink-0 text-xs"
                    >
                      <span>Disclaimer &amp; Accuracy</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-700 hidden sm:inline">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('methodology');
                        window.history.pushState({}, '', '/methodology');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-blue-400 hover:text-blue-300 font-mono font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 shrink-0 text-xs"
                    >
                      <span>Methodology</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── INTERACTIVE 3-TAB PERSONA SHOWCASE (Suggestion 9) ── */}
                <PersonaShowcase
                  isDarkMode={isDarkMode}
                  onLaunchSim={handleLaunchSim}
                />

                {/* ── EXPLORE POWER ELECTRONICS TOPICS SECTION ── */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.55 }}
                  className="w-full mt-10 pt-6 border-t border-slate-800/60 flex flex-col items-center gap-5 text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Explore Power Electronics
                    </h2>
                    <p className={`text-xs sm:text-sm font-normal max-w-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Select a core power electronics topic to launch the relevant interactive simulator.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl">
                    {[
                      { label: 'Rectifiers', tab: 'foundation-lab', path: '/foundation-lab' },
                      { label: 'SCR / Thyristors', tab: 'foundation-lab', path: '/foundation-lab' },
                      { label: 'PWM', tab: 'foundation-lab', path: '/foundation-lab' },
                      { label: 'Battery Chargers', tab: 'single-charger', path: '/single-6-pulse-charger' },
                      { label: 'Soft Starters', tab: 'soft-starter', path: '/soft-starter' },
                      { label: 'Static Transfer Switches', tab: 'static-switch', path: '/static-switch' },
                      { label: 'Harmonics', tab: 'harmonics', path: '/harmonics-filter' },
                      { label: 'FFT', tab: 'harmonics', path: '/harmonics-filter' },
                      { label: 'THD', tab: 'harmonics', path: '/harmonics-filter' },
                      { label: 'Power Quality', tab: 'harmonics', path: '/harmonics-filter' },
                      { label: 'Waveform Analysis', tab: 'foundation-lab', path: '/foundation-lab' }
                    ].map((topic, idx) => (
                      <a
                        key={idx}
                        href={topic.path}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(topic.tab);
                          window.history.pushState({}, '', topic.path);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 select-none ${
                          isDarkMode
                            ? 'bg-slate-900/90 text-slate-200 border-slate-800 hover:border-blue-500/50 hover:text-blue-400 shadow-sm'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>{topic.label}</span>
                      </a>
                    ))}
                  </div>
                </motion.div>

                {/* ── ENGINEERING TRANSPARENCY SECTION ── */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={`w-full mt-10 p-6 sm:p-8 rounded-2xl border flex flex-col items-center gap-5 text-center shadow-lg backdrop-blur-md ${
                    isDarkMode ? 'bg-[#0d1424]/90 border-slate-800/80 shadow-black/40' : 'bg-white border-slate-200/90 shadow-slate-200/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5 max-w-2xl">
                    <span className={`text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
                      isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      METHODOLOGY & OPEN SCIENCE
                    </span>
                    <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Engineering Transparency
                    </h2>
                    <p className={`text-xs sm:text-sm leading-relaxed mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Each simulator documents the model, assumptions, applicable standards references, validation information and known limitations so users can understand what the simulation represents.
                    </p>
                  </div>

                  {/* Visual Flow Ribbon */}
                  <div className="w-full max-w-4xl py-3.5 px-4 rounded-xl border bg-slate-950/60 border-slate-800/80">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 font-mono text-[11px] font-bold">
                      {[
                        'Model',
                        'Equations',
                        'Assumptions',
                        'Parameters',
                        'Validation',
                        'Standards References',
                        'Limitations'
                      ].map((step, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-blue-500 font-bold select-none">→</span>}
                          <span className={`px-2.5 py-1 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-blue-500/40' 
                              : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400'
                          }`}>
                            {step}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setShowHelp(true)}
                    className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-600 shadow-md transition-all cursor-pointer flex items-center gap-2 group select-none mt-1"
                  >
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>View Simulation Methodology</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              </div>
            );
          })()
        ) : (activeTab === 'single-charger' || activeTab === 'dual-charger' || activeTab === 'battery-charger') ? (
          <SingleChargerSimulatorHMI
            voltageIn={voltageIn}
            setVoltageIn={setVoltageIn}
            loadPct={loadPct}
            setLoadPct={setLoadPct}
            firingAngle={firingAngle}
            setFiringAngle={setFiringAngle}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            q1Closed={q1Closed}
            setQ1Closed={setQ1Closed}
            q2Closed={q2Closed}
            setQ2Closed={setQ2Closed}
            q3Closed={q3Closed}
            setQ3Closed={setQ3Closed}
            soc={soc}
            activeFaults={activeFaults}
            setActiveFaults={setActiveFaults}
            hasLcFilter={hasLcFilter}
            setHasLcFilter={setHasLcFilter}
            teachingView={teachingView}
            setTeachingView={setTeachingView}
            chargerSubTab={chargerSubTab}
            setChargerSubTab={setChargerSubTab}
            alarmLog={alarmLog}
            onClearAlarms={() => setAlarmLog([])}
            onNavigateToOverview={() => setActiveTab(null)}
            onOpenHelp={() => setShowHelp(true)}
          />
        ) : (activeTab === 'methodology' || activeTab === 'contact' || activeTab === 'about' || activeTab === 'privacy' || activeTab === 'terms' || activeTab === 'standards' || activeTab === 'disclaimer') ? (
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-start">
            {activeTab === 'methodology' && <MethodologyView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'contact' && <ContactView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'about' && <AboutView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'privacy' && <PrivacyView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'terms' && <TermsView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'standards' && <StandardsView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
            {activeTab === 'disclaimer' && <DisclaimerView isDarkMode={isDarkMode} onBack={() => setActiveTab(null)} />}
          </div>
        ) : (
          /* 3. CONTENT AREA (SIMULATOR ENGINE PLACEHOLDER VIEW) */
          <div>
            {activeTab !== 'foundation-lab' && activeTab !== 'dc-dc-converter' && activeTab !== 'single-phase-inverter' && (
              <div className="sim-view-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="breadcrumb">
                    <span onClick={() => setActiveTab(null)} className="cursor-pointer hover:underline">Suite Overview</span> / {currentSim?.tabName}
                  </div>
                  <h1 className="sim-title text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <span>{currentSim?.icon}</span> <span className="truncate">{currentSim?.title}</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button className="btn-outline flex-1 sm:flex-none justify-center py-2 px-3 text-xs" onClick={() => setActiveTab(null)}>
                    ← Overview
                  </button>
                  <button className="btn-primary flex-1 sm:flex-none justify-center py-2 px-3 text-xs" onClick={() => setIsRunning(!isRunning)}>
                    {isRunning ? '❚❚ Pause Engine' : '▶ Resume Engine'}
                  </button>
                </div>
              </div>
            )}

            <div className={activeTab === 'foundation-lab' || activeTab === 'soft-starter' || activeTab === 'harmonics' || activeTab === 'dc-dc-converter' || activeTab === 'single-phase-inverter' ? "w-full" : "simulator-grid"}>
              {/* Controls Column */}
              {activeTab !== 'foundation-lab' && activeTab !== 'soft-starter' && activeTab !== 'harmonics' && activeTab !== 'dc-dc-converter' && activeTab !== 'single-phase-inverter' && (
                <div className="control-panel flex flex-col gap-3 font-mono">
                  <div className="panel-heading flex justify-between items-center pb-2 border-b border-[#21262d]">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#c9d1d9]">⚙️ Control Parameters</span>
                    <span className="badge text-[10px] px-2 py-0.5 rounded bg-[#022c22] text-[#3fb950] border border-[#00ff88]/40">ACTIVE</span>
                  </div>

                  {activeTab === 'static-switch' ? (
                    <>
                      {/* System Load Demand Slider */}
                      <div className="control-group bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d] flex flex-col gap-1.5">
                        <div className="control-label flex justify-between text-xs font-semibold">
                          <span className="text-[#8b949e]">System Load Demand</span>
                          <span className="font-mono text-emerald-400 font-extrabold text-xs sm:text-sm">{loadPct} %</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="150"
                          value={loadPct}
                          onChange={(e) => setLoadPct(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500 my-0.5"
                        />
                      </div>

                      {/* SOURCE 1 (INPUT 1 / PREFERRED SOURCE A) CONTROLS CARD */}
                      <div className="flex flex-col gap-2.5 bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1 text-xs">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">⚡ Input 1 (Source A)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">Preferred</span>
                        </div>

                        {/* Voltage 1 Slider */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Voltage (V1):</span>
                            <span className="font-extrabold text-emerald-400 text-xs">{stsVoltage1.toFixed(0)} V AC</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="300"
                            step="1"
                            value={stsVoltage1}
                            onChange={(e) => setStsVoltage1(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        {/* Frequency 1 Slider (0 to 100 Hz, default 60 Hz) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Frequency (f1):</span>
                            <span className="font-extrabold text-emerald-400 text-xs">{stsFreq1.toFixed(1)} Hz</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={stsFreq1}
                            onChange={(e) => setStsFreq1(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>

                        {/* Phase Angle 1 Slider (-180 to +180 deg) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Phase Angle (θ1):</span>
                            <span className="font-extrabold text-emerald-400 text-xs">{stsPhase1 >= 0 ? '+' : ''}{stsPhase1.toFixed(1)}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={stsPhase1}
                            onChange={(e) => setStsPhase1(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>

                      {/* SOURCE 2 (INPUT 2 / ALTERNATE SOURCE B) CONTROLS CARD */}
                      <div className="flex flex-col gap-2.5 bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1 text-xs">
                          <span className="font-bold text-cyan-400 flex items-center gap-1">⚡ Input 2 (Source B)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">Alternate</span>
                        </div>

                        {/* Voltage 2 Slider */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Voltage (V2):</span>
                            <span className="font-extrabold text-cyan-400 text-xs">{stsVoltage2.toFixed(0)} V AC</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="300"
                            step="1"
                            value={stsVoltage2}
                            onChange={(e) => setStsVoltage2(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>

                        {/* Frequency 2 Slider (0 to 100 Hz, default 60 Hz) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Frequency (f2):</span>
                            <span className="font-extrabold text-cyan-400 text-xs">{stsFreq2.toFixed(1)} Hz</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={stsFreq2}
                            onChange={(e) => setStsFreq2(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>

                        {/* Phase Angle 2 Slider (-180 to +180 deg) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#8b949e]">Phase Angle (θ2):</span>
                            <span className="font-extrabold text-cyan-400 text-xs">{stsPhase2 >= 0 ? '+' : ''}{stsPhase2.toFixed(1)}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={stsPhase2}
                            onChange={(e) => setStsPhase2(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                      </div>

                      {/* OEM SYNC TOLERANCE RANGE INPUTS CARD (ANSI 25 RELAY) */}
                      <div className="flex flex-col gap-2 bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1 text-xs font-bold text-[#c9d1d9]">
                          <span className="flex items-center gap-1 text-amber-400">
                            🛡️ ANSI 25 Sync Permissive Limits
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">OEM Standard</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          {/* Voltage Tol Limit */}
                          <div className="flex flex-col gap-0.5 bg-[#161b22] p-1.5 rounded border border-[#21262d]">
                            <span className="text-[#8b949e] text-[9px] font-bold">Volt ΔV:</span>
                            <div className="flex items-center gap-0.5">
                              <span className="text-amber-400 font-bold text-[10px]">±</span>
                              <input
                                type="number"
                                min="0.5"
                                max="15"
                                step="0.5"
                                value={stsVoltTolerance}
                                onChange={(e) => setStsVoltTolerance(Math.max(0.5, Math.min(15, Number(e.target.value))))}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded px-1 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-slate-400 text-[9px]">%</span>
                            </div>
                          </div>

                          {/* Freq Tol Limit */}
                          <div className="flex flex-col gap-0.5 bg-[#161b22] p-1.5 rounded border border-[#21262d]">
                            <span className="text-[#8b949e] text-[9px] font-bold">Freq Δf:</span>
                            <div className="flex items-center gap-0.5">
                              <span className="text-amber-400 font-bold text-[10px]">±</span>
                              <input
                                type="number"
                                min="0.01"
                                max="1.0"
                                step="0.01"
                                value={stsFreqTolerance}
                                onChange={(e) => setStsFreqTolerance(Math.max(0.01, Math.min(1.0, Number(e.target.value))))}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded px-1 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-slate-400 text-[9px]">Hz</span>
                            </div>
                          </div>

                          {/* Phase Angle Tol Limit */}
                          <div className="flex flex-col gap-0.5 bg-[#161b22] p-1.5 rounded border border-[#21262d]">
                            <span className="text-[#8b949e] text-[9px] font-bold">Phase Δθ:</span>
                            <div className="flex items-center gap-0.5">
                              <span className="text-amber-400 font-bold text-[10px]">±</span>
                              <input
                                type="number"
                                min="0.5"
                                max="15"
                                step="0.5"
                                value={stsPhaseTolerance}
                                onChange={(e) => setStsPhaseTolerance(Math.max(0.5, Math.min(15, Number(e.target.value))))}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded px-1 py-0.5 text-amber-300 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-slate-400 text-[9px]">°</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* System Nominal Voltage Selector */}
                      <div className="metric-card bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d] flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="metric-label text-xs text-slate-400 font-bold uppercase">System AC Rating</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${isStsSyncOk ? 'bg-[#022c22] text-[#3fb950] border border-[#00ff88]/40' : 'bg-[#450a0a] text-[#f85149] border border-[#f85149]/40'}`}>
                            {isStsSyncOk ? 'PERMISSIVE' : 'UNSYNC'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setStsNominalVoltage('110V');
                              setStsVoltage1(110);
                              setStsVoltage2(110);
                            }}
                            className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                              stsNominalVoltage === '110V'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400 font-extrabold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            110V AC
                          </button>
                          <button
                            onClick={() => {
                              setStsNominalVoltage('220V');
                              setStsVoltage1(220);
                              setStsVoltage2(220);
                            }}
                            className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                              stsNominalVoltage === '220V'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-extrabold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            220V AC
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="control-group">
                        <div className="control-label">
                          <span>Input AC Voltage</span>
                          <span className="font-mono text-[#7ee787] font-bold">{voltageIn} V <span className="text-[10px] text-[#8b949e] font-normal">[read-only]</span></span>
                        </div>
                      </div>

                      <div className="control-group">
                        <div className="control-label">
                          <span>System Load Demand</span>
                          <span className="font-mono">{loadPct} %</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="110"
                          value={loadPct}
                          onChange={(e) => setLoadPct(Number(e.target.value))}
                          className="control-slider"
                        />
                      </div>

                      <div className="control-group">
                        <div className="control-label">
                          <span>Thyristor Firing Angle (α)</span>
                          <span className="font-mono text-[#3fb950] font-bold">{firingAngle}° <span className="text-[10px] text-[#8b949e] font-normal">[read-only]</span></span>
                        </div>
                        <div className="text-[10px] font-mono text-[#8b949e]">Value linked to main slider in Charger Control Panel</div>
                      </div>

                      <div className="metric-card">
                        <span className="metric-label">Nominal Rating</span>
                        <span className="metric-value font-mono">{currentSim?.voltage}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Output / Waveform Visualizer & SLD Diagram */}
              <div className="output-panel" style={{ overflow: 'visible' }}>
                {activeTab === 'foundation-lab' ? (
                  <PowerSimFoundationLab
                    onNavigateToOverview={() => setActiveTab(null)}
                    onNavigateToCharger={() => {
                      setActiveTab('single-charger');
                      setChargerSubTab('single');
                    }}
                  />
                ) : (activeTab === 'single-charger' || activeTab === 'dual-charger' || activeTab === 'battery-charger') ? (
                  <div className="flex flex-col gap-6 w-full items-start">
                    {/* SUB-SCHEME SELECTOR SWITCHER */}
                    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 font-mono shadow-2xl">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
                        <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-bold text-xs uppercase tracking-wider text-center lg:text-left shrink-0">
                          SELECT CHARGER SIMULATOR:
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                          <button
                            onClick={() => {
                              setChargerSubTab('single');
                              setActiveTab('single-charger');
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                              chargerSubTab === 'single'
                                ? 'bg-sky-950 border-2 border-sky-400 text-sky-200 shadow-lg shadow-sky-950/80 ring-1 ring-sky-400/50'
                                : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white hover:border-slate-500'
                            }`}
                          >
                            <span>⚡ 1. Single 6-Pulse Charger</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-900/80 text-sky-300 font-semibold">
                              Basics & SCR Firing Angle
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setChargerSubTab('dual');
                              setActiveTab('dual-charger');
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                              chargerSubTab === 'dual'
                                ? dualBlackout
                                  ? 'bg-red-950 border-2 border-red-500 text-red-200 shadow-lg shadow-red-950/80 ring-1 ring-red-500/50 animate-pulse'
                                  : 'bg-emerald-950 border-2 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-950/80 ring-1 ring-emerald-400/50'
                                : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white hover:border-slate-500'
                            }`}
                          >
                            <span>🔋 2. Dual Charger & Dual Bank Scheme</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              chargerSubTab === 'dual' && dualBlackout
                                ? 'bg-red-900/80 text-red-200 font-bold'
                                : 'bg-emerald-900/80 text-emerald-300'
                            }`}>
                              {chargerSubTab === 'dual' && dualBlackout ? 'DC SUPPLY BLACKOUT (0V)' : 'Substation 220VDC Standard'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-sans">
                        {chargerSubTab === 'single'
                          ? 'Mode: Single 3-Phase 6-Pulse SCR Bridge with Firing Angle α, LC Ripple Filter & Float/Boost'
                          : 'Mode: Substation 220VDC Float Cum Boost Charger-1A & 1B (80A) with Bus Tie Coupler & 64G Relay'}
                      </div>
                    </div>

                    {chargerSubTab === 'dual' ? (
                      <DualBatteryChargerContainer voltageIn={voltageIn} isRunning={isRunning} onBlackoutChange={setDualBlackout} />
                    ) : (
                      <>
                        {/* TEACHING LEVEL NAVIGATION TABS */}
                        <div className="w-full flex flex-col sm:flex-row items-center justify-between bg-[#161b22] border border-[#30363d] rounded-xl p-3 gap-3 shadow-md">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider hidden md:inline">
                              TEACHING LEVEL:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => setTeachingView('operator')}
                                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                                  teachingView === 'operator'
                                    ? 'bg-[#238636] text-white shadow-lg ring-1 ring-[#3fb950]'
                                    : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                                }`}
                              >
                                <span>👨‍✈️ OPERATOR VIEW</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0d1117] text-[#3fb950]">
                                  Default
                                </span>
                              </button>

                              <button
                                onClick={() => setTeachingView('maintenance')}
                                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                                  teachingView === 'maintenance'
                                    ? 'bg-[#1f6beb] text-white shadow-lg ring-1 ring-[#58a6ff]'
                                    : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                                }`}
                              >
                                <span>🛠️ MAINTENANCE VIEW</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0d1117] text-[#58a6ff]">
                                  Full View
                                </span>
                              </button>

                              <button
                                onClick={() => setTeachingView('reliability')}
                                className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                                  teachingView === 'reliability'
                                    ? 'bg-[#8957e5] text-white shadow-lg ring-1 ring-[#d2a8ff]'
                                    : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                                }`}
                              >
                                <span>📊 RELIABILITY VIEW</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0d1117] text-[#d2a8ff] font-bold">
                                  Pro Feature
                                </span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="text-[11px] font-mono text-[#8b949e]">
                              {teachingView === 'operator' && 'Operator Level: Simplified SLD, DC Meters & Primary Controls'}
                              {teachingView === 'maintenance' && 'Maintenance Level: Full SLD, Waveforms, Protection Relays & Fault Injection'}
                              {teachingView === 'reliability' && 'Reliability Level: IEEE 1188 Aging, Temp Slope, Event Log & MTBF'}
                            </div>
                            {renderViewAlarmsButton(alarmLog)}
                          </div>
                        </div>

                        {/* TAB 1: OPERATOR VIEW */}
                        {teachingView === 'operator' && (
                          <BatteryChargerOperatorView
                            voltageIn={voltageIn}
                            loadPct={loadPct}
                            firingAngle={firingAngle}
                            setFiringAngle={setFiringAngle}
                            isRunning={isRunning}
                            q1Closed={q1Closed}
                            setQ1Closed={setQ1Closed}
                            q2Closed={q2Closed}
                            setQ2Closed={setQ2Closed}
                            q3Closed={q3Closed}
                            setQ3Closed={setQ3Closed}
                            soc={soc}
                            activeFaults={activeFaults}
                            hasLcFilter={hasLcFilter}
                          />
                        )}

                        {/* TAB 2: MAINTENANCE VIEW (CURRENT FULL VIEW) */}
                        {teachingView === 'maintenance' && (
                          <>
                            {/* TOP ROW: SLD on LEFT 55%, Waveforms Panel on RIGHT 45% */}
                            <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
                              {/* LEFT 55%: Single Line Diagram */}
                              <div className="w-full xl:w-[55%] shrink-0">
                                <BatteryChargerSLD
                                  voltageIn={voltageIn}
                                  loadPct={loadPct}
                                  firingAngle={firingAngle}
                                  isRunning={isRunning}
                                  q1Closed={q1Closed}
                                  q2Closed={q2Closed}
                                  q3Closed={q3Closed}
                                  onToggleQ1={() => setQ1Closed(!q1Closed)}
                                  onToggleQ2={() => setQ2Closed(!q2Closed)}
                                  onToggleQ3={() => setQ3Closed(!q3Closed)}
                                  soc={soc}
                                  activeFaults={activeFaults}
                                  hasLcFilter={hasLcFilter}
                                />
                              </div>

                              {/* RIGHT 45%: Waveform Display Panel */}
                              <div className="w-full xl:w-[45%] flex flex-col gap-4">
                                <BatteryChargerWaveforms
                                  voltageIn={voltageIn}
                                  loadPct={loadPct}
                                  firingAngle={firingAngle}
                                  q1Closed={q1Closed}
                                  q2Closed={q2Closed}
                                  q3Closed={q3Closed}
                                  isRunning={isRunning}
                                  soc={soc}
                                  activeFaults={activeFaults}
                                  hasLcFilter={hasLcFilter}
                                />
                              </div>
                            </div>

                            {/* CONTROL PANEL (LEFT) + SOP PANEL (RIGHT) */}
                            <div className="w-full">
                              <BatteryChargerControlsAndSOP
                                firingAngle={firingAngle}
                                setFiringAngle={setFiringAngle}
                                voltageIn={voltageIn}
                                loadPct={loadPct}
                                setLoadPct={setLoadPct}
                                q1Closed={q1Closed}
                                setQ1Closed={setQ1Closed}
                                q2Closed={q2Closed}
                                setQ2Closed={setQ2Closed}
                                q3Closed={q3Closed}
                                setQ3Closed={setQ3Closed}
                                isRunning={isRunning}
                                soc={soc}
                                hasLcFilter={hasLcFilter}
                                setHasLcFilter={setHasLcFilter}
                              />
                            </div>

                            {/* FAULT INJECTION & PROTECTION LOGIC PANEL */}
                            <div className="w-full">
                              <BatteryChargerFaultPanel
                                activeFaults={activeFaults}
                                onTriggerFault={handleTriggerFault}
                                onResetFaults={handleResetFaults}
                                relays={relays}
                              />
                            </div>
                          </>
                        )}

                        {/* TAB 3: RELIABILITY VIEW (PRO FEATURE) */}
                        {teachingView === 'reliability' && (
                          <BatteryChargerReliabilityView
                            voltageIn={voltageIn}
                            loadPct={loadPct}
                            firingAngle={firingAngle}
                            q1Closed={q1Closed}
                            q2Closed={q2Closed}
                            q3Closed={q3Closed}
                            isRunning={isRunning}
                            soc={soc}
                            activeFaults={activeFaults}
                            hasLcFilter={hasLcFilter}
                            alarms={alarmLog}
                          />
                        )}
                      </>
                    )}
                  </div>
                ) : activeTab === 'static-switch' ? (
                  <div className="flex flex-col gap-6 w-full items-start">
                    {/* SUB-TAB NAVIGATION BAR */}
                    <div className="w-full flex flex-col md:flex-row items-center justify-between bg-[#161b22] border border-[#30363d] rounded-xl p-3 gap-3 shadow-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setStsSubTab('sld')}
                          className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                            stsSubTab === 'sld'
                              ? 'bg-[#238636] text-white shadow-lg'
                              : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                          }`}
                        >
                          <span>âš¡ Primary SLD & Operations</span>
                        </button>

                        <button
                          onClick={() => setStsSubTab('matrix')}
                          className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                            stsSubTab === 'matrix'
                              ? 'bg-[#1f6beb] text-white shadow-lg'
                              : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                          }`}
                        >
                          <span>ðŸ“Š Transfer Matrix & Synchroscope</span>
                        </button>

                        <button
                          onClick={() => setStsSubTab('relays')}
                          className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                            stsSubTab === 'relays'
                              ? 'bg-[#d29922] text-black shadow-lg font-extrabold'
                              : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]'
                          }`}
                        >
                          <span>ðŸ›¡ï¸ Protection Relays & Fault Panel</span>
                        </button>
                      </div>

                      {/* QUICK STATUS PILLS & ALARMS BUTTON */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs font-mono bg-[#0d1117] px-3 py-2 rounded-lg border border-[#30363d] justify-center md:justify-start">
                          <span className="text-[#8b949e]">Path: <strong className="text-[#3fb950]">{stsActiveBridge === 'A' ? 'SRC A (SCR)' : stsActiveBridge === 'B' ? 'SRC B (SCR)' : 'BYPASS Q3'}</strong></span>
                          <span className="text-[#30363d]">|</span>
                          <span className="text-[#8b949e]">Sync Relay 25: <strong className={isStsSyncOk ? 'text-[#3fb950]' : 'text-[#f85149]'}>{isStsSyncOk ? 'PERMISSIVE' : 'BLOCKED'}</strong></span>
                          <span className="text-[#30363d]">|</span>
                          <span className="text-[#8b949e]">Load: <strong className="text-[#38bdf8]">{stsLoadCurrent.toFixed(0)}A (230V)</strong></span>
                        </div>
                        {renderViewAlarmsButton(stsAlarmLog)}
                      </div>
                    </div>

                    {/* SUB-TAB 1: INTEGRATED WORKBENCH MATCHING SINGLE 6-PULSE CHARGER LAYOUT */}
                    {stsSubTab === 'sld' && (
                      <div className="flex flex-col gap-6 w-full">
                        {/* TOP ROW: SLD on LEFT 70%, Synchroscope, Dual Waveforms & Telemetry on RIGHT 30% */}
                        <div className="flex flex-col xl:flex-row gap-5 w-full items-start">
                          {/* LEFT 70%: Single Line Diagram */}
                          <div className="w-full xl:w-[70%] min-w-0">
                            <StaticSwitchSLD
                              qaClosed={stsQAClosed}
                              qbClosed={stsQBClosed}
                              q3Closed={stsQ3BypassClosed}
                              bypassSource={stsBypassSource}
                              activeBridge={stsActiveBridge}
                              onToggleQA={() => setStsQAClosed(!stsQAClosed)}
                              onToggleQB={() => setStsQBClosed(!stsQBClosed)}
                              onToggleQ3={() => setStsQ3BypassClosed(!stsQ3BypassClosed)}
                              onSelectBypassSource={(src) => setStsBypassSource(src)}
                              voltageA={stsVoltageAUpstream}
                              freqA={stsFreqACalculated}
                              voltageB={stsVoltageBUpstream}
                              freqB={stsFreqBCalculated}
                              phaseB={stsPhaseBCalculated}
                              loadCurrent={stsLoadCurrent}
                              outputVoltage={stsOutputVoltage}
                              faults={stsFaults}
                              nominalVoltageRating={stsNominalVoltage}
                              onSelectNominalVoltage={(v) => setStsNominalVoltage(v)}
                            />
                          </div>

                          {/* RIGHT 30%: Synchroscope, Live Dual Input Waveforms & Conduction Results */}
                          <div className="w-full xl:w-[30%] flex flex-col gap-3 shrink-0">
                            {/* SYNCHROSCOPE DISPLAY & LIVE DUAL INPUT AC WAVEFORMS */}
                            <StaticSwitchSynchroscope
                              voltageA={stsVoltageAUpstream}
                              freqA={stsFreqACalculated}
                              phaseA={stsPhase1}
                              voltageB={stsVoltageBUpstream}
                              freqB={stsFreqBCalculated}
                              phaseB={stsPhase2}
                              phaseBOffset={stsPhaseBOffset}
                              isSyncOk={isStsSyncOk}
                              deltaTheta={stsDeltaTheta}
                              deltaFreq={stsDeltaFreq}
                              deltaVoltPct={stsDeltaVoltPct}
                              nominalVoltage={stsNominalVoltage}
                              phaseTolerance={stsPhaseTolerance}
                            />

                            {/* REAL-TIME TELEMETRY & RESULTS CARD */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-xs font-mono flex flex-col gap-3 shadow-lg">
                              <div className="text-xs font-bold text-[#c9d1d9] pb-2 border-b border-[#21262d] flex justify-between items-center">
                                <span>ðŸ“Š Switch Conduction Results</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#238636]/20 border border-[#3fb950]/40 text-[#3fb950] font-bold">
                                  CLASS 1 PERFORMANCE
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                                  <div className="text-[#8b949e] text-[10px]">Active Conduction</div>
                                  <div className="font-extrabold text-[#3fb950] truncate mt-0.5">
                                    {stsActiveBridge === 'A'
                                      ? 'Bridge A (Source A)'
                                      : stsActiveBridge === 'B'
                                      ? 'Bridge B (Source B)'
                                      : stsActiveBridge === 'BOTH'
                                      ? 'COMMUTATION OVERLAP'
                                      : 'DE-ENERGIZED'}
                                  </div>
                                </div>

                                <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                                  <div className="text-[#8b949e] text-[10px]">Transfer Speed</div>
                                  <div className="font-extrabold text-[#58a6ff] mt-0.5">
                                    {stsTransferMode === 'MAKE_BEFORE_BREAK' ? '< 3.2 ms (MBB)' : '< 3.8 ms (BBM)'}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d] flex justify-between items-center text-xs">
                                <span className="text-[#8b949e]">Sync Relay 25 Status:</span>
                                <span className={`font-bold px-2 py-1 rounded text-[10px] ${isStsSyncOk ? 'bg-[#238636]/30 text-[#3fb950]' : 'bg-[#da3633]/30 text-[#f85149]'}`}>
                                  {isStsSyncOk ? 'SYNC PERMISSIVE OK' : 'TRANSFER BLOCKED'}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                                <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                                  <div className="text-[#8b949e] text-[9px]">Î”Î¸ Angle</div>
                                  <div className={`font-bold mt-0.5 ${stsDeltaTheta <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                    {stsDeltaTheta.toFixed(1)}Â°
                                  </div>
                                </div>

                                <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                                  <div className="text-[#8b949e] text-[9px]">Î”f Frequency</div>
                                  <div className={`font-bold mt-0.5 ${stsDeltaFreq <= 0.1 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                    {stsDeltaFreq.toFixed(2)} Hz
                                  </div>
                                </div>

                                <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                                  <div className="text-[#8b949e] text-[9px]">Î”V Voltage</div>
                                  <div className={`font-bold mt-0.5 ${stsDeltaVoltPct <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                    {stsDeltaVoltPct.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* POWER OUTAGE & AUTO-TRANSFER SIMULATION PANEL */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-lg font-mono text-xs">
                              <div className="text-xs font-bold text-[#c9d1d9] pb-2 border-b border-[#21262d] flex justify-between items-center">
                                <span>âš¡ Source Outage & Fast-Transfer Inhibit</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stsAutoTransferEnabled ? 'bg-[#238636]/20 text-[#3fb950]' : 'bg-[#da3633]/20 text-[#f85149]'}`}>
                                  {stsAutoTransferEnabled ? 'AUTO <4ms ON' : 'AUTO INHIBITED'}
                                </span>
                              </div>

                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => {
                                    const next = !stsAutoTransferEnabled;
                                    setStsAutoTransferEnabled(next);
                                    addStsAlarm('INFO', `Automatic Fast-Transfer Mode ${next ? 'ENABLED (< 4ms)' : 'INHIBITED (Manual Only)'}`);
                                  }}
                                  className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs border transition-all flex items-center justify-between min-h-[44px] ${
                                    stsAutoTransferEnabled
                                      ? 'bg-[#238636]/20 border-[#3fb950] text-[#3fb950] hover:bg-[#238636]/30'
                                      : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
                                  }`}
                                >
                                  <span>Automatic Fast-Transfer (&lt;4ms)</span>
                                  <span>{stsAutoTransferEnabled ? 'ENABLED â–¶' : 'INHIBITED â¸'}</span>
                                </button>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <button
                                    onClick={() => {
                                      const next = !stsSourceAPowerStopped;
                                      setStsSourceAPowerStopped(next);
                                      addStsAlarm(next ? 'TRIP' : 'INFO', `Source A Power ${next ? 'STOPPED / OUTAGE' : 'RESTORED (230V)'}`);
                                    }}
                                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all min-h-[44px] ${
                                      stsSourceAPowerStopped
                                        ? 'bg-[#da3633] text-white border-[#f85149] animate-pulse'
                                        : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:border-[#f85149]'
                                    }`}
                                  >
                                    {stsSourceAPowerStopped ? 'âš ï¸ SRC A OUTAGE' : 'âš¡ CUT SOURCE A'}
                                  </button>

                                  <button
                                    onClick={() => {
                                      const next = !stsSourceBPowerStopped;
                                      setStsSourceBPowerStopped(next);
                                      addStsAlarm(next ? 'TRIP' : 'INFO', `Source B Power ${next ? 'STOPPED / OUTAGE' : 'RESTORED (230V)'}`);
                                    }}
                                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all min-h-[44px] ${
                                      stsSourceBPowerStopped
                                        ? 'bg-[#da3633] text-white border-[#f85149] animate-pulse'
                                        : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:border-[#f85149]'
                                    }`}
                                  >
                                    {stsSourceBPowerStopped ? 'âš ï¸ SRC B OUTAGE' : 'âš¡ CUT SOURCE B'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* MIDDLE ROW: CONTROL PANEL (LEFT) + SOP PANEL (RIGHT) */}
                        <div className="w-full">
                          <StaticSwitchControlsAndSOP
                            v1={stsVoltage1}
                            onV1Change={setStsVoltage1}
                            f1={stsFreq1}
                            onF1Change={setStsFreq1}
                            phase1={stsPhase1}
                            onPhase1Change={setStsPhase1}
                            v2={stsVoltage2}
                            onV2Change={setStsVoltage2}
                            f2={stsFreq2}
                            onF2Change={setStsFreq2}
                            phase2={stsPhase2}
                            onPhase2Change={setStsPhase2}
                            voltTolerance={stsVoltTolerance}
                            onVoltToleranceChange={setStsVoltTolerance}
                            freqTolerance={stsFreqTolerance}
                            onFreqToleranceChange={setStsFreqTolerance}
                            phaseTolerance={stsPhaseTolerance}
                            onPhaseToleranceChange={setStsPhaseTolerance}
                            phaseBOffset={stsPhaseBOffset}
                            onPhaseBChange={setStsPhaseBOffset}
                            freqBOffset={stsFreqBOffset}
                            onFreqBChange={setStsFreqBOffset}
                            voltageBOffset={stsVoltageBOffset}
                            onVoltageBChange={setStsVoltageBOffset}
                            nominalVoltageRating={stsNominalVoltage}
                            onSelectNominalVoltage={(v) => setStsNominalVoltage(v)}
                            transferMode={stsTransferMode}
                            onToggleTransferMode={() =>
                              setStsTransferMode(
                                stsTransferMode === 'MAKE_BEFORE_BREAK' ? 'BREAK_BEFORE_MAKE' : 'MAKE_BEFORE_BREAK'
                              )
                            }
                            activeBridge={stsActiveBridge}
                            isSyncOk={isStsSyncOk}
                            onTransferToB={handleStsTransferToB}
                            onTransferToA={handleStsTransferToA}
                            onEmergencyTransfer={handleStsEmergencyTransfer}
                            q3Closed={stsQ3BypassClosed}
                            onToggleQ3={() => setStsQ3BypassClosed(!stsQ3BypassClosed)}
                            bypassSource={stsBypassSource}
                            onSelectBypassSource={(src) => setStsBypassSource(src)}
                          />
                        </div>

                        {/* BOTTOM ROW: FAULT INJECTION & PROTECTION LOGIC PANEL */}
                        <div className="w-full">
                          <StaticSwitchFaultPanel
                            faults={stsFaults}
                            onTriggerFault={(faultKey) => handleTriggerStsFault(faultKey)}
                            onResetFaults={handleResetStsFaults}
                            relays={stsRelays}
                          />
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: TRANSFER QUALIFICATION MATRIX & SYNCHROSCOPE */}
                    {stsSubTab === 'matrix' && (
                      <div className="flex flex-col gap-6 w-full">
                        {/* TOP ROW: SYNCHROSCOPE + TELEMETRY */}
                        <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
                          <div className="w-full xl:w-[50%] shrink-0">
                            <StaticSwitchSynchroscope
                              voltageA={stsVoltageAUpstream}
                              freqA={stsFreqACalculated}
                              voltageB={stsVoltageBUpstream}
                              freqB={stsFreqBCalculated}
                              phaseBOffset={stsPhaseBOffset}
                              isSyncOk={isStsSyncOk}
                              deltaTheta={stsDeltaTheta}
                              deltaFreq={stsDeltaFreq}
                              deltaVoltPct={stsDeltaVoltPct}
                            />
                          </div>

                          <div className="w-full xl:w-[50%] bg-[#161b22] border border-[#30363d] rounded-xl p-5 font-mono text-xs text-[#c9d1d9] flex flex-col gap-4 shadow-lg">
                            <h3 className="font-bold text-sm text-[#58a6ff] pb-2 border-b border-[#21262d] flex justify-between items-center">
                              <span>ðŸ“ Phase Synchronization Diagnostics</span>
                              <span className="text-[11px] font-normal text-[#8b949e]">IEC 62040-3 Standard</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                                <div className="text-[#8b949e] text-[10px]">Voltage Difference (Î”V)</div>
                                <div className={`text-sm font-bold mt-1 ${stsDeltaVoltPct <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                  {stsDeltaVoltPct.toFixed(1)}% (Limit: â‰¤ 5.0%)
                                </div>
                              </div>
                              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                                <div className="text-[#8b949e] text-[10px]">Frequency Difference (Î”f)</div>
                                <div className={`text-sm font-bold mt-1 ${stsDeltaFreq <= 0.1 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                  {stsDeltaFreq.toFixed(2)} Hz (Limit: â‰¤ 0.10 Hz)
                                </div>
                              </div>
                              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                                <div className="text-[#8b949e] text-[10px]">Phase Angle Offset (Î”Î¸)</div>
                                <div className={`text-sm font-bold mt-1 ${stsDeltaTheta <= 5 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                  {stsDeltaTheta.toFixed(1)}Â° (Limit: â‰¤ 5.0Â°)
                                </div>
                              </div>
                              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
                                <div className="text-[#8b949e] text-[10px]">L-N Polarity Match</div>
                                <div className={`text-sm font-bold mt-1 ${!stsFaults.phaseReversalB ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                  {!stsFaults.phaseReversalB ? 'NORMAL POLARITY' : 'POLARITY INVERTED'}
                                </div>
                              </div>
                            </div>
                            <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] text-slate-300 leading-relaxed text-[11px]">
                              <strong>Bumpless Fast-Transfer Requirement:</strong> For smooth, zero-interruption thyristor commutation (&lt; 4ms) without circulating currents, both sources must satisfy tight phase angle, frequency, and voltage tolerances according to IEC 62040-3 Class 1 specifications.
                            </div>
                          </div>
                        </div>

                        {/* FULL QUALIFICATION MATRIX */}
                        <div className="w-full">
                          <BumplessTransferMatrix
                            voltageA={stsVoltageAUpstream}
                            freqA={stsFreqACalculated}
                            phaseA={0}
                            voltageB={stsVoltageBUpstream}
                            freqB={stsFreqBCalculated}
                            phaseB={stsPhaseBCalculated}
                            deltaTheta={stsDeltaTheta}
                            deltaFreq={stsDeltaFreq}
                            deltaVoltPct={stsDeltaVoltPct}
                            activeBridge={stsActiveBridge}
                            transferMode={stsTransferMode}
                            autoTransferEnabled={stsAutoTransferEnabled}
                            onToggleAutoTransfer={() => {
                              const next = !stsAutoTransferEnabled;
                              setStsAutoTransferEnabled(next);
                              addStsAlarm('INFO', `Automatic Fast-Transfer Mode ${next ? 'ENABLED (< 4ms)' : 'INHIBITED (Manual Only)'}`);
                            }}
                            sourceAPowerStopped={stsSourceAPowerStopped}
                            sourceBPowerStopped={stsSourceBPowerStopped}
                            onToggleStopSourceA={() => {
                              const next = !stsSourceAPowerStopped;
                              setStsSourceAPowerStopped(next);
                              addStsAlarm(next ? 'TRIP' : 'INFO', `Source A Power ${next ? 'STOPPED / OUTAGE' : 'RESTORED (230V)'}`);
                            }}
                            onToggleStopSourceB={() => {
                              const next = !stsSourceBPowerStopped;
                              setStsSourceBPowerStopped(next);
                              addStsAlarm(next ? 'TRIP' : 'INFO', `Source B Power ${next ? 'STOPPED / OUTAGE' : 'RESTORED (230V)'}`);
                            }}
                            qaClosed={stsQAClosed}
                            qbClosed={stsQBClosed}
                            q3Closed={stsQ3BypassClosed}
                            matrixState={stsMatrixState}
                            lastTransferTimeMs={stsLastTransferTimeMs}
                            lastTransferReason={stsLastTransferReason}
                          />
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 3: PROTECTIVE RELAYS & FAULT SIMULATION */}
                    {stsSubTab === 'relays' && (
                      <div className="flex flex-col gap-6 w-full">
                        <div className="w-full">
                          <StaticSwitchFaultPanel
                            faults={stsFaults}
                            onTriggerFault={handleTriggerStsFault}
                            onResetFaults={handleResetStsFaults}
                            relays={stsRelays}
                          />
                        </div>

                        <div className="w-full">
                          <StaticSwitchControlsAndSOP
                            v1={stsVoltage1}
                            onV1Change={setStsVoltage1}
                            f1={stsFreq1}
                            onF1Change={setStsFreq1}
                            phase1={stsPhase1}
                            onPhase1Change={setStsPhase1}
                            v2={stsVoltage2}
                            onV2Change={setStsVoltage2}
                            f2={stsFreq2}
                            onF2Change={setStsFreq2}
                            phase2={stsPhase2}
                            onPhase2Change={setStsPhase2}
                            voltTolerance={stsVoltTolerance}
                            onVoltToleranceChange={setStsVoltTolerance}
                            freqTolerance={stsFreqTolerance}
                            onFreqToleranceChange={setStsFreqTolerance}
                            phaseTolerance={stsPhaseTolerance}
                            onPhaseToleranceChange={setStsPhaseTolerance}
                            phaseBOffset={stsPhaseBOffset}
                            onPhaseBChange={setStsPhaseBOffset}
                            freqBOffset={stsFreqBOffset}
                            onFreqBChange={setStsFreqBOffset}
                            voltageBOffset={stsVoltageBOffset}
                            onVoltageBChange={setStsVoltageBOffset}
                            transferMode={stsTransferMode}
                            onToggleTransferMode={() =>
                              setStsTransferMode(
                                stsTransferMode === 'MAKE_BEFORE_BREAK' ? 'BREAK_BEFORE_MAKE' : 'MAKE_BEFORE_BREAK'
                              )
                            }
                            activeBridge={stsActiveBridge}
                            isSyncOk={isStsSyncOk}
                            onTransferToB={handleStsTransferToB}
                            onTransferToA={handleStsTransferToA}
                            onEmergencyTransfer={handleStsEmergencyTransfer}
                            q3Closed={stsQ3BypassClosed}
                            onToggleQ3={() => setStsQ3BypassClosed(!stsQ3BypassClosed)}
                            bypassSource={stsBypassSource}
                            onSelectBypassSource={(src) => setStsBypassSource(src)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'soft-starter' ? (
                  <SoftStarter
                    ssParams={ssParams}
                    setSsParams={setSsParams}
                    ssReadouts={ssReadouts}
                    ssIsRunning={ssIsRunning}
                    ssIsTrip={ssIsTrip}
                    ssFaults={ssFaults}
                    currentSsEngineState={currentSsEngineState}
                    handleSsStart={handleSsStart}
                    handleSsStop={handleSsStop}
                    handleSsJog={handleSsJog}
                    ssMCCBClosed={ssMCCBClosed}
                    setSsMCCBClosed={setSsMCCBClosed}
                    ssBypassOverride={ssBypassOverride}
                    setSsBypassOverride={setSsBypassOverride}
                    ssSuctionValveOpen={ssSuctionValveOpen}
                    setSsSuctionValveOpen={setSsSuctionValveOpen}
                    ssDischargeValveOpen={ssDischargeValveOpen}
                    setSsDischargeValveOpen={setSsDischargeValveOpen}
                    ssFlashTargetComponent={ssFlashTargetComponent}
                    addSsAlarm={addSsAlarm}
                    ssAlarmLog={ssAlarmLog}
                    renderViewAlarmsButton={renderViewAlarmsButton}
                    handleTriggerFault={handleTriggerSsFault}
                    handleResetSsFaults={handleResetSsFaults}
                    setActiveTab={setActiveTab}
                  />
                ) : activeTab === 'dc-dc-converter' ? (
                  <DCDCConverter />
                ) : activeTab === 'single-phase-inverter' ? (
                  <SinglePhaseInverter />
                ) : activeTab === 'harmonics' ? (

                  <CyberIndustrialPowerLab />
                ) : (
                  <>
                    <div className="canvas-container">
                      <div className="canvas-header">
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#c9d1d9' }}>
                          📊 Real-Time Oscilloscope Telemetry
                        </span>
                        <span className="badge">CH1: Voltage | CH2: Load Current</span>
                      </div>
                      <canvas ref={canvasRef} width="700" height="220" className="waveform-canvas"></canvas>
                    </div>

                    <div className="log-terminal">
                      <div>[SYSTEM OK] PowerElectronics Engine initialized for {currentSim?.title}</div>
                      <div>[STANDARDS] Verified against {currentSim?.standards.join(', ')}</div>
                      <div>[TELEMETRY] Input Voltage: {voltageIn} VAC | Load Demand: {loadPct}%</div>
                      <div>[STATUS] Operating within continuous heavy-duty process thresholds.</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* REUSABLE COMMON FOOTER (Visible across landing page, text pages, and all simulators) */}
      {activeTab && activeTab !== 'overview' && activeTab !== 'methodology' && activeTab !== 'contact' && activeTab !== 'about' && activeTab !== 'privacy' && activeTab !== 'terms' && activeTab !== 'standards' && activeTab !== 'disclaimer' ? (
        <CommonFooter />
      ) : (
        <Footer
          isDarkMode={isDarkMode}
          setActiveTab={setActiveTab}
          onOpenContact={() => setShowContactModal(true)}
          onOpenPrivacy={() => setShowPrivacyModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
          onOpenAbout={() => setShowAboutModal(true)}
          onOpenDisclaimer={() => setShowDisclaimerModal(true)}
          setShowHelp={setShowHelp}
          setShowStandards={setShowStandards}
        />
      )}

      {/* GLOBAL ALARMS & ALERTS MODAL */}
      <AlarmsAndAlertsModal
        isOpen={showAlarmsModal}
        onClose={() => setShowAlarmsModal(false)}
        alarmLog={getActiveModuleAlarmLog().log}
        onClearLog={() => getActiveModuleAlarmLog().setLog([])}
        moduleName={getActiveModuleAlarmLog().name}
        onSelectLogEntry={handleSelectLogEntry}
      />

      {/* HELP MODAL */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>⚡</span> PowerElectronics Lab Help &amp; Documentation
              </h2>
              <button className="close-btn" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="text-xs text-slate-300 flex flex-col gap-3 leading-relaxed">
              <p><strong className="text-slate-100 font-bold">Welcome to PowerElectronics Lab Suite:</strong> An educational power electronics simulator built for learning, engineering training, and academic demonstration of continuous process &amp; substation equipment.</p>
              <p><strong className="text-blue-400 font-bold">Educational Simulation Notice:</strong> Results are model-based and depend on user inputs, assumptions and numerical solver approximations. They are intended for learning and engineering exploration and should not replace applicable engineering design, site measurements, equipment manufacturer data, protection studies, or regulatory requirements.</p>
              <p><strong className="text-slate-100 font-bold">Navigation:</strong> Select any of the tabs in the top navigation bar to launch a specific power electronic equipment simulator, or click the ⚡ logo to return to the landing overview.</p>
              <p><strong className="text-slate-100 font-bold">Standards Alignment:</strong> Simulation models reference equations and guidelines from international standards including IEC 60146-1-1, IEC 62485-2, IEEE 946, IEEE 1188, IEEE 519, and NFPA 70E for educational study only.</p>
            </div>
          </div>
        </div>
      )}

      {/* FIELD ENGINEER SPEC MODAL */}
      <SpecModal
        sim={specModalSim}
        isOpen={!!specModalSim}
        onClose={() => setSpecModalSim(null)}
        onLaunch={handleLaunchSim}
      />

      {/* FOOTER DIALOG MODALS */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} isDarkMode={isDarkMode} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} isDarkMode={isDarkMode} />
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} isDarkMode={isDarkMode} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} isDarkMode={isDarkMode} />
      <DisclaimerModal isOpen={showDisclaimerModal} onClose={() => setShowDisclaimerModal(false)} isDarkMode={isDarkMode} />

      {/* UNIVERSAL PERSISTENT VISUAL HUD & QUICK TOOLS */}
      <UniversalVisualQuickNav />

      {/* MOBILE STICKY BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
      />

      {/* COMMAND PALETTE MODAL (Ctrl+K / ⌘K) (Suggestion 7) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        isDarkMode={isDarkMode}
        onSelectSim={(tabId) => {
          if (tabId === 'methodology') {
            setActiveTab('methodology');
            window.history.pushState({}, '', '/methodology');
          } else if (tabId === 'disclaimer') {
            setActiveTab('disclaimer');
            window.history.pushState({}, '', '/disclaimer');
          } else {
            handleLaunchSim(tabId);
          }
        }}
        onOpenModal={(modalType) => {
          if (modalType === 'standards') setShowStandards(true);
          else if (modalType === 'help') setShowHelp(true);
          else if (modalType === 'contact') setShowContactModal(true);
          else if (modalType === 'disclaimer') setShowDisclaimerModal(true);
        }}
      />

    </div>
  );
}

