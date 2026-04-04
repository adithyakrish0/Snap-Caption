@echo off
echo Starting Video Content Suite (Web Edition)...

REM Start Backend
start cmd /k "cd backend && title Backend && pip install -r requirements.txt && python main.py"

REM Start Frontend
start cmd /k "cd frontend && title Frontend && npm run dev"

echo Servers started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
