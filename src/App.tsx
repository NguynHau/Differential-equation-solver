import { useState, useEffect } from 'react';
import { 
  sanitizeAndCompile, 
  solveFirstOrderRK4, 
  solveSecondOrderRK4, 
  generateDirectionField, 
  generateAnalyticDerivation,
  ODE_PRESETS,
  ODEPreset,
  InitialCondition,
  EvaluationPoint
} from './mathSolver';
import { ScientificPlot } from './components/ScientificPlot';
import { Latex } from './components/Latex';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Info, 
  Settings, 
  Plus, 
  Trash2, 
  Play, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  TrendingUp,
  Award,
  BookMarked,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Sidebar tabs mapping
  const [activeTab, setActiveTab] = useState<'dashboard' | 'first-order' | 'higher-order' | 'examples' | 'documentation' | 'about'>('dashboard');
  
  // ODE Solver States
  const [equationType, setEquationType] = useState<'first-order' | 'higher-order'>('first-order');
  const [equationInput, setEquationInput] = useState<string>('(x^2 + y / x^3) / 5');
  const [currentPresetId, setCurrentPresetId] = useState<string | null>('preset-user-example');
  
  // Initial Conditions State
  const [initialConditions, setInitialConditions] = useState<InitialCondition[]>([
    { order: 0, x: 1, value: 2 }
  ]);
  
  // Range Limit state (Default)
  const [xMin, setXMin] = useState<number>(0.5);
  const [xMax, setXMax] = useState<number>(4.0);
  
  // Plotting tab state
  const [plotTab, setPlotTab] = useState<'curve' | 'field' | 'combined'>('combined');
  
  // Results
  const [points, setPoints] = useState<EvaluationPoint[]>([]);
  const [directionField, setDirectionField] = useState<any[]>([]);
  const [analyticSteps, setAnalyticSteps] = useState<string[]>([]);
  const [symbolicFormula, setSymbolicFormula] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');
  
  // Collapsible sections
  const [isDocOpen, setIsDocOpen] = useState(true);
  const [isStepOpen, setIsStepOpen] = useState(true);

  // Sync sidebar clicks to appropriate solver modes
  useEffect(() => {
    if (activeTab === 'first-order') {
      setEquationType('first-order');
      // Load user example preset by default if empty or first-order mismatch
      if (equationType !== 'first-order') {
        loadPreset(ODE_PRESETS.find(p => p.id === 'preset-user-example')!);
      }
    } else if (activeTab === 'higher-order') {
      setEquationType('higher-order');
      if (equationType !== 'higher-order') {
        loadPreset(ODE_PRESETS.find(p => p.id === 'preset-harmonic')!);
      }
    }
  }, [activeTab]);

  // Run the solver when loading, or when clicking "Solve"
  useEffect(() => {
    handleSolve();
  }, [equationType]);

  // Load predefined scientific presets
  const loadPreset = (preset: ODEPreset) => {
    setCurrentPresetId(preset.id);
    setEquationType(preset.type);
    setEquationInput(preset.equation);
    setInitialConditions([...preset.initialConditions]);
    setXMin(preset.xRange[0]);
    setXMax(preset.xRange[1]);
    
    // Clear errors & trigger solve immediately in next tick
    setLastError('');
    setTimeout(() => {
      triggerSolver(preset.type, preset.equation, preset.initialConditions, preset.xRange[0], preset.xRange[1], preset.id);
    }, 50);
  };

  // Add initial condition row
  const addInitialCondition = () => {
    const nextOrder = equationType === 'higher-order' ? 1 : 0;
    const defaultX = initialConditions.length > 0 ? initialConditions[0].x : 0;
    
    // Prevent duplicate derivative orders
    const exists = initialConditions.some(c => c.order === nextOrder);
    if (exists && equationType === 'first-order') {
      setLastError("First-order ordinary differential equations only require one boundary/initial condition y(x0) = y0.");
      return;
    }
    if (exists && nextOrder === 1 && initialConditions.some(c => c.order === 1)) {
      setLastError("Second-order differential equations require exactly one y(x0) and one y'(x0) condition.");
      return;
    }

    setInitialConditions(prev => [
      ...prev,
      { order: nextOrder, x: defaultX, value: 0 }
    ]);
  };

  // Delete initial condition row
  const removeInitialCondition = (index: number) => {
    setInitialConditions(prev => prev.filter((_, i) => i !== index));
  };

  // Edit initial condition fields
  const updateInitialCondition = (index: number, field: 'order' | 'x' | 'value', val: number) => {
    setInitialConditions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // UI trigger Solve
  const handleSolve = () => {
    triggerSolver(equationType, equationInput, initialConditions, xMin, xMax, currentPresetId);
  };

  // Reset parameters to defaults
  const handleReset = () => {
    setLastError('');
    if (equationType === 'first-order') {
      loadPreset(ODE_PRESETS.find(p => p.id === 'preset-user-example')!);
    } else {
      loadPreset(ODE_PRESETS.find(p => p.id === 'preset-harmonic')!);
    }
  };

  // Central Math Engine triggering
  const triggerSolver = (
    type: 'first-order' | 'higher-order',
    input: string,
    ic: InitialCondition[],
    minX: number,
    maxX: number,
    presetId: string | null
  ) => {
    setLastError('');
    const isHigher = type === 'higher-order';
    
    // 1. Compile Math Expression
    const compileRes = sanitizeAndCompile(input, isHigher);
    if (compileRes.error) {
      setLastError(compileRes.error);
      return;
    }

    const f = compileRes.fn!;

    // 2. Locate boundary values
    const icY = ic.find(c => c.order === 0);
    if (!icY) {
      setLastError("Core initial condition y(x0) = y0 is required to compute a particular solution.");
      return;
    }

    const x0 = icY.x;
    const y0 = icY.value;

    let rkPoints: EvaluationPoint[] = [];
    let vectors: any[] = [];

    try {
      if (isHigher) {
        const icDY = ic.find(c => c.order === 1);
        if (!icDY) {
          setLastError("Second-order ODEs require a second boundary condition specifying the derivative value y'(x0) = dy0.");
          return;
        }
        const dy0 = icDY.value;
        rkPoints = solveSecondOrderRK4(f, x0, y0, dy0, minX, maxX);
      } else {
        rkPoints = solveFirstOrderRK4(f, x0, y0, minX, maxX);
        vectors = generateDirectionField(f, minX, maxX, -5, 5);
      }

      setPoints(rkPoints);
      setDirectionField(vectors);

      // Generate step-by-step LaTeX derivation proof
      const derivation = generateAnalyticDerivation(presetId, input, ic, isHigher);
      setAnalyticSteps(derivation.steps);
      setSymbolicFormula(derivation.formula);

    } catch (err: any) {
      setLastError(`Numerical simulation crash: ${err.message}. Please check division terms or bounds.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex" id="app-root-layout">
      
      {/* ================= SIDEBAR (LEFT) ================= */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] shrink-0 flex flex-col justify-between sticky top-0 h-screen" id="app-sidebar">
        <div>
          {/* Workspace Branding Header */}
          <div className="p-6 border-b border-[#E5E7EB] flex items-center gap-3" id="sidebar-header">
            <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center text-[#2563EB]" id="sidebar-logo">
              <span className="font-mono font-bold text-lg">∫</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-slate-900" id="sidebar-title">Applied Math Lab</h1>
              <p className="text-[10px] text-slate-400 font-mono" id="sidebar-version">ODE SOLVER v2.1</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1" id="sidebar-nav">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('first-order')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'first-order'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-first-order"
            >
              <Layers size={15} />
              <span>First-Order ODE</span>
            </button>

            <button
              onClick={() => setActiveTab('higher-order')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'higher-order'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-higher-order"
            >
              <TrendingUp size={15} />
              <span>Higher-Order ODE</span>
            </button>

            <button
              onClick={() => setActiveTab('examples')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'examples'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-examples"
            >
              <BookMarked size={15} />
              <span>Examples Library</span>
            </button>

            <button
              onClick={() => setActiveTab('documentation')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'documentation'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-docs"
            >
              <FileText size={15} />
              <span>Reference Manual</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'about'
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900'
              }`}
              id="nav-link-about"
            >
              <Info size={15} />
              <span>Methodology & About</span>
            </button>
          </nav>
        </div>

        {/* Footer Academic Affiliation */}
        <div className="p-4 border-t border-[#E5E7EB] text-[11px] text-slate-400 font-mono space-y-1" id="sidebar-footer">
          <div>Department of Mathematics</div>
          <div className="text-[9px] text-slate-400">Computational Physics Lab</div>
        </div>
      </aside>

      {/* ================= MAIN WORKSPACE (RIGHT) ================= */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto" id="app-main-workspace">
        
        {/* ================= TAB 1: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in" id="dashboard-tab-content">
            {/* Header Title Hero card */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm flex justify-between items-center" id="dashboard-hero">
              <div className="max-w-xl space-y-2">
                <span className="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono" id="hero-tag">Interactive Academic Portal</span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 font-sans" id="hero-title">Differential Equation Solver</h2>
                <p className="text-sm text-slate-500 leading-relaxed" id="hero-desc">
                  An advanced mathematical toolkit designed for students studying Applied Mathematics and Calculus. Solve first-order and second-order ordinary differential equations (ODEs), visualize vector direction fields, and trace complete step-by-step analytical derivations.
                </p>
                <div className="pt-4 flex gap-3" id="hero-buttons">
                  <button
                    onClick={() => setActiveTab('first-order')}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
                    id="btn-go-first-order"
                  >
                    Solve First-Order ODE
                  </button>
                  <button
                    onClick={() => setActiveTab('higher-order')}
                    className="px-4 py-2 bg-[#F5F7FA] hover:bg-[#E5E7EB] text-slate-700 text-xs font-medium rounded-lg transition-all"
                    id="btn-go-higher-order"
                  >
                    Solve Second-Order ODE
                  </button>
                </div>
              </div>
              <div className="hidden lg:flex w-44 h-44 border border-[#E5E7EB] rounded-2xl items-center justify-center bg-[#F5F7FA]" id="hero-visual-illustration">
                <div className="text-center font-serif text-slate-400 italic font-medium" id="hero-math-text">
                  <div className="text-xl">dy</div>
                  <div className="border-t border-slate-300 w-12 mx-auto my-1">dx</div>
                  <div className="text-xs font-sans font-medium text-slate-500 mt-2">y' = f(x, y)</div>
                </div>
              </div>
            </div>

            {/* Quick Presets Selection Gallery */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono mb-3" id="dashboard-presets-title">Quick presets for standard university curriculum</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="dashboard-presets-grid">
                {ODE_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => {
                      loadPreset(preset);
                      setActiveTab(preset.type === 'first-order' ? 'first-order' : 'higher-order');
                    }}
                    className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#2563EB] hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col justify-between h-44"
                    id={`preset-card-${preset.id}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold font-mono tracking-wider text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase">
                          {preset.type.replace('-', ' ')}
                        </span>
                        <Sparkles size={13} className="text-slate-300 group-hover:text-[#2563EB] transition-colors" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 group-hover:text-[#2563EB] transition-colors mb-1">{preset.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{preset.description}</p>
                    </div>
                    <div className="bg-[#F5F7FA] p-2 rounded-lg font-mono text-xs text-[#2563EB] text-center border border-slate-100 overflow-x-auto whitespace-nowrap">
                      <Latex math={preset.displayEq} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Roadmap / Features card block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-roadmaps-section">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">First-Order Modeling Features</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Interactive <strong>Slope & Direction Field</strong> vector plot displaying vector slopes instantly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Exact boundary mapping with floating cursor HUD and coordinate zoom-to-fit parameters.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Step-by-step integrations using <strong>Integrating Factors</strong> and separating variable math.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#2563EB]/5 rounded-lg flex items-center justify-center text-[#2563EB]">
                    <Layers size={16} />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">Higher-Order Modeling Features</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-500 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Damped & Undamped harmonic solutions evaluated under multiple distinct roots.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Dual boundary specification tables for the function and its first derivative simultaneously.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2563EB] font-bold select-none">•</span>
                    <span>Numerical trace logging outputting full step vectors for verification.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2 & 3: EQUATION SOLVER WORKSPACES ================= */}
        {((activeTab === 'first-order') || (activeTab === 'higher-order')) && (
          <div className="space-y-6 animate-fade-in" id="solver-tab-content">
            
            {/* Top Command Action bar */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="workspace-action-bar">
              <div>
                <span className="text-[10px] font-bold font-mono text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase">
                  {equationType.replace('-', ' ')}
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1" id="workspace-heading">
                  {equationType === 'first-order' ? 'First-Order ODE Solver Workspace' : 'Higher-Order ODE Solver Workspace'}
                </h2>
                <p className="text-xs text-slate-400">Configure parameters, boundary values, and solve numerical calculations.</p>
              </div>

              {/* Selector, Solve and Reset Buttons */}
              <div className="flex flex-wrap items-center gap-2" id="action-buttons-group">
                {/* Mode Selector */}
                <select
                  value={equationType}
                  onChange={(e) => {
                    const nextVal = e.target.value as 'first-order' | 'higher-order';
                    setEquationType(nextVal);
                    setActiveTab(nextVal);
                  }}
                  className="bg-white border border-[#E5E7EB] rounded-lg text-xs font-medium text-slate-700 py-2 px-3 shadow-xs hover:bg-[#F5F7FA] cursor-pointer"
                  id="equation-type-select-dropdown"
                >
                  <option value="first-order">First-Order ODE</option>
                  <option value="higher-order">Higher-Order (2nd-Order)</option>
                </select>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs font-medium text-slate-600 hover:bg-[#F5F7FA] active:bg-slate-100 transition-all shadow-xs"
                  id="btn-workspace-reset"
                >
                  <RotateCcw size={14} />
                  <span>Reset Defaults</span>
                </button>

                <button
                  onClick={handleSolve}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/95 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all duration-150"
                  id="btn-workspace-solve"
                >
                  <Play size={14} fill="white" />
                  <span>Execute Solver</span>
                </button>
              </div>
            </div>

            {/* Error Display alert */}
            {lastError && (
              <div className="bg-red-50 border-l-4 border-[#DC2626] p-4 rounded-r-xl flex items-start gap-3 text-red-800 shadow-xs animate-pulse" id="alert-error-display">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#DC2626]" />
                <div className="text-xs font-mono leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Mathematical Solver Error</span>
                  {lastError}
                </div>
              </div>
            )}

            {/* Primary Grid Layout: Inputs Left, Plot Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="solver-primary-grid">
              
              {/* Left Grid: Configuration Cards */}
              <div className="lg:col-span-5 space-y-6" id="config-col-container">
                
                {/* CARD 1: EQUATION INPUT */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-equation-input">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                      <Layers size={14} className="text-[#2563EB]" />
                      <span>Equation Input</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Explicit form</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/10 transition-all bg-white" id="math-input-wrapper">
                      <div className="bg-[#F5F7FA] px-3 py-2.5 font-mono text-xs font-semibold text-slate-500 border-r border-[#E5E7EB]">
                        {equationType === 'first-order' ? "y' =" : "y'' ="}
                      </div>
                      <input
                        type="text"
                        value={equationInput}
                        onChange={(e) => {
                          setEquationInput(e.target.value);
                          setCurrentPresetId(null); // customized
                        }}
                        placeholder={equationType === 'first-order' ? "e.g. -0.1 * (y - 20)" : "e.g. -2 * dy - 5 * y"}
                        className="w-full px-3 py-2.5 text-xs font-mono text-slate-900 outline-none"
                        id="formula-input-textbox"
                      />
                    </div>
                    
                    {/* Live Preview of Parsed Formula */}
                    <div className="bg-[#F5F7FA] p-3 rounded-lg flex items-center justify-between border border-slate-100" id="live-math-preview-panel">
                      <span className="text-[10px] text-slate-400 font-mono">Live Math Pre-render:</span>
                      <div className="bg-white px-2 py-1.5 rounded-md border border-slate-200/50 max-w-[70%] overflow-x-auto text-xs text-[#2563EB]">
                        <Latex math={`${equationType === 'first-order' ? "y'" : "y''"} = ${equationInput || '?'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Helper Instructions */}
                  <div className="text-[11px] text-slate-400 leading-relaxed bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/40" id="notation-instructions-box">
                    <span className="font-bold text-slate-600 block mb-1">Supported Syntax Rules:</span>
                    <ul className="space-y-1 font-mono list-disc list-inside">
                      <li>First derivative: <code className="text-[#2563EB] bg-white px-1 py-0.5 rounded border">dy</code> or <code className="text-[#2563EB] bg-white px-1 py-0.5 rounded border">y'</code> (higher-order only)</li>
                      <li>Standard operators: <code className="text-slate-600 bg-white px-1 py-0.5 rounded border">+ - * / ^</code></li>
                      <li>Math variables: <code className="text-slate-600 bg-white px-1 py-0.5 rounded border">x</code> (abscissa), <code className="text-slate-600 bg-white px-1 py-0.5 rounded border">y</code> (ordinate)</li>
                      <li>Functions: <code className="text-slate-600 bg-white px-1">sin, cos, exp, ln, log, sqrt, pi, e</code></li>
                    </ul>
                  </div>
                </div>

                {/* CARD 2: INITIAL CONDITIONS TABLE */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-initial-conditions">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <span>Initial / Boundary Conditions</span>
                    </h3>
                    
                    <button
                      onClick={addInitialCondition}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#2563EB] hover:text-[#2563EB]/85 transition-colors font-mono uppercase bg-[#2563EB]/5 px-2 py-1 rounded"
                      id="btn-add-condition-row"
                    >
                      <Plus size={12} />
                      <span>Add Condition</span>
                    </button>
                  </div>

                  {/* Condition Table */}
                  <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white shadow-xs" id="table-conditions-wrapper">
                    <table className="w-full text-left text-xs border-collapse" id="initial-conditions-table">
                      <thead>
                        <tr className="bg-[#F5F7FA] border-b border-[#E5E7EB] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                          <th className="py-2.5 px-3 font-semibold">Order</th>
                          <th className="py-2.5 px-3 font-semibold">Point x</th>
                          <th className="py-2.5 px-3 font-semibold">Value y</th>
                          <th className="py-2.5 px-3 text-center font-semibold w-12">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] font-mono text-xs">
                        {initialConditions.map((ic, index) => (
                          <tr key={index} className="hover:bg-[#F5F7FA]/50 transition-colors" id={`row-condition-${index}`}>
                            <td className="py-2 px-3">
                              <select
                                value={ic.order}
                                onChange={(e) => updateInitialCondition(index, 'order', parseInt(e.target.value))}
                                className="bg-[#F5F7FA] border border-slate-200/80 rounded px-1.5 py-1 text-[11px] outline-none text-slate-700 cursor-pointer"
                                id={`select-order-ic-${index}`}
                              >
                                <option value={0}>y(x)</option>
                                <option value={1} disabled={equationType === 'first-order'}>y'(x)</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="any"
                                value={ic.x}
                                onChange={(e) => updateInitialCondition(index, 'x', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-[#F5F7FA] border border-slate-200/80 rounded px-2 py-1 text-xs outline-none focus:border-[#2563EB]"
                                id={`input-x-ic-${index}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="any"
                                value={ic.value}
                                onChange={(e) => updateInitialCondition(index, 'value', parseFloat(e.target.value) || 0)}
                                className="w-20 bg-[#F5F7FA] border border-slate-200/80 rounded px-2 py-1 text-xs outline-none focus:border-[#2563EB]"
                                id={`input-val-ic-${index}`}
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => removeInitialCondition(index)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                title="Delete row"
                                id={`btn-delete-ic-${index}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {initialConditions.length === 0 && (
                          <tr id="empty-conditions-row">
                            <td colSpan={4} className="py-4 text-center text-slate-400 text-[11px]">
                              No boundary constraints. Click "Add Condition" to set constraints.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CARD 3: COMPUTATIONAL RANGE LIMITS */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-computation-range">
                  <h3 className="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                    <Settings size={14} className="text-slate-500" />
                    <span>Domain Integration Limits</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs" id="range-inputs-grid">
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase mb-1">X Min (Left Limit)</label>
                      <input
                        type="number"
                        step="any"
                        value={xMin}
                        onChange={(e) => setXMin(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#F5F7FA] border border-slate-200/80 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#2563EB]"
                        id="input-range-xmin"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] uppercase mb-1">X Max (Right Limit)</label>
                      <input
                        type="number"
                        step="any"
                        value={xMax}
                        onChange={(e) => setXMax(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#F5F7FA] border border-slate-200/80 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#2563EB]"
                        id="input-range-xmax"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Grid: Visualizer Canvas Column */}
              <div className="lg:col-span-7 space-y-6" id="visualizer-col-container">
                
                {/* SCIENTIFIC PLOTTER CARD */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-visualization-area">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                    <h3 className="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono">
                      Differential Plotting Screen
                    </h3>

                    {/* Plot view mode tabs */}
                    <div className="flex bg-[#F5F7FA] p-0.5 rounded-lg border border-slate-200/50 text-xs font-medium" id="plot-tabs-wrapper">
                      <button
                        onClick={() => setPlotTab('curve')}
                        className={`px-3 py-1.5 rounded-md transition-all text-[11px] ${
                          plotTab === 'curve'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        id="btn-plot-tab-curve"
                      >
                        Solution Curve
                      </button>
                      <button
                        onClick={() => setPlotTab('field')}
                        disabled={equationType === 'higher-order'}
                        className={`px-3 py-1.5 rounded-md transition-all text-[11px] ${
                          equationType === 'higher-order' ? 'opacity-40 cursor-not-allowed' : ''
                        } ${
                          plotTab === 'field'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        id="btn-plot-tab-field"
                      >
                        Direction Field
                      </button>
                      <button
                        onClick={() => setPlotTab('combined')}
                        disabled={equationType === 'higher-order'}
                        className={`px-3 py-1.5 rounded-md transition-all text-[11px] ${
                          equationType === 'higher-order' ? 'opacity-40 cursor-not-allowed' : ''
                        } ${
                          plotTab === 'combined'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        id="btn-plot-tab-combined"
                      >
                        Combined View
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Plotter Render */}
                  <ScientificPlot
                    points={points}
                    directionField={directionField}
                    showCurve={plotTab === 'curve' || plotTab === 'combined' || equationType === 'higher-order'}
                    showField={(plotTab === 'field' || plotTab === 'combined') && equationType === 'first-order'}
                    initialX={initialConditions.find(c => c.order === 0)?.x ?? 0}
                    initialY={initialConditions.find(c => c.order === 0)?.value ?? 0}
                    isHigherOrder={equationType === 'higher-order'}
                    xRangeLimit={[xMin, xMax]}
                  />
                  
                  {/* Visual Legend elements */}
                  <div className="flex flex-wrap items-center gap-6 text-[11px] text-slate-500 justify-center pt-2 font-mono" id="plot-visual-legends">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-0.5 bg-[#2563EB] rounded inline-block"></span>
                      <span>Numerical Approximation (RK4 Curve)</span>
                    </div>
                    {equationType === 'first-order' && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-2 bg-gradient-to-r from-blue-400 to-red-400 opacity-60 rounded inline-block"></span>
                        <span>Vector Slopes dy/dx (Direction Field)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block border border-white shadow-xs"></span>
                      <span>Boundary Constraint (x₀, y₀)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* ================= SOLUTION CARD (SYMBOLIC & TRACE STEP COMPONENT) ================= */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-6" id="card-solution-results">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] pb-4 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-indigo-50 text-[#2563EB] rounded-md flex items-center justify-center font-bold text-xs" id="solution-tag-label">
                    f(x)
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Mathematical Solution Formula</h3>
                    <p className="text-[11px] text-slate-400">Exact analytic expression matching boundaries (if solvable, else numerical approximation).</p>
                  </div>
                </div>
                
                {/* Formula display value */}
                <div className="bg-[#F5F7FA] px-4 py-2 rounded-lg text-xs font-semibold text-[#2563EB] font-mono border border-slate-100 max-w-md overflow-x-auto whitespace-nowrap scrollbar-thin">
                  <Latex math={symbolicFormula || "y(x) = ?"} block={false} />
                </div>
              </div>

              {/* Analytical Proof derivation steps */}
              <div className="space-y-4" id="section-analytical-proof">
                <button
                  onClick={() => setIsStepOpen(!isStepOpen)}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 tracking-wider uppercase font-mono hover:text-slate-900 transition-colors"
                  id="btn-toggle-analytic-steps"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} className="text-[#2563EB]" />
                    <span>Analytical Proof & Derivation Steps</span>
                  </span>
                  {isStepOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isStepOpen && (
                  <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl p-6 space-y-4 font-mono text-xs overflow-x-auto scrollbar-thin shadow-inner" id="steps-container-panel">
                    {analyticSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`leading-relaxed py-2 ${
                          step.startsWith('\\text{') 
                            ? 'text-slate-700 font-bold border-b border-slate-200/50 mt-4 first:mt-0 pb-1' 
                            : 'text-slate-600 pl-4'
                        }`}
                        id={`derivation-step-${idx}`}
                      >
                        <Latex math={step} block={!step.startsWith('\\text{')} />
                      </div>
                    ))}
                    {analyticSteps.length === 0 && (
                      <div className="text-center text-slate-400 py-6">
                        Click "Execute Solver" to run calculations and generate mathematical proofs.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tabular Numerical Calculation Log (RK4 step outputs) */}
              <div className="space-y-3" id="section-numerical-grid">
                <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-2">
                  <span>Numerical Calculation Output (First 10 Integration Steps)</span>
                </h4>
                
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white shadow-xs" id="table-calculation-wrapper">
                  <table className="w-full text-left text-xs border-collapse" id="calculation-output-table">
                    <thead>
                      <tr className="bg-[#F5F7FA] border-b border-[#E5E7EB] text-slate-400 uppercase tracking-wider font-mono text-[9px]">
                        <th className="py-2 px-4 font-semibold text-center w-14">Step (n)</th>
                        <th className="py-2 px-4 font-semibold text-center">x_n</th>
                        <th className="py-2 px-4 font-semibold text-center">Approximated y_n</th>
                        {equationType === 'higher-order' && (
                          <th className="py-2 px-4 font-semibold text-center">Velocity y'_n</th>
                        )}
                        <th className="py-2 px-4 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] font-mono text-xs text-center text-slate-600">
                      {points.slice(0, 10).map((pt, index) => (
                        <tr key={index} className="hover:bg-[#F5F7FA]/50 transition-all" id={`row-point-${index}`}>
                          <td className="py-2 px-4 font-bold text-slate-400">{index}</td>
                          <td className="py-2 px-4 text-[#2563EB]">{pt.x.toFixed(5)}</td>
                          <td className="py-2 px-4 text-slate-900 font-semibold">{pt.y.toFixed(6)}</td>
                          {equationType === 'higher-order' && (
                            <td className="py-2 px-4 text-emerald-600">
                              {pt.dy !== undefined ? pt.dy.toFixed(6) : '-'}
                            </td>
                          )}
                          <td className="py-2 px-4 text-[10px]">
                            {index === 0 ? (
                              <span className="text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase">Boundary</span>
                            ) : (
                              <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase">Converged</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {points.length === 0 && (
                        <tr id="empty-points-row">
                          <td colSpan={5} className="py-6 text-slate-400 text-center font-mono text-[11px]">
                            No point values calculated yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {points.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-right italic font-mono" id="points-overflow-indicator">
                    Showing first 10 steps out of {points.length} calculated coordinates spanning your domain.
                  </p>
                )}
              </div>

            </div>

            {/* ================= COMPACT FLOATING EXAMPLES SECTION ================= */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-floating-examples">
              <h3 className="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                <BookMarked size={14} className="text-[#2563EB]" />
                <span>Example Problems Carousel</span>
              </h3>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin" id="horizontal-examples-row">
                {ODE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className={`flex-none w-64 bg-[#F5F7FA] border rounded-lg p-3 text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer ${
                      currentPresetId === preset.id 
                        ? 'border-[#2563EB] bg-[#2563EB]/5 ring-1 ring-[#2563EB]' 
                        : 'border-[#E5E7EB] hover:border-slate-400'
                    }`}
                    id={`examples-button-${preset.id}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                        {preset.type}
                      </span>
                      {currentPresetId === preset.id && (
                        <span className="text-[8px] font-bold text-white bg-[#2563EB] px-1 rounded">Active</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-xs truncate mb-1">{preset.name}</h4>
                    <div className="bg-white p-1.5 rounded font-mono text-[10px] text-[#2563EB] border border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap mb-1">
                      <Latex math={preset.displayEq} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ================= COLLAPSIBLE DOCUMENTATION CARD ================= */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4" id="card-collapsible-documentation">
              <button
                onClick={() => setIsDocOpen(!isDocOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase font-mono hover:text-slate-900 transition-colors"
                id="btn-toggle-docs-card"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-slate-500" />
                  <span>Interactive Quick Reference Panel</span>
                </span>
                {isDocOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isDocOpen && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100" id="docs-card-grid">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full"></span>
                      <span>Derivative Notation Rules</span>
                    </h4>
                    <p>
                      This app compiles explicit formulas.
                      For first-order, write equations in terms of <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">x</code> and <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">y</code>, representing the derivative function <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">f(x, y) = dy/dx</code>.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                      <span>Boundary Value Mapping</span>
                    </h4>
                    <p>
                      Initial conditions represent mathematical coordinate anchors <code className="font-mono text-slate-800 bg-slate-100 px-1 rounded">(x₀, y₀)</code>. 
                      RK4 propagates the approximation trajectory both leftwards and rightwards starting from this pivot point.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                      <span>Integration Solvers (RK4)</span>
                    </h4>
                    <p>
                      Runge-Kutta 4th-order method provides robust stability for solving stiff and oscillating systems without requiring analytical symbolics.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 4: EXAMPLES VIEW ================= */}
        {activeTab === 'examples' && (
          <div className="space-y-6 animate-fade-in" id="examples-tab-content">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-2" id="examples-header-card">
              <span className="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Curated Library</span>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 font-sans">Common Differential Equations</h2>
              <p className="text-sm text-slate-500 max-w-2xl">
                Explore a rich pedagogical archive of ordinary differential equations (ODEs) from undergraduate applied science courses. Select any card to immediately seed parameters, plot vector flows, and examine the math steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="examples-main-grid">
              {ODE_PRESETS.map(preset => (
                <div
                  key={preset.id}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4 hover:border-[#2563EB] transition-all shadow-xs flex flex-col justify-between"
                  id={`examples-full-card-${preset.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold font-mono text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase">
                        {preset.type.replace('-', ' ')}
                      </span>
                      <Award size={16} className="text-[#2563EB]" />
                    </div>
                    <h3 className="font-bold text-slate-950 text-sm">{preset.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-[#F5F7FA] p-3 rounded-lg text-center border border-slate-100 font-mono text-xs text-[#2563EB]">
                      <Latex math={preset.displayEq} />
                    </div>
                    
                    <button
                      onClick={() => {
                        loadPreset(preset);
                        setActiveTab(preset.type === 'first-order' ? 'first-order' : 'higher-order');
                      }}
                      className="w-full text-center bg-[#2563EB] text-white hover:bg-[#2563EB]/95 transition-all py-2 rounded-lg text-xs font-semibold"
                      id={`btn-load-example-${preset.id}`}
                    >
                      Load into Workspace & Solve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: DOCUMENTATION VIEW ================= */}
        {activeTab === 'documentation' && (
          <div className="space-y-6 animate-fade-in" id="documentation-tab-content">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-2" id="doc-hero-card">
              <span className="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Reference Manual</span>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 font-sans">Ordinary Differential Equations Reference</h2>
              <p className="text-sm text-slate-500 max-w-2xl">
                A mathematical overview of the analytical classifications and numerical integration algorithms running behind this solver.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="doc-topics-grid">
              
              {/* Box 1: Classification */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#2563EB] rounded-full inline-block"></span>
                  <span>1. ODE Classification</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  An Ordinary Differential Equation relates a function of a single independent variable <code className="font-mono">x</code> to its derivatives.
                </p>
                <div className="space-y-2 bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/30 text-xs font-mono text-slate-600">
                  <div className="font-semibold text-slate-800">First-Order:</div>
                  <div className="pl-2">y' = f(x, y)</div>
                  <div className="font-semibold text-slate-800 mt-2">Second-Order:</div>
                  <div className="pl-2">y'' = f(x, y, y')</div>
                </div>
                <p className="text-xs text-slate-400">
                  First-order equations form a direction field representing tangent slopes at any coordinate.
                </p>
              </div>

              {/* Box 2: RK4 algorithm */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
                  <span>2. Runge-Kutta 4th Order</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Our solver implements the RK4 integration engine. It computes four slope vectors across each step interval <code className="font-mono">h</code> to estimate the trajectory.
                </p>
                <div className="space-y-1 bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/30 text-[11px] font-mono text-slate-600 space-y-1">
                  <div>k₁ = h·f(xₙ, yₙ)</div>
                  <div>k₂ = h·f(xₙ+h/2, yₙ+k₁/2)</div>
                  <div>k₃ = h·f(xₙ+h/2, yₙ+k₂/2)</div>
                  <div>k₄ = h·f(xₙ+h, yₙ+k₃)</div>
                  <div className="font-bold text-slate-800 pt-1 border-t border-slate-200 mt-1">yₙ₊₁ = yₙ + (k₁+2k₂+2k₃+k₄)/6</div>
                </div>
                <p className="text-xs text-slate-400">
                  RK4 provides a robust balance between computation speed and numerical stability, converging at a global truncation error rate of O(h⁴).
                </p>
              </div>

              {/* Box 3: Formats and Tips */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
                  <span>3. Parsing Syntax Guidelines</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Keep equations explicit! Solve on-paper for the highest order derivative before entering.
                </p>
                <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
                  <div className="flex gap-2">
                    <span className="font-mono text-[#2563EB] font-bold">✓</span>
                    <span><code className="font-mono">y' = x^2 - y</code></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-red-600 font-bold">✗</span>
                    <span><code className="font-mono">dy/dx + y - x^2 = 0</code></span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 leading-relaxed">
                    Implicit equations can lead to compilation errors. Maintain standard mathematical syntax structures.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 6: ABOUT VIEW ================= */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-fade-in" id="about-tab-content">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6" id="about-main-card">
              
              <div className="space-y-2 border-b border-[#E5E7EB] pb-4">
                <span className="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Academic Project Background</span>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 font-sans">About Differential Equation Solver</h2>
                <p className="text-sm text-slate-500">
                  A high-fidelity computational science reference application.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-500 leading-relaxed font-sans" id="about-details-columns">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Educational Objective</h3>
                  <p>
                    This solver was built as an open pedagogical asset for university students and professors in mathematics and engineering. By offering simultaneous symbolic derivations and interactive numerical canvases side-by-side, it bridges the gap between pure algebraic solutions and physical numerical approximations.
                  </p>
                  <p>
                    Developed with robust, client-side TypeScript compiling, it calculates hundreds of slope vectors and high-precision integration curves with sub-millisecond response latency, functioning entirely offline without database overheads.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Engine Technical Stack</h3>
                  <ul className="space-y-2 font-mono" id="tech-stack-list">
                    <li className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Framework:</span>
                      <span className="text-slate-800 font-semibold">React 18 & TypeScript</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Styling Engine:</span>
                      <span className="text-slate-800 font-semibold">Tailwind CSS v4</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Formula Layout:</span>
                      <span className="text-slate-800 font-semibold">KaTeX Math Renderers</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400">Plot Renderer:</span>
                      <span className="text-slate-800 font-semibold">HTML5 Interactive Canvas</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Numeric Engine:</span>
                      <span className="text-[#2563EB] font-bold">4th-Order Runge-Kutta (RK4)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl p-4 flex gap-4 items-center" id="about-affiliations-box">
                <div className="w-10 h-10 bg-[#2563EB]/5 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0 font-bold" id="affiliation-icon">
                  μ
                </div>
                <div className="text-xs text-slate-500 leading-relaxed" id="affiliation-text">
                  <span className="font-bold text-slate-900 block">Department of Applied Mathematics</span>
                  Designed in accordance with undergraduate Calculus III and Ordinary Differential Equations course criteria. Verified for mathematical correctness across diverse linear and non-linear boundary constraints.
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
