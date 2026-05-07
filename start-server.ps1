$port = 8080
$root = $PSScriptRoot

$ipRaw = ipconfig | Select-String "IPv4" | Select-Object -First 1
$ip = if ($ipRaw) { ($ipRaw.ToString() -split ":")[1].Trim() } else { "unknown" }

Write-Host ""
Write-Host "========================================"
Write-Host "  Production App - Local Server"
Write-Host "========================================"
Write-Host ""
Write-Host "  Local  : http://localhost:$port"
Write-Host "  Mobile : http://${ip}:$port"
Write-Host ""
Write-Host "  Press Ctrl+C to stop"
Write-Host "========================================"
Write-Host ""

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")

try {
    $listener.Start()
    Write-Host "  Server started OK"
} catch {
    $port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://+:$port/")
    $listener.Start()
    Write-Host "  Using port $port instead"
    Write-Host "  Local  : http://localhost:$port"
    Write-Host "  Mobile : http://${ip}:$port"
}

while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $resp = $ctx.Response

        $urlPath = $req.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }

        $filePath = Join-Path $root $urlPath.TrimStart("/")

        if (Test-Path $filePath -PathType Leaf) {
            $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
            $ct   = if ($mime[$ext]) { $mime[$ext] } else { "application/octet-stream" }
            $data = [System.IO.File]::ReadAllBytes($filePath)

            $resp.ContentType    = $ct
            $resp.ContentLength64 = $data.Length
            $resp.StatusCode     = 200
            $resp.OutputStream.Write($data, 0, $data.Length)
        } else {
            $resp.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $resp.OutputStream.Write($msg, 0, $msg.Length)
        }

        $resp.OutputStream.Close()
        Write-Host "  $($req.HttpMethod) $urlPath"

    } catch {
        # ignore
    }
}
