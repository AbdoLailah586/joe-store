@echo off
chcp 65001 > nul
title متجر جو ستور - JOE Store
color 0E

echo ===================================================
echo        🚀 تشغيل متجر جو ستور (JOE Store)
echo ===================================================
echo.
echo  📍 المتجر: هواتف وإكسسوارات أصلية (المنصورة)
echo  ⚡ التقنيات: React + Vite + Tailwind + WhatsApp Pro
echo.
echo  جاري تشغيل خادم التطوير...
echo.

start http://localhost:5174
npm run dev -- --port 5174 --host

pause
