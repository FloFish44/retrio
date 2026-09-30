@echo off
cd /d "%~dp0"
echo Compilation native de Installateur_Retrio.exe...
if not exist dist mkdir dist
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /optimize+ /platform:anycpu /win32icon:retrio_icon.ico /out:dist\Installateur_Retrio.exe /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll InstallateurRetrio.cs
if errorlevel 1 exit /b 1
echo Termine. Le fichier se trouve dans dist\Installateur_Retrio.exe
