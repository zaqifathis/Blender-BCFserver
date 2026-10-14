# Build the web UI into web/dist, then pack the extension zip.
param([string]$Blender = "blender")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path web/node_modules)) { npm --prefix web ci; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
npm --prefix web run build; if ($LASTEXITCODE) { exit $LASTEXITCODE }
& $Blender --command extension build --source-dir . --output-dir .; exit $LASTEXITCODE
