@echo off
setlocal
set "PATH=C:\Users\piyush\AppData\Local\Programs\MinGit\cmd;C:\Users\piyush\AppData\Local\Programs\MinGit\ucrt64\bin;%PATH%"

echo ==============================================
echo Pushing BRAWLVERSE branch v1 to GitHub...
echo ==============================================
echo.

git push -u origin v1

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================
    echo SUCCESS! Branch v1 has been pushed to GitHub.
    echo ==============================================
) else (
    echo.
    echo ==============================================
    echo Push did not complete. If prompted above,
    echo sign in with your GitHub account / token.
    echo ==============================================
)
echo.
pause
