# Differential Equation Solver

A Python project for solving **ordinary differential equations (ODEs)** symbolically using **SymPy** and visualizing results with **Matplotlib**.

The project supports both **first-order ODEs** and **higher-order ODEs**, with visualization tools such as direction fields and solution curves.

---

# Features

## First-Order ODE Solver

- Symbolic solution using **SymPy**
- Solve equations with **initial conditions**
- Plot solution curves
- **Direction field visualization**
- Combined plot of **solution + direction field**

## Higher-Order ODE Solver

- Solve higher-order differential equations
- Support for **multiple initial conditions**
- Plot solution curves

---

# Supported Input Syntax

Example equation

```
y^3*(x-1) = y^2
```

Derivative notation used in the program

| Input | Meaning |
|------|------|
| `y'` | first derivative |
| `y^2` | second derivative (interpreted as `y''`) |
| `y^3` | third derivative (interpreted as `y'''`) |

The power operator `^` is automatically converted to Python `**`.

---

# Initial Conditions Format

Initial conditions are entered using the format

```
(order, x, value)
```

Examples

```
0,2,2   -> y(2) = 2
1,2,1   -> y'(2) = 1
2,2,1   -> y''(2) = 1
```

Enter

```
x
```

to stop entering conditions.

---

# Example

Equation

```
y^3*(x-1) = y^2
```

Initial conditions

```
0,2,2
1,2,1
2,2,1
```

The program will compute the symbolic solution and plot the result.

---

# Visualization

## First-Order ODE Solver

Example outputs

![Direction Field](images/first_order_ode/direction_field.png)

![Graph_of_the_particular_solution](images/first_order_ode/graph_of_the_particular_solution.png)

![Solution + Direction Field](images/first_order_ode/solution+direction_field.png)

The solver can display

- direction field
- solution curve
- combined visualization

---

## Higher-Order ODE Solver

Example output

![Higher Order Solution](images/higher_order_ode/graph_of_the_particular_solutiont.png)

Higher-order equations currently support **solution curve plotting only**.

---

# Installation

Clone the repository

```
git clone https://github.com/yourusername/differential-equation-solver.git
```

Install dependencies

```
pip install -r requirements.txt
```

---

# Running the Program

Run the solver from the `src` directory

```
python src/first_order_ode_solver.py
```

or

```
python src/higher_order_ode_solver.py
```

---

# Project Structure

```
differential-equation-solver
│
├── src
│   ├── first_order_ode_solver.py
│   └── higher_order_ode_solver.py
│
├── notebooks
│   └── ode_solver.ipynb
│
├── images
│   ├── first_order_ode_solver
│   │   ├── direction_field.png
│   │   ├── solution_plot.png
│   │   └── combined_plot.png
│   │
│   └── higher_order_ode_solver
│       └── solution_plot.png
│
├── requirements.txt
└── README.md
```

---

# Technologies

- Python
- SymPy
- NumPy
- Matplotlib

---

# Author

Student project for **Applied Mathematics**.
