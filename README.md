# Propnica

A cloud-based SaaS platform for creating cinematic property showcase videos with map-based animations, designed specifically for UAE real estate professionals.

## Features

- **Map-Based Animation Editor**: Create stunning fly-over animations using Mapbox GL
- **Timeline Editor**: Precise keyframe-based animation control with drag-and-drop
- **Geocoding Search**: Find properties and locations with Mapbox Geocoding API
- **Drawing Tools**: Add zones, routes, markers, and annotations to maps
- **Video Rendering**: High-quality video export via Remotion Lambda
- **Project Management**: Organise and manage multiple video projects
- **VIP Client Programme**: Tiered benefits for high-value clients

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Framer Motion
- **State Management**: Zustand with Immer middleware
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Maps**: Mapbox GL JS
- **Video Rendering**: Remotion with AWS Lambda
- **Infrastructure**: Terraform, AWS (S3, Lambda, CloudFront)
- **CI/CD**: GitHub Actions, Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL database (or Supabase account)
- Mapbox account with API token
- AWS account (for video rendering)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/propnica.git
   cd propnica
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables in `.env.local`:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Database
   DATABASE_URL=your_database_url

   # Mapbox
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

   # AWS (for Remotion)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=me-south-1
   ```

5. Generate Prisma client and run migrations:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm test` | Run unit tests (watch mode) |
| `pnpm test:unit` | Run unit tests once |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm remotion:dev` | Open Remotion Studio |
| `pnpm remotion:bundle` | Bundle Remotion for deployment |
| `pnpm remotion:lambda:deploy` | Deploy to AWS Lambda |

## Project Structure

```
propnica/
├── .github/
│   └── workflows/         # CI/CD workflows
├── e2e/                   # Playwright E2E tests
├── infrastructure/
│   └── terraform/         # AWS infrastructure as code
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
├── remotion/              # Remotion video compositions
│   ├── components/        # Video components
│   └── compositions/      # Video compositions
├── scripts/               # Deployment and setup scripts
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── editor/       # Editor-specific components
│   │   ├── layout/       # Layout components
│   │   ├── preview/      # Preview components
│   │   ├── timeline/     # Timeline components
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utility functions
│   ├── server/           # tRPC server and routers
│   ├── stores/           # Zustand stores
│   ├── test/             # Test setup and utilities
│   └── types/            # TypeScript type definitions
└── supabase/             # Supabase migrations
```

## Infrastructure

The application uses AWS for video rendering infrastructure:

- **S3**: Asset storage and rendered video storage
- **Lambda**: Remotion video rendering
- **CloudFront**: CDN for asset delivery

To deploy infrastructure:

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **PR Checks**: Linting, type checking, tests, security scans
- **CI/CD Pipeline**: Build, test, and deploy to Vercel
- **Remotion Deployment**: Deploy video rendering to AWS Lambda

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `DATABASE_URL` | PostgreSQL connection string |
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organisation ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_ASSETS_BUCKET` | S3 bucket for assets |
| `S3_RENDERS_BUCKET` | S3 bucket for renders |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |
| `SNYK_TOKEN` | (Optional) Snyk security scanning |

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test changes
- `build:` Build system changes
- `ci:` CI configuration changes
- `chore:` Other changes

## Licence

Proprietary - All rights reserved.

## Support

For support, please contact support@propnica.com or visit our documentation.

---

Built with care for the UAE real estate market.
