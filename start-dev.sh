#!/bin/bash
# Start both Vite dev server and email server in parallel (macOS/Linux)
# Opens 2 new terminal windows

echo "Starting AgroColetivo Development Environment..."
echo ""
echo "📱 Terminal 1: Vite Dev Server (http://localhost:5173)"
echo "📧 Terminal 2: Email Server (http://localhost:3001)"
echo ""

# Check if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS: Use open with new Terminal windows
  osascript <<EOF
    tell application "Terminal"
      do script "cd '$PWD' && npm run dev"
      do script "cd '$PWD' && npm run email-server"
    end tell
EOF
else
  # Linux: Use gnome-terminal, xterm, or konsole
  if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd '$PWD' && npm run dev; exec bash"
    sleep 2
    gnome-terminal -- bash -c "cd '$PWD' && npm run email-server; exec bash"
  elif command -v xterm &> /dev/null; then
    xterm -e "cd '$PWD' && npm run dev" &
    sleep 2
    xterm -e "cd '$PWD' && npm run email-server" &
  else
    echo "❌ No terminal emulator found. Install gnome-terminal or xterm"
    exit 1
  fi
fi

echo ""
echo "✅ Both servers started!"
echo "   - Frontend: http://localhost:5173"
echo "   - Email API: http://localhost:3001"
echo ""
echo "Close either terminal to stop that server."
