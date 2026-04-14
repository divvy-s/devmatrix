<p align="center">
  <img src="https://img.shields.io/badge/CastKit-Web3_Social-00FF88?style=for-the-badge&logo=ethereum&logoColor=white" alt="CastKit" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Fastify-5-202020?style=for-the-badge&logo=fastify" alt="Fastify 5" />
  <img src="https://img.shields.io/badge/LightGBM-ML-3776AB?style=for-the-badge&logo=python" alt="LightGBM" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🚀 DevMatrix — CastKit</h1>

<p align="center">
  <strong>The Web3 Social Developer Showcase Platform</strong><br/>
  Turn social posts into executable mini-apps powered by Web3 payments, AI-ranked feeds, and a modular SDK.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-ml-recommendation-engine">ML Engine</a> •
  <a href="#-web3-integration">Web3</a> •
  <a href="#-frontend">Frontend</a> •
  <a href="#-backend">Backend</a> •
  <a href="#-castkit-sdk">SDK</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [ML Recommendation Engine](#-ml-recommendation-engine)
- [Web3 Integration](#-web3-integration)
- [Frontend](#-frontend)
- [Backend](#-backend)
- [CastKit SDK](#-castkit-sdk)
- [Database Schema](#-database-schema)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Overview

**DevMatrix (CastKit)** is a full-stack Web3 social platform that enables developers to build, deploy, and monetize **mini-apps** — interactive, sandboxed components embedded directly inside social feeds. Users can mint NFTs, tip creators, vote on DAOs, and interact with smart contracts without ever leaving the timeline.

### Key Features

| Feature | Description |
|---|---|
| 🎮 **Mini-App Engine** | Sandboxed iframe execution with secure `postMessage` gateways |
| 🔗 **Web3 Native** | Wallet-first architecture with viem/wagmi integration |
| 🤖 **AI Recommendations** | LightGBM-powered feed ranking and app recommendations |
| 📦 **CastKit SDK** | Plug-and-play TypeScript SDK with CLI verification tooling |
| 🛡️ **Admin & Moderation** | Role-based access control, content moderation, audit logging |
| 🔔 **Real-time Notifications** | Event-driven notification system with configurable preferences |
| 📊 **Analytics** | Background workers for engagement tracking and webhook delivery |

---

## 🏗 Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        FE["Next.js 16 Frontend<br/>React 19 · TailwindCSS v4"]
        WALLET["Web3 Wallet<br/>MetaMask · WalletConnect"]
    end

    subgraph API["⚙️ API Layer"]
        FASTIFY["Fastify 5 API Server<br/>Zod Validation · Rate Limiting"]
        AUTH["Auth Module<br/>JWT · Google OAuth · Wallet Auth"]
        ROUTES["REST API v1<br/>/auth /posts /feed /users /apps"]
    end

    subgraph ML["🤖 ML Layer"]
        LGBM["LightGBM Model<br/>Recommendation Engine"]
        FEAT["Feature Engineering<br/>User Vectors · Content Signals"]
        RANK["Feed Ranker<br/>Personalized Scoring"]
    end

    subgraph Data["💾 Data Layer"]
        PG["PostgreSQL 16<br/>Drizzle ORM · 30+ Tables"]
        REDIS["Redis 7<br/>Caching · Session Store"]
        S3["S3-Compatible Storage<br/>Media · Avatars"]
    end

    subgraph Workers["🔄 Background Workers"]
        OUTBOX["Outbox Worker<br/>Event Processing"]
        ANALYTICS["Analytics Worker<br/>Engagement Metrics"]
        MEDIA["Media Worker<br/>Image Processing · Sharp"]
        WEBHOOK["Webhook Worker<br/>Delivery & Retry"]
    end

    subgraph Web3["🔗 Web3 Layer"]
        CONTRACTS["Smart Contracts<br/>Tipping · Payments"]
        RPC["RPC Provider<br/>Ethereum · Base"]
        VERIFY["On-chain Verification<br/>Signature Validation"]
    end

    FE --> FASTIFY
    WALLET --> FE
    FASTIFY --> AUTH
    FASTIFY --> ROUTES
    ROUTES --> ML
    ROUTES --> PG
    ROUTES --> REDIS
    ROUTES --> S3
    FASTIFY --> Workers
    OUTBOX --> PG
    ANALYTICS --> REDIS
    MEDIA --> S3
    WEBHOOK --> PG
    FE --> Web3
    FASTIFY --> VERIFY
    ML --> PG
    ML --> REDIS

    style Client fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
    style API fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style ML fill:#0d1117,stroke:#8B5CF6,stroke-width:2px,color:#ededed
    style Data fill:#0d1117,stroke:#F59E0B,stroke-width:2px,color:#ededed
    style Workers fill:#0d1117,stroke:#EF4444,stroke-width:2px,color:#ededed
    style Web3 fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
```

### Monorepo Structure

```
devmatrix/
├── frontend/                   # Next.js 16 web application
│   ├── app/                    # App Router pages & layouts
│   │   ├── admin/              # Admin dashboard
│   │   ├── dashboard/          # User dashboard
│   │   ├── feed/               # Social feed
│   │   ├── profile/            # User profiles
│   │   ├── project/[id]/       # Project detail pages
│   │   ├── submit/             # App submission flow
│   │   ├── login/              # Authentication
│   │   └── docs/               # Documentation
│   ├── components/             # Reusable UI components
│   │   ├── feed/               # Feed-specific components
│   │   ├── global/             # Layout: NavBar, Footer, AuthProvider
│   │   ├── projects/           # Project cards & detail views
│   │   ├── social/             # Follow, like, share components
│   │   ├── shared/             # Common utilities
│   │   └── ui/                 # shadcn/ui primitives
│   ├── lib/                    # Client utilities
│   │   ├── api.ts              # API client with error handling
│   │   ├── rankPosts.ts        # ML ranking integration point
│   │   ├── tipAuthor.ts        # Web3 tipping flow
│   │   └── types.ts            # TypeScript interfaces
│   └── hooks/                  # Custom React hooks
│
├── backend/                    # Fastify API monorepo (pnpm workspaces)
│   ├── apps/api/               # Main API application
│   │   └── src/
│   │       ├── modules/        # Feature modules
│   │       │   ├── admin/      # Admin management
│   │       │   ├── analytics/  # Usage analytics
│   │       │   ├── apps/       # Mini-app registry
│   │       │   ├── auth/       # Authentication (JWT + OAuth)
│   │       │   ├── developers/ # Developer portal
│   │       │   ├── feed/       # Feed aggregation
│   │       │   ├── identity/   # User identity & profiles
│   │       │   ├── media/      # Media upload & processing
│   │       │   ├── moderation/ # Content moderation
│   │       │   ├── notifications/ # Notification system
│   │       │   ├── posts/      # Post CRUD & interactions
│   │       │   ├── social/     # Follow/block/mute graphs
│   │       │   ├── storage/    # App key-value storage
│   │       │   ├── wallet/     # Wallet address management
│   │       │   └── webhooks/   # Webhook subscriptions
│   │       ├── infrastructure/ # Background workers
│   │       │   ├── analytics.worker.ts
│   │       │   ├── media.worker.ts
│   │       │   ├── outbox.worker.ts
│   │       │   └── webhook.worker.ts
│   │       ├── middleware/     # Auth, rate-limit, tracing
│   │       └── routes/        # Health checks
│   ├── packages/
│   │   ├── db/                # Drizzle ORM schema & migrations
│   │   ├── errors/            # Shared error types
│   │   ├── logger/            # Structured logging (pino)
│   │   ├── queue/             # BullMQ job definitions
│   │   └── types/             # Shared TypeScript types
│   └── docker-compose.yml     # PostgreSQL + Redis + Adminer
│
└── packages/
    └── castkit-sdk/           # CastKit SDK & CLI verifier
        └── src/
            ├── index.ts       # Public exports
            ├── runtime.ts     # initCastKit / getCastKitContext
            ├── verifier.ts    # Repo verification engine
            ├── cli.ts         # `castkit-verify` CLI tool
            ├── checks/        # Individual verification checks
            └── types.ts       # SDK type definitions
```

---

## 🤖 ML Recommendation Engine

The recommendation system uses a **LightGBM (Light Gradient Boosting Machine)** model to personalize feed ranking and mini-app discovery for each user. LightGBM was chosen for its speed, low memory footprint, and strong performance on tabular/feature-engineered data — ideal for real-time feed ranking at scale.

### ML Pipeline Architecture

```mermaid
graph LR
    subgraph DataCollection["📊 Data Collection"]
        INTERACTIONS["User Interactions<br/>Likes · Views · Tips · Installs"]
        ONCHAIN["On-chain Data<br/>Wallet History · Token Balances"]
        SOCIAL["Social Graph<br/>Follows · Blocks · Mutes"]
        CONTENT["Content Signals<br/>Tags · Media Type · App Category"]
    end

    subgraph FeatureEng["🔧 Feature Engineering"]
        UV["User Feature Vector<br/>- Tag affinity scores<br/>- Tip frequency & recency<br/>- Engagement rate<br/>- Session context"]
        CV["Content Feature Vector<br/>- Post freshness score<br/>- Author credibility<br/>- Engagement velocity<br/>- Category embedding"]
        PV["Pair Features<br/>- Author-user affinity<br/>- Tag overlap ratio<br/>- Social distance<br/>- Wallet overlap"]
    end

    subgraph Model["🤖 LightGBM Model"]
        TRAIN["Training Pipeline<br/>Offline Batch (Daily)"]
        LGBM_MODEL["LightGBM Ranker<br/>lambdarank objective<br/>NDCG optimization"]
        INFERENCE["Real-time Inference<br/>< 10ms per request"]
    end

    subgraph Output["📤 Output"]
        RANKED["Ranked Feed<br/>Personalized post ordering"]
        RECS["App Recommendations<br/>Mini-app discovery"]
        EXPLORE["Explore Rankings<br/>Trending & category sort"]
    end

    INTERACTIONS --> UV
    ONCHAIN --> UV
    SOCIAL --> PV
    CONTENT --> CV

    UV --> LGBM_MODEL
    CV --> LGBM_MODEL
    PV --> LGBM_MODEL
    TRAIN --> LGBM_MODEL
    LGBM_MODEL --> INFERENCE

    INFERENCE --> RANKED
    INFERENCE --> RECS
    INFERENCE --> EXPLORE

    style DataCollection fill:#1a1035,stroke:#8B5CF6,stroke-width:2px,color:#ededed
    style FeatureEng fill:#0d2818,stroke:#00FF88,stroke-width:2px,color:#ededed
    style Model fill:#0d1a2e,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style Output fill:#2e1a0d,stroke:#F59E0B,stroke-width:2px,color:#ededed
```

### LightGBM Model Details

```mermaid
graph TD
    subgraph InputFeatures["Input Features (per user-post pair)"]
        UF["👤 User Features<br/>───────────────<br/>• fid (Farcaster ID)<br/>• tag_affinity[128] vector<br/>• avg_session_duration<br/>• tip_count_30d<br/>• follower_count<br/>• wallet_age_days<br/>• device_type"]
        PF["📝 Post Features<br/>───────────────<br/>• post_age_hours<br/>• like_velocity<br/>• reply_count<br/>• repost_ratio<br/>• has_miniapp<br/>• media_count<br/>• tag_embeddings[128]"]
        CF["🔗 Cross Features<br/>───────────────<br/>• author_follow_status<br/>• tag_cosine_similarity<br/>• tip_history_with_author<br/>• shared_followers_pct<br/>• category_preference_score"]
    end

    subgraph LightGBM["LightGBM Ranker"]
        direction TB
        PARAMS["Hyperparameters<br/>───────────────<br/>• objective: lambdarank<br/>• metric: ndcg<br/>• num_leaves: 63<br/>• learning_rate: 0.05<br/>• feature_fraction: 0.8<br/>• bagging_fraction: 0.9<br/>• max_depth: 8<br/>• n_estimators: 500"]
        TREES["Gradient Boosted<br/>Decision Trees<br/>───────────────<br/>Ensemble of 500 trees<br/>Leaf-wise growth<br/>Histogram binning"]
    end

    subgraph Scores["Prediction Output"]
        RELEVANCE["Relevance Score<br/>float ∈ [0, 1]"]
        SORTED["Sorted Feed<br/>Top-K selection"]
    end

    UF --> TREES
    PF --> TREES
    CF --> TREES
    PARAMS --> TREES
    TREES --> RELEVANCE
    RELEVANCE --> SORTED

    style InputFeatures fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style LightGBM fill:#0d1117,stroke:#8B5CF6,stroke-width:2px,color:#ededed
    style Scores fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
```

### Training & Serving Pipeline

```mermaid
sequenceDiagram
    participant DB as PostgreSQL
    participant ETL as ETL Pipeline
    participant Train as Training Job
    participant Store as Model Registry
    participant API as Fastify API
    participant Cache as Redis Cache
    participant Client as Frontend

    Note over DB, Client: Daily Offline Training
    DB ->> ETL: Export interaction logs
    ETL ->> ETL: Feature engineering<br/>(user vectors, content signals)
    ETL ->> Train: Training dataset (parquet)
    Train ->> Train: LightGBM.train()<br/>lambdarank objective
    Train ->> Train: Evaluate NDCG@10, MAP
    Train ->> Store: Serialize model (model.txt)
    Store ->> API: Hot-reload model weights

    Note over DB, Client: Real-time Inference
    Client ->> API: GET /api/v1/feed?cursor=...
    API ->> Cache: Check user feature cache
    Cache -->> API: Cached user vector
    API ->> DB: Fetch candidate posts
    API ->> API: LightGBM.predict()<br/>Score each post
    API ->> API: Sort by relevance score
    API ->> Cache: Cache ranked results (TTL: 60s)
    API -->> Client: Ranked feed (paginated)
```

### Why LightGBM?

| Criteria | LightGBM | Deep Learning | Logistic Regression |
|---|---|---|---|
| **Inference Speed** | ⚡ < 10ms | ❌ 50-200ms | ⚡ < 5ms |
| **Feature Engineering** | ✅ Handles raw features | ✅ Learns representations | ❌ Needs manual |
| **Training Speed** | ⚡ Minutes | ❌ Hours/Days | ⚡ Seconds |
| **Tabular Data** | ✅ Best-in-class | ⚠️ Moderate | ⚠️ Limited |
| **Memory Footprint** | ✅ ~50MB model | ❌ 500MB+ | ✅ ~1MB |
| **Interpretability** | ✅ Feature importance | ❌ Black box | ✅ Coefficients |
| **Cold Start Handling** | ✅ Graceful fallback | ❌ Needs data | ✅ Simple default |

### Frontend Integration Point

The ML ranking integrates at `frontend/lib/rankPosts.ts`:

```typescript
/**
 * ML Ranking placeholder.
 *
 * When integrated, the ML model will require:
 * - user FID (Farcaster ID) to determine personalized feed
 * - tag affinity vector (to rank posts matching user's interests higher)
 * - tip history (to surface creators the user has tipped)
 * - session context (time of day, device, active location)
 */
export function rankPosts(posts: Post[]): Post[] {
  // Future: calls backend ML scoring endpoint
  return posts;
}
```

---

## 🔗 Web3 Integration

### Wallet Architecture

```mermaid
graph LR
    subgraph Frontend["Frontend (viem + wagmi)"]
        CONNECT["Wallet Connect<br/>MetaMask · WalletConnect"]
        SIGN["Sign Message<br/>EIP-712 Typed Data"]
        TX["Send Transaction<br/>ERC-20 · Native ETH"]
    end

    subgraph Backend["Backend (ethers.js)"]
        VERIFY_SIG["Verify Signature<br/>ecrecover"]
        WALLET_DB["Wallet Registry<br/>address · chainId · isPrimary"]
        NONCE["Nonce Management<br/>Replay protection"]
    end

    subgraph Chain["On-chain"]
        CONTRACT["Smart Contracts<br/>Tipping · Payments"]
        RPC_NODE["RPC Provider<br/>Alchemy / Infura"]
        EVENTS["Event Listener<br/>Transfer · Mint events"]
    end

    CONNECT --> SIGN
    SIGN --> VERIFY_SIG
    TX --> RPC_NODE
    RPC_NODE --> CONTRACT
    VERIFY_SIG --> WALLET_DB
    CONTRACT --> EVENTS
    EVENTS --> Backend

    style Frontend fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
    style Backend fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style Chain fill:#0d1117,stroke:#8B5CF6,stroke-width:2px,color:#ededed
```

### Web3 Features

- **Wallet Authentication** — Sign-in with Ethereum (SIWE) via wallet signature verification
- **Multi-chain Support** — Manage multiple wallet addresses across chains (Ethereum, Base, Polygon)
- **On-chain Tipping** — Tip authors in USDC/ETH directly from the feed (`tipAuthor.ts`)
- **NFT Minting** — Inline mini-app NFT drops executed from social posts
- **DAO Voting** — Embedded governance proposals with on-chain vote recording
- **Permission Scopes** — Granular app permissions (read profile, post on behalf, spend tokens)

### Dependencies

```json
{
  "viem": "^2.47.12",      // Low-level Ethereum interactions
  "wagmi": "^3.6.1",        // React hooks for Ethereum
  "ethers": "^6.12.0"       // Backend signature verification
}
```

---

## 🖥 Frontend

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.3 | App Router, SSR, API Routes |
| **React** | 19.2.4 | UI rendering |
| **TailwindCSS** | 4.2.2 | Utility-first styling |
| **Framer Motion** | 12.38.0 | Animations & transitions |
| **Zustand** | 5.0.12 | Client state management |
| **TanStack Query** | 5.97.0 | Server state & caching |
| **shadcn/ui** | 4.2.0 | Component primitives |
| **wagmi** | 3.6.1 | Wallet connection hooks |
| **next-auth** | 4.24.13 | Google OAuth authentication |

### Design System

The frontend uses a custom dark-mode-first design system with neon accents:

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#00FF88` | CTA buttons, links, success states |
| `--secondary` | `#00D4FF` | Web3 features, secondary actions |
| `--accent` | `#8B5CF6` | AI/ML features, highlights |
| `--background` | `#060606` | Page background |
| `--foreground` | `#ededed` | Body text |

### Page Routes

| Route | Description |
|---|---|
| `/` | Landing page with animated terminal & service cards |
| `/feed` | Personalized social feed with ML-ranked posts |
| `/dashboard` | User dashboard with analytics |
| `/profile` | User profile with bio, posts, and wallet info |
| `/project/[id]` | Detailed project/mini-app view |
| `/submit` | Developer app submission wizard |
| `/admin` | Admin panel (role-gated) |
| `/login` | Authentication (Google OAuth + Wallet) |
| `/docs` | Developer documentation |

---

## ⚙️ Backend

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Fastify** | 5.0.0 | HTTP server framework |
| **Drizzle ORM** | 0.30.10 | Type-safe SQL & migrations |
| **PostgreSQL** | 16 (Alpine) | Primary database |
| **Redis** | 7 (Alpine) | Caching & job queues |
| **BullMQ** | 5.73.4 | Background job processing |
| **Zod** | 3.23.8 | Request/response validation |
| **Sharp** | 0.34.5 | Image processing |
| **AWS S3 SDK** | 3.x | Object storage |
| **pnpm workspaces** | — | Monorepo package management |

### API Modules

```mermaid
graph TB
    subgraph Modules["Backend API Modules"]
        AUTH["🔐 Auth<br/>JWT · Google OAuth<br/>Wallet Sign-In"]
        IDENTITY["👤 Identity<br/>Profiles · Usernames<br/>Avatars · Headers"]
        SOCIAL["🤝 Social<br/>Follow · Block · Mute<br/>Social Graph"]
        POSTS["📝 Posts<br/>CRUD · Likes · Reposts<br/>Bookmarks · Replies"]
        FEED["📰 Feed<br/>Timeline Aggregation<br/>ML Ranking Integration"]
        MEDIA["🖼️ Media<br/>Upload · Processing<br/>S3 Storage"]
        APPS["📦 Apps<br/>Registry · Versions<br/>Permissions · Tokens"]
        DEV["🛠️ Developers<br/>Portal · Verification<br/>App Management"]
        NOTIF["🔔 Notifications<br/>In-app Alerts<br/>Preference Config"]
        ADMIN["⚡ Admin<br/>User Management<br/>Content Moderation"]
        STORAGE["💾 Storage<br/>App Key-Value Store<br/>Per-user Scoped Data"]
        WEBHOOK["🔗 Webhooks<br/>Subscriptions<br/>Delivery & Retry"]
    end

    style Modules fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
```

### REST API Endpoints

| Prefix | Module | Key Endpoints |
|---|---|---|
| `/api/v1/auth` | Auth | `POST /register`, `POST /login`, `POST /refresh` |
| `/api/v1/users` | Identity + Social | `GET /me`, `GET /:username`, `POST /follow` |
| `/api/v1/posts` | Posts | `POST /`, `GET /:id`, `POST /:id/like` |
| `/api/v1/feed` | Feed | `GET /` (paginated, ML-ranked) |
| `/api/v1/media` | Media | `POST /upload` (multipart) |
| `/api/v1/apps` | Apps | `POST /`, `GET /:id`, `PATCH /:id` |
| `/api/v1/developers` | Developers | `POST /register`, `GET /me` |
| `/api/v1/wallets` | Wallets | `POST /link`, `GET /`, `DELETE /:id` |
| `/api/v1/notifications` | Notifications | `GET /`, `POST /read` |
| `/api/v1/admin` | Admin | `GET /users`, `POST /moderate` |
| `/api/v1/app-storage` | Storage | `GET /:key`, `PUT /:key` |
| `/health` | Health | `GET /live`, `GET /ready` |

### Background Workers

| Worker | File | Responsibility |
|---|---|---|
| **Outbox** | `outbox.worker.ts` | Transactional event processing with at-least-once delivery |
| **Analytics** | `analytics.worker.ts` | Engagement metric aggregation and trend computation |
| **Media** | `media.worker.ts` | Image resizing, format conversion, thumbnail generation |
| **Webhook** | `webhook.worker.ts` | External webhook delivery with exponential retry backoff |

---

## 📦 CastKit SDK

The **CastKit SDK** (`@castkit/sdk`) is a standalone TypeScript package that enables developers to build, verify, and deploy mini-apps on the CastKit platform.

### Features

| Feature | Description |
|---|---|
| `initCastKit()` | Initialize the SDK runtime in a mini-app |
| `getCastKitContext()` | Access session, user identity, and platform APIs |
| `verifyRepo()` | Programmatic repo verification before deployment |
| `isDeployable()` | Quick check if the app passes all verification gates |
| `castkit-verify` CLI | Command-line verification tool for CI/CD pipelines |

### Installation

```bash
npm install @castkit/sdk
```

### Usage

```typescript
import { initCastKit, getCastKitContext } from '@castkit/sdk';

// Initialize in your mini-app entry point
initCastKit({ appId: 'my-mini-app' });

// Access the platform context
const ctx = getCastKitContext();
console.log(ctx.user);   // Current authenticated user
console.log(ctx.session); // Session token
```

### CLI Verification

```bash
# Verify your mini-app before deployment
npx castkit-verify

# Outputs:
# ✔ package.json valid
# ✔ entry point found
# ✔ permissions declared
# ✔ security headers configured
# ─── DEPLOYABLE ✔
```

---

## 💾 Database Schema

The platform uses **30+ PostgreSQL tables** managed via Drizzle ORM with full migration support.

### Core Entity Relationships

```mermaid
erDiagram
    USERS ||--o{ USER_PROFILES : has
    USERS ||--o{ EXTERNAL_IDENTITIES : authenticates
    USERS ||--o{ WALLET_ADDRESSES : owns
    USERS ||--o{ SESSIONS : maintains
    USERS ||--o{ POSTS : authors
    USERS ||--o{ POST_LIKES : likes
    USERS ||--o{ FOLLOWS : "follows/followed_by"
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ DEVELOPERS : registers_as

    DEVELOPERS ||--o{ APPS : publishes
    APPS ||--o{ APP_VERSIONS : versions
    APPS ||--o{ APP_INSTALLS : "installed_by"
    APPS ||--o{ APP_STORAGE : stores
    APPS ||--o{ APP_TOKENS : "tokens"
    APPS ||--o{ WEBHOOK_SUBSCRIPTIONS : subscribes

    POSTS ||--o{ POST_LIKES : receives
    POSTS ||--o{ POST_BOOKMARKS : bookmarked
    POSTS ||--o{ POST_REPOSTS : reposted
    POSTS ||--o{ MEDIA_ATTACHMENTS : attaches
    POSTS ||--o{ POST_EDITS : edited

    WEBHOOK_SUBSCRIPTIONS ||--o{ WEBHOOK_DELIVERIES : delivers

    USERS {
        uuid id PK
        text username UK
        text display_name
        text status
        text moderation_status
        jsonb roles
    }

    POSTS {
        uuid id PK
        uuid author_id FK
        text content
        uuid app_id FK
        jsonb tags
        text post_type
        int like_count
        int reply_count
    }

    APPS {
        uuid id PK
        uuid developer_id FK
        text slug UK
        text name
        text category
        text status
        int install_count
    }

    DEVELOPERS {
        uuid id PK
        uuid user_id FK
        text display_name
        boolean verified
    }
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0
- **Docker** & Docker Compose (for PostgreSQL + Redis)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/devmatrix.git
cd devmatrix
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and Adminer
cd backend
docker compose up -d
```

### 3. Configure Environment

```bash
# Backend
cp backend/apps/api/.env.example backend/apps/api/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Required environment variables:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:password@localhost:5432/web3_social` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `NEXT_PUBLIC_API_URL` | API base URL for frontend | `http://localhost:8080` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | — |

### 4. Run Database Migrations

```bash
cd backend
pnpm install
pnpm migrate
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend API
cd backend
pnpm dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Adminer (DB GUI)**: http://localhost:8081

---

## 🌍 Deployment

### Deployment Architecture

```mermaid
graph TB
    subgraph DNS["DNS & CDN"]
        CF["Cloudflare<br/>DNS · DDoS Protection"]
        CDN["Edge CDN<br/>Static Assets"]
    end

    subgraph Frontend_Deploy["Frontend Deployment"]
        VERCEL["Vercel<br/>Next.js 16 Hosting<br/>Edge Functions"]
    end

    subgraph Backend_Deploy["Backend Deployment"]
        RAILWAY["Railway / Render<br/>Fastify API Server<br/>Auto-scaling"]
        WORKERS_DEPLOY["Worker Processes<br/>BullMQ Consumers<br/>Separate dyno/service"]
    end

    subgraph Database_Deploy["Managed Databases"]
        SUPABASE["Supabase / Neon<br/>PostgreSQL 16<br/>Connection Pooling"]
        UPSTASH["Upstash<br/>Serverless Redis<br/>Global Replication"]
    end

    subgraph Storage_Deploy["Object Storage"]
        R2["Cloudflare R2 / S3<br/>Media Storage<br/>CDN-backed"]
    end

    subgraph ML_Deploy["ML Service"]
        ML_API["FastAPI / Modal<br/>LightGBM Inference<br/>Model Registry"]
    end

    CF --> VERCEL
    CF --> RAILWAY
    CDN --> R2
    VERCEL --> RAILWAY
    RAILWAY --> SUPABASE
    RAILWAY --> UPSTASH
    RAILWAY --> R2
    RAILWAY --> ML_API
    WORKERS_DEPLOY --> SUPABASE
    WORKERS_DEPLOY --> UPSTASH
    ML_API --> SUPABASE
    ML_API --> UPSTASH

    style DNS fill:#0d1117,stroke:#F59E0B,stroke-width:2px,color:#ededed
    style Frontend_Deploy fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
    style Backend_Deploy fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style Database_Deploy fill:#0d1117,stroke:#8B5CF6,stroke-width:2px,color:#ededed
    style Storage_Deploy fill:#0d1117,stroke:#EF4444,stroke-width:2px,color:#ededed
    style ML_Deploy fill:#0d1117,stroke:#F59E0B,stroke-width:2px,color:#ededed
```

### Option A: Vercel + Railway (Recommended)

#### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → Your Railway backend URL
- `NEXTAUTH_URL` → Your Vercel domain
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

#### Backend → Railway

```bash
# railway.toml (create in /backend)
[build]
  builder = "nixpacks"

[deploy]
  startCommand = "pnpm dev"
  healthcheckPath = "/health"
  restartPolicyType = "on_failure"
```

1. Connect your GitHub repo to Railway
2. Set root directory to `/backend`
3. Add PostgreSQL and Redis as Railway services
4. Configure environment variables

#### ML Service → Modal / Railway

```bash
# Deploy LightGBM inference endpoint
modal deploy ml/serve.py

# Or as a Railway service
railway up --service ml-ranker
```

### Option B: Docker Compose (Self-hosted)

```yaml
# docker-compose.prod.yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgres://postgres:password@postgres:5432/web3_social
      - REDIS_URL=redis://redis:6379

  ml-ranker:
    build:
      context: ./ml
      dockerfile: Dockerfile
    ports:
      - "8000:8000"

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: web3_social
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Option C: Kubernetes (Scale)

For production-grade deployments, use Helm charts:

```bash
helm install devmatrix ./charts/devmatrix \
  --set frontend.replicas=3 \
  --set api.replicas=5 \
  --set workers.replicas=2 \
  --set ml.replicas=2 \
  --set postgresql.enabled=true \
  --set redis.enabled=true
```

### CI/CD Pipeline

```mermaid
graph LR
    subgraph CI["CI Pipeline"]
        PUSH["Git Push"]
        LINT["Lint & Typecheck<br/>eslint · tsc --noEmit"]
        TEST["Unit Tests<br/>vitest"]
        BUILD["Build<br/>next build · tsc"]
        VERIFY["CastKit Verify<br/>castkit-verify"]
    end

    subgraph CD["CD Pipeline"]
        STAGING["Deploy Staging<br/>Preview URL"]
        E2E["E2E Tests<br/>Playwright"]
        PROD["Deploy Production<br/>Vercel · Railway"]
        MONITOR["Monitor<br/>Health checks"]
    end

    PUSH --> LINT --> TEST --> BUILD --> VERIFY --> STAGING --> E2E --> PROD --> MONITOR

    style CI fill:#0d1117,stroke:#00D4FF,stroke-width:2px,color:#ededed
    style CD fill:#0d1117,stroke:#00FF88,stroke-width:2px,color:#ededed
```

---

## 🧪 Testing

```bash
# Run all unit tests
cd backend
pnpm test

# Run with coverage
pnpm test -- --coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Frontend tests
cd frontend
npm run lint
```

---

## 🤝 Contributing

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a **Pull Request**

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `refactor:` | Code refactoring |
| `test:` | Adding tests |
| `chore:` | Build/tooling changes |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with 💚 by the DevMatrix team</strong><br/>
  <sub>Next.js · Fastify · LightGBM · Ethereum · TypeScript</sub>
</p>
