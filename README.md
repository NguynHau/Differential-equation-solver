# Differential Equation Solver

A small Python project that solves ordinary differential equations (ODE) using **SymPy** and visualizes solutions using **Matplotlib**.

## Features

- Solve differential equations symbolically
- Support for higher order derivatives
- Initial condition solving
- Plot solution curves
- Direction field visualization (for first order ODE)
- Combined plot of solution + direction field

## Supported Input Syntax

Example:

y^(3)*(x-1)=y''


Derivative notation:

| Input | Meaning |
|------|------|
| y' | first derivative |
| y^2 | second derivative |
| y^3 | third derivative |

Powers using `^` are automatically converted to Python `**`.

## Example

Solve

y^3*(x-1) = y^2

Initial conditions

y(2)=2
y'(2)=1
y''(2)=1

Input format in program

0,2,2
1,2,1
2,2,1


## Installation

Clone the repository

git clone https://github.com/yourusername/differential-equation-solver.git


Install dependencies

pip install -r requirements.txt


Run

python src/solver.py


## Technologies

- Python
- SymPy
- NumPy
- Matplotlib

## Author

Student project for applied mathematics.






