import './assets/style/tailwind.css';
import './assets/style/import.scss';
import './App.css'
import '@solana/wallet-adapter-react-ui/styles.css';

import {createRoot} from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
