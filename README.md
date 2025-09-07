# Livestock Health Monitoring System - Technical Challenge

Welcome! You're about to work on a real-world technical challenge that mirrors the type of problems we solve every day. This challenge is designed to assess your problem-solving skills, technical abilities, and how effectively you leverage modern development tools including AI assistants.

## Why This Challenge?

We believe the best way to evaluate engineering talent is through practical, production-like scenarios. This challenge represents a simplified version of an actual livestock monitoring system - the kind of IoT and data processing challenges that are increasingly common in modern agriculture technology.

More importantly, we want to see how you work, not just what you produce. We encourage you to use AI tools (Claude, Cursor, Copilot, etc.) throughout this challenge - just as you would in your daily work with us.

## Your Experience

Over the next 1-2 days, you'll be working with a functioning but poorly performing livestock health monitoring system. The system processes IoT sensor data from 500 cattle across multiple farms. Your primary goal is to transform this prototype into a production-ready service.

You'll have access to:
- A working TypeScript/Node.js API with significant performance issues
- A partial React dashboard for visualizing livestock health
- 6 months of sensor data (7.8M+ records)
- Complete technical documentation
- Freedom to implement your solution however you see fit

## Prerequisites & Setup

### Required Software
- Node.js 18+ 
- pnpm package manager (`npm install -g pnpm`)
- Git
- A code editor of your choice
- Optional but recommended: Docker (if you choose to use databases)

### Getting Started

#### 1. Fork and Clone the Repository
```bash
# First, fork the repository (https://github.com/human-ventures/livestock-interview-challenge.git) to your GitHub account
# Then clone your fork:
git clone https://github.com/[your-username]/livestock-interview-challenge.git
cd livestock-interview-challenge
```

#### 2. Download the Dataset
Due to size constraints, the sensor data isn't included in the repository.

1. Download the data files: [Google Drive - Livestock Data](https://drive.google.com/drive/folders/1GPvT2i_2YQME0mJK0fyWMiLYkBFrbQyK?usp=sharing)
2. Extract both CSV files into the `data/` directory
3. Verify you have:
   - `data/sensor_readings.csv` (738MB)
   - `data/health_labels.csv` (290MB)

#### 3. Install Dependencies
```bash
pnpm install
```

#### 4. Start the Application
```bash
# Run both API and web dashboard
pnpm dev

# Or run services individually
pnpm dev:api    # API on http://localhost:3001
pnpm dev:web    # Dashboard on http://localhost:3002
```

#### 5. Verify Everything Works
- API Health Check: http://localhost:3001/health
- API Documentation: http://localhost:3001/api-docs
- Dashboard: http://localhost:3002

Note: The API will be very slow initially (30+ seconds per request) - this is the problem you'll be solving!

## System Overview

You're working with a livestock health monitoring platform that:
- Collects sensor data from IoT devices on cattle (temperature, heart rate, GPS, movement)
- Provides REST APIs for data access
- Displays real-time health metrics through a web dashboard

The current implementation has a critical performance bottleneck: it reads through massive CSV files on every API request, causing unacceptable response times.

### What's Provided
- **Working API** with sensor data endpoints (but very slow)
- **Basic endpoints**: `/api/v1/sensors/*`, `/api/v1/animals/*`, `/health`
- **CSV data loader** service (the performance bottleneck)
- **Web dashboard** for visualization
- **Test data**: 7.8M sensor readings, health labels

### What You'll Build
- **Performance optimization**: Fix the CSV bottleneck
- **Time-series API**: Implement data aggregation endpoints
- **Rate limiting**: Add API quotas for public endpoints
- **Optional**: ML model for health predictions (bonus)

**For detailed API specifications, see `TECHNICAL_DESIGN.md`**

## The Challenge

### Primary Objectives
1. **Performance Optimization**: Reduce API response times from 30+ seconds to under 500ms
2. **Time-Series Implementation**: Add data aggregation at multiple resolutions (5m, 15m, 1h, 1d)
3. **Rate Limiting**: Implement API quotas for public endpoints
4. **Production Readiness**: Ensure the solution can handle concurrent requests and maintains data integrity

### Optional Challenges (Bonus Points)
1. **Test Suite Enhancement**: Review our current test coverage and improve it. Add integration tests, performance benchmarks, or any testing improvements you think would benefit the codebase.
2. **ML Model Development**: Build a machine learning model to predict cattle health based on sensor data. You can:
   - Analyze the provided health labels dataset
   - Design and train a prediction model
   - Deploy it through the existing `/api/v1/predictions` endpoints (currently has mock logic)
   - Document your model's performance and approach

### What We're Looking For
- **Problem Analysis**: How you identify and approach the performance bottleneck
- **Solution Design**: Your architectural decisions and trade-offs
- **Code Quality**: Clean, maintainable, well-tested code
- **AI Tool Usage**: Effective use of AI assistants to accelerate development
- **Production Thinking**: Consideration of real-world deployment concerns

### Time Expectation
This challenge is designed to take 1-2 days of focused work. We understand you may have other commitments - quality matters more than speed.

## Tips for Success

1. **Start with Analysis**: Profile the existing code to understand the bottleneck before jumping to solutions
2. **Think Production**: Consider monitoring, error handling, and deployment from the start
3. **Use AI Effectively**: Leverage AI tools for boilerplate, debugging, and exploring unfamiliar concepts
4. **Test Incrementally**: Verify each optimization step maintains data accuracy
5. **Document Decisions**: Brief notes on why you chose certain approaches will help during discussion

## Submission

### How to Submit

1. **Complete Your Solution**: 
   - Commit all your changes to your forked repository
   - Make sure your solution is on the `main` branch

2. **Add Documentation**: Create a `SOLUTION.md` file in the root directory explaining:
   - Your optimization approach and rationale
   - Key architectural decisions
   - Trade-offs you considered
   - How you used AI tools during development
   - Performance measurements (before/after)
   - If you tackled optional challenges, describe your approach

3. **Ensure It Runs**: We should be able to run your solution with:
   ```bash
   pnpm install
   pnpm dev
   ```

4. **Submit via Email**:
   - Reply to the original email that provided this challenge
   - Include the link to your forked repository
   - Ensure the repository is public or grant us access
   - Add any additional notes or context you'd like us to know

### Evaluation Criteria
- Solution effectiveness (performance improvements)
- Code quality and organization
- Problem-solving approach
- Use of modern development practices
- Production readiness
- Bonus: Test improvements and/or ML model implementation

---

We're excited to see how you approach this challenge! This is your opportunity to show us how you think, code, and solve real problems. Good luck!