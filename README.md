# HealthAI

AI-based health risk prediction system using Random Forest, a FastAPI/Flask backend, a React frontend, and MongoDB.

## Overview

HealthAI lets users input health parameters and get an AI-driven risk assessment in real time. A trained Random Forest model powers the prediction, served through a Python backend API, with results displayed on a modern React frontend.

## Tech Stack

**Frontend**
- React + TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui components

**Backend**
- FastAPI / Flask (Python)
- MongoDB

**Machine Learning**
- Python
- Scikit-learn (Random Forest)

**Testing**
- Playwright (end-to-end tests)
- Vitest (unit tests)

**Package Manager**
- Bun

## Project Structure

```
healthai/
├── backend/                 # FastAPI/Flask server, ML model, API routes
├── server/                  # Server configuration
├── src/                     # React frontend source code
├── public/                  # Static assets
├── playwright.config.ts     # E2E test configuration
├── vitest.config.ts         # Unit test configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── components.json          # shadcn/ui component config
└── package.json
```

## Getting Started

### Prerequisites
- Node.js and [Bun](https://bun.sh/)
- Python 3.x
- MongoDB (local or Atlas)

### Frontend Setup
```bash
bun install
bun run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Environment Variables
Create a `.env` file in the backend directory:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## Available Scripts

```bash
bun run dev        # Start the frontend dev server
bun run build       # Build for production
bun run test        # Run unit tests (Vitest)
bunx playwright test # Run end-to-end tests
```

## How It Works

1. The user enters health-related parameters (e.g., age, BMI, blood pressure, glucose levels) through the React frontend.
2. The frontend sends the data to the backend API.
3. The trained Random Forest model processes the input and predicts a health risk category.
4. Results are stored in MongoDB and displayed back to the user with relevant insights.

## Model

The prediction model uses **Random Forest**, trained on health-related datasets to classify risk levels based on key medical indicators.

## Testing

- **Unit tests** are run with Vitest.
- **End-to-end tests** are run with Playwright, configured via `playwright.config.ts` and `playwright-fixture.ts`.

## Future Improvements

- Add more health parameters for improved prediction accuracy
- Support additional ML models for comparison
- User authentication and personalized health history
- Deploy to a cloud platform (e.g., Render, Vercel, AWS)

## Author

**Juliet Samson Raj S**
GitHub: [julietsamsonraj2005](https://github.com/julietsamsonraj2005)

## License

This project is licensed under the MIT License.
