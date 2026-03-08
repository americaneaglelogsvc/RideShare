#!/bin/bash

# Multi-Tenant Architecture Testing Script
# Tests routing, asset loading, and tenant detection

echo "🚀 Multi-Tenant Architecture Testing"
echo "=================================="

BASE_URL="https://rideshare-static-server-staging-73967865619.us-central1.run.app"
TEST_RESULTS=()
FAILED_TESTS=()

# Test function
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="$3"
    
    echo "Testing: $description"
    echo "URL: $url"
    
    # Make request and capture status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo "✅ PASS - Status: $status"
        TEST_RESULTS+=("PASS: $description")
    else
        echo "❌ FAIL - Expected: $expected_status, Got: $status"
        TEST_RESULTS+=("FAIL: $description")
        FAILED_TESTS+=("$description")
    fi
    echo "---"
}

# Test asset loading
test_asset() {
    local url="$1"
    local description="$2"
    
    echo "Testing Asset: $description"
    echo "URL: $url"
    
    # Check if asset loads (200 OK)
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "200" ]; then
        echo "✅ PASS - Asset loads correctly"
        TEST_RESULTS+=("PASS: $description")
    else
        echo "❌ FAIL - Asset failed to load (Status: $status)"
        TEST_RESULTS+=("FAIL: $description")
        FAILED_TESTS+=("$description")
    fi
    echo "---"
}

echo "📍 Testing UWD Platform Routes"
echo "=============================="

# Test UWD homepage
test_endpoint "$BASE_URL/" "UWD Homepage" 200

# Test UWD pages
test_endpoint "$BASE_URL/platform.html" "UWD Platform Page" 200
test_endpoint "$BASE_URL/for-operators.html" "UWD For Operators" 200
test_endpoint "$BASE_URL/pricing.html" "UWD Pricing" 200
test_endpoint "$BASE_URL/tenant-onboarding.html" "UWD Tenant Onboarding" 200

# Test UWD assets
test_asset "$BASE_URL/styles.css" "UWD Stylesheet"
test_asset "$BASE_URL/app.js" "UWD JavaScript"

echo ""
echo "🏢 Testing Tenant Routes"
echo "========================"

# Test GoldRavenia homepage
test_endpoint "$BASE_URL/tenant/goldravenia/" "GoldRavenia Homepage" 200

# Test GoldRavenia pages
test_endpoint "$BASE_URL/tenant/goldravenia/services.html" "GoldRavenia Services" 200
test_endpoint "$BASE_URL/tenant/goldravenia/about.html" "GoldRavenia About" 200
test_endpoint "$BASE_URL/tenant/goldravenia/contact.html" "GoldRavenia Contact" 200

# Test tenant assets
test_asset "$BASE_URL/assets/tenants/goldravenia-logo-winner.png" "GoldRavenia Logo"
test_asset "$BASE_URL/tenant/goldravenia/../../styles.css" "Tenant Stylesheet Access"

echo ""
echo "🔍 Testing Edge Cases"
echo "===================="

# Test non-existent tenant
test_endpoint "$BASE_URL/tenant/nonexistent/" "Non-existent Tenant" 404

# Test invalid tenant page
test_endpoint "$BASE_URL/tenant/goldravenia/nonexistent.html" "Invalid Tenant Page" 404

# Test health endpoint
test_endpoint "$BASE_URL/health" "Health Check" 200

echo ""
echo "📊 Test Results Summary"
echo "======================="

TOTAL_TESTS=${#TEST_RESULTS[@]}
FAILED_COUNT=${#FAILED_TESTS[@]}
PASSED_COUNT=$((TOTAL_TESTS - FAILED_COUNT))

echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_COUNT"
echo "Failed: $FAILED_COUNT"

if [ $FAILED_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED! Multi-tenant architecture is working correctly."
    exit 0
else
    echo ""
    echo "❌ FAILED TESTS:"
    for failed in "${FAILED_TESTS[@]}"; do
        echo "  - $failed"
    done
    echo ""
    echo "⚠️  Some tests failed. Please review the issues above."
    exit 1
fi
