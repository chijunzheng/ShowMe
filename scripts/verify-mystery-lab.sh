#!/bin/bash

# Mystery Lab Integration Verification Script
# This script verifies that all Mystery Lab components are properly integrated

set -e  # Exit on error

echo "🔍 Mystery Lab Integration Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo ""

# 1. Check backend files exist
echo "1️⃣  Checking backend files..."
if [ -f "backend/src/routes/learn.js" ]; then
    echo -e "${GREEN}✅ backend/src/routes/learn.js exists${NC}"
else
    echo -e "${RED}❌ backend/src/routes/learn.js missing${NC}"
    exit 1
fi

if [ -f "backend/src/services/mysteryGenerator.js" ]; then
    echo -e "${GREEN}✅ backend/src/services/mysteryGenerator.js exists${NC}"
else
    echo -e "${RED}❌ backend/src/services/mysteryGenerator.js missing${NC}"
    exit 1
fi
echo ""

# 2. Check frontend components exist
echo "2️⃣  Checking frontend components..."
COMPONENTS=(
    "frontend/src/components/LearnModes/index.js"
    "frontend/src/components/LearnModes/ModeSelector.jsx"
    "frontend/src/components/LearnModes/Mystery/MysteryLab.jsx"
    "frontend/src/components/LearnModes/Mystery/MysteryScene.jsx"
    "frontend/src/components/LearnModes/Mystery/CluePanel.jsx"
    "frontend/src/components/LearnModes/Mystery/TheorySolver.jsx"
    "frontend/src/components/LearnModes/Mystery/DetectiveReward.jsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✅ $component${NC}"
    else
        echo -e "${RED}❌ $component missing${NC}"
        exit 1
    fi
done
echo ""

# 3. Check backend modules load
echo "3️⃣  Checking backend module imports..."
cd backend
if node -e "import('./src/routes/learn.js').then(() => process.exit(0)).catch(() => process.exit(1))"; then
    echo -e "${GREEN}✅ Learn routes module loads successfully${NC}"
else
    echo -e "${RED}❌ Learn routes module failed to load${NC}"
    exit 1
fi

if node -e "import('./src/services/mysteryGenerator.js').then(() => process.exit(0)).catch(() => process.exit(1))"; then
    echo -e "${GREEN}✅ Mystery generator module loads successfully${NC}"
else
    echo -e "${RED}❌ Mystery generator module failed to load${NC}"
    exit 1
fi
cd ..
echo ""

# 4. Check learn routes are registered in backend
echo "4️⃣  Checking learn routes registration..."
if grep -q "app.use('/api/learn', learnRoutes)" backend/src/index.js; then
    echo -e "${GREEN}✅ Learn routes are registered in backend/src/index.js${NC}"
else
    echo -e "${RED}❌ Learn routes not registered in backend/src/index.js${NC}"
    exit 1
fi
echo ""

# 5. Check MysteryLab is imported in App.jsx
echo "5️⃣  Checking App.jsx imports..."
if grep -q "import.*MysteryLab.*from.*LearnModes" frontend/src/App.jsx; then
    echo -e "${GREEN}✅ MysteryLab imported in App.jsx${NC}"
else
    echo -e "${RED}❌ MysteryLab not imported in App.jsx${NC}"
    exit 1
fi

if grep -q "selectedLearningMode === 'mystery'" frontend/src/App.jsx; then
    echo -e "${GREEN}✅ Mystery mode routing implemented in App.jsx${NC}"
else
    echo -e "${RED}❌ Mystery mode routing missing in App.jsx${NC}"
    exit 1
fi
echo ""

# 6. Build frontend
echo "6️⃣  Building frontend..."
cd frontend
if npm run build > /tmp/mystery-lab-build.log 2>&1; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    echo "See /tmp/mystery-lab-build.log for details"
    exit 1
fi
cd ..
echo ""

# 7. Check for common issues
echo "7️⃣  Checking for common issues..."

# Check for classifyHandoffIfNeeded references
if grep -r "classifyHandoffIfNeeded" frontend/src --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found references to classifyHandoffIfNeeded (should be removed)${NC}"
else
    echo -e "${GREEN}✅ No stale classifyHandoffIfNeeded references found${NC}"
fi

# Check for console.log in Mystery Lab components
if grep -r "console\.log" frontend/src/components/LearnModes/Mystery/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found console.log statements in Mystery components${NC}"
else
    echo -e "${GREEN}✅ No console.log statements in Mystery components${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✅ All verification checks passed!${NC}"
echo ""
echo "Mystery Lab is fully integrated and ready to use."
echo ""
echo "Next steps:"
echo "  1. Start backend: cd backend && npm run dev"
echo "  2. Start frontend: cd frontend && npm run dev"
echo "  3. Test manually using the checklist in test-mystery-lab.md"
echo ""
