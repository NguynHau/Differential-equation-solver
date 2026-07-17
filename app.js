
import { 
  sanitizeAndCompile, solveFirstOrderRK4, solveSecondOrderRK4, 
  generateDirectionField, generateAnalyticDerivation, ODE_PRESETS 
} from './mathSolver.js';

const appState = {
  activeTab: 'dashboard',
  equationType: 'first-order',
  equationInput: '(x^2 + y / x^3) / 5',
  currentPresetId: 'preset-user-example',
  initialConditions: [{ order: 0, x: 1, value: 2 }],
  xMin: 0.5,
  xMax: 4.0,
  plotTab: 'combined',
  points: [],
  directionField: [],
  analyticSteps: [],
  symbolicFormula: '',
  lastError: '',
  isDocOpen: true,
  isStepOpen: true,
  
  // plot internal state
  yMin: -5,
  yMax: 5,
  isPanning: false,
  panStart: {x:0, y:0},
  hoverCoord: null,
};

function query(sel) { return document.querySelector(sel); }

function updateLatex(el, math, block=false) {
  if (!el) return;
  katex.render(math, el, {
    throwOnError: false,
    displayMode: block
  });
}

function initIcons() {
  if (window.lucide) { lucide.createIcons(); }
}

const TABS = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
  { id: 'first-order', icon: 'layers', label: 'First-Order ODE' },
  { id: 'higher-order', icon: 'trending-up', label: 'Higher-Order ODE' },
  { id: 'examples', icon: 'book-marked', label: 'Examples Library' },
  { id: 'documentation', icon: 'file-text', label: 'Reference Manual' },
  { id: 'about', icon: 'info', label: 'Methodology & About' },
];

function renderSidebar() {
  const nav = query('#sidebar-nav');
  nav.innerHTML = TABS.map(tab => {
    const isActive = appState.activeTab === tab.id;
    const cls = isActive ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-slate-900';
    return `
      <button onclick="app.setTab('${tab.id}')" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${cls}">
        <i data-lucide="${tab.icon}" class="w-4 h-4"></i>
        <span>${tab.label}</span>
      </button>
    `;
  }).join('');
  initIcons();
}

function updateTabs() {
  document.querySelectorAll('[data-tab-content]').forEach(el => {
    el.classList.toggle('active', el.dataset.tabContent === appState.activeTab || (el.dataset.tabContent === 'solver' && (appState.activeTab === 'first-order' || appState.activeTab === 'higher-order')));
  });
}

