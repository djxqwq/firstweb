import styled, { keyframes } from 'styled-components'

export const StyledTerminalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 14px;
  width: 100%;
  max-width: 100%;
  margin: 0 !important;
  border-radius: 0;
  color: white;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  box-shadow: none;
  z-index: 9999;

  @media screen and (max-width: 760px) {
    width: 100%;
    margin-top: 0 !important;
  }
`

export const StyledTerminal = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  z-index: 1;
  margin-top: 30px;
  height: calc(100vh - 30px);
  max-height: calc(100vh - 30px);
  background-color: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 0;

  @media screen and (max-width: 760px) {
    box-shadow: none;
    height: calc(100vh - 30px);
    max-height: calc(100vh - 30px);
  }

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
`

export const StyledTerminalInner = styled.div`
  padding: 20px;
  font-weight: normal;
  font-family: "SF Mono", "Fira Code", "Source Code Pro", Monaco, Menlo,
    Consolas, monospace;
  color: #fff;
  line-height: 1.5;

  @media screen and (max-width: 760px) {
    padding: 20px 10px;
  }
`

export const StyledInputWrapper = styled.p`
  display: flex;
  align-items: center;
  margin: 0;
  padding: 8px 0;
  word-spacing: 0;
  letter-spacing: 0;
  word-break: break-all;
  font-weight: 400;
  font-family: "SF Mono", Fira Code, Source Code Pro, Monaco, Menlo, Consolas,
    monospace;
  color: #fff;
`

export const StyledInput = styled.input`
  position: absolute;
  background: transparent;
  border: none;
  width: 1px;
  height: 1px;
  opacity: 0;
  padding: 0;
  margin: 0;
  cursor: default;
  pointer-events: none;
  z-index: -1;

  &:focus {
    outline: none;
    border: none;
  }
`

export const StyledPrompt = styled.span`
  word-break: break-all;
  color: #56b6c2;
  margin-right: 8px;
`

const loadingDots = keyframes`
  0%, 20% {
    color: rgba(255, 255, 255, 0);
    text-shadow: 0.25em 0 0 rgba(255, 255, 255, 0), 0.5em 0 0 rgba(255, 255, 255, 0);
  }
  40% {
    color: white;
    text-shadow: 0.25em 0 0 rgba(255, 255, 255, 0), 0.5em 0 0 rgba(255, 255, 255, 0);
  }
  60% {
    text-shadow: 0.25em 0 0 white, 0.5em 0 0 rgba(255, 255, 255, 0);
  }
  80%, 100% {
    text-shadow: 0.25em 0 0 white, 0.5em 0 0 white;
  }
`

export const StyledLoadingCursor = styled.span`
  font: 300 1.5em "SF Mono";
  animation: ${loadingDots} 1s steps(5, end) infinite;
`

const blinkDot = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
`

export const StyledBlinkCursor = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 8px;
  height: 17px;
  line-height: 17px;
  vertical-align: middle;
  color: inherit;
  margin-left: 0;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: ${props => props.children === '\u00A0' ? '#56b6c2' : 'rgba(86, 182, 194, 0.7)'};
    animation: ${blinkDot} 1s step-end infinite;
  }

  ${props => props.children !== '\u00A0' && `
    &::after {
      content: '';
      position: absolute;
      left: 0;
      z-index: 2;
      color: #abb2bf;
    }
  `}
`

export const StyledLine = styled.div`
  word-break: break-all;
  margin: 8px 0;
  line-height: 1.5;

  .cmd {
    color: #abb2bf;
  }

  .info {
    color: #61afef;
  }

  .warning {
    color: #e5c07b;
  }

  .success {
    color: #98c379;
  }

  .error {
    color: #e06c75;
  }

  .system {
    color: #c678dd;
  }

  .time {
    color: #56b6c2;
  }

  .black {
    color: #4b5263;
  }

  .time,
  .system,
  .error,
  .success,
  .warning,
  .info,
  .black {
    margin-right: 8px;
    padding: 2px 4px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
  }
`

export const StyledHeader = styled.div`
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  left: 0;
  height: 30px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  -webkit-app-region: drag;
`

export const StyledHeaderTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.5px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
`

export const StyledHeaderDotList = styled.ul`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 10px;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 6px;
  list-style: none;
`

export const StyledHeaderDotItem = styled.li`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => {
    switch (props.color) {
      case 'red':
        return '#ff5f56'
      case 'yellow':
        return '#ffbd2e'
      case 'green':
        return '#27c93f'
      default:
        return '#ddd'
    }
  }};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    filter: brightness(0.8);
  }
`

export const StyledCommand = styled.span`
  font-size: inherit;
  color: inherit;
  font-family: inherit;
  line-height: inherit;
  vertical-align: middle;
`
