@echo off
REM start-all.bat - Sobe OmniRoute + HQ Bridge + abre a HQ (duplo clique)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
