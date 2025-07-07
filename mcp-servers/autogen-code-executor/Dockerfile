# Use Python 3.12 slim image as base
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    git \
    curl \
    wget \
    vim \
    nano \
    bash \
    nodejs \
    npm \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt requirements.txt
RUN python -m pip install -r requirements.txt

COPY coder.py coder.py

# Create a working directory for code execution
RUN mkdir -p /app/workspace
WORKDIR /

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Set the entrypoint to run the coder MCP server
ENTRYPOINT ["python", "/app/coder.py"]

# Default arguments
CMD ["--work-dir", "/app/workspace", "--timeout", "60"]
