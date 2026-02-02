#!/usr/bin/env bash
# 🎯 TRAVEX Implementation Verification Checklist
# Run this to verify all enhancements are in place

echo "🎨 TRAVEX UI/UX Enhancement Verification"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking Implementation...${NC}\n"

# Check if files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $1"
        return 0
    else
        echo "❌ $1 (NOT FOUND)"
        return 1
    fi
}

# Check if text exists in file
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $1 contains '$2'"
        return 0
    else
        echo "❌ $1 missing '$2'"
        return 1
    fi
}

echo -e "${BLUE}📁 File Structure${NC}"
check_file "src/components/AmbientBackground.jsx"
check_file "src/utils/devTools.js"
check_file "tailwind.config.js"
echo ""

echo -e "${BLUE}🎨 SearchForm Enhancements${NC}"
check_content "src/components/SearchForm.jsx" "import { motion }"
check_content "src/components/SearchForm.jsx" "backdrop-blur-xl"
check_content "src/components/SearchForm.jsx" "Sparkles"
check_content "src/components/SearchForm.jsx" "motion.button"
echo ""

echo -e "${BLUE}📊 ResultsPage Enhancements${NC}"
check_content "src/pages/ResultsPage.jsx" "AmbientBackground"
check_content "src/pages/ResultsPage.jsx" "sticky top-0"
check_content "src/pages/ResultsPage.jsx" "AI Confidence"
echo ""

echo -e "${BLUE}🎒 PackingList Enhancements${NC}"
check_content "src/components/PackingList.jsx" "expandedCategories"
check_content "src/components/PackingList.jsx" "AnimatePresence"
check_content "src/components/PackingList.jsx" "ChevronDown"
echo ""

echo -e "${BLUE}📅 ItineraryTimeline Enhancements${NC}"
check_content "src/components/ItineraryTimeline.jsx" "expandedDay"
check_content "src/components/ItineraryTimeline.jsx" "AnimatePresence"
check_content "src/components/ItineraryTimeline.jsx" "whileInView"
echo ""

echo -e "${BLUE}✈️ FlightCard Enhancements${NC}"
check_content "src/components/FlightCard.jsx" "motion.div"
check_content "src/components/FlightCard.jsx" "whileHover"
check_content "src/components/FlightCard.jsx" "animate={{ x:"
echo ""

echo -e "${BLUE}🔧 Dev Tools${NC}"
check_content "src/App.jsx" "initDevTools"
check_content "src/utils/devTools.js" "window.__TRAVEX_DEBUG__"
echo ""

echo -e "${BLUE}🎯 Animation Keyframes${NC}"
check_content "tailwind.config.js" "shimmer"
check_content "tailwind.config.js" "fadeInUp"
echo ""

echo -e "${GREEN}✨ Verification Complete!${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Start dev server: npm run dev"
echo "2. Open http://localhost:5174/"
echo "3. Test features on SearchPage and ResultsPage"
echo "4. Access dev tools: window.__TRAVEX_DEBUG__"
echo ""

echo -e "${BLUE}Documentation:${NC}"
echo "📖 README.md - Overview"
echo "📖 QUICKSTART.md - 2-minute guide"
echo "📖 IMPLEMENTATION_SUMMARY.md - Detailed breakdown"
echo "📖 VISUAL_REFERENCE.md - Code examples"
