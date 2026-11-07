@echo off
rem Builds the Windows x64 whisper.cpp command-line component the voice manifest names, as one
rem statically linked executable: no DLLs beside it, the C runtime linked in, so the single-file
rem manifest entry holds. Run from a Developer Command Prompt or any shell: it finds the Visual
rem Studio 2022 Build Tools, their CMake and Ninja, on its own.
rem
rem   scripts\build_whisper_cli_windows.cmd [version]      default: v1.8.3 (the manifest's componentVersion)
rem
rem Output: build\whisper-cli-<version>-windows-x64.exe and its sha256, ready for the manifest:
rem   {"platform":"windows","architecture":"x64","fileName":"whisper-cli-<version>-windows-x64.exe",
rem    "url":"https://updates.mirrormind.sh/mirror-desktop/voice/<fileName>","sha256":"…","sizeBytes":…}
rem
rem Flags: AVX2 on, native tuning off (the binary runs on any x64 machine of the last decade),
rem OpenMP off (no vcomp DLL), SDL off (the stream examples are not built), tests off.
setlocal
set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.8.3
set VS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools
if not exist "%VS%\VC\Auxiliary\Build\vcvars64.bat" set VS=C:\Program Files\Microsoft Visual Studio\2022\Community
call "%VS%\VC\Auxiliary\Build\vcvars64.bat" >nul || exit /b 1
set CMAKE=%VS%\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe
set NINJA=%VS%\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja\ninja.exe
set WORK=%~dp0..\build\whisper-cpp
if not exist "%WORK%\.git" git clone --depth 1 --branch %VERSION% https://github.com/ggml-org/whisper.cpp.git "%WORK%" || exit /b 1
"%CMAKE%" -S "%WORK%" -B "%WORK%\build-static" -G Ninja -DCMAKE_MAKE_PROGRAM="%NINJA%" -DCMAKE_BUILD_TYPE=Release ^
  -DBUILD_SHARED_LIBS=OFF -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded ^
  -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON -DWHISPER_SDL2=OFF ^
  -DGGML_NATIVE=OFF -DGGML_AVX2=ON -DGGML_OPENMP=OFF || exit /b 1
"%CMAKE%" --build "%WORK%\build-static" --target whisper-cli --config Release || exit /b 1
set OUT=%~dp0..\build\whisper-cli-%VERSION%-windows-x64.exe
copy /y "%WORK%\build-static\bin\whisper-cli.exe" "%OUT%" >nul || exit /b 1
echo.
echo built %OUT%
certutil -hashfile "%OUT%" SHA256 | findstr /v "hash"
for %%A in ("%OUT%") do echo sizeBytes %%~zA
endlocal
