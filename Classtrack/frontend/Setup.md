# Project Setup and Run Guide

## Clone the Repository
## Open Git Bash in Terminal then paste there 
git clone https://github.com/cobeee26/CLPRO25.git
cd CLPRO25

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
