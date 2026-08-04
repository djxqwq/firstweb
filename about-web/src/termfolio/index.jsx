import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import {
  StyledBlinkCursor,
  StyledCommand,
  StyledHeader,
  StyledHeaderDotItem,
  StyledHeaderDotList,
  StyledHeaderTitle,
  StyledInput,
  StyledInputWrapper,
  StyledLine,
  StyledLoadingCursor,
  StyledPrompt,
  StyledTerminal,
  StyledTerminalInner,
  StyledTerminalWrapper,
} from './style'

import { CSSTransition, TransitionGroup } from 'react-transition-group'

import { systemCmdList, tipCmdList } from './commands'

import { setCaretPosition } from './utils'

class Terminal extends PureComponent {
  static propTypes = {
    cmd: PropTypes.shape({
      dynamicList: PropTypes.object,
      staticList: PropTypes.object,
    }).isRequired,
    config: PropTypes.shape({
      initialDirectory: PropTypes.string,
      prompt: PropTypes.string,
      version: PropTypes.string,
      bootCmd: PropTypes.string,
    }),
    className: PropTypes.string,
  };

  static defaultProps = {
    className: 'react-terimnal-app',
    config: {
      initialDirectory: 'src',
      prompt: '➜  ~ ',
      version: '1.0.0',
      bootCmd: 'intro',
    },
  };

  historyCmdList = [];
  historyCmdIndex = 0;

  constructor(props) {
    super(props)
    this.$terminal = React.createRef()
    this.$inputWrapper = React.createRef()
    this.$inputEl = React.createRef()

    const { config, cmd } = props

    this.state = {
      cmdList: [],
      command: '',
      directory: config.initialDirectory,
      currentPrompt: `➜  ${config.initialDirectory} `,
      isPrinting: true,
      cursorPosition: 0,
      processes: [
        { pid: 1, name: 'system', status: 'running' },
        { pid: 2, name: 'terminal', status: 'running' },
      ],
    }

    this.supportedCmdList = [
      ...Object.keys(cmd.staticList),
      ...Object.keys(cmd.dynamicList),
    ]
    this.allCmdList = [
      ...this.supportedCmdList,
      ...Object.keys(systemCmdList)
        .map((key) => systemCmdList[key].aliasList)
        .flat(1),
    ]
  }

  componentDidMount() {
    const {
      config: { bootCmd },
    } = this.props

    // Add immediate focus
    setTimeout(() => {
      this.inputFocus()
    }, 100)

    this.run(bootCmd).then(() => {
      const { help, clear, exit } = systemCmdList
      this.print([help, clear, exit])
      this.inputFocus()
    })
  }

  run = (command, inputCommand = this.state.command) => {
    const { cmd } = this.props
    this.setState({ isPrinting: true })
    return cmd.dynamicList[command]
      .run(this.print, inputCommand)
      .then(this.print)
      .catch((error) => {
        console.error(error)
        this.print(tipCmdList.error)
      })
      .finally(() => {
        this.setState({ isPrinting: false })
      })
  };

  print = (cmd) => {
    this.setState((prevState) => ({
      cmdList: [...prevState.cmdList, ...(Array.isArray(cmd) ? cmd : [cmd])],
    }))
    this.autoScroll()
  };

  inputFocus = () => {
    if (this.$inputEl.current) {
      this.$inputEl.current.focus()
    }
  };

  autoScroll = () => {
    this.$terminal.current.scrollTop = this.$inputWrapper.current.offsetTop
  };

