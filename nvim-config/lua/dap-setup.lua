local dap = require('dap')
local dapui = require('dapui')

dapui.setup()

-- Node.js adapter
dap.adapters.node2 = {
  type = 'executable',
  command = 'node',
  args = {os.getenv('HOME') .. '/.vscode-js-debug/out/src/nodeDebug.js'}
}

dap.configurations.javascript = {
  {
    type = 'node2',
    request = 'launch',
    program = '${workspaceFolder}/index.js',
    cwd = '${workspaceFolder}',
    sourceMaps = true,
    protocol = 'inspector'
  }
}
