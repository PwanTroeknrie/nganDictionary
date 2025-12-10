import React from 'react';
import { useNavigate } from "react-router-dom";
import {
  Sun, Moon, Edit, Eye, ListIcon, Columns, Home, FileText, TypeIcon
} from './Icons.jsx'; // 确保 Home 和 FileText 已导入
import SearchBar from './ui/SearchBar';
import useEntrySearch from '../hooks/useEntrySearch';

const Header = ({
    isDarkMode, toggleTheme,
    isGlobalEditMode, toggleGlobalEditMode,
    isWordListOpen, toggleLeftPanel,
    isTreeOpen, toggleRightPanel,
    customFont, setCustomFont,
    isFontInputVisible, setIsFontInputVisible,
    entries,
    onSearchSelect,
    // 新增：用于控制按钮可见性的配置对象
    buttonVisibility = {}
}) => {
  const navigate = useNavigate();

  // 定义默认的可见性配置，并与传入的配置合并
  const defaultVisibility = {
    homeNav: true,
    docNav: true,
    wordlistToggle: true,
    fontInputToggle: true,
    editModeToggle: true,
    hierarchyTreeToggle: true,
    themeToggle: true,
  };
  const visibility = { ...defaultVisibility, ...buttonVisibility };


  return (
    <header className="fixed top-0 left-0 w-full z-20 bg-white dark:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4 h-16">
        {/* LEFT SECTION (导航和列表开关) */}
        <div className="flex items-center space-x-4">

          {/* Wordlist Toggle (现在受控于 visibility.wordlistToggle) */}
          {visibility.wordlistToggle && (
            <button
              onClick={toggleLeftPanel}
              className={`p-2 rounded-full transition-colors ${
                  isWordListOpen 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="词条列表"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          )}

          {/* Responsive Title */}
          <h1 className="text-2xl font-extrabold text-gray-800 dark:text-blue-400 items-center space-x-2 hidden md:flex">
            <span className="text-3xl">📚</span>
            <span>词典构建器</span>
          </h1>

          {/* Large Screen Search Bar */}
            <SearchBar
                entries={entries}
                onEntrySearch={useEntrySearch}
                onSelectEntry={onSearchSelect}
                customFont={customFont}
            />
        </div>

        {/* RIGHT SECTION (工具和主题开关) */}
        <div className="flex items-center space-x-3">
          {/* Font Selector Input Toggle (现在受控于 visibility.fontInputToggle) */}
          {visibility.fontInputToggle && (
            <button
              onClick={() => setIsFontInputVisible(prev => !prev)}
              className={`p-2 rounded-full transition-colors ${
                  isFontInputVisible 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="自定义字体"
            >
              <TypeIcon className="w-5 h-5" />
            </button>
          )}

          {/* Font Input Field */}
          {isFontInputVisible && visibility.fontInputToggle && (
            <input
              type="text"
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
              onBlur={() => localStorage.setItem('customFont', customFont)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  localStorage.setItem('customFont', customFont);
                  e.target.blur();
                }
              }}
              placeholder="字体名称"
              className="px-3 py-1 w-32 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              style={{ fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif' }}
            />
          )}

          {/* NEW: Home Navigation Button */}
          {visibility.homeNav && (
            <button
              onClick={() => navigate('/home')}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title="主页"
            >
              <Home className="w-5 h-5" />
            </button>
          )}

          {/* NEW: Doc Navigation Button */}
          {visibility.docNav && (
            <button
              onClick={() => navigate('/docs')}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title="文档"
            >
              <FileText className="w-5 h-5" />
            </button>
          )}

           {/* Theme Toggle (现在受控于 visibility.themeToggle) */}
          {visibility.themeToggle && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title={isDarkMode ? '切换到亮色主题' : '切换到暗色主题'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          {/* Edit/View Mode Toggle (现在受控于 visibility.editModeToggle) */}
          {visibility.editModeToggle && (
            <button
              onClick={toggleGlobalEditMode}
              className={`p-2 rounded-full transition-colors ${
                  isGlobalEditMode 
                      ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' 
                      : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
              }`}
              title={isGlobalEditMode ? '切换到查看模式 (Ctrl/Cmd+E)' : '切换到编辑模式 (Ctrl/Cmd+E)'}
            >
              {isGlobalEditMode ? <Edit className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}

          {/* Hierarchy Tree Toggle (现在受控于 visibility.hierarchyTreeToggle) */}
          {visibility.hierarchyTreeToggle && (
            <button
              onClick={toggleRightPanel}
              className={`p-2 rounded-full transition-colors ${
                  isTreeOpen 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="层级树"
            >
              <Columns className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;