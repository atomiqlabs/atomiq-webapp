import './assets/style/tailwind.css';
import './assets/style/import.scss';
import './App.css'

import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import {createRoot} from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
