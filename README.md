# Differential Equation Solver

A small Python project that solves ordinary differential equations (ODE) using **SymPy** and visualizes solutions using **Matplotlib**.

## Features

- Solve differential equations symbolically
- Support for higher-order derivatives
- Solve with initial conditions
- Plot solution curves
- Direction field visualization (for first-order ODE)
- Combined plot of solution and direction field

---

## Supported Input Syntax

Example equation:

```
y^3*(x-1)=y^2
```

Derivative notation:

| Input | Meaning |
|------|------|
| y' | first derivative |
| y^2 | second derivative |
| y^3 | third derivative |

Power operator `^` is automatically converted to Python `**`.

---

## Example

Solve the differential equation

```
y^3*(x-1) = y^2
```

Initial conditions

```
y(2) = 2
y'(2) = 1
y''(2) = 1
```

Input format in the program

```
0,2,2
1,2,1
2,2,1
```

Then enter

```
x
```

to finish entering conditions.

---

## Installation

Clone the repository

```
git clone https://github.com/yourusername/differential-equation-solver.git
```

Install dependencies

```
pip install -r requirements.txt
```

Run the program

```
python src/solver.py
```

---

## Technologies

- Python
- SymPy
- NumPy
- Matplotlib

---

## Project Structure

```
differential-equation-solver
│
├── src
│   └── solver.py
│
├── notebook
│   └── ode_solver.ipynb
│
├── requirements.txt
└── README.md
```

---

## Author

Student project for **Applied Mathematics**.
