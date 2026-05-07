@echo off
set APPDIR=%~dp0
set APPFILE=%APPDIR%index.html

:: Try Chrome first
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if exist %CHROME% (
    start "" %CHROME% --allow-file-access-from-files --disable-web-security --user-data-dir="%TEMP%\chrome-app" "%APPFILE%"
    goto end
)

if exist %EDGE% (
    start "" %EDGE% --allow-file-access-from-files --disable-web-security --user-data-dir="%TEMP%\edge-app" "%APPFILE%"
    goto end
)

:: Fallback: open with default browser
start "" "%APPFILE%"

:end
