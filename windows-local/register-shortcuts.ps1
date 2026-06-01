$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$launcherProject = Join-Path $scriptDir "Launcher\Note2Launcher.csproj"
$launcherExe = Join-Path $scriptDir "Launcher\bin\Release\net9.0-windows\Note2Launcher.exe"

dotnet build $launcherProject -c Release

if (-not (Test-Path $launcherExe)) {
    throw "Launcher executable was not found: $launcherExe"
}

$programsDir = [Environment]::GetFolderPath("Programs")
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutFileName = "Note2Launcher - $([char]0x30B7)$([char]0x30E7)$([char]0x30FC)$([char]0x30C8)$([char]0x30AB)$([char]0x30C3)$([char]0x30C8).lnk"
$shortcutNames = @("note2.lnk", "Note2Launcher.lnk", $shortcutFileName)

foreach ($dir in @($programsDir, $startupDir)) {
    foreach ($name in $shortcutNames) {
        $path = Join-Path $dir $name
        if (Test-Path $path) {
            Remove-Item -LiteralPath $path -Force
        }
    }
}

$shell = New-Object -ComObject WScript.Shell

function New-Shortcut {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $launcherExe
    $shortcut.WorkingDirectory = $repoRoot
    $shortcut.IconLocation = $launcherExe
    $shortcut.Description = "note2 local launcher"
    $shortcut.Save()
}

New-Shortcut (Join-Path $programsDir $shortcutFileName)
New-Shortcut (Join-Path $startupDir $shortcutFileName)

Write-Host "Created shortcut: $(Join-Path $programsDir $shortcutFileName)"
Write-Host "Created shortcut: $(Join-Path $startupDir $shortcutFileName)"
