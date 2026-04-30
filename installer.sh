#!/bin/bash

# Target location for custom user commands
INSTALL_DIR="$HOME/.local/bin"
SCRIPT_PATH="$INSTALL_DIR/kassist"

echo "Installing 'kassist' command..."

# 1. Create the target directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# 2. Write the actual application script to the kassist file
# We use 'EOF' in single quotes so variables like $HOME don't evaluate 
# right now, but instead wait until the user actually runs 'kassist'.
cat << 'EOF' > "$SCRIPT_PATH"
#!/bin/bash

# Configuration
REPO_URL="https://github.com/Kartik20122002/kap_assist.git"
APP_DIR="$HOME/kap_assist"
BRANCH="master"
APP_URL="http://localhost:4242"

echo "=== Kap Assist Local Setup ==="

# 1. Check if node, npm, and git are installed
for cmd in node npm git; do
  if ! command -v $cmd &> /dev/null; then
    echo "Error: '$cmd' is not installed. Please install it first."
    exit 1
  fi
done

echo "Dependencies (node, npm, git) are installed."

NEEDS_BUILD=false

# 2 & 3. Check if repo is cloned, clone if not
if [ ! -d "$APP_DIR" ]; then
  echo "Webapp not found. Installing to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  NEEDS_BUILD=true
else
  # 4. If cloned, check for updates on the master branch
  echo "Checking for updates..."
  cd "$APP_DIR" || exit 1
  git fetch origin "$BRANCH"
  
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/"$BRANCH")
  
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Updates found! Updating the app..."
    git pull origin "$BRANCH"
    NEEDS_BUILD=true
  else
    echo "Webapp is already up to date."
  fi
fi

cd "$APP_DIR" || exit 1

# 5. Check if .next folder exists (if not, we must build even if no git updates)
if [ ! -d ".next" ]; then
  echo "Webapp build is missing. A build is required."
  NEEDS_BUILD=true
fi

# 5 (cont). Install dependencies and build if necessary
if [ "$NEEDS_BUILD" = true ]; then
  echo "Installing required dependencies..."
  npm install
  
  echo "Building the webapp..."
  npm run build
  if [ $? -ne 0 ]; then
    echo "Error: Build failed - No worrys, try again later"
    exit 1
  fi  
else
  echo "No updates or missing files. Skipping build."
fi

# 6 & 7. Open browser and start the app
echo "Starting the application..."

# Run a background process that waits 3 seconds then tries to open the browser
(
  sleep 3
  if command -v xdg-open &> /dev/null; then
    xdg-open "$APP_URL"
  elif command -v python3 &> /dev/null; then
    python3 -m webbrowser "$APP_URL"
  else
    echo "=========================================================="
    echo " Could not auto-open browser."
    echo " Please manually open: $APP_URL"
    echo "=========================================================="
  fi
) &

# Start the server (this runs in the foreground so the user sees logs)
npm start
EOF

# 3. Set the executable permission so it can run
chmod +x "$SCRIPT_PATH"

# 4. Make sure the computer knows where to look for the 'kassist' command
BASHRC="$HOME/.bashrc"
ZSHRC="$HOME/.zshrc"
PATH_EXPORT='export PATH="$HOME/.local/bin:$PATH"'

add_to_path() {
  local rc_file=$1
  if [ -f "$rc_file" ]; then
    # If the path export isn't already in the file, add it
    if ! grep -q "$PATH_EXPORT" "$rc_file"; then
      echo "" >> "$rc_file"
      echo "# Added by kassist installer" >> "$rc_file"
      echo "$PATH_EXPORT" >> "$rc_file"
      echo "Updated $rc_file to include ~/.local/bin in PATH."
    fi
  fi
}

add_to_path "$BASHRC"
add_to_path "$ZSHRC"

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo "To activate the command right now, run this:"
echo "  source ~/.bashrc"
echo ""
echo "After that, you can simply type:"
echo "  kassist"
echo "anywhere in your terminal to start the app!"
