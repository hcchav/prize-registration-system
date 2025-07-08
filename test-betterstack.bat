@echo off
setlocal

:: Get current date and time in ISO format (close enough to UTC for testing)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set year=%datetime:~0,4%
set month=%datetime:~4,2%
set day=%datetime:~6,2%
set hour=%datetime:~8,2%
set minute=%datetime:~10,2%
set second=%datetime:~12,2%

set isotime=%year%-%month%-%day% %hour%:%minute%:%second% UTC

:: Run the curl command with the formatted date
curl -X POST ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer x6r5hPctDgpHHSpE7YihaDfr" ^
  -d "{\"dt\":\"%isotime%\",\"message\":\"Hello from Better Stack!\"}" ^
  -k ^
  https://s1373787.eu-nbg-2.betterstackdata.com

endlocal
