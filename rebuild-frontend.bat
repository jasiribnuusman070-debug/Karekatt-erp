@echo off
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"
echo Rebuilding frontend...
cd frontend
call "%NODE_DIR%\npm.cmd" run build
cd ..
echo Done. Restart start.bat to apply changes.
pause
