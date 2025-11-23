# #!/bin/bash
# echo "Starting Node.js Debug Environment inside container..."

# # Start Node.js debugger for example project (background)
# # node --inspect=0.0.0.0:9229 /workspace/example-project/index.js &
# node --inspect-brk=0.0.0.0:9229 /workspace/example-project/index.js &


# # Wait a few seconds to ensure Node.js debugger is listening
# sleep 2

# # Start Neovim headless for plugin setup / DAP
# nvim --headless -c "lua require('dap-install').setup({})" -c "quitall"

# # Keep container alive  
# tail -f /dev/null



# #!/bin/bash
# echo "Starting Node.js Debug Environment inside container..."

# # Start Node.js debugger for example project
# node --inspect-brk=0.0.0.0:9229 /workspace/example-project/index.js &

# # Wait until debugger port is open
# while ! nc -z localhost 9229; do
#   sleep 0.2
# done

# echo "Node Inspector ready at ws://0.0.0.0:9229"

# # Keep container alive
# tail -f /dev/null




#!/bin/bash
echo "Starting Node.js Debug Environment inside container..."

# Start Node.js debugger for the project (using server.js instead of index.js)
node --inspect-brk=0.0.0.0:9229 /workspace/server.js &

# Wait until debugger port is open
while ! nc -z localhost 9229; do
  sleep 0.2
done

echo "Node Inspector ready at ws://0.0.0.0:9229"
echo "Application ready at http://localhost:3000"

# Keep container alive
tail -f /dev/null