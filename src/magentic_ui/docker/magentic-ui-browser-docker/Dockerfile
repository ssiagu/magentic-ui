FROM node:lts-slim

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    xvfb \
    x11vnc \
    openbox \
    supervisor \
    python3 \
    python3-pip \
    novnc \
    websockify \
    procps \
    xdg-utils \
    python3-xdg \
    x11-xserver-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC - keep this in a separate layer for better caching
RUN mkdir -p /usr/local/novnc && \
    mkdir -p /usr/local/novnc/utils/websockify

# Set up working directory
WORKDIR /app

# Install Playwright
COPY package.json package-lock.json* ./
RUN npm ci

# Install browsers with dependencies 
RUN npx playwright@1.51 install --with-deps chromium

# Set up configurations and copy files
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /app/start.sh
COPY playwright-server.js /app/playwright-server.js
COPY x11-setup.sh /app/x11-setup.sh
COPY openbox-rc.xml /root/.config/openbox/rc.xml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Set up directories and permissions in a single layer
RUN chmod +x /app/start.sh /app/x11-setup.sh /usr/local/bin/entrypoint.sh \
    && mkdir -p /root/.config/openbox /workspace

# Set environment variables
ENV PLAYWRIGHT_WS_PATH="default" \
    DISPLAY=:99

# Expose ports: noVNC web interface, and Playwright server
EXPOSE 6080 37367

# Set the working directory for the application
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Start services
CMD ["/app/start.sh"]