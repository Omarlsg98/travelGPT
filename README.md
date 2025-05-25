# Tourist AI Agent

This repository contains the boilerplate for the Tourist AI Agent application, designed for cloud deployment with automated installation and management.

## Project Structure

- `apps/`: Contains the main applications.
  - `web/`: The Next.js frontend application for user interaction.
  - `agent/`: The LLM Agent runtime, including API endpoints and scheduler for planning and deal searching.
- `packages/`: Houses shared code and components.
  - `ui/`: Reusable React components and Tailwind CSS configurations.
  - `core/`: Core LLM logic, including prompt templates and function definitions.
  - `utils/`: Common utility functions (e.g., date formatting, price calculations).
  - `config/`: Shared runtime configurations, environment variables, and constants.
- `infra/`: Infrastructure as Code (IaC) templates and deployment configurations.
  - `terraform/`: Terraform templates for provisioning cloud resources.
  - `serverless/`: Serverless framework or SST definitions for Lambda functions.
  - `docker/`: Dockerfiles and `docker-compose` templates for containerization.
- `scripts/`: Various setup, deployment, and cleanup scripts.
- `public/`: Static assets for the `web` application.
- `.env.example`: Template for environment variables.
- `turbo.json`: Turborepo configuration for monorepo management.
- `package.json`: Root-level dependencies and scripts.
- `tsconfig.json`: Global TypeScript configuration.

## Getting Started

More detailed instructions will be added here for setting up the development environment, running the applications, and deploying to the cloud.
