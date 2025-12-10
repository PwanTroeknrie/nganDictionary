import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DictionaryPage from './pages/DictionaryPage.jsx';
import DocPage from './pages/DocPage';
import HomePage from "./pages/HomePage.jsx";
import HelloPage from "./pages/HelloPage.jsx";


export default function App() {
  const [customFont, setCustomFont] = useState(
    () => localStorage.getItem('customFont') || 'Aktimang'
  );
  // 新增 Dark Mode 状态管理
  const [isDarkMode, setIsDarkMode] = useState(
    () => JSON.parse(localStorage.getItem('isDarkMode')) ?? true
  );

  // Sync global font CSS variable
  useEffect(() => {
    const html = document.documentElement;
    if (customFont) {
      html.style.setProperty('--custom-word-font', `"${customFont}"`);
      localStorage.setItem('customFont', customFont);
    } else {
      html.style.removeProperty('--custom-word-font');
      localStorage.removeItem('customFont');
    }
  }, [customFont]);

  // Sync dark mode state with DOM
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/hello" replace />} />
        <Route
          path="/dictionary"
          element={
            <DictionaryPage
              projectId="default"
              customFont={customFont}
              setCustomFont={setCustomFont}
              isDarkMode={isDarkMode} // 传递主题状态
              toggleTheme={toggleTheme} // 传递主题切换函数
            />
          }
        />
        <Route
          path="/docs"
          element={
            <DocPage
              customFont={customFont}
              setCustomFont={setCustomFont}
            />
          }
        />
        <Route
          path="/home"
          element={
            <HomePage
              customFont={customFont}
              setCustomFont={setCustomFont}
            />
          }
        />
        <Route
          path="/hello"
          element={
            <HelloPage
              customFont={customFont}
              setCustomFont={setCustomFont}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}