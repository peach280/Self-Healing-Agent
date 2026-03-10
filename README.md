## Overview
This project addresses **AI Reliability** in automated code generation. While LLMs are proficient at generating fixes, they often produce "hallucinated" syntax or logically inconsistent code.

This system implements a **Deterministic Validation Loop**:
1. **Detection:** Identifies inconsistencies in input data.
2. **Generation:** AI engine proposes a fix.
3. **Sandboxing:** The fix is executed within a **Docker Sandbox** to run deterministic unit tests.
4. **Validation:** Only verified code is returned to the user; failed attempts trigger a re-generation or error log.
5. **Optimization:** Integrated **LRU Caching** stores verified fixes to minimize LLM latency and API costs.

## Architecture
![alt text](image.png)

## Demo

https://github.com/user-attachments/assets/30cc15cf-8030-42d5-a5e1-d1a77603e3bd

## Setup

Follow the steps below to set up the **Self-Healing-Agent** project locally.

### 1. Clone the Repository
```bash
git clone https://github.com/peach280/Self-Healing-Agent.git
cd Self-Healing-Agent
cd backend
docker build -t healer .
python main.py 
cd ..
cd frontend
npm install 
npm run dev
```

