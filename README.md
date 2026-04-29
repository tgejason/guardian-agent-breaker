# Guardian Agent Breaker (GAB)

**Zero-trust circuit breaker for AI agents** | Deterministic safety for enterprise AI infrastructure

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-50.4%25-blue)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-45.2%25-yellow)](#)

## Overview

Guardian Agent Breaker is a runtime safety framework that intercepts AI agent actions and applies deterministic policy enforcement before execution. Unlike permissive sandboxes, GAB implements **zero-trust verification**: every agent intent is validated against configurable safety parameters, suspicious actions trigger circuit breaks, and all decisions are logged for audit trails.

By separating **intent evaluation** from **action execution**, GAB allows you to deploy AI agents to production with confidence—turning fragile demos into enterprise-grade infrastructure.

## 🛠️ Powered By (Hackathon Sponsors)

| Sponsor | Integration Role | Purpose |
| :--- | :--- | :--- |
| **[Insforge](https://insforge.com/)** | **Policy Engine Backend** | Stores and manages the `safety_parameters` PostgreSQL table, enabling real-time policy updates. |
| **[Redis](https://redis.io/)** | **High-Speed Caching** | Used for sub-10ms policy lookups and session state management, ensuring the circuit breaker adds zero perceived latency. |
| **[Shipables](https://shipables.dev/)** | **Deployment & Orchestration** | Provides the production environment and API portal for triggering agent supervision and managing secrets. |
| **[Chainguard](https://www.chainguard.dev/)** | **Hardened Security** | Utilizes **[Chainguard Node.js images](https://github.com/tgejason/guardian-agent-breaker/blob/main/infra/Dockerfile)** to ensure a minimal attack surface. |
| **[Supabase](https://supabase.com/)** | **Data Persistence** | Managed PostgreSQL backbone for high-availability policy storage and audit logging. |

## Core Features

### 🚨 Intent Interception
- Middleware-based agent action interception
- Pre-execution policy validation
- Configurable safety parameters per agent/domain

### 🔐 Zero-Trust Enforcement
- No action bypasses the safety layer
- Deterministic decision rules (no probabilistic trust)
- Exhaustive audit logging of all blocks and allows

### 📊 State Management
- PostgreSQL backend for persistent safety policies
- Redis caching layer for low-latency policy checks
- Stateful circuit breaking (prevents retry storms)

### 🔍 Observability
- Structured logging of agent intents and decisions
- Real-time circuit status monitoring
- Historical action audit trail

## Architecture

```
┌─────────────┐
│  AI Agent   │
└──────┬──────┘
       │
       ├─> Intent
       │
       ▼
┌─────────────────────────┐
│  GAB Safety Interceptor │  ◄─── Real-time policy check
├─────────────────────────┤
│ Redis Cache Layer       │  (sub-10ms decision)
│ (policy hot-load)       │
└────────┬────────────────┘
         │
         ├─> Cache Hit? ─────────► Decision
         │
         └─> Cache Miss?
               │
               ▼
         ┌──────────────────┐
         │ PostgreSQL Srv   │
         │ (safety_         │
         │  parameters)     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Policy Engine   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Action Executed  │
         │    or Blocked    │
         └──────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js + TypeScript | Type-safe agent framework |
| **API Gateway** | Express.js | Request routing & middleware |
| **State** | PostgreSQL | Persistent policy storage |
| **Cache** | Redis | Sub-second policy lookups |
| **Backend** | Supabase | Managed database + auth |
| **Deployment** | Docker | Container orchestration |

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 13+ (or Supabase instance)
- Redis 6+
- Docker (optional, for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/tgejason/guardian-agent-breaker.git
cd guardian-agent-breaker

# Install dependencies
npm install

# Configure environment variables
cp .env.backup .env
# Edit .env with your credentials:
# - INSFORGE_PROJECT_URL: Your Supabase project URL
# - INSFORGE_ANON_KEY: Your Supabase anon key
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection URL
```

### Verification

```bash
# Test connectivity to all backends
npx ts-node verify-bridge.ts

# Expected output:
# ✅ Redis: Connected
# ✅ SQL Bridge: Connected directly via 5432
# Result: REST API is active. You can use the standard Supabase client.
```

### Running the API Server

```bash
# Development mode
npm run dev

# Production mode
npm run start
```

The API will be available at `http://localhost:3000` by default.

## Configuration

### Safety Parameters

Safety parameters define the policy rules enforced by GAB. Store these in the `safety_parameters` PostgreSQL table:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique parameter identifier |
| `agent_id` | UUID | Target agent this policy applies to |
| `policy_name` | String | Human-readable policy name (e.g., "no_write_production") |
| `threshold` | Float | Risk threshold (0.0-1.0) |
| `action_pattern` | JSONB | Regex or action matcher |
| `block_action` | Boolean | True = block on violation |
| `created_at` | Timestamp | Policy creation time |
| `updated_at` | Timestamp | Last policy update |

### Example Policy Configuration

```json
{
  "agent_id": "agent-123",
  "policy_name": "no_write_production",
  "action_pattern": {
    "service": "database",
    "environment": "production",
    "operation": ["UPDATE", "DELETE", "DROP"]
  },
  "threshold": 0.95,
  "block_action": true
}
```

## API Reference

### POST `/api/v1/check-action`

Validate an agent action against safety policies.

**Request:**
```json
{
  "agent_id": "agent-123",
  "intent": {
    "action": "write_to_database",
    "target": "users_table",
    "environment": "production"
  },
  "metadata": {
    "timestamp": 1682515200,
    "risk_score": 0.87
  }
}
```

**Response (Allowed):**
```json
{
  "decision": "allow",
  "message": "Action passes all policies",
  "policy_id": "policy-456",
  "execution_time_ms": 8
}
```

**Response (Blocked):**
```json
{
  "decision": "block",
  "reason": "Violates policy: no_write_production",
  "policy_id": "policy-123",
  "circuit_open": true,
  "execution_time_ms": 5
}
```

## Deployment

### Docker

```bash
# Build image
docker build -t gab:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e INSFORGE_PROJECT_URL="https://..." \
  -e INSFORGE_ANON_KEY="..." \
  gab:latest
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis server URL |
| `INSFORGE_PROJECT_URL` | ✅ | Supabase project URL |
| `INSFORGE_ANON_KEY` | ✅ | Supabase anonymous key |
| `NODE_ENV` | ❌ | `development` or `production` |
| `PORT` | ❌ | API server port (default: 3000) |

## Development

### Project Structure

```
guardian-agent-breaker/
├── supervisor/          # Agent supervision & monitoring
├── archive/             # Historical decision logs
├── logs/                # Runtime logs
├── verify-bridge.ts     # Connectivity diagnostic tool
├── package.json         # Dependencies & scripts
└── .env.backup          # Example environment configuration
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests (requires live backends)
npm run test:integration

# Coverage report
npm run test:coverage
```

### Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## Performance Characteristics

- **Policy lookup (cached):** < 10ms (Redis hit)
- **Policy lookup (uncached):** ~50-100ms (PostgreSQL query)
- **Decision latency (p99):** < 200ms
- **Throughput:** ~1000 decisions/sec per instance
- **Redis hit ratio target:** > 95%

## Roadmap

- [ ] Multi-agent orchestration (supervisor enhancements)
- [ ] Policy conflict resolution engine
- [ ] Machine learning-based anomaly detection
- [ ] Real-time dashboard for policy analytics
- [ ] Grafana integration for metrics
- [ ] Policy versioning & rollback
- [ ] Agent simulation/dry-run mode

## Troubleshooting

### "Redis: Failed" in verify-bridge.ts
- Ensure Redis is running: `redis-cli ping`
- Check `REDIS_URL` environment variable
- Verify network connectivity to Redis endpoint

### "SQL Bridge: Failed"
- Verify PostgreSQL is accessible at `DATABASE_URL`
- For cloud databases, SSL may be required (see `verify-bridge.ts` line 50-53)
- Run: `psql $DATABASE_URL -c "SELECT 1"`

### "REST is down" warning
- Check Supabase project status at dashboard
- Verify `INSFORGE_PROJECT_URL` and `INSFORGE_ANON_KEY` are correct
- Test directly: `curl -H "apikey: $INSFORGE_ANON_KEY" $INSFORGE_PROJECT_URL/rest/v1/safety_parameters`

## Security Considerations

- **Zero-trust assumption:** All agent actions treated as potentially risky
- **Audit logging:** Every decision (allow/block) is logged for forensics
- **Rate limiting:** Circuit breaker prevents retry storms after N consecutive failures
- **Policy updates:** Changes to safety parameters propagate via Redis pub/sub within seconds
- **Database credentials:** Use environment variables, never commit `.env` files

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/tgejason/guardian-agent-breaker/issues)
- **Discussions:** [GitHub Discussions](https://github.com/tgejason/guardian-agent-breaker/discussions)
- **Author:** [tgejason](https://github.com/tgejason)

---

**Built for enterprises deploying AI agents to production.** 🚀
