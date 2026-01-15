
```markdown
# CLPRO25 Project Setup and Run Guide

## 📥 Clone the Repository
Open Git Bash (or your terminal) and run:
```bash
git clone https://github.com/cobeee26/CLPRO25.git
cd CLPRO25
```

## ⚙️ Backend Setup (Python + FastAPI)

### 1. Create and activate virtual environment
```bash
python -m venv venv
```

Run the venv Script:
- **Windows**
```bash
source venv/Scripts/activate
```
- **macOS/Linux**
```bash
source venv/bin/activate
```

### 2. Run the backend server
```bash
uvicorn main:app --reload
```

---

## 🎨 Frontend Setup (React + Vite)

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```


## 🚀 Upload or Update Project on GitHub (Safe Workflow)

### 1. Check your remotes
```bash
git remote -v
```
Make sure `origin` points to:
```
https://github.com/cobeee26/CLPRO25.git
```

### 2. Switch to main branch
```bash
git checkout main
```

### 3. Pull latest changes from repo owner
```bash
git pull origin main
```

### 4. Stage and commit your changes
```bash
git add .
git commit -m "Update: <describe your changes>"
```

### 5. Push safely to GitHub
```bash
git push origin main
```



## 🌱 Best Practice (Collaborative Workflow)

Instead of pushing directly to `main`, create a feature branch:
```bash
git checkout -b allen-feature
git push origin allen-feature
```

Then open a **Pull Request** on GitHub to merge your branch into `main`.  
This avoids overwriting and makes collaboration smoother.