  handleKeyCommand = (e) => {
    const {
      config: { prompt },
    } = this.props
    const isDownKey = e.keyCode === 40
    const isUpKey = e.keyCode === 38
    const isTabKey = e.keyCode === 9
    const isCKey = e.keyCode === 67
    const isDKey = e.keyCode === 68
    const isLKey = e.keyCode === 76
    const isLeftKey = e.keyCode === 37
    const isRightKey = e.keyCode === 39
    const isCtrlCKey = isCKey && e.ctrlKey && !e.shiftKey
    const isCtrlDKey = isDKey && e.ctrlKey && !e.shiftKey
    const isCtrlLKey = isLKey && e.ctrlKey && !e.shiftKey

    const { command, isPrinting } = this.state
    if (isPrinting) {
      return
    }

    if (isLeftKey || isRightKey) {
      const newPos = isLeftKey
        ? Math.max(0, this.state.cursorPosition - 1)
        : Math.min(this.state.command.length, this.state.cursorPosition + 1)
      this.setState({ cursorPosition: newPos }, () => {
        setCaretPosition(this.$inputEl.current, newPos)
      })
      e.preventDefault()
    }

    if (isDownKey) {
      this.historyCmdIndex = Math.min(
        this.historyCmdIndex + 1,
        this.historyCmdList.length - 1
      )
    } else if (isUpKey) {
      this.historyCmdIndex = Math.max(this.historyCmdIndex - 1, 0)
    }
    if (isUpKey || isDownKey) {
      const historyCmd = this.historyCmdList[this.historyCmdIndex]
      if (historyCmd) {
        this.setState({
          command: historyCmd,
          cursorPosition: historyCmd.length
        })
        setTimeout(() => {
          setCaretPosition(this.$inputEl.current, historyCmd.length + 1)
        }, 0)
      }
    }

    if (isTabKey) {
      if (!command) {
        this.setState({ command: 'help' })
      }
      const canExtendCmdList = this.allCmdList.filter((c) =>
        c.startsWith(command)
      )
      if (canExtendCmdList && canExtendCmdList.length) {
        this.setState({
          command:
            canExtendCmdList[
              Math.floor(Math.random() * canExtendCmdList.length)
            ],
        })
      }
      e.preventDefault()
    }

    if (isCtrlCKey) {
      this.print(`${prompt}${command}`)
      this.setState({ command: '' })
      e.preventDefault()
    }

    if (isCtrlDKey) {
      this.print(tipCmdList.jump)
      e.preventDefault()
      window.history.go(-1)
    }

    if (isCtrlLKey) {
      this.setState({ cmdList: [] })
      e.preventDefault()
    }

    this.autoScroll()
    this.inputFocus()
  };

  updatePrompt = (directory) => {
    this.setState({
      currentPrompt: `➜  ${directory} `,
      directory
    })
  }

  handleCommand = (e) => {
    const {
      cmd,
      config: { version: versionNumber },
    } = this.props
    const isEnterKey = e.keyCode === 13

    if (!isEnterKey) {
      this.handleKeyCommand(e)
      return
    }

    if (!this.state.command) {
      this.print(this.state.currentPrompt)
      return
    }

    const command = this.state.command.toLowerCase().trim()
    const [action, ...args] = command.split(' ')
    const commandArgs = args.join(' ')

    this.historyCmdList.push(command)
    this.historyCmdIndex = this.historyCmdList.length

    this.print(`${this.state.currentPrompt}${command}`)
    const cmdList = []

    const isStaticCommand = !!cmd.staticList[command]
    const isDynamicCommand = !!cmd.dynamicList[action]

    const {
      exit,
      help,
      clear,
      pwd,
      cd,
      version,
      date,
      whoami,
      history,
      env,
      echo,
    } = systemCmdList
    const { unknown, jump, supporting } = tipCmdList

    if (exit.aliasList.includes(action)) {
      cmdList.push(jump)
      this.print(cmdList)
      window.history.go(-1)
    } else if (help.aliasList.includes(action)) {
      if (commandArgs) {
        const command =
          cmd.staticList[commandArgs] ||
          cmd.dynamicList[commandArgs] ||
          systemCmdList[commandArgs]
        if (command) {
          cmdList.push({
            type: 'info',
            label: commandArgs,
            content: command.content,
          })
        } else {
          cmdList.push({
            type: 'error',
            label: 'Error',
            content: `No manual entry for ${commandArgs}`,
          })
        }
        this.print(cmdList)
      } else {
        cmdList.push(supporting)
        const allCommands = [
          ...Object.entries(systemCmdList).map(([key, cmd]) => ({
            type: 'system',
            label: key,
            // eslint-disable-next-line react/prop-types
            content: cmd.content,
          })),
          ...this.supportedCmdList.map((commandKey) => {
            const command =
              cmd.staticList[commandKey] || cmd.dynamicList[commandKey]
            return {
              type: 'success',
              label: commandKey,
              content: command.description,
            }
          }),
        ]
        cmdList.push(...allCommands)
        this.print(cmdList)
      }
    } else if (clear.aliasList.includes(action)) {
      this.setState({ cmdList: [] })
    } else if (pwd.aliasList.includes(action)) {
      this.print(this.state.directory)
    } else if (cd.aliasList.includes(action)) {
      if (commandArgs) {
        const directory = commandArgs.trim()
        if (directory && directory.length < 20) {
          this.updatePrompt(directory)
        }
      }
    } else if (version.aliasList.includes(action)) {
      this.print(versionNumber)
    } else if (date.aliasList.includes(action)) {
      this.print(new Date().toString())
    } else if (whoami.aliasList.includes(action)) {
      this.print('guest')
    } else if (history.aliasList.includes(action)) {
      this.historyCmdList.forEach((cmd, index) => {
        cmdList.push(`${index + 1}  ${cmd}`)
      })
      this.print(cmdList)
    } else if (env.aliasList.includes(action)) {
      cmdList.push(
        'TERM=react-terminal',
        'SHELL=/bin/bash',
        'USER=guest',
        'PATH=/usr/local/bin:/usr/bin:/bin',
        `PWD=${this.state.directory}`,
        'HOME=/home/guest'
      )
      this.print(cmdList)
    } else if (echo.aliasList.includes(action)) {
      const text = commandArgs.replace(
        /\$([A-Za-z_][A-Za-z0-9_]*)/g,
        (match, varName) => {
          switch (varName) {
            case 'USER':
              return 'guest'
            case 'PWD':
              return this.state.directory
            case 'HOME':
              return '/home/guest'
            case 'SHELL':
              return '/bin/bash'
            case 'TERM':
              return 'react-terminal'
            case 'PATH':
              return '/usr/local/bin:/usr/bin:/bin'
            default:
              return match
          }
        }
      )
      this.print(text || '')
    } else if (isStaticCommand) {
      this.print(cmd.staticList[command].list)
    } else if (isDynamicCommand) {
      this.run(action, commandArgs)
    } else if (action.trim()) {
      unknown.content = unknown.contentWithCommand(action)
      this.print([unknown, help])
    }

    this.setState({ command: '' })
    setTimeout(this.autoScroll, 0)
    this.inputFocus()
  };

