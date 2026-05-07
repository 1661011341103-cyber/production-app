@echo off
echo ========================================
echo   ระบบใบสั่งผลิต — Local Server
echo ========================================
echo.

:: ลองใช้ Python ก่อน
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo กำลังเริ่ม server ด้วย Python...
    echo.
    for /f "tokens=*" %%i in ('powershell -command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1).IPAddress"') do set IP=%%i
    echo ========================================
    echo   เปิดในเครื่องนี้ : http://localhost:8080
    echo   เปิดจากมือถือ   : http://%IP%:8080
    echo ========================================
    echo.
    echo (กด Ctrl+C เพื่อหยุด server)
    python -m http.server 8080
    goto end
)

:: ลอง Python3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo กำลังเริ่ม server ด้วย Python3...
    for /f "tokens=*" %%i in ('powershell -command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1).IPAddress"') do set IP=%%i
    echo ========================================
    echo   เปิดในเครื่องนี้ : http://localhost:8080
    echo   เปิดจากมือถือ   : http://%IP%:8080
    echo ========================================
    python3 -m http.server 8080
    goto end
)

:: ลอง Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo กำลังเริ่ม server ด้วย Node.js...
    for /f "tokens=*" %%i in ('powershell -command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1).IPAddress"') do set IP=%%i
    echo ========================================
    echo   เปิดในเครื่องนี้ : http://localhost:8080
    echo   เปิดจากมือถือ   : http://%IP%:8080
    echo ========================================
    node -e "const h=require('http'),fs=require('fs'),p=require('path');h.createServer((q,r)=>{let f=p.join('.',q.url==='/'?'/index.html':q.url);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('Not found')}else{const m={'html':'text/html','css':'text/css','js':'application/javascript','json':'application/json','png':'image/png'};r.writeHead(200,{'Content-Type':m[f.split('.').pop()]||'text/plain'});r.end(d)}})}).listen(8080)"
    goto end
)

echo ไม่พบ Python หรือ Node.js ในเครื่อง
echo.
echo กรุณาติดตั้งอย่างใดอย่างหนึ่ง:
echo   Python : https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/
echo.
pause

:end
