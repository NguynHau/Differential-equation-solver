const ODE_PRESETS = [
  {
    id: "preset-cooling",
    name: "Newton's Law of Cooling",
    type: "first-order",
    equation: "-0.1 * (y - 20)",
    displayEq: "y' = -0.1(y - 20)",
    initialConditions: [{ order: 0, x: 0, value: 80 }],
    xRange: [0, 40],
    description: "Models a warm object cooling down to a room temperature of 20\xB0C with cooling rate k = 0.1.",
    isAnalytic: true
  },
  {
    id: "preset-growth",
    name: "Malthusian Population Growth",
    type: "first-order",
    equation: "0.25 * y",
    displayEq: "y' = 0.25y",
    initialConditions: [{ order: 0, x: 0, value: 10 }],
    xRange: [0, 10],
    description: "Classical unconstrained biological growth with a continuous growth rate of 25%.",
    isAnalytic: true
  },
  {
    id: "preset-logistic",
    name: "Logistic Population Growth",
    type: "first-order",
    equation: "0.1 * y * (1 - y/100)",
    displayEq: "y' = 0.1y\\left(1 - \\frac{y}{100}\\right)",
    initialConditions: [{ order: 0, x: 0, value: 10 }],
    xRange: [0, 80],
    description: "Models resource-constrained growth where population saturates at a carrying capacity of 100.",
    isAnalytic: true
  },
  {
    id: "preset-user-example",
    name: "Academic First-Order ODE",
    type: "first-order",
    equation: "(x^2 + y / x^3) / 5",
    displayEq: "5y' - \\frac{1}{x^3}y = x^2 \\implies y' = \\frac{1}{5}\\left(x^2 + \\frac{y}{x^3}\\right)",
    initialConditions: [{ order: 0, x: 1, value: 2 }],
    xRange: [0.5, 4],
    description: "A non-separable first-order linear ODE solved analytically using an integrating factor.",
    isAnalytic: true
  },
  {
    id: "preset-harmonic",
    name: "Simple Harmonic Oscillator",
    type: "higher-order",
    equation: "-4 * y",
    displayEq: "y'' + 4y = 0",
    initialConditions: [
      { order: 0, x: 0, value: 1.5 },
      { order: 1, x: 0, value: 0 }
    ],
    xRange: [-5, 5],
    description: "Models a frictionless mass-spring system or LC circuit with a natural angular frequency \u03C9 = 2.",
    isAnalytic: true
  },
  {
    id: "preset-damped",
    name: "Damped Harmonic Oscillator",
    type: "higher-order",
    equation: "-2 * dy - 5 * y",
    // y'' = -2y' - 5y
    displayEq: "y'' + 2y' + 5y = 0",
    initialConditions: [
      { order: 0, x: 0, value: 2 },
      { order: 1, x: 0, value: -1 }
    ],
    xRange: [0, 10],
    description: "Models an underdamped oscillator, showcasing sinusoidal decay due to frictional resistance.",
    isAnalytic: true
  },
  {
    id: "preset-overdamped",
    name: "Overdamped Oscillator",
    type: "higher-order",
    equation: "-5 * dy - 4 * y",
    // y'' = -5y' - 4y
    displayEq: "y'' + 5y' + 4y = 0",
    initialConditions: [
      { order: 0, x: 0, value: 1 },
      { order: 1, x: 0, value: 2 }
    ],
    xRange: [0, 6],
    description: "Strong damping forces prevent oscillation, driving the system to equilibrium exponentially.",
    isAnalytic: true
  }
];
function replacePowers(str) {
  const regex = /\b([a-zA-Z0-9_.]+|\((?:[^()]+|\([^()]*\))*\))\^([a-zA-Z0-9_.]+|\((?:[^()]+|\([^()]*\))*\))/;
  let processed = str;
  let safetyCounter = 0;
  while (regex.test(processed) && safetyCounter < 100) {
    processed = processed.replace(regex, "Math.pow($1,$2)");
    safetyCounter++;
  }
  return processed;
}
function sanitizeAndCompile(expr, isHigherOrder) {
  try {
    let cleaned = expr.trim();
    if (cleaned.includes("=")) {
      const parts = cleaned.split("=");
      const left = parts[0].trim();
      const right = parts[1].trim();
      if (!isHigherOrder && (left.includes("y'") || left.includes("dy"))) {
        const normalizedLeft = left.replace(/\s+/g, "");
        if (normalizedLeft === "5y'-(1/x^3)y" && right === "x^2") {
          cleaned = "(Math.pow(x,2) + (1/Math.pow(x,3))*y) / 5";
        } else {
          return { error: "Please express the equation explicitly in the form y' = f(x, y) or use a preset." };
        }
      } else if (isHigherOrder && (left.includes("y''") || left.includes("d2y"))) {
        const normalizedLeft = left.replace(/\s+/g, "");
        if (normalizedLeft === "y''+4y" && right === "0") {
          cleaned = "-4*y";
        } else if (normalizedLeft === "y''+2y'+5y" && right === "0") {
          cleaned = "-2*dy - 5*y";
        } else if (normalizedLeft === "y''+5y'+4y" && right === "0") {
          cleaned = "-5*dy - 4*y";
        } else {
          return { error: "Please express the equation explicitly in the form y'' = f(x, y, y') or use a preset." };
        }
      } else {
        return { error: `Please write the right-hand side of ${isHigherOrder ? "y'' = f(x, y, y')" : "y' = f(x, y)"}` };
      }
    }
    let processed = cleaned;
    processed = processed.replace(/\bpi\b/gi, "Math.PI");
    processed = processed.replace(/\be\b/gi, "Math.E");
    processed = replacePowers(processed);
    processed = processed.replace(/(\d+)\s*([a-zA-Z(])/g, "$1*$2");
    processed = processed.replace(/\)\s*\(/g, ")*(");
    processed = processed.replace(/\)\s*([a-zA-Z])/g, ")*$1");
    processed = processed.replace(/\bsin\b/gi, "Math.sin");
    processed = processed.replace(/\bcos\b/gi, "Math.cos");
    processed = processed.replace(/\btan\b/gi, "Math.tan");
    processed = processed.replace(/\bexp\b/gi, "Math.exp");
    processed = processed.replace(/\bsqrt\b/gi, "Math.sqrt");
    processed = processed.replace(/\babs\b/gi, "Math.abs");
    processed = processed.replace(/\bln\b/gi, "Math.log");
    processed = processed.replace(/\blog\b/gi, "Math.log10");
    processed = processed.replace(/([xXyY])\s+([xXyY])/g, "$1*$2");
    processed = processed.replace(/([xXyY])\s+([0-9])/g, "$1*$2");
    if (isHigherOrder) {
      processed = processed.replace(/\by_prime\b/g, "dy");
      processed = processed.replace(/\by'\b/g, "dy");
    }
    processed = processed.replace(/\bX\b/g, "x");
    processed = processed.replace(/\bY\b/g, "y");
    if (isHigherOrder) {
      processed = processed.replace(/\bDY\b/g, "dy");
    }
    let validationStr = processed.replace(/Math\.(sin|cos|tan|exp|log|log10|sqrt|pow|abs|PI|E)/g, "").replace(/dy|y_prime/g, "").replace(/[0-9+\-*/().,\s^xy]/gi, "");
    if (validationStr.trim().length > 0) {
      return { error: `Invalid mathematical expression or unsupported syntax: "${validationStr.trim()}"` };
    }
    let compiledFn;
    if (isHigherOrder) {
      compiledFn = new Function("x", "y", "dy", `try { return ${processed}; } catch(e) { return NaN; }`);
    } else {
      compiledFn = new Function("x", "y", `try { return ${processed}; } catch(e) { return NaN; }`);
    }
    return { fn: compiledFn, cleaned: processed };
  } catch (err) {
    return { error: `Parsing error: ${err.message}` };
  }
}
function solveFirstOrderRK4(f, x0, y0, xMin, xMax, h = 0.02) {
  const points = [];
  let x = x0;
  let y = y0;
  points.push({ x, y });
  if (xMax > x0) {
    const stepsForward = Math.ceil((xMax - x0) / h);
    const actualH = (xMax - x0) / stepsForward;
    for (let i = 0; i < stepsForward; i++) {
      const k1 = actualH * f(x, y);
      const k2 = actualH * f(x + actualH / 2, y + k1 / 2);
      const k3 = actualH * f(x + actualH / 2, y + k2 / 2);
      const k4 = actualH * f(x + actualH, y + k3);
      y = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      x = x + actualH;
      if (isNaN(y) || !isFinite(y) || Math.abs(y) > 1e6) break;
      points.push({ x, y });
    }
  }
  points.sort((a, b) => a.x - b.x);
  x = x0;
  y = y0;
  const backwardPoints = [];
  if (xMin < x0) {
    const stepsBackward = Math.ceil((x0 - xMin) / h);
    const actualH = -(x0 - xMin) / stepsBackward;
    for (let i = 0; i < stepsBackward; i++) {
      const k1 = actualH * f(x, y);
      const k2 = actualH * f(x + actualH / 2, y + k1 / 2);
      const k3 = actualH * f(x + actualH / 2, y + k2 / 2);
      const k4 = actualH * f(x + actualH, y + k3);
      y = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      x = x + actualH;
      if (isNaN(y) || !isFinite(y) || Math.abs(y) > 1e6) break;
      backwardPoints.push({ x, y });
    }
  }
  const allPoints = [...backwardPoints, ...points];
  allPoints.sort((a, b) => a.x - b.x);
  return allPoints;
}
function solveSecondOrderRK4(f, x0, y0, dy0, xMin, xMax, h = 0.02) {
  const points = [];
  const rk4Step = (x2, y2, dy2, stepH) => {
    const ky1 = stepH * dy2;
    const kd1 = stepH * f(x2, y2, dy2);
    const ky2 = stepH * (dy2 + kd1 / 2);
    const kd2 = stepH * f(x2 + stepH / 2, y2 + ky1 / 2, dy2 + kd1 / 2);
    const ky3 = stepH * (dy2 + kd2 / 2);
    const kd3 = stepH * f(x2 + stepH / 2, y2 + ky2 / 2, dy2 + kd2 / 2);
    const ky4 = stepH * (dy2 + kd3);
    const kd4 = stepH * f(x2 + stepH, y2 + ky3, dy2 + kd3);
    const nextY = y2 + (ky1 + 2 * ky2 + 2 * ky3 + ky4) / 6;
    const nextDY = dy2 + (kd1 + 2 * kd2 + 2 * kd3 + kd4) / 6;
    return [nextY, nextDY];
  };
  let x = x0;
  let y = y0;
  let dy = dy0;
  points.push({ x, y, dy });
  if (xMax > x0) {
    const stepsForward = Math.ceil((xMax - x0) / h);
    const actualH = (xMax - x0) / stepsForward;
    for (let i = 0; i < stepsForward; i++) {
      const [nextY, nextDY] = rk4Step(x, y, dy, actualH);
      y = nextY;
      dy = nextDY;
      x = x + actualH;
      if (isNaN(y) || !isFinite(y) || Math.abs(y) > 1e6) break;
      points.push({ x, y, dy });
    }
  }
  points.sort((a, b) => a.x - b.x);
  x = x0;
  y = y0;
  dy = dy0;
  const backwardPoints = [];
  if (xMin < x0) {
    const stepsBackward = Math.ceil((x0 - xMin) / h);
    const actualH = -(x0 - xMin) / stepsBackward;
    for (let i = 0; i < stepsBackward; i++) {
      const [nextY, nextDY] = rk4Step(x, y, dy, actualH);
      y = nextY;
      dy = nextDY;
      x = x + actualH;
      if (isNaN(y) || !isFinite(y) || Math.abs(y) > 1e6) break;
      backwardPoints.push({ x, y, dy });
    }
  }
  const allPoints = [...backwardPoints, ...points];
  allPoints.sort((a, b) => a.x - b.x);
  return allPoints;
}
function generateDirectionField(f, xMin, xMax, yMin, yMax, xSegments = 22, ySegments = 18) {
  const vectors = [];
  const xStep = (xMax - xMin) / (xSegments - 1);
  const yStep = (yMax - yMin) / (ySegments - 1);
  for (let i = 0; i < xSegments; i++) {
    const x = xMin + i * xStep;
    for (let j = 0; j < ySegments; j++) {
      const y = yMin + j * yStep;
      const slope = f(x, y);
      if (isNaN(slope) || !isFinite(slope)) continue;
      const angle = Math.atan(slope);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      vectors.push({ x, y, dx, dy, slope });
    }
  }
  return vectors;
}
function generateAnalyticDerivation(presetId, rawEq, ic, isHigherOrder) {
  if (presetId === "preset-cooling" || rawEq.replace(/\s+/g, "") === "-0.1*(y-20)") {
    const y0 = ic.find((c) => c.order === 0)?.value ?? 80;
    const x0 = ic.find((c) => c.order === 0)?.x ?? 0;
    const C = y0 - 20;
    const formula = `y(x) = 20 + ${C === 0 ? "" : C}e^{-0.1(x - ${x0})}`;
    return {
      formula,
      steps: [
        "\\text{1. Classify the Equation:}",
        "\\text{This is a first-order separable ordinary differential equation: } \\frac{dy}{dx} = -0.1(y - 20)",
        "\\text{2. Separate Variables:}",
        "\\text{Divide both sides by } (y - 20) \\text{ and multiply by } dx:",
        "\\frac{1}{y - 20} \\, dy = -0.1 \\, dx",
        "\\text{3. Integrate Both Sides:}",
        "\\int \\frac{1}{y - 20} \\, dy = \\int -0.1 \\, dx",
        "\\ln|y - 20| = -0.1x + C_0",
        "\\text{4. Exponentiate to solve for } y:",
        "|y - 20| = e^{-0.1x + C_0} = e^{C_0} e^{-0.1x}",
        "y(x) = 20 + C e^{-0.1x} \\quad \\text{where } C = \\pm e^{C_0}",
        "\\text{5. Apply the Initial Condition } y(" + x0 + ") = " + y0 + ":",
        y0 + " = 20 + C e^{-0.1(" + x0 + ")} \\implies " + y0 + " = 20 + C",
        "C = " + C,
        "\\text{6. Final Particular Solution:}",
        "y(x) = 20 + " + (C === 0 ? "0" : C) + "e^{-0.1(x" + (x0 === 0 ? "" : " - " + x0) + ")}"
      ]
    };
  }
  if (presetId === "preset-growth" || rawEq.replace(/\s+/g, "") === "0.25*y") {
    const y0 = ic.find((c) => c.order === 0)?.value ?? 10;
    const x0 = ic.find((c) => c.order === 0)?.x ?? 0;
    const C = y0;
    const formula = `y(x) = ${C}e^{0.25(x - ${x0})}`;
    return {
      formula,
      steps: [
        "\\text{1. Classify the Equation:}",
        "\\text{This is a standard Malthusian population growth equation: } \\frac{dy}{dx} = 0.25y",
        "\\text{2. Separate Variables and Integrate:}",
        "\\frac{1}{y} \\, dy = 0.25 \\, dx \\implies \\int \\frac{1}{y} \\, dy = \\int 0.25 \\, dx",
        "\\ln|y| = 0.25x + C_0",
        "y(x) = C e^{0.25x}",
        "\\text{3. Apply Initial Condition } y(" + x0 + ") = " + y0 + ":",
        y0 + " = C e^{0.25(" + x0 + ")} \\implies C = " + y0,
        "\\text{4. Final Analytical Solution:}",
        "y(x) = " + C + "e^{0.25(x" + (x0 === 0 ? "" : " - " + x0) + ")}"
      ]
    };
  }
  if (presetId === "preset-user-example" || rawEq.includes("x^3") && rawEq.includes("5")) {
    const y0 = ic.find((c) => c.order === 0)?.value ?? 2;
    const x0 = ic.find((c) => c.order === 0)?.x ?? 1;
    const formula = `y(x) = e^{\\frac{1}{10x^2}} \\left( \\int_{${x0}}^{x} \\frac{t^2}{5} e^{-\\frac{1}{10t^2}} \\, dt + ${y0} e^{-\\frac{1}{10\\cdot ${x0}^2}} \\right)`;
    return {
      formula,
      steps: [
        "\\text{1. Write in standard linear form } y' + P(x)y = Q(x):",
        "5y' - \\frac{1}{x^3}y = x^2 \\implies y' - \\frac{1}{5x^3}y = \\frac{x^2}{5}",
        "\\text{Here, } P(x) = -\\frac{1}{5x^3} = -0.2 x^{-3} \\quad \\text{and} \\quad Q(x) = \\frac{x^2}{5} = 0.2 x^2",
        "\\text{2. Compute the Integrating Factor } I(x):",
        "I(x) = e^{\\int P(x) \\, dx} = e^{\\int -0.2 x^{-3} \\, dx} = e^{0.1 x^{-2}} = e^{\\frac{1}{10x^2}}",
        "\\text{3. Multiply the ODE by } I(x):",
        "\\frac{d}{dx} \\left[ y \\cdot e^{\\frac{1}{10x^2}} \\right] = \\frac{x^2}{5} e^{\\frac{1}{10x^2}}",
        "\\text{4. Integrate both sides from initial point } x_0 = " + x0 + " \\text{ to } x:",
        "y(x) \\cdot e^{\\frac{1}{10x^2}} - y(" + x0 + ") \\cdot e^{\\frac{1}{10(" + x0 + ")^2}} = \\int_{" + x0 + "}^{x} \\frac{t^2}{5} e^{\\frac{1}{10t^2}} \\, dt",
        "\\text{5. Solve for } y(x) \\text{ using the initial condition } y(" + x0 + ") = " + y0 + ":",
        "y(x) = e^{-\\frac{1}{10x^2}} \\left( \\int_{" + x0 + "}^{x} \\frac{t^2}{5} e^{\\frac{1}{10t^2}} \\, dt + " + y0 + " e^{\\frac{1}{10\\cdot " + x0 + "^2}} \\right)",
        "\\text{Note: This integral is non-elementary. The graph shows the numerical evaluation (RK4) of this analytical form.}"
      ]
    };
  }
  if (isHigherOrder) {
    let A = 0;
    let B = 0;
    let isHomogeneous = true;
    if (presetId === "preset-harmonic" || rawEq === "-4 * y") {
      A = 0;
      B = 4;
    } else if (presetId === "preset-damped" || rawEq === "-2 * dy - 5 * y") {
      A = 2;
      B = 5;
    } else if (presetId === "preset-overdamped" || rawEq === "-5 * dy - 4 * y") {
      A = 5;
      B = 4;
    } else {
      const cleaned = rawEq.replace(/\s+/g, "");
      const match1 = cleaned.match(/-([0-9.]+)\*dy-([0-9.]+)\*y/);
      const match2 = cleaned.match(/-([0-9.]+)\*y/);
      if (match1) {
        A = parseFloat(match1[1]);
        B = parseFloat(match1[2]);
      } else if (match2) {
        A = 0;
        B = parseFloat(match2[1]);
      } else {
        isHomogeneous = false;
      }
    }
    if (isHomogeneous) {
      const y0 = ic.find((c) => c.order === 0)?.value ?? 1;
      const dy0 = ic.find((c) => c.order === 1)?.value ?? 0;
      const x0 = ic.find((c) => c.order === 0)?.x ?? 0;
      const disc = A * A - 4 * B;
      if (disc > 0) {
        const r1 = (-A + Math.sqrt(disc)) / 2;
        const r2 = (-A - Math.sqrt(disc)) / 2;
        const exp1 = Math.exp(r1 * x0);
        const exp2 = Math.exp(r2 * x0);
        const C1 = (dy0 - r2 * y0) / ((r1 - r2) * exp1);
        const C2 = (y0 - C1 * exp1) / exp2;
        const fC1 = C1.toFixed(3).replace(/\.000$/, "");
        const fC2 = C2.toFixed(3).replace(/\.000$/, "");
        const fr1 = r1.toFixed(3).replace(/\.000$/, "");
        const fr2 = r2.toFixed(3).replace(/\.000$/, "");
        const formula = `y(x) = ${fC1}e^{${fr1}x} + ${fC2}e^{${fr2}x}`;
        return {
          formula,
          steps: [
            "\\text{1. Classify the Equation:}",
            `\\text{This is a second-order linear homogeneous ODE with constant coefficients: } y'' + ${A === 0 ? "" : A + "y' + "}${B}y = 0`,
            "\\text{2. Write the Characteristic Equation:}",
            `r^2 + ${A === 0 ? "" : A + "r + "}${B} = 0`,
            "\\text{3. Calculate Roots:}",
            `\\Delta = b^2 - 4ac = ${A}^2 - 4(1)(${B}) = ${disc}`,
            `\\text{Since } \\Delta > 0, \\text{ we have two distinct real roots:}`,
            `r_1 = \\frac{-${A} + \\sqrt{${disc}}}{2} = ${r1.toFixed(4)}`,
            `r_2 = \\frac{-${A} - \\sqrt{${disc}}}{2} = ${r2.toFixed(4)}`,
            "\\text{4. Formulate the General Solution:}",
            `y(x) = C_1 e^{${r1.toFixed(3)}x} + C_2 e^{${r2.toFixed(3)}x}`,
            `\\text{5. Solve for } C_1 \\text{ and } C_2 \\text{ using initial conditions at } x_0 = ${x0}:`,
            `y(${x0}) = C_1 e^{${(r1 * x0).toFixed(2)}} + C_2 e^{${(r2 * x0).toFixed(2)}} = ${y0}`,
            `y'(${x0}) = C_1 (${r1.toFixed(2)}) e^{${(r1 * x0).toFixed(2)}} + C_2 (${r2.toFixed(2)}) e^{${(r2 * x0).toFixed(2)}} = ${dy0}`,
            `\\text{Solving the system gives: } C_1 = ${C1.toFixed(4)}, \\, C_2 = ${C2.toFixed(4)}`,
            "\\text{6. Particular Solution:}",
            `y(x) = ${fC1} e^{${fr1}(x - ${x0})} ${C2 >= 0 ? "+" : ""} ${fC2} e^{${fr2}(x - ${x0})}`
          ]
        };
      } else if (disc === 0) {
        const r = -A / 2;
        const exp = Math.exp(-r * x0);
        const C2 = (dy0 - r * y0) * exp;
        const C1 = y0 * exp - C2 * x0;
        const fC1 = C1.toFixed(3).replace(/\.000$/, "");
        const fC2 = C2.toFixed(3).replace(/\.000$/, "");
        const fr = r.toFixed(3).replace(/\.000$/, "");
        const formula = `y(x) = (${fC1} + ${fC2}x) e^{${fr}x}`;
        return {
          formula,
          steps: [
            "\\text{1. Classify the Equation:}",
            `\\text{This is a second-order linear homogeneous ODE with constant coefficients: } y'' + ${A === 0 ? "" : A + "y' + "}${B}y = 0`,
            "\\text{2. Write the Characteristic Equation:}",
            `r^2 + ${A === 0 ? "" : A + "r + "}${B} = 0`,
            "\\text{3. Calculate Roots:}",
            `\\Delta = b^2 - 4ac = ${A}^2 - 4(1)(${B}) = 0`,
            `\\text{Since } \\Delta = 0, \\text{ we have a single repeated real root:}`,
            `r = \\frac{-${A}}{2} = ${r}`,
            "\\text{4. Formulate the General Solution:}",
            `y(x) = (C_1 + C_2 x) e^{${r}x}`,
            `\\text{5. Solve for } C_1 \\text{ and } C_2 \\text{ using initial conditions at } x_0 = ${x0}:`,
            `y(${x0}) = (C_1 + C_2 (${x0})) e^{${r * x0}} = ${y0}`,
            `y'(${x0}) = C_2 e^{${r * x0}} + ${r} (C_1 + C_2 (${x0})) e^{${r * x0}} = ${dy0}`,
            `\\text{Solving the system gives: } C_1 = ${C1.toFixed(4)}, \\, C_2 = ${C2.toFixed(4)}`,
            "\\text{6. Particular Solution:}",
            `y(x) = (${fC1} + ${fC2}(x - ${x0})) e^{${fr}(x - ${x0})}`
          ]
        };
      } else {
        const alpha = -A / 2;
        const beta = Math.sqrt(-disc) / 2;
        const C1 = y0;
        const C2 = (dy0 - alpha * y0) / beta;
        const fC1 = C1.toFixed(3).replace(/\.000$/, "");
        const fC2 = C2.toFixed(3).replace(/\.000$/, "");
        const fAlpha = alpha.toFixed(3).replace(/\.000$/, "");
        const fBeta = beta.toFixed(3).replace(/\.000$/, "");
        const exponentialPart = alpha === 0 ? "" : `e^{${fAlpha}x}`;
        const formula = `y(x) = ${exponentialPart}(${fC1}\\cos(${fBeta}x) + ${fC2}\\sin(${fBeta}x))`;
        return {
          formula,
          steps: [
            "\\text{1. Classify the Equation:}",
            `\\text{This is a second-order linear homogeneous ODE with constant coefficients: } y'' + ${A === 0 ? "" : A + "y' + "}${B}y = 0`,
            "\\text{2. Write the Characteristic Equation:}",
            `r^2 + ${A === 0 ? "" : A + "r + "}${B} = 0`,
            "\\text{3. Calculate Roots:}",
            `\\Delta = b^2 - 4ac = ${A}^2 - 4(1)(${B}) = ${disc}`,
            `\\text{Since } \\Delta < 0, \\text{ we have complex conjugate roots } r = \\alpha \\pm i\\beta:`,
            `\\alpha = \\frac{-b}{2a} = \\frac{-${A}}{2} = ${alpha}`,
            `\\beta = \\frac{\\sqrt{-\\Delta}}{2a} = \\frac{\\sqrt{${-disc}}}{2} = ${beta.toFixed(4)}`,
            "\\text{4. Formulate the General Solution:}",
            `y(x) = e^{${alpha}x} \\left( C_1 \\cos(${beta.toFixed(3)}x) + C_2 \\sin(${beta.toFixed(3)}x) \\right)`,
            `\\text{5. Solve for } C_1 \\text{ and } C_2 \\text{ using initial conditions at } x_0 = ${x0}:`,
            `y(${x0}) = e^{${(alpha * x0).toFixed(2)}} (C_1 \\cos(${beta.toFixed(2)} (${x0})) + C_2 \\sin(${beta.toFixed(2)} (${x0}))) = ${y0}`,
            `\\text{Using phase coordinates relative to } x_0 = ${x0}:`,
            `C_1 = y(${x0}) = ${C1}`,
            `C_2 = \\frac{y'(${x0}) - \\alpha y(${x0})}{\\beta} = \\frac{${dy0} - (${alpha})(${y0})}{${beta.toFixed(3)}} = ${C2.toFixed(4)}`,
            "\\text{6. Particular Solution:}",
            `y(x) = ${alpha === 0 ? "" : `e^{${fAlpha}(x - ${x0})}`} \\left( ${fC1}\\cos(${fBeta}(x - ${x0})) ${C2 >= 0 ? "+" : ""} ${fC2}\\sin(${fBeta}(x - ${x0})) \\right)`
          ]
        };
      }
    }
  }
  return {
    formula: "\\text{Numerical Approximation (No exact algebraic closed form available)}",
    steps: [
      "\\text{1. Analysis of Custom Input:}",
      `\\text{Equation: } ${isHigherOrder ? "y''" : "y'"} = ${rawEq}`,
      "\\text{2. Numerical Solution via RK4 (Runge-Kutta 4th Order):}",
      "\\text{Because this custom equation may not have a simple analytical closed-form representation,}",
      "\\text{the application evaluates the solution numerically with high-precision steps.}",
      "\\text{Algorithm Coefficients:}",
      "k_1 = h \\cdot f(x_n, y_n)",
      "k_2 = h \\cdot f(x_n + \\frac{h}{2}, y_n + \\frac{k_1}{2})",
      "k_3 = h \\cdot f(x_n + \\frac{h}{2}, y_n + \\frac{k_2}{2})",
      "k_4 = h \\cdot f(x_n + h, y_n + k_3)",
      "y_{n+1} = y_n + \\frac{k_1 + 2k_2 + 2k_3 + k_4}{6}",
      "\\text{This algorithm achieves a local truncation error of } \\mathcal{O}(h^5) \\text{ and global error of } \\mathcal{O}(h^4)."
    ]
  };
}
export {
  ODE_PRESETS,
  generateAnalyticDerivation,
  generateDirectionField,
  replacePowers,
  sanitizeAndCompile,
  solveFirstOrderRK4,
  solveSecondOrderRK4
};