  render() {
    const { className } = this.props
    const { cmdList, isPrinting, command, directory, currentPrompt, cursorPosition } = this.state
    return (
      <StyledTerminalWrapper className={className}>
        <StyledHeader>
          <StyledHeaderTitle>{directory}</StyledHeaderTitle>
          <StyledHeaderDotList>
            <StyledHeaderDotItem color="red" />
            <StyledHeaderDotItem color="yellow" />
            <StyledHeaderDotItem color="green" />
          </StyledHeaderDotList>
        </StyledHeader>
        <StyledTerminal ref={this.$terminal} onClick={this.inputFocus}>
          <StyledTerminalInner>
            <TransitionGroup>
              {cmdList.map((item, index) => (
                <CSSTransition key={index} timeout={500}>
                  <StyledLine>
                    {typeof item === 'string' ? (
                      <StyledCommand className="cmd">{item}</StyledCommand>
                    ) : (
                      <>
                        {item.time && (
                          <StyledCommand className="time">
                            {item.time}
                          </StyledCommand>
                        )}
                        {item.label && (
                          <StyledCommand className={item.type}>
                            {item.label}
                          </StyledCommand>
                        )}
                        {item.content && (
                          <StyledCommand className="cmd">
                            {item.content}
                          </StyledCommand>
                        )}
                      </>
                    )}
                  </StyledLine>
                </CSSTransition>
              ))}
            </TransitionGroup>
            <StyledInputWrapper
              ref={this.$inputWrapper}
              onClick={this.inputFocus}
            >
              {isPrinting ? (
                <StyledLoadingCursor>.</StyledLoadingCursor>
              ) : (
                <>
                  <StyledPrompt>{currentPrompt}</StyledPrompt>
                  <StyledCommand>{command.slice(0, cursorPosition)}</StyledCommand>
                  <StyledBlinkCursor>
                    {cursorPosition === command.length ? '\u00A0' : command[cursorPosition] || '\u00A0'}
                  </StyledBlinkCursor>
                  <StyledCommand>{command.slice(cursorPosition + (cursorPosition === command.length ? 0 : 1))}</StyledCommand>
                </>
              )}
              <StyledInput
                value={command}
                onChange={(e) => {
                  const newPos = e.target.selectionStart
                  this.setState({
                    command: e.target.value,
                    cursorPosition: newPos
                  })
                }}
                onKeyDown={this.handleCommand}
                onSelect={(e) => {
                  this.setState({
                    cursorPosition: e.target.selectionStart
                  })
                }}
                onFocus={(e) => {
                  this.setState({
                    cursorPosition: e.target.selectionStart
                  })
                }}
                autoFocus
                ref={this.$inputEl}
              />
            </StyledInputWrapper>
          </StyledTerminalInner>
        </StyledTerminal>
      </StyledTerminalWrapper>
    )
  }
}

export default Terminal
