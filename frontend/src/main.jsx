import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from "@/components/theme-provider.tsx";
import './index.css'; // 导入全局样式

ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
);