window.app = {
  setTab(tabId) {
    appState.activeTab = tabId;
    if (tabId === 'first-order' || tabId === 'higher-order') {
      if (appState.equationType !== tabId) {
        appState.equationType = tabId;
        const defaultPreset = ODE_PRESETS.find(p => p.id === (tabId === 'first-order' ? 'preset-user-example' : 'preset-harmonic'));
        this.loadPreset(defaultPreset, false);
      }
    }
    renderSidebar();
    updateTabs();
    this.renderWorkspace();
  },
  
  handleTypeChange(type) {
    this.setTab(type);
  },

  loadPreset(preset, switchTab = true) {
    appState.currentPresetId = preset.id;
    appState.equationType = preset.type;
    appState.equationInput = preset.equation;
    appState.initialConditions = JSON.parse(JSON.stringify(preset.initialConditions));
    appState.xMin = preset.xRange[0];
    appState.xMax = preset.xRange[1];
    appState.lastError = '';
    
    if (switchTab) {
      appState.activeTab = preset.type;
      renderSidebar();
      updateTabs();
    }
    
    this.handleSolve();
  },

  handleReset() {
    appState.lastError = '';
    const pId = appState.equationType === 'first-order' ? 'preset-user-example' : 'preset-harmonic';
    this.loadPreset(ODE_PRESETS.find(p => p.id === pId), false);
  },

  updateLiveMath() {
    appState.equationInput = query('#formula-input').value;
    appState.currentPresetId = null;
    const prefix = appState.equationType === 'first-order' ? "y'" : "y''";
    updateLatex(query('#live-math-preview'), `${prefix} = ${appState.equationInput || '?'}`);
    this.renderExamplesCarousel();
  },

  addInitialCondition() {
    const nextOrder = appState.equationType === 'higher-order' ? 1 : 0;
    const defaultX = appState.initialConditions.length > 0 ? appState.initialConditions[0].x : 0;
    
    const exists = appState.initialConditions.some(c => c.order === nextOrder);
    if (exists && appState.equationType === 'first-order') {
      this.showError("First-order ordinary differential equations only require one boundary/initial condition y(x0) = y0.");
      return;
    }
    if (exists && nextOrder === 1 && appState.initialConditions.some(c => c.order === 1)) {
      this.showError("Second-order differential equations require exactly one y(x0) and one y'(x0) condition.");
      return;
    }
    appState.initialConditions.push({ order: nextOrder, x: defaultX, value: 0 });
    this.renderConditions();
  },

  removeInitialCondition(idx) {
    appState.initialConditions.splice(idx, 1);
    this.renderConditions();
  },

  updateCondition(idx, field, val) {
    appState.initialConditions[idx][field] = val;
    this.renderConditions(); // Update UI if needed, or just let value sit
  },

  updateRange(field, val) {
    appState[field === 'min' ? 'xMin' : 'xMax'] = parseFloat(val) || 0;
  },

  showError(msg) {
    appState.lastError = msg;
    const errEl = query('#alert-error-display');
    if (msg) {
      query('#error-message-text').innerText = msg;
      errEl.classList.remove('hidden');
      errEl.classList.add('flex');
    } else {
      errEl.classList.add('hidden');
      errEl.classList.remove('flex');
    }
  },

  handleSolve() {
    this.showError('');
    const isHigher = appState.equationType === 'higher-order';
    
    const compileRes = sanitizeAndCompile(appState.equationInput, isHigher);
    if (compileRes.error) {
      this.showError(compileRes.error);
      return;
    }
    const f = compileRes.fn;

    const icY = appState.initialConditions.find(c => c.order === 0);
    if (!icY) {
      this.showError("Core initial condition y(x0) = y0 is required to compute a particular solution.");
      return;
    }

    const x0 = icY.x;
    const y0 = icY.value;

    try {
      if (isHigher) {
        const icDY = appState.initialConditions.find(c => c.order === 1);
        if (!icDY) {
          this.showError("Second-order ODEs require a second boundary condition specifying the derivative value y'(x0) = dy0.");
          return;
        }
        appState.points = solveSecondOrderRK4(f, x0, y0, icDY.value, appState.xMin, appState.xMax);
        appState.directionField = [];
      } else {
        appState.points = solveFirstOrderRK4(f, x0, y0, appState.xMin, appState.xMax);
        appState.directionField = generateDirectionField(f, appState.xMin, appState.xMax, -5, 5);
      }

      const derivation = generateAnalyticDerivation(appState.currentPresetId, appState.equationInput, appState.initialConditions, isHigher);
      appState.analyticSteps = derivation.steps;
      appState.symbolicFormula = derivation.formula;

      this.autoScaleY();
      this.renderWorkspace();
    } catch (err) {
      this.showError(`Numerical simulation crash: ${err.message}. Please check division terms or bounds.`);
    }
  },

  autoScaleY() {
    if (appState.points.length > 0) {
      const yValues = appState.points.map(p => p.y).filter(y => !isNaN(y) && isFinite(y));
      if (yValues.length > 0) {
        const minVal = Math.min(...yValues);
        const maxVal = Math.max(...yValues);
        const padding = Math.max((maxVal - minVal) * 0.25, 2.0);
        appState.yMin = minVal - padding;
        appState.yMax = maxVal + padding;
      } else {
        appState.yMin = -5; appState.yMax = 5;
      }
    } else {
      appState.yMin = -5; appState.yMax = 5;
    }
  },

  setPlotTab(t) {
    appState.plotTab = t;
    this.renderPlotTabs();
    this.drawCanvas();
  },
  
  toggleDocs() {
    appState.isDocOpen = !appState.isDocOpen;
    query('#docs-content').style.display = appState.isDocOpen ? 'grid' : 'none';
    query('#docs-chevron').setAttribute('data-lucide', appState.isDocOpen ? 'chevron-up' : 'chevron-down');
    initIcons();
  },
  
  toggleSteps() {
    appState.isStepOpen = !appState.isStepOpen;
    query('#proof-steps-container').style.display = appState.isStepOpen ? 'block' : 'none';
    query('#steps-chevron').setAttribute('data-lucide', appState.isStepOpen ? 'chevron-up' : 'chevron-down');
    initIcons();
  },
  
  zoomCanvas(factor) {
    const xCenter = (appState.xMin + appState.xMax) / 2;
    const yCenter = (appState.yMin + appState.yMax) / 2;
    const halfX = ((appState.xMax - appState.xMin) * factor) / 2;
    const halfY = ((appState.yMax - appState.yMin) * factor) / 2;
    appState.xMin = xCenter - halfX;
    appState.xMax = xCenter + halfX;
    appState.yMin = yCenter - halfY;
    appState.yMax = yCenter + halfY;
    this.drawCanvas();
  },

  resetCanvasZoom() {
    appState.xMin = parseFloat(query('#input-xmin').value) || 0;
    appState.xMax = parseFloat(query('#input-xmax').value) || 0;
    this.autoScaleY();
    this.drawCanvas();
  },

  renderDashboardPresets() {
    const grid = query('#dashboard-presets-grid');
    if (!grid) return;
    grid.innerHTML = ODE_PRESETS.map(p => {
      // Need a unique div id for latex rendering
      const domId = 'dash-latex-' + p.id;
      return `
        <div onclick="app.loadPreset(ODE_PRESETS.find(x=>x.id==='${p.id}'))" class="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#2563EB] hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col justify-between h-44">
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="text-[10px] font-bold font-mono tracking-wider text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase">${p.type.replace('-', ' ')}</span>
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563EB] transition-colors"></i>
            </div>
            <h4 class="font-semibold text-sm text-slate-900 group-hover:text-[#2563EB] transition-colors mb-1">${p.name}</h4>
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${p.description}</p>
          </div>
          <div class="bg-[#F5F7FA] p-2 rounded-lg font-mono text-xs text-[#2563EB] text-center border border-slate-100 overflow-x-auto whitespace-nowrap">
            <div id="${domId}"></div>
          </div>
        </div>
      `;
    }).join('');
    
    // Render latex
    ODE_PRESETS.forEach(p => {
      updateLatex(query('#dash-latex-' + p.id), p.displayEq);
    });
    initIcons();
  },

  renderExamplesLibrary() {
    const grid = query('#examples-main-grid');
    if (!grid) return;
    grid.innerHTML = ODE_PRESETS.map(p => {
      const domId = 'lib-latex-' + p.id;
      return `
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4 hover:border-[#2563EB] transition-all shadow-xs flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-bold font-mono text-[#2563EB] bg-[#2563EB]/5 py-0.5 px-2 rounded-full uppercase">${p.type.replace('-', ' ')}</span>
              <i data-lucide="award" class="w-4 h-4 text-[#2563EB]"></i>
            </div>
            <h3 class="font-bold text-slate-950 text-sm">${p.name}</h3>
            <p class="text-xs text-slate-500 leading-relaxed">${p.description}</p>
          </div>
          <div class="space-y-3">
            <div class="bg-[#F5F7FA] p-3 rounded-lg text-center border border-slate-100 font-mono text-xs text-[#2563EB]">
              <div id="${domId}"></div>
            </div>
            <button onclick="app.loadPreset(ODE_PRESETS.find(x=>x.id==='${p.id}'))" class="w-full text-center bg-[#2563EB] text-white hover:bg-[#2563EB]/95 transition-all py-2 rounded-lg text-xs font-semibold">
              Load into Workspace & Solve
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    ODE_PRESETS.forEach(p => updateLatex(query('#lib-latex-' + p.id), p.displayEq));
    initIcons();
  },

  renderExamplesCarousel() {
    const row = query('#horizontal-examples-row');
    if(!row) return;
    row.innerHTML = ODE_PRESETS.map(p => {
      const activeCls = appState.currentPresetId === p.id 
        ? 'border-[#2563EB] bg-[#2563EB]/5 ring-1 ring-[#2563EB]' 
        : 'border-[#E5E7EB] hover:border-slate-400';
      const domId = 'car-latex-' + p.id;
      return `
        <button onclick="app.loadPreset(ODE_PRESETS.find(x=>x.id==='${p.id}'))" class="flex-none w-64 bg-[#F5F7FA] border rounded-lg p-3 text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer ${activeCls}">
          <div class="flex justify-between items-center mb-1">
            <span class="text-[9px] font-bold text-slate-400 uppercase font-mono">${p.type}</span>
            ${appState.currentPresetId === p.id ? '<span class="text-[8px] font-bold text-white bg-[#2563EB] px-1 rounded">Active</span>' : ''}
          </div>
          <h4 class="font-semibold text-slate-900 text-xs truncate mb-1">${p.name}</h4>
          <div class="bg-white p-1.5 rounded font-mono text-[10px] text-[#2563EB] border border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap mb-1">
            <div id="${domId}"></div>
          </div>
        </button>
      `;
    }).join('');
    
    ODE_PRESETS.forEach(p => updateLatex(query('#car-latex-' + p.id), p.displayEq));
  },

  renderPlotTabs() {
    const isHigher = appState.equationType === 'higher-order';
    query('#legend-dir-field').style.display = isHigher ? 'none' : 'flex';
    
    document.querySelectorAll('#plot-tabs button').forEach(btn => {
      const pt = btn.dataset.plottab;
      
      if (isHigher && pt !== 'curve') {
        btn.className = "px-3 py-1.5 rounded-md transition-all text-[11px] opacity-40 cursor-not-allowed text-slate-500 hover:text-slate-900";
      } else {
        const isActive = appState.plotTab === pt;
        btn.className = "px-3 py-1.5 rounded-md transition-all text-[11px] " + (isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900');
      }
    });
  },

  renderConditions() {
    const tbody = query('#initial-conditions-tbody');
    if(!tbody) return;
    
    if (appState.initialConditions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-400 text-[11px]">No boundary constraints. Click "Add Condition" to set constraints.</td></tr>';
      return;
    }
    
    tbody.innerHTML = appState.initialConditions.map((ic, idx) => `
      <tr class="hover:bg-[#F5F7FA]/50 transition-colors">
        <td class="py-2 px-3">
          <select onchange="app.updateCondition(${idx}, 'order', parseInt(this.value))" class="bg-[#F5F7FA] border border-slate-200/80 rounded px-1.5 py-1 text-[11px] outline-none text-slate-700 cursor-pointer">
            <option value="0" ${ic.order === 0 ? 'selected' : ''}>y(x)</option>
            <option value="1" ${appState.equationType === 'first-order' ? 'disabled' : ''} ${ic.order === 1 ? 'selected' : ''}>y'(x)</option>
          </select>
        </td>
        <td class="py-2 px-3">
          <input type="number" step="any" value="${ic.x}" onchange="app.updateCondition(${idx}, 'x', parseFloat(this.value) || 0)" class="w-16 bg-[#F5F7FA] border border-slate-200/80 rounded px-2 py-1 text-xs outline-none focus:border-[#2563EB]" />
        </td>
        <td class="py-2 px-3">
          <input type="number" step="any" value="${ic.value}" onchange="app.updateCondition(${idx}, 'value', parseFloat(this.value) || 0)" class="w-20 bg-[#F5F7FA] border border-slate-200/80 rounded px-2 py-1 text-xs outline-none focus:border-[#2563EB]" />
        </td>
        <td class="py-2 px-3 text-center">
          <button onclick="app.removeInitialCondition(${idx})" class="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete row">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `).join('');
    initIcons();
  },

  renderWorkspace() {
    // Top config
    query('#workspace-type-badge').innerText = appState.equationType.replace('-', ' ');
    query('#workspace-heading').innerText = appState.equationType === 'first-order' ? 'First-Order ODE Solver Workspace' : 'Higher-Order ODE Solver Workspace';
    query('#equation-type-select').value = appState.equationType;
    query('#equation-prefix').innerText = appState.equationType === 'first-order' ? "y' =" : "y'' =";
    query('#formula-input').value = appState.equationInput;
    query('#formula-input').placeholder = appState.equationType === 'first-order' ? "e.g. -0.1 * (y - 20)" : "e.g. -2 * dy - 5 * y";
    query('#input-xmin').value = appState.xMin;
    query('#input-xmax').value = appState.xMax;
    
    this.updateLiveMath();
    this.renderConditions();
    this.renderPlotTabs();
    this.renderExamplesCarousel();

    // Solution
    updateLatex(query('#solution-formula'), appState.symbolicFormula || "y(x) = ?", false);
    
    // Steps
    const stepsCont = query('#proof-steps-container');
    if (appState.analyticSteps.length === 0) {
      stepsCont.innerHTML = '<div class="text-center text-slate-400 py-6">Click "Execute Solver" to run calculations and generate mathematical proofs.</div>';
    } else {
      stepsCont.innerHTML = appState.analyticSteps.map((step, idx) => {
        const isText = step.startsWith('\\text{');
        const cls = isText ? 'text-slate-700 font-bold border-b border-slate-200/50 mt-4 first:mt-0 pb-1' : 'text-slate-600 pl-4';
        return `<div class="leading-relaxed py-2 ${cls}" id="step-${idx}"></div>`;
      }).join('');
      appState.analyticSteps.forEach((step, idx) => {
        updateLatex(query('#step-'+idx), step, !step.startsWith('\\text{'));
      });
    }

    // Table
    const isHigher = appState.equationType === 'higher-order';
    query('#th-velocity').style.display = isHigher ? 'table-cell' : 'none';
    const tbody = query('#numerical-tbody');
    const displayPts = appState.points.slice(0,10);
    
    if (displayPts.length === 0) {
      tbody.innerHTML = `<tr id="empty-points-row"><td colspan="${isHigher?5:4}" class="py-6 text-slate-400 text-center font-mono text-[11px]">No point values calculated yet.</td></tr>`;
    } else {
      tbody.innerHTML = displayPts.map((pt, index) => `
        <tr class="hover:bg-[#F5F7FA]/50 transition-all">
          <td class="py-2 px-4 font-bold text-slate-400">${index}</td>
          <td class="py-2 px-4 text-[#2563EB]">${pt.x.toFixed(5)}</td>
          <td class="py-2 px-4 text-slate-900 font-semibold">${pt.y.toFixed(6)}</td>
          ${isHigher ? `<td class="py-2 px-4 text-emerald-600">${pt.dy !== undefined ? pt.dy.toFixed(6) : '-'}</td>` : ''}
          <td class="py-2 px-4 text-[10px]">
            ${index === 0 ? '<span class="text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase">Boundary</span>' : '<span class="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase">Converged</span>'}
          </td>
        </tr>
      `).join('');
    }
    
    const indic = query('#points-overflow-indicator');
    if (appState.points.length > 10) {
      indic.innerText = `Showing first 10 steps out of ${appState.points.length} calculated coordinates spanning your domain.`;
      indic.style.display = 'block';
    } else {
      indic.style.display = 'none';
    }
    
    this.drawCanvas();
  },

  drawCanvas() {
    const canvas = query('#math-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const xMin = appState.xMin;
    const xMax = appState.xMax;
    const yMin = appState.yMin;
    const yMax = appState.yMax;
    const toScreenX = (x) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Grid
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px "monospace"';

    const xSpan = xMax - xMin;
    let xSpacing = Math.pow(10, Math.floor(Math.log10(xSpan))) / 2;
    if (xSpan / xSpacing > 15) xSpacing *= 2;
    if (xSpan / xSpacing < 5) xSpacing /= 2;
    const firstGridX = Math.ceil(xMin / xSpacing) * xSpacing;
    for (let x = firstGridX; x <= xMax; x += xSpacing) {
      const sx = toScreenX(x);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, height); ctx.stroke();
      if (Math.abs(x) > 1e-10) ctx.fillText(x.toFixed(1).replace(/\.0$/, ''), sx - 6, height - 10);
    }

    const ySpan = yMax - yMin;
    let ySpacing = Math.pow(10, Math.floor(Math.log10(ySpan))) / 2;
    if (ySpan / ySpacing > 15) ySpacing *= 2;
    if (ySpan / ySpacing < 5) ySpacing /= 2;
    const firstGridY = Math.ceil(yMin / ySpacing) * ySpacing;
    for (let y = firstGridY; y <= yMax; y += ySpacing) {
      const sy = toScreenY(y);
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(width, sy); ctx.stroke();
      if (Math.abs(y) > 1e-10) ctx.fillText(y.toFixed(1).replace(/\.0$/, ''), 8, sy + 3);
    }

    const originX = toScreenX(0);
    const originY = toScreenY(0);
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.fillText('0', originX + 5, originY - 5);
    }

    // Axes
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1.5;
    if (originY >= 0 && originY <= height) {
      ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(width, originY); ctx.stroke();
    }
    if (originX >= 0 && originX <= width) {
      ctx.beginPath(); ctx.moveTo(originX, 0); ctx.lineTo(originX, height); ctx.stroke();
    }

    const showField = (appState.plotTab === 'field' || appState.plotTab === 'combined') && appState.equationType === 'first-order';
    const showCurve = (appState.plotTab === 'curve' || appState.plotTab === 'combined' || appState.equationType === 'higher-order');

    if (showField && appState.directionField) {
      ctx.lineWidth = 1.2;
      appState.directionField.forEach(vec => {
        const sx = toScreenX(vec.x);
        const sy = toScreenY(vec.y);
        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          const halfL = 15 / 2;
          const screenDx = toScreenX(vec.x + vec.dx * 0.1) - sx;
          const screenDy = toScreenY(vec.y + vec.dy * 0.1) - sy;
          const len = Math.sqrt(screenDx * screenDx + screenDy * screenDy);
          if (len > 0) {
            const udx = screenDx / len;
            const udy = screenDy / len;
            ctx.beginPath();
            ctx.moveTo(sx - udx * halfL, sy - udy * halfL);
            ctx.lineTo(sx + udx * halfL, sy + udy * halfL);
            if (vec.slope > 0.05) ctx.strokeStyle = `rgba(37, 99, 235, ${Math.min(0.15 + Math.abs(vec.slope) * 0.1, 0.45)})`;
            else if (vec.slope < -0.05) ctx.strokeStyle = `rgba(220, 38, 38, ${Math.min(0.15 + Math.abs(vec.slope) * 0.1, 0.45)})`;
            else ctx.strokeStyle = 'rgba(156, 163, 175, 0.25)';
            ctx.stroke();
          }
        }
      });
    }

    if (showCurve && appState.points.length > 0) {
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let first = true;
      appState.points.forEach(p => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        if (isNaN(sy) || !isFinite(sy)) return;
        if (first) { ctx.moveTo(sx, sy); first = false; }
        else { ctx.lineTo(sx, sy); }
      });
      ctx.stroke();
    }

    const ic = appState.initialConditions.find(c => c.order === 0);
    if (ic) {
      const icX = toScreenX(ic.x);
      const icY = toScreenY(ic.value);
      if (icX >= 0 && icX <= width && icY >= 0 && icY <= height) {
        ctx.beginPath(); ctx.arc(icX, icY, 8, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(22, 163, 74, 0.18)'; ctx.fill();
        ctx.beginPath(); ctx.arc(icX, icY, 4, 0, 2 * Math.PI); ctx.fillStyle = '#16A34A'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
      }
    }
  }
};

// Canvas events
document.addEventListener('DOMContentLoaded', () => {
  const canvas = query('#math-canvas');
  if(canvas) {
    canvas.addEventListener('mousedown', (e) => {
      appState.isPanning = true;
      appState.panStart = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const mx = appState.xMin + (px / rect.width) * (appState.xMax - appState.xMin);
      const my = appState.yMin + ((rect.height - py) / rect.height) * (appState.yMax - appState.yMin);
      
      const hud = query('#plot-hud');
      hud.classList.remove('hidden');
      query('#hud-x').innerText = mx.toFixed(4);
      query('#hud-y').innerText = my.toFixed(4);

      if (appState.isPanning) {
        const dx = e.clientX - appState.panStart.x;
        const dy = e.clientY - appState.panStart.y;
        const mathDx = (dx / rect.width) * (appState.xMax - appState.xMin);
        const mathDy = (dy / rect.height) * (appState.yMax - appState.yMin);
        appState.xMin -= mathDx;
        appState.xMax -= mathDx;
        appState.yMin += mathDy;
        appState.yMax += mathDy;
        appState.panStart = { x: e.clientX, y: e.clientY };
        app.drawCanvas();
      }
    });
    const finishPan = () => {
      appState.isPanning = false;
    };
    canvas.addEventListener('mouseup', finishPan);
    canvas.addEventListener('mouseleave', () => {
      finishPan();
      query('#plot-hud').classList.add('hidden');
    });
  }

  // Init
  app.renderDashboardPresets();
  app.renderExamplesLibrary();
  app.setTab('dashboard');
  
  // resize canvas on window resize
  window.addEventListener('resize', () => {
    if (appState.activeTab === 'first-order' || appState.activeTab === 'higher-order') {
      app.drawCanvas();
    }
  });
});
