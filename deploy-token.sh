#!/bin/bash
# 🚀 AUTOMATED DEPLOYMENT SCRIPT FOR SYSTRO LIVE
# Builds the production package and deploys to Firebase Hosting automatically using a Token.

PROJECT_ID="nexwork-75325"

echo "=========================================================="
echo "📦 Step 1: Building Production Assets..."
echo "=========================================================="
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Error: Production build failed!"
  exit 1
fi
echo "✅ Build completed successfully. Generated directory: 'dist/'"

echo ""
echo "=========================================================="
echo "⚡ Step 2: Deploying to Firebase Hosting..."
echo "=========================================================="

# Check if FIREBASE_TOKEN environment variable is defined
if [ -z "$FIREBASE_TOKEN" ]; then
  echo "🔑 No environment token found."
  echo "💡 Tip: You can set the token as a variable: export FIREBASE_TOKEN=\"your_firebase_token\""
  echo "Please enter your Firebase Token to continue (or press Enter if you've already authenticated via CLI):"
  read -s -r INPUT_TOKEN
  
  if [ -n "$INPUT_TOKEN" ]; then
    export FIREBASE_TOKEN="$INPUT_TOKEN"
  fi
fi

if [ -n "$FIREBASE_TOKEN" ]; then
  echo "🚀 Running deployment with token..."
  npx firebase deploy --only hosting --project "$PROJECT_ID" --token "$FIREBASE_TOKEN"
else
  echo "🚀 Running standard deployment..."
  npx firebase deploy --only hosting --project "$PROJECT_ID"
fi

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================================="
  echo "🎉 Success! Systro Live has been deployed to Firebase Hosting!"
  echo "=========================================================="
else
  echo ""
  echo "❌ Error: Deployment failed. Please verify your token and network connection."
fi
