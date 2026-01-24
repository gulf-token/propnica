# PropertyClips Ubuntu 24.04 LTS Installation Guide

This document provides step-by-step instructions for setting up the PropertyClips development environment on a clean Ubuntu 24.04 LTS installation.

## Prerequisites

- Ubuntu 24.04 LTS (Noble Numbat) freshly installed
- Sudo access
- Internet connection
- Minimum 8GB RAM (16GB recommended for Remotion rendering)
- Minimum 20GB free disk space

## Step 1: System Update

Update the package lists and upgrade existing packages:

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Essential Build Tools

```bash
sudo apt install -y build-essential curl git wget unzip
```

## Step 3: Install Node.js 20 LTS

PropertyClips requires Node.js 20 or higher. Install via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify the installation:

```bash
node --version  # Should output v20.x.x
npm --version   # Should output 10.x.x
```

## Step 4: Install pnpm (Optional but Recommended)

```bash
npm install -g pnpm
```

## Step 5: Install PostgreSQL

PropertyClips uses PostgreSQL via Supabase locally for development:

```bash
sudo apt install -y postgresql postgresql-contrib
```

Start and enable PostgreSQL:

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create a development database:

```bash
sudo -u postgres psql -c "CREATE USER propertyclips WITH PASSWORD 'propertyclips_dev';"
sudo -u postgres psql -c "CREATE DATABASE propertyclips_dev OWNER propertyclips;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE propertyclips_dev TO propertyclips;"
```

## Step 6: Install Redis (Optional - for caching)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Step 7: Install Chromium Dependencies for Remotion

Remotion requires Chromium for headless rendering. Install the required dependencies:

```bash
sudo apt install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1
```

## Step 8: Install FFmpeg

FFmpeg is required for video encoding:

```bash
sudo apt install -y ffmpeg
```

Verify:

```bash
ffmpeg -version
```

## Step 9: Clone the Repository

```bash
git clone https://github.com/your-org/propertyclips.git
cd propertyclips
```

## Step 10: Install Node Dependencies

```bash
npm install --legacy-peer-deps
```

Note: The `--legacy-peer-deps` flag is required due to a peer dependency conflict between @tanstack/react-query v5 and @trpc/next which expects v4.

## Step 11: Configure Environment Variables

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the following variables:

```env
# Database
DATABASE_URL="postgresql://propertyclips:propertyclips_dev@localhost:5432/propertyclips_dev"

# Supabase (get from your Supabase project)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-token"

# AWS (for Remotion Lambda rendering)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="eu-west-1"

# Remotion
REMOTION_SERVE_URL="http://localhost:3001"
```

## Step 12: Set Up the Database

Generate Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

## Step 13: Start Development Server

```bash
npm run dev
```

The application should now be available at http://localhost:3000

## Step 14: Start Remotion Studio (Optional)

In a separate terminal, start Remotion Studio for video preview:

```bash
npm run remotion:dev
```

Remotion Studio will be available at http://localhost:3001

## Troubleshooting

### Node.js Version Issues

If you encounter issues with Node.js version:

```bash
# Install nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
```

### PostgreSQL Connection Issues

Check PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

Check connection:

```bash
psql -h localhost -U propertyclips -d propertyclips_dev
```

### Remotion Rendering Issues

If Remotion fails to render, ensure all Chromium dependencies are installed:

```bash
npx remotion browser ensure
```

### Permission Denied Errors

If you encounter permission errors with npm global packages:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Production Deployment

For production deployment on Ubuntu 24.04:

1. Install nginx as a reverse proxy
2. Configure SSL with Let's Encrypt
3. Set up PM2 for process management
4. Configure systemd service for auto-start

See the main documentation for detailed production deployment instructions.

## Security Considerations

- Keep Ubuntu updated: `sudo apt update && sudo apt upgrade -y`
- Configure UFW firewall: `sudo ufw enable && sudo ufw allow ssh && sudo ufw allow 80 && sudo ufw allow 443`
- Use strong database passwords in production
- Never commit `.env` files to version control
- Rotate AWS credentials regularly

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Remotion Documentation](https://www.remotion.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js)
