import fs from 'fs';
import { ODE_PRESETS } from './mathSolver.js';

let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scientific Differential Equation Solver</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
    [data-tab-content] { display: none; }
    [data-tab-content].active { display: block; }
  </style>
</head>
<body class="bg-[#F5F7FA] text-slate-800 flex h-screen overflow-hidden" id="app-root-layout">
  
  <!-- SIDEBAR -->
  <aside class="w-64 bg-white border-r border-[#E5E7EB] shrink-0 flex flex-col justify-between sticky top-0 h-screen" id="app-sidebar">
    <div>
      <div class="p-6 border-b border-[#E5E7EB] flex items-center gap-3" id="sidebar-header">
        <div class="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center text-[#2563EB]" id="sidebar-logo">
          <span class="font-mono font-bold text-lg">∫</span>
        </div>
        <div>
          <h1 class="font-semibold text-sm tracking-tight text-slate-900" id="sidebar-title">Applied Math Lab</h1>
          <p class="text-[10px] text-slate-400 font-mono" id="sidebar-version">ODE SOLVER v2.1</p>
        </div>
      </div>
      <nav class="p-4 space-y-1" id="sidebar-nav">
        <!-- populated by js -->
      </nav>
    </div>
    <div class="p-4 border-t border-[#E5E7EB] text-[11px] text-slate-400 font-mono space-y-1" id="sidebar-footer">
      <div>Department of Mathematics</div>
      <div class="text-[9px] text-slate-400">Computational Physics Lab</div>
    </div>
  </aside>

  <!-- MAIN WORKSPACE -->
  <main class="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full relative" id="app-main-workspace">
    
    <!-- DASHBOARD -->
    <div data-tab-content="dashboard" class="space-y-6 animate-fade-in active">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm flex justify-between items-center">
        <div class="max-w-xl space-y-2">
          <span class="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Interactive Academic Portal</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-950 font-sans">Differential Equation Solver</h2>
          <p class="text-sm text-slate-500 leading-relaxed">
            An advanced mathematical toolkit designed for students studying Applied Mathematics and Calculus. Solve first-order and second-order ordinary differential equations (ODEs), visualize vector direction fields, and trace complete step-by-step analytical derivations.
          </p>
          <div class="pt-4 flex gap-3">
            <button onclick="app.setTab('first-order')" class="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-medium rounded-lg transition-all shadow-sm">
              Solve First-Order ODE
            </button>
            <button onclick="app.setTab('higher-order')" class="px-4 py-2 bg-[#F5F7FA] hover:bg-[#E5E7EB] text-slate-700 text-xs font-medium rounded-lg transition-all">
              Solve Second-Order ODE
            </button>
          </div>
        </div>
        <div class="hidden lg:flex w-44 h-44 border border-[#E5E7EB] rounded-2xl items-center justify-center bg-[#F5F7FA]">
          <div class="text-center font-serif text-slate-400 italic font-medium">
            <div class="text-xl">dy</div>
            <div class="border-t border-slate-300 w-12 mx-auto my-1">dx</div>
            <div class="text-xs font-sans font-medium text-slate-500 mt-2">y' = f(x, y)</div>
          </div>
        </div>
      </div>
      <div>
        <h3 class="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono mb-3">Quick presets for standard university curriculum</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="dashboard-presets-grid"></div>
      </div>
      
      <!-- roadmaps -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <i data-lucide="check-circle-2"></i>
            </div>
            <h4 class="font-semibold text-slate-900 text-sm">First-Order Modeling Features</h4>
          </div>
          <ul class="space-y-2 text-xs text-slate-500 leading-relaxed">
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Interactive <strong>Slope & Direction Field</strong> vector plot displaying vector slopes instantly.</span></li>
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Exact boundary mapping with floating cursor HUD and coordinate zoom-to-fit parameters.</span></li>
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Step-by-step integrations using <strong>Integrating Factors</strong> and separating variable math.</span></li>
          </ul>
        </div>
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-[#2563EB]/5 rounded-lg flex items-center justify-center text-[#2563EB]">
              <i data-lucide="layers"></i>
            </div>
            <h4 class="font-semibold text-slate-900 text-sm">Higher-Order Modeling Features</h4>
          </div>
          <ul class="space-y-2 text-xs text-slate-500 leading-relaxed">
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Damped & Undamped harmonic solutions evaluated under multiple distinct roots.</span></li>
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Dual boundary specification tables for the function and its first derivative simultaneously.</span></li>
            <li class="flex items-start gap-2"><span class="text-[#2563EB] font-bold select-none">•</span><span>Numerical trace logging outputting full step vectors for verification.</span></li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- SOLVER WORKSPACE (both first/higher order share this UI, controlled by JS) -->
    <div data-tab-content="solver" class="space-y-6 animate-fade-in">
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-bold font-mono text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase" id="workspace-type-badge"></span>
          <h2 class="text-lg font-bold text-slate-900 tracking-tight mt-1" id="workspace-heading"></h2>
          <p class="text-xs text-slate-400">Configure parameters, boundary values, and solve numerical calculations.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="equation-type-select" class="bg-white border border-[#E5E7EB] rounded-lg text-xs font-medium text-slate-700 py-2 px-3 shadow-xs hover:bg-[#F5F7FA] cursor-pointer" onchange="app.handleTypeChange(this.value)">
            <option value="first-order">First-Order ODE</option>
            <option value="higher-order">Higher-Order (2nd-Order)</option>
          </select>
          <button onclick="app.handleReset()" class="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs font-medium text-slate-600 hover:bg-[#F5F7FA] active:bg-slate-100 transition-all shadow-xs">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span>Reset Defaults</span>
          </button>
          <button onclick="app.handleSolve()" class="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/95 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all duration-150">
            <i data-lucide="play" class="w-3.5 h-3.5 fill-white text-white"></i>
            <span>Execute Solver</span>
          </button>
        </div>
      </div>
      
      <div id="alert-error-display" class="hidden bg-red-50 border-l-4 border-[#DC2626] p-4 rounded-r-xl items-start gap-3 text-red-800 shadow-xs animate-pulse">
        <i data-lucide="alert-circle" class="shrink-0 mt-0.5 text-[#DC2626] w-4.5 h-4.5"></i>
        <div class="text-xs font-mono leading-relaxed">
          <span class="font-bold uppercase tracking-wider block mb-0.5">Mathematical Solver Error</span>
          <span id="error-message-text"></span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 space-y-6">
          <!-- EQUATION INPUT -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                <i data-lucide="layers" class="w-3.5 h-3.5 text-[#2563EB]"></i>
                <span>Equation Input</span>
              </h3>
              <span class="text-[10px] text-slate-400 font-mono">Explicit form</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/10 transition-all bg-white">
                <div id="equation-prefix" class="bg-[#F5F7FA] px-3 py-2.5 font-mono text-xs font-semibold text-slate-500 border-r border-[#E5E7EB]"></div>
                <input type="text" id="formula-input" oninput="app.updateLiveMath()" class="w-full px-3 py-2.5 text-xs font-mono text-slate-900 outline-none" />
              </div>
              <div class="bg-[#F5F7FA] p-3 rounded-lg flex items-center justify-between border border-slate-100">
                <span class="text-[10px] text-slate-400 font-mono">Live Math Pre-render:</span>
                <div id="live-math-preview" class="bg-white px-2 py-1.5 rounded-md border border-slate-200/50 max-w-[70%] overflow-x-auto text-xs text-[#2563EB]"></div>
              </div>
            </div>
            <div class="text-[11px] text-slate-400 leading-relaxed bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/40">
              <span class="font-bold text-slate-600 block mb-1">Supported Syntax Rules:</span>
              <ul class="space-y-1 font-mono list-disc list-inside">
                <li>First derivative: <code class="text-[#2563EB] bg-white px-1 py-0.5 rounded border">dy</code> or <code class="text-[#2563EB] bg-white px-1 py-0.5 rounded border">y'</code></li>
                <li>Standard operators: <code class="text-slate-600 bg-white px-1 py-0.5 rounded border">+ - * / ^</code></li>
                <li>Math variables: <code class="text-slate-600 bg-white px-1 py-0.5 rounded border">x</code> (abscissa), <code class="text-slate-600 bg-white px-1 py-0.5 rounded border">y</code> (ordinate)</li>
                <li>Functions: <code class="text-slate-600 bg-white px-1">sin, cos, exp, ln, log, sqrt, pi, e</code></li>
              </ul>
            </div>
          </div>
          
          <!-- INITIAL CONDITIONS -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
                <i data-lucide="trending-up" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>Initial / Boundary Conditions</span>
              </h3>
              <button onclick="app.addInitialCondition()" class="flex items-center gap-1 text-[10px] font-bold text-[#2563EB] hover:text-[#2563EB]/85 transition-colors font-mono uppercase bg-[#2563EB]/5 px-2 py-1 rounded">
                <i data-lucide="plus" class="w-3 h-3"></i>
                <span>Add Condition</span>
              </button>
            </div>
            <div class="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white shadow-xs">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#F5F7FA] border-b border-[#E5E7EB] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                    <th class="py-2.5 px-3 font-semibold">Order</th>
                    <th class="py-2.5 px-3 font-semibold">Point x</th>
                    <th class="py-2.5 px-3 font-semibold">Value y</th>
                    <th class="py-2.5 px-3 text-center font-semibold w-12">Delete</th>
                  </tr>
                </thead>
                <tbody id="initial-conditions-tbody" class="divide-y divide-[#E5E7EB] font-mono text-xs"></tbody>
              </table>
            </div>
          </div>
          
          <!-- LIMITS -->
          <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
            <h3 class="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
              <i data-lucide="settings" class="w-3.5 h-3.5 text-slate-500"></i>
              <span>Domain Integration Limits</span>
            </h3>
            <div class="grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <label class="block text-slate-400 text-[10px] uppercase mb-1">X Min (Left Limit)</label>
                <input type="number" id="input-xmin" step="any" onchange="app.updateRange('min', this.value)" class="w-full bg-[#F5F7FA] border border-slate-200/80 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#2563EB]" />
              </div>
              <div>
                <label class="block text-slate-400 text-[10px] uppercase mb-1">X Max (Right Limit)</label>
                <input type="number" id="input-xmax" step="any" onchange="app.updateRange('max', this.value)" class="w-full bg-[#F5F7FA] border border-slate-200/80 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#2563EB]" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- VISUALIZER -->
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
              <h3 class="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono">Differential Plotting Screen</h3>
              <div class="flex bg-[#F5F7FA] p-0.5 rounded-lg border border-slate-200/50 text-xs font-medium" id="plot-tabs">
                <button onclick="app.setPlotTab('curve')" data-plottab="curve" class="px-3 py-1.5 rounded-md transition-all text-[11px] text-slate-500 hover:text-slate-900">Solution Curve</button>
                <button onclick="app.setPlotTab('field')" data-plottab="field" class="px-3 py-1.5 rounded-md transition-all text-[11px] text-slate-500 hover:text-slate-900">Direction Field</button>
                <button onclick="app.setPlotTab('combined')" data-plottab="combined" class="px-3 py-1.5 rounded-md transition-all text-[11px] bg-white text-slate-900 shadow-xs">Combined View</button>
              </div>
            </div>
            
            <!-- CANVAS AREA -->
            <div class="relative border border-[#E5E7EB] rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-[400px]">
              <canvas id="math-canvas" class="w-full flex-1 cursor-grab active:cursor-grabbing"></canvas>
              
              <!-- HUD -->
              <div id="plot-hud" class="hidden absolute top-4 left-4 bg-slate-900/90 text-slate-100 text-xs font-mono py-1.5 px-3 rounded-md shadow-md backdrop-blur-xs flex gap-3 pointer-events-none select-none border border-slate-700/50">
                <div><span class="text-slate-400 font-semibold mr-1">X:</span><span id="hud-x"></span></div>
                <div class="border-l border-slate-700 h-4 my-auto"></div>
                <div><span class="text-slate-400 font-semibold mr-1">Y:</span><span id="hud-y"></span></div>
              </div>
              
              <!-- Axis Indicator -->
              <div class="absolute right-4 bottom-14 bg-white/80 border border-slate-200 text-[10px] text-slate-500 font-mono py-1 px-2 rounded-md shadow-xs pointer-events-none flex flex-col gap-0.5">
                <div>Ordinate: <span class="text-blue-600 font-bold">y</span></div>
                <div class="border-t border-slate-100 my-0.5"></div>
                <div>Abscissa: <span class="text-slate-700 font-bold">x</span></div>
              </div>
              
              <!-- Controls -->
              <div class="absolute right-4 top-4 flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-[#E5E7EB]">
                <button onclick="app.zoomCanvas(0.7)" class="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors" title="Zoom In">
                  <i data-lucide="zoom-in" class="w-4 h-4"></i>
                </button>
                <button onclick="app.zoomCanvas(1.4)" class="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors" title="Zoom Out">
                  <i data-lucide="zoom-out" class="w-4 h-4"></i>
                </button>
                <button onclick="app.resetCanvasZoom()" class="p-1.5 rounded-md hover:bg-[#F5F7FA] text-slate-600 hover:text-slate-900 transition-colors" title="Reset View">
                  <i data-lucide="maximize-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
            
            <div class="flex flex-wrap items-center gap-6 text-[11px] text-slate-500 justify-center pt-2 font-mono">
              <div class="flex items-center gap-1.5"><span class="w-5 h-0.5 bg-[#2563EB] rounded inline-block"></span><span>Numerical Approximation (RK4 Curve)</span></div>
              <div id="legend-dir-field" class="flex items-center gap-1.5"><span class="w-4 h-2 bg-gradient-to-r from-blue-400 to-red-400 opacity-60 rounded inline-block"></span><span>Vector Slopes dy/dx (Direction Field)</span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block border border-white shadow-xs"></span><span>Boundary Constraint (x₀, y₀)</span></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- RESULTS -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] pb-4 gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 bg-indigo-50 text-[#2563EB] rounded-md flex items-center justify-center font-bold text-xs">f(x)</div>
            <div>
              <h3 class="font-semibold text-slate-900 text-sm tracking-tight">Mathematical Solution Formula</h3>
              <p class="text-[11px] text-slate-400">Exact analytic expression matching boundaries (if solvable, else numerical approximation).</p>
            </div>
          </div>
          <div id="solution-formula" class="bg-[#F5F7FA] px-4 py-2 rounded-lg text-xs font-semibold text-[#2563EB] font-mono border border-slate-100 max-w-md overflow-x-auto whitespace-nowrap scrollbar-thin"></div>
        </div>
        
        <!-- PROOF STEPS -->
        <div class="space-y-4">
          <button onclick="app.toggleSteps()" class="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-400 tracking-wider uppercase font-mono hover:text-slate-900 transition-colors">
            <span class="flex items-center gap-2"><i data-lucide="book-open" class="w-3.5 h-3.5 text-[#2563EB]"></i><span>Analytical Proof & Derivation Steps</span></span>
            <i data-lucide="chevron-up" id="steps-chevron" class="w-4 h-4"></i>
          </button>
          <div id="proof-steps-container" class="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl p-6 space-y-4 font-mono text-xs overflow-x-auto scrollbar-thin shadow-inner block"></div>
        </div>
        
        <!-- TABLE -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-2"><span>Numerical Calculation Output (First 10 Integration Steps)</span></h4>
          <div class="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white shadow-xs">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#F5F7FA] border-b border-[#E5E7EB] text-slate-400 uppercase tracking-wider font-mono text-[9px]">
                  <th class="py-2 px-4 font-semibold text-center w-14">Step (n)</th>
                  <th class="py-2 px-4 font-semibold text-center">x_n</th>
                  <th class="py-2 px-4 font-semibold text-center">Approximated y_n</th>
                  <th id="th-velocity" class="py-2 px-4 font-semibold text-center hidden">Velocity y'_n</th>
                  <th class="py-2 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody id="numerical-tbody" class="divide-y divide-[#E5E7EB] font-mono text-xs text-center text-slate-600"></tbody>
            </table>
          </div>
          <p id="points-overflow-indicator" class="hidden text-[10px] text-slate-400 text-right italic font-mono"></p>
        </div>
        
      </div>
      
      <!-- EXAMPLES CAROUSEL -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
        <h3 class="font-semibold text-slate-900 text-xs tracking-wider uppercase font-mono flex items-center gap-2">
          <i data-lucide="book-marked" class="w-3.5 h-3.5 text-[#2563EB]"></i>
          <span>Example Problems Carousel</span>
        </h3>
        <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-thin" id="horizontal-examples-row"></div>
      </div>
      
      <!-- DOCS ACCORDION -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4">
        <button onclick="app.toggleDocs()" class="w-full flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase font-mono hover:text-slate-900 transition-colors">
          <span class="flex items-center gap-2"><i data-lucide="help-circle" class="w-3.5 h-3.5 text-slate-500"></i><span>Interactive Quick Reference Panel</span></span>
          <i data-lucide="chevron-up" id="docs-chevron" class="w-4 h-4"></i>
        </button>
        <div id="docs-content" class="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
          <div class="space-y-2"><h4 class="font-semibold text-slate-900 flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-[#2563EB] rounded-full"></span><span>Derivative Notation Rules</span></h4><p>This app compiles explicit formulas. For first-order, write equations in terms of <code class="font-mono text-slate-800 bg-slate-100 px-1 rounded">x</code> and <code class="font-mono text-slate-800 bg-slate-100 px-1 rounded">y</code>, representing the derivative function <code class="font-mono text-slate-800 bg-slate-100 px-1 rounded">f(x, y) = dy/dx</code>.</p></div>
          <div class="space-y-2"><h4 class="font-semibold text-slate-900 flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span><span>Boundary Value Mapping</span></h4><p>Initial conditions represent mathematical coordinate anchors <code class="font-mono text-slate-800 bg-slate-100 px-1 rounded">(x₀, y₀)</code>. RK4 propagates the approximation trajectory both leftwards and rightwards starting from this pivot point.</p></div>
          <div class="space-y-2"><h4 class="font-semibold text-slate-900 flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span><span>Integration Solvers (RK4)</span></h4><p>Runge-Kutta 4th-order method provides robust stability for solving stiff and oscillating systems without requiring analytical symbolics.</p></div>
        </div>
      </div>
      
    </div>
    
    <!-- EXAMPLES TAB -->
    <div data-tab-content="examples" class="space-y-6 animate-fade-in">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-2">
        <span class="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Curated Library</span>
        <h2 class="text-xl font-bold tracking-tight text-slate-950 font-sans">Common Differential Equations</h2>
        <p class="text-sm text-slate-500 max-w-2xl">Explore a rich pedagogical archive of ordinary differential equations (ODEs) from undergraduate applied science courses. Select any card to immediately seed parameters, plot vector flows, and examine the math steps.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="examples-main-grid"></div>
    </div>
    
    <!-- DOCS TAB -->
    <div data-tab-content="documentation" class="space-y-6 animate-fade-in">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-2">
        <span class="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Reference Manual</span>
        <h2 class="text-xl font-bold tracking-tight text-slate-950 font-sans">Ordinary Differential Equations Reference</h2>
        <p class="text-sm text-slate-500 max-w-2xl">A mathematical overview of the analytical classifications and numerical integration algorithms running behind this solver.</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2"><span class="w-1.5 h-6 bg-[#2563EB] rounded-full inline-block"></span><span>1. ODE Classification</span></h3>
          <p class="text-xs text-slate-500 leading-relaxed">An Ordinary Differential Equation relates a function of a single independent variable <code class="font-mono">x</code> to its derivatives.</p>
          <div class="space-y-2 bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/30 text-xs font-mono text-slate-600">
            <div class="font-semibold text-slate-800">First-Order:</div><div class="pl-2">y' = f(x, y)</div>
            <div class="font-semibold text-slate-800 mt-2">Second-Order:</div><div class="pl-2">y'' = f(x, y, y')</div>
          </div>
          <p class="text-xs text-slate-400">First-order equations form a direction field representing tangent slopes at any coordinate.</p>
        </div>
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2"><span class="w-1.5 h-6 bg-emerald-600 rounded-full inline-block"></span><span>2. Runge-Kutta 4th Order</span></h3>
          <p class="text-xs text-slate-500 leading-relaxed">Our solver implements the RK4 integration engine. It computes four slope vectors across each step interval <code class="font-mono">h</code> to estimate the trajectory.</p>
          <div class="space-y-1 bg-[#F5F7FA] p-3 rounded-lg border border-slate-200/30 text-[11px] font-mono text-slate-600">
            <div>k₁ = h·f(xₙ, yₙ)</div><div>k₂ = h·f(xₙ+h/2, yₙ+k₁/2)</div><div>k₃ = h·f(xₙ+h/2, yₙ+k₂/2)</div><div>k₄ = h·f(xₙ+h, yₙ+k₃)</div>
            <div class="font-bold text-slate-800 pt-1 border-t border-slate-200 mt-1">yₙ₊₁ = yₙ + (k₁+2k₂+2k₃+k₄)/6</div>
          </div>
          <p class="text-xs text-slate-400">RK4 provides a robust balance between computation speed and numerical stability, converging at a global truncation error rate of O(h⁴).</p>
        </div>
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2"><span class="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span><span>3. Parsing Syntax Guidelines</span></h3>
          <p class="text-xs text-slate-500 leading-relaxed">Keep equations explicit! Solve on-paper for the highest order derivative before entering.</p>
          <div class="space-y-2 text-xs text-slate-500 leading-relaxed">
            <div class="flex gap-2"><span class="font-mono text-[#2563EB] font-bold">✓</span><span><code class="font-mono">y' = x^2 - y</code></span></div>
            <div class="flex gap-2"><span class="font-mono text-red-600 font-bold">✗</span><span><code class="font-mono">dy/dx + y - x^2 = 0</code></span></div>
            <div class="border-t border-slate-100 pt-2 text-[11px] text-slate-400 leading-relaxed">Implicit equations can lead to compilation errors. Maintain standard mathematical syntax structures.</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ABOUT TAB -->
    <div data-tab-content="about" class="space-y-6 animate-fade-in">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-6">
        <div class="space-y-2 border-b border-[#E5E7EB] pb-4">
          <span class="text-xs font-bold text-[#2563EB] tracking-wider uppercase font-mono">Academic Project Background</span>
          <h2 class="text-xl font-bold tracking-tight text-slate-950 font-sans">About Differential Equation Solver</h2>
          <p class="text-sm text-slate-500">A high-fidelity computational science reference application.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-500 leading-relaxed font-sans">
          <div class="space-y-4"><h3 class="font-semibold text-slate-900 text-sm">Educational Objective</h3><p>This solver was built as an open pedagogical asset for university students and professors in mathematics and engineering. By offering simultaneous symbolic derivations and interactive numerical canvases side-by-side, it bridges the gap between pure algebraic solutions and physical numerical approximations.</p><p>Developed with robust, client-side JS compiling, it calculates hundreds of slope vectors and high-precision integration curves with sub-millisecond response latency, functioning entirely offline without database overheads.</p></div>
          <div class="space-y-4"><h3 class="font-semibold text-slate-900 text-sm">Engine Technical Stack</h3>
            <ul class="space-y-2 font-mono">
              <li class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">Framework:</span><span class="text-slate-800 font-semibold">Vanilla HTML/JS/CSS</span></li>
              <li class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">Styling Engine:</span><span class="text-slate-800 font-semibold">Tailwind CSS v3</span></li>
              <li class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">Formula Layout:</span><span class="text-slate-800 font-semibold">KaTeX Math Renderers</span></li>
              <li class="flex justify-between border-b border-slate-100 pb-1"><span class="text-slate-400">Plot Renderer:</span><span class="text-slate-800 font-semibold">HTML5 Interactive Canvas</span></li>
              <li class="flex justify-between"><span class="text-slate-400">Numeric Engine:</span><span class="text-[#2563EB] font-bold">4th-Order Runge-Kutta (RK4)</span></li>
            </ul>
          </div>
        </div>
        <div class="bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl p-4 flex gap-4 items-center">
          <div class="w-10 h-10 bg-[#2563EB]/5 rounded-lg flex items-center justify-center text-[#2563EB] shrink-0 font-bold">μ</div>
          <div class="text-xs text-slate-500 leading-relaxed"><span class="font-bold text-slate-900 block">Department of Applied Mathematics</span>Designed in accordance with undergraduate Calculus III and Ordinary Differential Equations course criteria. Verified for mathematical correctness across diverse linear and non-linear boundary constraints.</div>
        </div>
      </div>
    </div>
    
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('HTML written.');
