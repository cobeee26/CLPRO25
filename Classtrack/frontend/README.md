# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh  
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

---

## 🧩 React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances.  
To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

---

## 🧠 Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,
      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])



#Project Setup and Run Guide
#Backend Setup (Python + FastAPI)
# 1. Create and activate virtual environment
python -m venv venv
#Run the venv Script
source venv/Scripts/activate   # Windows
# or
source venv/bin/activate       # macOS/Linux

# 2. Run the backend server
uvicorn main:app --reload



#Frontend Setup (React + Vite)
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev



#Upload or Update Project on GitHub
# 1. Add remote repository
git remote add upstream https://github.com/cobeee26/CLPRO25.git

# 2. Switch to your working branch
git checkout my-old-working-version

# 3. Push your latest working version to GitHub
git push upstream main --force
