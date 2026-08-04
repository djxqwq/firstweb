import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// No StrictMode: TermFolio uses react-transition-group findDOMNode
createRoot(document.getElementById('root')).render(<App />)
