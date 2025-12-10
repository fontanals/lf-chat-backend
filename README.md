# LF Chat Backend

REST API for an AI chat application similar to ChatGPT and Claude.ai. Users can have conversations with an AI assistant, create projects and upload documents for context-aware responses using RAG (Retrieval-Augmented Generation).

## Features

- **Real-time AI Streaming**: OpenAI integration with Server-Sent Events (SSE) for live conversation responses
- **Conversation Branching**: Edit and resend messages from any point to explore different response paths with full conversation history in a tree structure
- **RAG (Retrieval-Augmented Generation)**: Upload PDF/TXT documents (max 1MB) for context-aware responses using vector search with pgvector embeddings
- **AI Document Processing**: Automated document chunking, embedding, and semantic search with AI-powered tools
- **Project Organization**: Group chats and documents into projects for organized, context-focused conversations
- **JWT Authentication**: Secure access and refresh token system with email verification and password recovery
- **Content Moderation**: Automatic content filtering using OpenAI's moderation API
- **Message Feedback System**: Rate assistant responses with like/dislike/neutral ratings
- **API Usage Tracking**: Real-time OpenAI cost monitoring with configurable monthly limits and automatic fallback
- **Rate Limiting**: Configurable request throttling for API protection
- **AWS S3 Integration**: Secure file storage and management
- **Session Management**: Tracked user sessions with automatic expiration
- **OpenAPI Documentation**: Interactive Swagger UI for API exploration
- **Automated Testing**: Comprehensive unit and integration tests with Jest and Supertest
- **Docker Multi-Environment**: Separate development and test environments with Docker Compose
- **Structured Logging**: Daily rotated file logs with Winston
- **CI/CD Pipelines**: Automated workflows with GitHub Actions

## Technologies

- **TypeScript** - Type-safe development with strict mode
- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Relational database
- **pgvector** - Vector embeddings for semantic search
- **OpenAI API** - AI model integration
- **Vercel AI SDK** - LLM abstraction layer
- **AWS S3** - Cloud file storage
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing and security
- **Zod** - Runtime schema validation
- **Multer** - File upload handling
- **Nodemailer** - Email service (SMTP)
- **pdf-parse** - PDF document processing
- **Winston** - Structured logging with rotation
- **Jest** - Testing framework
- **Supertest** - API integration testing
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD automation
- **Swagger/OpenAPI** - API documentation

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [OpenAI API](https://platform.openai.com/) key
- [AWS S3](https://aws.amazon.com/s3/) bucket for file storage
- SMTP service for sending emails (account verification and password recovery)

## Environment Variables

1. Copy ".env.example" to ".env" for development and ".env.test" for test
2. Replace the placeholder values with your own

| Variable                                | Description                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `PORT`                                  | Server port                                                                         |
| `LOGS_PATH`                             | Directory for log files                                                             |
| `CORS_ORIGINS`                          | CORS origin addresses as CSV                                                        |
| `POSTGRES_HOST`                         | PostgreSQL host                                                                     |
| `POSTGRES_PORT`                         | PostgreSQL port                                                                     |
| `POSTGRES_USER`                         | PostgreSQL user                                                                     |
| `POSTGRES_PASSWORD`                     | PostgreSQL password                                                                 |
| `POSTGRES_DB`                           | PostgreSQL database name                                                            |
| `ACCOUNT_VERIFICATION_TOKEN_SECRET`     | Secret for signing JWT account verification tokens                                  |
| `ACCESS_TOKEN_SECRET`                   | Secret for signing JWT access tokens                                                |
| `REFRESH_TOKEN_SECRET`                  | Secret for signing JWT refresh tokens                                               |
| `PASSWORD_RECOVERY_TOKEN_SECRET`        | Secret for signing JWT password recovery tokens                                     |
| `SMTP_HOST`                             | SMTP host                                                                           |
| `SMTP_PORT`                             | SMTP port                                                                           |
| `SMTP_USER`                             | SMTP user                                                                           |
| `SMTP_PASSWORD`                         | SMTP password                                                                       |
| `SUPPORT_EMAIL`                         | Support email address for sending account verification and password recovery emails |
| `AWS_REGION`                            | AWS region                                                                          |
| `AWS_S3_BUCKET_NAME`                    | S3 bucket name for file storage                                                     |
| `AWS_ACCESS_KEY_ID`                     | AWS access key ID                                                                   |
| `AWS_SECRET_ACCESS_KEY`                 | AWS secret access key                                                               |
| `OPENAI_API_KEY`                        | OpenAI API key                                                                      |
| `OPENAI_MAIN_MODEL`                     | Primary OpenAI model (`gpt-5-nano` or `gpt-4o-mini`)                                |
| `OPENAI_LOW_MODEL`                      | Secondary model for lighter tasks (`gpt-5-nano` or `gpt-4o-mini`)                   |
| `OPENAI_MONTHLY_USAGE_LIMIT_IN_DOLLARS` | Monthly spending limit for OpenAI                                                   |
| `ENABLE_RATE_LIMITING`                  | Enable rate limiting                                                                |
| `RATE_LIMIT_WINDOW_IN_MINUTES`          | Rate limit window                                                                   |
| `RATE_LIMIT_MAX_REQUESTS`               | Max requests per window                                                             |
| `MAX_DOCUMENTS_PER_USER`                | Maximum documents per user                                                          |

## Running the Project

1. Install Docker
2. Clone the repository
3. Setup environment variables
4. Run one of the following commands:

```bash
# Development
docker compose up

# Test
docker compose --env-file .env.test -f docker-compose.test.yml up
```

5. Open `http://localhost:${PORT}/api/docs` in your browser to view OpenAPI documentation

If you do not want to use Docker, you can have Node.js 22+ and PostgreSQL on your host machine instead of containers.

## Architecture

The application follows a **layered architecture** pattern:

```
Routes (HTTP Layer)
    ↓
Middlewares (Auth, Upload, Error Handling)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Data Context (PostgreSQL Driver Wrapper)
    ↓
PostgreSQL
```

## Testing

- **Unit tests** (`tests/unit/`): Individual components in isolation with mocked dependencies
- **Integration tests** (`tests/integration/`): Full request/response cycles with real third-party services

Run `npm run test:unit` for running unit tests only

Run `npm run test:integration` for running integration tests only (needs test database running)

Run `npm run test` for running unit and integration tests

## License

MIT
