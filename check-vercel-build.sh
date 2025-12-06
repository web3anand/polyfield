#!/bin/bash
# Script to check for common Vercel build issues

echo "🔍 Checking for Vercel build issues..."
echo ""

# Check if api/package.json exists and has dependencies
echo "1. Checking api/package.json..."
if [ -f "api/package.json" ]; then
  echo "   ✅ api/package.json exists"
  if grep -q "@supabase/supabase-js" api/package.json; then
    echo "   ✅ @supabase/supabase-js dependency found"
  else
    echo "   ❌ @supabase/supabase-js dependency MISSING"
  fi
  if grep -q "axios" api/package.json; then
    echo "   ✅ axios dependency found"
  else
    echo "   ❌ axios dependency MISSING"
  fi
else
  echo "   ❌ api/package.json NOT FOUND"
fi

echo ""
echo "2. Checking vercel.json..."
if [ -f "vercel.json" ]; then
  echo "   ✅ vercel.json exists"
  if grep -q "crons" vercel.json; then
    echo "   ✅ Cron jobs configured"
    # Check cron schedule
    if grep -q "\"schedule\"" vercel.json; then
      echo "   ✅ Cron schedule found"
    fi
  fi
else
  echo "   ❌ vercel.json NOT FOUND"
fi

echo ""
echo "3. Checking API files..."
if [ -f "api/leaderboard/sync.ts" ]; then
  echo "   ✅ api/leaderboard/sync.ts exists"
else
  echo "   ❌ api/leaderboard/sync.ts NOT FOUND"
fi

if [ -f "api/leaderboard/users.ts" ]; then
  echo "   ✅ api/leaderboard/users.ts exists"
else
  echo "   ❌ api/leaderboard/users.ts NOT FOUND"
fi

echo ""
echo "4. Checking TypeScript compilation..."
if command -v tsc &> /dev/null; then
  echo "   Running TypeScript check..."
  tsc --noEmit --project tsconfig.json 2>&1 | head -20
else
  echo "   ⚠️ TypeScript not installed globally"
fi

echo ""
echo "✅ Check complete!"
echo ""
echo "To see Vercel build logs:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click on your project"
echo "3. Go to 'Deployments' tab"
echo "4. Click on the failed deployment"
echo "5. Click 'Build Logs' to see the error"

