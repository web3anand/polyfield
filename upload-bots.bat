@echo off
echo ====================================
echo Uploading Bots to Server
echo ====================================
echo.
echo Server: 207.246.126.234
echo User: linuxuser
echo.
echo IMPORTANT: You will be prompted for the password 3 times
echo Password: M6]c@47MFZfqG)vy
echo.
pause

echo.
echo Uploading scanner folder...
pscp -r -pw "M6]c@47MFZfqG)vy" dist\bots\scanner linuxuser@207.246.126.234:/home/linuxuser/polyfield-bots/

echo.
echo Uploading oracle folder...
pscp -r -pw "M6]c@47MFZfqG)vy" dist\bots\oracle linuxuser@207.246.126.234:/home/linuxuser/polyfield-bots/

echo.
echo Uploading setup script...
pscp -pw "M6]c@47MFZfqG)vy" dist\bots\server-setup.sh linuxuser@207.246.126.234:/home/linuxuser/polyfield-bots/

echo.
echo ====================================
echo Upload Complete!
echo ====================================
echo.
echo Next: SSH into server and run setup
echo   plink -ssh linuxuser@207.246.126.234
echo   Password: M6]c@47MFZfqG)vy
echo.
echo Then run:
echo   cd polyfield-bots
echo   chmod +x server-setup.sh
echo   ./server-setup.sh
echo.
pause
