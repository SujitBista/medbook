#!/bin/bash

# Deployment script for MedBook
# This script helps with common deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main menu
show_menu() {
    echo ""
    echo "MedBook Deployment Script"
    echo "========================"
    echo "1. Run database migrations"
    echo "2. Seed database (development only)"
    echo "3. Build all packages"
    echo "4. Run tests"
    echo "5. Check environment variables"
    echo "6. Generate secrets"
    echo "7. Exit"
    echo ""
    read -p "Select an option: " choice
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        read -p "Enter DATABASE_URL: " DATABASE_URL
        export DATABASE_URL
    fi
    
    cd packages/db
    pnpm db:migrate:deploy
    cd ../..
    
    print_success "Migrations completed successfully"
}

# Seed database
seed_database() {
    print_warning "Seeding database (development only)"
    read -p "Are you sure you want to seed the database? (y/N): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "Seeding cancelled"
        return
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        read -p "Enter DATABASE_URL: " DATABASE_URL
        export DATABASE_URL
    fi
    
    cd packages/db
    pnpm db:seed
    cd ../..
    
    print_success "Database seeded successfully"
}

# Build all packages
build_all() {
    print_info "Building all packages..."
    pnpm build
    print_success "Build completed successfully"
}

# Run tests
run_tests() {
    print_info "Running tests..."
    pnpm test
    print_success "Tests completed successfully"
}

# Check environment variables
check_env() {
    print_info "Checking environment variables..."
    echo ""
    
    # Frontend variables
    echo "Frontend (Web App):"
    if [ -n "$NEXTAUTH_URL" ]; then
        print_success "NEXTAUTH_URL is set"
    else
        print_error "NEXTAUTH_URL is not set"
    fi
    
    if [ -n "$NEXTAUTH_SECRET" ]; then
        print_success "NEXTAUTH_SECRET is set"
    else
        print_error "NEXTAUTH_SECRET is not set"
    fi
    
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        print_success "NEXT_PUBLIC_API_URL is set: $NEXT_PUBLIC_API_URL"
    else
        print_error "NEXT_PUBLIC_API_URL is not set"
    fi
    
    echo ""
    echo "Backend (API):"
    if [ -n "$DATABASE_URL" ]; then
        print_success "DATABASE_URL is set"
    else
        print_error "DATABASE_URL is not set"
    fi
    
    if [ -n "$JWT_SECRET" ]; then
        print_success "JWT_SECRET is set"
    else
        print_error "JWT_SECRET is not set"
    fi
    
    if [ -n "$CORS_ORIGIN" ]; then
        print_success "CORS_ORIGIN is set: $CORS_ORIGIN"
    else
        print_warning "CORS_ORIGIN is not set (using defaults)"
    fi
    
    if [ -n "$RESEND_API_KEY" ]; then
        print_success "RESEND_API_KEY is set"
    else
        print_warning "RESEND_API_KEY is not set (emails will be logged)"
    fi
}

# Generate secrets
generate_secrets() {
    print_info "Generating secrets..."
    echo ""
    
    if command_exists openssl; then
        echo "NextAuth Secret:"
        openssl rand -base64 32
        echo ""
        echo "JWT Secret:"
        openssl rand -base64 32
        echo ""
        print_success "Secrets generated"
    else
        print_error "openssl is not installed. Please install it to generate secrets."
    fi
}

# Main loop
main() {
    while true; do
        show_menu
        case $choice in
            1)
                run_migrations
                ;;
            2)
                seed_database
                ;;
            3)
                build_all
                ;;
            4)
                run_tests
                ;;
            5)
                check_env
                ;;
            6)
                generate_secrets
                ;;
            7)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main

