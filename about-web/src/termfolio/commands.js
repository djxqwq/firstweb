export const systemCmdList = {
  help: {
    type: 'system',
    label: 'System',
    content: 'Type "help" to get a supporting command list.',
    aliasList: ['help', 'h', '?', 'ls'],
  },
  clear: {
    type: 'system',
    label: 'System',
    content: 'Type "clear" to clear the terminal screen.',
    aliasList: ['clear', 'cls'],
  },
  exit: {
    type: 'system',
    label: 'System',
    content: 'Type "exit" to exit the terminal',
    aliasList: ['exit', 'quit', 'q'],
  },
  pwd: {
    type: 'system',
    label: 'System',
    content: 'Print working directory',
    aliasList: ['pwd'],
  },
  cd: {
    type: 'system',
    label: 'System',
    content: 'Change directory',
    aliasList: ['cd'],
  },
  version: {
    type: 'system',
    label: 'System',
    content: 'Show terminal version',
    aliasList: ['version', 'ver'],
  },
  date: {
    type: 'system',
    label: 'System',
    content: 'Display the current date and time',
    aliasList: ['date', 'time'],
  },
  whoami: {
    type: 'system',
    label: 'System',
    content: 'Display current user',
    aliasList: ['whoami', 'who'],
  },
  history: {
    type: 'system',
    label: 'System',
    content: 'Display command history',
    aliasList: ['history'],
  },
  env: {
    type: 'system',
    label: 'System',
    content: 'Display environment variables',
    aliasList: ['env', 'printenv'],
  },
  echo: {
    type: 'system',
    label: 'System',
    content: 'Display a line of text or variables',
    aliasList: ['echo', 'print'],
  }
}

export const tipCmdList = {
  jump: {
    type: 'system',
    label: 'System',
    content: 'Jumping page...',
  },
  unknown: {
    type: 'error',
    label: 'Error',
    contentWithCommand: (command) => `Command '${command}' not found`,
  },
  error: {
    type: 'error',
    label: 'Error',
    content: 'Something went wrong!',
  },
  noProcess: {
    type: 'error',
    label: 'Error',
    content: 'No such process',
  },
  supporting: 'Here is a list of supporting command.',
}
