#!/bin/bash

# Function to print header
print_header() {
    clear
    echo ""
    echo "========================================"
    echo "    RWA LENDING PLATFORM"
    echo "    QUICK START GUIDE (Bash)"
    echo "========================================"
    echo ""
}

# Function to kill node processes
kill_node() {
    echo "Step 1: Killing all Node.js processes..."
    # Try pkill, if not available try taskkill (Windows)
    if command -v taskkill &> /dev/null; then
        taskkill //F //IM node.exe //T 2>/dev/null
    else
        pkill -f node 2>/dev/null
    fi
    echo "Done!"
    echo ""
}

# Function to clean backend
clean_backend() {
    echo "Step 2: Cleaning backend cache..."
    cd backend
    rm -rf cache artifacts deployments/localhost.json node_modules/.cache
    cd ..
    echo "Done!"
    echo ""
}

# Function to clean frontend
clean_frontend() {
    echo "Step 3: Cleaning frontend cache..."
    cd frontend
    rm -rf node_modules/.cache dist
    cd ..
    echo "Done!"
    echo ""
}

# Main Menu Loop
while true; do
    print_header
    echo "Choose an option:"
    echo ""
    echo "[1] FULL RESET (Clean cache and restart)"
    echo "[2] QUICK START (Normal startup)"
    echo "[3] Exit"
    echo ""
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            echo ""
            echo "========================================"
            echo "    FULL RESET"
            echo "========================================"
            echo ""
            kill_node
            clean_backend
            clean_frontend
            echo "========================================"
            echo "    RESET COMPLETE!"
            echo "========================================"
            echo ""
            echo "IMPORTANT: Clear MetaMask cache now!"
            echo "1. Open MetaMask"
            echo "2. Settings -> Advanced"
            echo "3. Click 'Clear activity tab data'"
            echo ""
            read -p "Press Enter to continue to Quick Start..."
            # Continue to Quick Start logic (break this case, not the loop, but we want to go to next loop iteration or fall through? 
            # Let's just loop back to menu so user can choose Quick Start)
            ;;
        2)
            # Quick Start Sub-menu
            while true; do
                print_header
                echo "========================================"
                echo "    STARTING PROJECT"
                echo "========================================"
                echo ""
                echo "You need to open 3 separate terminals."
                echo ""
                echo "Would you like to:"
                echo "[1] Open Terminal 1 (Hardhat Node)"
                echo "[2] Open Terminal 2 (Deploy & Seed)"
                echo "[3] Open Terminal 3 (Frontend)"
                echo "[4] Open all terminals"
                echo "[5] Back to main menu"
                echo ""
                read -p "Enter your choice (1-5): " term_choice

                case $term_choice in
                    1)
                        echo "Opening Terminal 1..."
                        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
                            cmd.exe /c start cmd /k "cd backend && echo Starting Hardhat Node... && npm run node"
                        else
                            echo "Please run manually: cd backend && npm run node"
                        fi
                        ;;
                    2)
                        echo "Opening Terminal 2..."
                        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
                            cmd.exe /c start cmd /k "cd backend && echo Waiting 5 seconds... && timeout /t 5 && npm run deploy && npm run seed && pause"
                        else
                            echo "Please run manually: cd backend && npm run deploy && npm run seed"
                        fi
                        ;;
                    3)
                        echo "Opening Terminal 3..."
                        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
                            cmd.exe /c start cmd /k "cd frontend && echo Starting Frontend... && npm run dev"
                        else
                            echo "Please run manually: cd frontend && npm run dev"
                        fi
                        ;;
                    4)
                        echo "Opening all terminals..."
                        if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
                            cmd.exe /c start cmd /k "cd backend && echo [TERMINAL 1] Starting Hardhat Node... && npm run node"
                            sleep 2
                            cmd.exe /c start cmd /k "cd backend && echo [TERMINAL 2] Waiting for node... && timeout /t 8 && npm run deploy && npm run seed && pause"
                            sleep 2
                            cmd.exe /c start cmd /k "cd frontend && echo [TERMINAL 3] Starting Frontend... && timeout /t 12 && npm run dev"
                            
                            echo ""
                            echo "========================================"
                            echo "    NEXT STEPS"
                            echo "========================================"
                            echo "1. Wait for all terminals to finish loading"
                            echo "2. Open browser: http://localhost:3000"
                            echo "3. Configure MetaMask (see START.md)"
                            echo "4. Import test account"
                            echo ""
                            read -p "Press Enter to continue..."
                        else
                            echo "Automatic terminal opening is optimized for Windows Git Bash."
                            echo "Please open terminals manually."
                            read -p "Press Enter to continue..."
                        fi
                        ;;
                    5)
                        break # Break inner loop, go back to main menu
                        ;;
                    *)
                        echo "Invalid option"
                        sleep 1
                        ;;
                esac
            done
            ;;
        3)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option"
            sleep 1
            ;;
    esac
done
