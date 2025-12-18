# CI/CD Pipeline Guide

This guide covers setting up Continuous Integration and Continuous Deployment for the Device Remote Management Platform.

## Pipeline Overview

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐
│  Commit │────>│   Build  │────>│  Test   │────>│  Deploy  │────>│ Verify │
│ to main │     │  Images  │     │  & Lint │     │to Staging│     │& Smoke │
└─────────┘     └──────────┘     └─────────┘     └──────────┘     └────────┘
                                                         │
                                                         v
                                                  ┌──────────────┐
                                                  │Deploy to Prod│
                                                  │(Manual/Auto) │
                                                  └──────────────┘
```

## GitHub Actions

### Backend CI

Create `.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'BackendContainer/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'BackendContainer/**'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
          cache: 'pip'
      
      - name: Install dependencies
        working-directory: ./BackendContainer
        run: |
          python -m pip install --upgrade pip
          pip install -e .
          pip install pytest pytest-cov pytest-asyncio black ruff
      
      - name: Lint with ruff
        working-directory: ./BackendContainer
        run: ruff check src/
      
      - name: Format check with black
        working-directory: ./BackendContainer
        run: black --check src/
      
      - name: Run tests
        working-directory: ./BackendContainer
        env:
          DATABASE_URL: postgresql+asyncpg://testuser:testpass@localhost:5432/testdb
          CELERY_BROKER_URL: redis://localhost:6379/0
          CELERY_RESULT_BACKEND: redis://localhost:6379/1
          JWT_SECRET: test-secret-key
        run: pytest tests/ --cov=src --cov-report=xml --cov-report=term
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./BackendContainer/coverage.xml
          flags: backend

  build-image:
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./BackendContainer
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/drm-backend:${{ github.sha }}
            ${{ secrets.REGISTRY_URL }}/drm-backend:latest
          cache-from: type=registry,ref=${{ secrets.REGISTRY_URL }}/drm-backend:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_URL }}/drm-backend:buildcache,mode=max
```

### Frontend CI

Create `.github/workflows/frontend-ci.yml`:

```yaml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'FrontendContainer/**'
      - '.github/workflows/frontend-ci.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'FrontendContainer/**'

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './FrontendContainer/package-lock.json'
      
      - name: Install dependencies
        working-directory: ./FrontendContainer
        run: npm ci
      
      - name: Lint
        working-directory: ./FrontendContainer
        run: npm run lint
      
      - name: Type check
        working-directory: ./FrontendContainer
        run: npm run typecheck
      
      - name: Build
        working-directory: ./FrontendContainer
        env:
          VITE_API_BASE_URL: https://api-staging.example.com
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-dist
          path: FrontendContainer/dist/

  build-image:
    runs-on: ubuntu-latest
    needs: lint-and-build
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./FrontendContainer
          push: true
          build-args: |
            VITE_API_BASE_URL=${{ secrets.STAGING_API_URL }}
          tags: |
            ${{ secrets.REGISTRY_URL }}/drm-frontend:${{ github.sha }}
            ${{ secrets.REGISTRY_URL }}/drm-frontend:latest
          cache-from: type=registry,ref=${{ secrets.REGISTRY_URL }}/drm-frontend:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_URL }}/drm-frontend:buildcache,mode=max
```

### Deploy to Staging

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Update ECS service (Backend)
        run: |
          aws ecs update-service \
            --cluster drm-staging \
            --service drm-backend \
            --force-new-deployment
      
      - name: Update ECS service (Worker)
        run: |
          aws ecs update-service \
            --cluster drm-staging \
            --service drm-worker \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster drm-staging \
            --services drm-backend drm-worker
      
      - name: Run smoke tests
        run: |
          curl -f https://api-staging.example.com/docs || exit 1
          curl -f https://staging.example.com || exit 1
```

### Deploy to Production

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Verify tag format
        run: |
          if [[ ! "${{ github.ref }}" =~ ^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid tag format. Use v1.2.3"
            exit 1
          fi
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Create backup
        run: |
          aws rds create-db-snapshot \
            --db-instance-identifier drm-prod-db \
            --db-snapshot-identifier drm-prod-backup-$(date +%Y%m%d-%H%M%S)
      
      - name: Run database migrations
        run: |
          # Run migrations via ECS task
          aws ecs run-task \
            --cluster drm-prod \
            --task-definition drm-migrations \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
      
      - name: Update ECS services
        run: |
          aws ecs update-service \
            --cluster drm-prod \
            --service drm-backend \
            --force-new-deployment
          
          aws ecs update-service \
            --cluster drm-prod \
            --service drm-worker \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster drm-prod \
            --services drm-backend drm-worker
      
      - name: Run smoke tests
        run: |
          curl -f https://api.example.com/docs || exit 1
          curl -f https://app.example.com || exit 1
      
      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment ${{ job.status }}: ${{ github.ref }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## GitLab CI

### .gitlab-ci.yml

```yaml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

# Backend Jobs
backend:lint:
  stage: lint
  image: python:3.12-slim
  before_script:
    - cd BackendContainer
    - pip install black ruff
  script:
    - black --check src/
    - ruff check src/
  only:
    changes:
      - BackendContainer/**

backend:test:
  stage: test
  image: python:3.12-slim
  services:
    - postgres:15-alpine
    - redis:7-alpine
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: testuser
    POSTGRES_PASSWORD: testpass
    DATABASE_URL: postgresql+asyncpg://testuser:testpass@postgres:5432/testdb
    CELERY_BROKER_URL: redis://redis:6379/0
    CELERY_RESULT_BACKEND: redis://redis:6379/1
    JWT_SECRET: test-secret
  before_script:
    - cd BackendContainer
    - pip install -e .
    - pip install pytest pytest-cov pytest-asyncio
  script:
    - pytest tests/ --cov=src --cov-report=term --cov-report=xml
  coverage: '/(?i)total.*? (100(?:\.0+)?\%|[1-9]?\d(?:\.\d+)?\%)$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: BackendContainer/coverage.xml
  only:
    changes:
      - BackendContainer/**

backend:build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY/drm-backend:$CI_COMMIT_SHA -t $CI_REGISTRY/drm-backend:latest ./BackendContainer
    - docker push $CI_REGISTRY/drm-backend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY/drm-backend:latest
  only:
    - main
    - develop

# Frontend Jobs
frontend:lint:
  stage: lint
  image: node:20-alpine
  before_script:
    - cd FrontendContainer
    - npm ci
  script:
    - npm run lint
    - npm run typecheck
  only:
    changes:
      - FrontendContainer/**

frontend:build:
  stage: build
  image: node:20-alpine
  before_script:
    - cd FrontendContainer
    - npm ci
  script:
    - npm run build
  artifacts:
    paths:
      - FrontendContainer/dist/
    expire_in: 1 week
  only:
    changes:
      - FrontendContainer/**

frontend:docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build --build-arg VITE_API_BASE_URL=$API_BASE_URL -t $CI_REGISTRY/drm-frontend:$CI_COMMIT_SHA -t $CI_REGISTRY/drm-frontend:latest ./FrontendContainer
    - docker push $CI_REGISTRY/drm-frontend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY/drm-frontend:latest
  only:
    - main
    - develop

# Deploy Jobs
deploy:staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - curl -X POST $DEPLOY_WEBHOOK_STAGING
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy:production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - curl -X POST $DEPLOY_WEBHOOK_PRODUCTION
  environment:
    name: production
    url: https://app.example.com
  when: manual
  only:
    - main
    - tags
```

## Jenkins Pipeline

### Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        REGISTRY = 'your-registry.example.com'
        BACKEND_IMAGE = "${REGISTRY}/drm-backend"
        FRONTEND_IMAGE = "${REGISTRY}/drm-frontend"
        DOCKER_CREDENTIALS = credentials('docker-registry-creds')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Backend Lint') {
            when {
                changeset "BackendContainer/**"
            }
            agent {
                docker {
                    image 'python:3.12-slim'
                }
            }
            steps {
                dir('BackendContainer') {
                    sh 'pip install black ruff'
                    sh 'black --check src/'
                    sh 'ruff check src/'
                }
            }
        }
        
        stage('Backend Test') {
            when {
                changeset "BackendContainer/**"
            }
            steps {
                script {
                    docker.image('postgres:15-alpine').withRun('-e POSTGRES_DB=testdb -e POSTGRES_USER=testuser -e POSTGRES_PASSWORD=testpass') { db ->
                        docker.image('redis:7-alpine').withRun() { redis ->
                            docker.image('python:3.12-slim').inside("--link ${db.id}:postgres --link ${redis.id}:redis") {
                                dir('BackendContainer') {
                                    sh 'pip install -e .'
                                    sh 'pip install pytest pytest-cov pytest-asyncio'
                                    sh 'pytest tests/ --cov=src --cov-report=xml'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Frontend Lint & Build') {
            when {
                changeset "FrontendContainer/**"
            }
            agent {
                docker {
                    image 'node:20-alpine'
                }
            }
            steps {
                dir('FrontendContainer') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm run typecheck'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Images') {
            when {
                branch 'main'
            }
            parallel {
                stage('Backend Image') {
                    steps {
                        script {
                            def backendImage = docker.build("${BACKEND_IMAGE}:${env.BUILD_NUMBER}", "./BackendContainer")
                            docker.withRegistry('https://' + REGISTRY, 'docker-registry-creds') {
                                backendImage.push("${env.BUILD_NUMBER}")
                                backendImage.push("latest")
                            }
                        }
                    }
                }
                stage('Frontend Image') {
                    steps {
                        script {
                            def frontendImage = docker.build("${FRONTEND_IMAGE}:${env.BUILD_NUMBER}", 
                                "--build-arg VITE_API_BASE_URL=${env.API_BASE_URL} ./FrontendContainer")
                            docker.withRegistry('https://' + REGISTRY, 'docker-registry-creds') {
                                frontendImage.push("${env.BUILD_NUMBER}")
                                frontendImage.push("latest")
                            }
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    // SSH to staging server and deploy
                    sshagent(['staging-ssh-key']) {
                        sh '''
                            ssh user@staging-server "
                                cd /opt/drm &&
                                docker-compose pull &&
                                docker-compose up -d
                            "
                        '''
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to Production?', ok: 'Deploy'
                script {
                    sshagent(['production-ssh-key']) {
                        sh '''
                            ssh user@prod-server "
                                cd /opt/drm &&
                                docker-compose pull &&
                                docker-compose up -d
                            "
                        '''
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            slackSend color: 'good', message: "Build Successful: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: 'danger', message: "Build Failed: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
    }
}
```

## Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        files: ^BackendContainer/

  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.1.8
    hooks:
      - id: ruff
        files: ^BackendContainer/
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: ^FrontendContainer/.*\.[jt]sx?$
        additional_dependencies:
          - eslint@8.56.0
          - typescript@5.3.3
```

Install and use:

```bash
pip install pre-commit
pre-commit install
```

## Semantic Release

For automated versioning and changelogs, use semantic-release:

Create `.releaserc.json`:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/github",
    [
      "@semantic-release/exec",
      {
        "prepareCmd": "echo ${nextRelease.version} > VERSION"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "VERSION"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

Commit message format:

```
feat: add new feature
fix: bug fix
docs: documentation update
chore: maintenance tasks
test: add tests
refactor: code refactoring
perf: performance improvements
```

## Summary

This CI/CD setup provides:

- ✅ Automated linting and testing on every PR
- ✅ Docker image building and registry push
- ✅ Automated staging deployments
- ✅ Manual production deployments with approval
- ✅ Smoke tests after deployment
- ✅ Rollback capabilities
- ✅ Notifications (Slack, email, etc.)

Customize the pipelines based on your specific infrastructure and requirements.
```
