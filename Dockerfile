# # Container-Based Node.js Debugger Environment
# FROM node:20-bullseye

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     neovim \
#     git \
#     curl \
#     wget \
#     build-essential \
#     python3 \
#     python3-pip \
#     lua5.4 \
#     liblua5.4-dev \
#     unzip \
#     netcat-traditional \
#     && rm -rf /var/lib/apt/lists/*

# # Create non-root user 'debugger'
# RUN useradd -m -s /bin/bash debugger && \
#     mkdir -p /home/debugger/.config/nvim && \
#     mkdir -p /home/debugger/logs && \
#     mkdir -p /workspace && \
#     chown -R debugger:debugger /home/debugger && \
#     chown -R debugger:debugger /workspace

# # Install VS Code JavaScript debugger globally
# RUN git clone https://github.com/microsoft/vscode-js-debug.git /opt/vscode-js-debug && \
#     cd /opt/vscode-js-debug && \
#     npm install && \
#     npm run compile

# # Switch to debugger user
# USER debugger
# WORKDIR /home/debugger

# # Install Neovim package manager (Packer)
# RUN git clone --depth 1 https://github.com/wbthomason/packer.nvim \
#     ~/.local/share/nvim/site/pack/packer/start/packer.nvim

# # Copy Neovim configuration files
# COPY --chown=debugger:debugger nvim-config/ /home/debugger/.config/nvim/

# # Copy example Node.js project for debugging
# COPY --chown=debugger:debugger example-project/ /workspace/

# # Copy startup script
# COPY --chown=debugger:debugger container-init.sh /home/debugger/
# RUN chmod +x /home/debugger/container-init.sh

# # Expose ports
# EXPOSE 3000 9229 3001

# # Set environment variables
# ENV NODE_ENV=development
# ENV DEBUG=*

# # Health check to ensure RPC server is running
# HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
#   CMD nc -z localhost 3000 || exit 1

# # Default command
# CMD ["/home/debugger/container-init.sh"]



# Container-Based Node.js Debugger Environment
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    neovim \
    git \
    curl \
    wget \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Create debugger user
RUN useradd -m -s /bin/bash debugger

# Create workspace directory
WORKDIR /workspace

# Copy the example-project files
COPY example-project/ ./

# Install dependencies
RUN npm install

# Set permissions
RUN chown -R debugger:debugger /workspace && \
    chown -R debugger:debugger /home/debugger

# Switch to debugger user
USER debugger

# Install Neovim package manager (Packer)
RUN git clone --depth 1 https://github.com/wbthomason/packer.nvim \
    ~/.local/share/nvim/site/pack/packer/start/packer.nvim

# Create container-init.sh
RUN echo '#!/bin/bash' > /home/debugger/container-init.sh && \
    echo 'echo "Starting Node.js Debug Environment..."' >> /home/debugger/container-init.sh && \
    echo 'cd /workspace' >> /home/debugger/container-init.sh && \
    echo 'node --inspect-brk=0.0.0.0:9229 server.js &' >> /home/debugger/container-init.sh && \
    echo 'while ! nc -z localhost 9229; do sleep 0.2; done' >> /home/debugger/container-init.sh && \
    echo 'echo "Node Inspector ready at ws://0.0.0.0:9229"' >> /home/debugger/container-init.sh && \
    echo 'echo "Application ready at http://localhost:3000"' >> /home/debugger/container-init.sh && \
    echo 'tail -f /dev/null' >> /home/debugger/container-init.sh && \
    chmod +x /home/debugger/container-init.sh

# Expose ports
EXPOSE 3000 9229 3001

# Set environment variables
ENV NODE_ENV=development
ENV DEBUG=*

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD nc -z localhost 3000 || exit 1

# Default command
CMD ["/home/debugger/container-init.sh"]