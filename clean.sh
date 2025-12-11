#!/bin/bash

echo "================================"
echo "    CLEAN RWA PROJECT"
echo "================================"
echo ""

echo "[1/3] Killing all Node.js processes..."
taskkill //F //IM node.exe 2>/dev/null && echo "    ✅ All Node.js processes killed" || echo "    ℹ️  No Node.js processes running"
echo ""

echo "[2/3] Cleaning backend cache..."
cd backend
rm -rf cache artifacts deployments/localhost.json node_modules/.cache
echo "    ✅ Backend cache cleaned"
echo ""

echo "[3/3] Cleaning frontend cache..."
cd ../frontend
rm -rf node_modules/.cache dist
echo "    ✅ Frontend cache cleaned"
cd ..
echo ""

echo "================================"
echo "    CLEAN COMPLETED!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Clear MetaMask activity data"
echo "2. Run: ./start-all.sh"
echo ""
