# PowerShell static file server for Royal Bakery
param([int]$Port=3000)

Add-Type -AssemblyName System.Web
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$prefix = "http://+:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Serving $root at $prefix"
} catch {
    Write-Host "Port $Port busy, trying 3001..."
    $Port = 3001
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://+:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Host "Serving $root at $prefix"
}

function Get-ContentType($path) {
    switch ([System.IO.Path]::GetExtension($path).ToLower()) {
        ".html" { "text/html" }
        ".htm"  { "text/html" }
        ".css"  { "text/css" }
        ".js"   { "application/javascript" }
        ".json" { "application/json" }
        ".png"  { "image/png" }
        ".jpg"  { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".webp" { "image/webp" }
        ".svg"  { "image/svg+xml" }
        ".ico"  { "image/x-icon" }
        ".txt"  { "text/plain" }
        default { "application/octet-stream" }
    }
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    $urlPath = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = "index.html" }

    $fullPath = Join-Path $root $urlPath
    if (Test-Path $fullPath -PathType Container) {
        $fullPath = Join-Path $fullPath "index.html"
    }

    if (Test-Path $fullPath -PathType Leaf) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $res.ContentType = Get-ContentType $fullPath
            $res.ContentLength64 = $bytes.Length
            $res.StatusCode = 200
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $res.StatusCode = 500
        }
    } else {
        $res.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $res.OutputStream.Write($msg,0,$msg.Length)
    }
    $res.OutputStream.Close()
}
