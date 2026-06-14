import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Edit, Eye, ListIcon, Columns, Home, FileText, TypeIcon, TableIcon
} from './Icons.jsx';
import SearchBar from './ui/SearchBar';
import useEntrySearch from '../hooks/useEntrySearch';
import { useProjectStore } from '../store/projectStore.js';

const Header = ({
  isDarkMode,
  toggleTheme,
  isGlobalEditMode,
  toggleGlobalEditMode,
  isWordListOpen,
  toggleLeftPanel,
  isTreeOpen,
  toggleRightPanel,
  customFont,
  setCustomFont,
  isFontInputVisible,
  setIsFontInputVisible,
  entries,
  onSearchSelect,
  buttonVisibility = {},
}) => {
  const navigate = useNavigate();
  const projectId = useProjectStore(s => s.projectId);

  const defaultVisibility = {
    homeNav: true,
    docNav: true,
    morphologyNav: true,
    wordlistToggle: true,
    fontInputToggle: true,
    editModeToggle: true,
    hierarchyTreeToggle: true,
    themeToggle: true,
  };
  const visibility = { ...defaultVisibility, ...buttonVisibility };

  return (
    <header className="fixed left-0 top-0 z-20 w-full border-b border-gray-200 bg-white shadow-lg transition-colors dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {visibility.wordlistToggle && (
            <button
              onClick={toggleLeftPanel}
              className={`rounded-full p-2 transition-colors ${
                isWordListOpen
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="词条列表"
            >
              <ListIcon className="h-5 w-5" />
            </button>
          )}

          <h1 className="hidden items-center space-x-2 text-2xl font-extrabold text-gray-800 dark:text-blue-400 md:flex">
            <span className="text-3xl">📖</span>
            <span>词典构建器</span>
          </h1>

          <SearchBar
            entries={entries}
            onEntrySearch={useEntrySearch}
            onSelectEntry={onSearchSelect}
            customFont={customFont}
          />
        </div>

        <div className="flex items-center space-x-3">
          {visibility.fontInputToggle && (
            <button
              onClick={() => setIsFontInputVisible(prev => !prev)}
              className={`rounded-full p-2 transition-colors ${
                isFontInputVisible
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="自定义字体"
            >
              <TypeIcon className="h-5 w-5" />
            </button>
          )}

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
              className="w-32 rounded-lg border border-gray-300 px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              style={{ fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif' }}
            />
          )}

          {visibility.morphologyNav && (
            <button
              onClick={() => navigate(`/morphology?project=${projectId}`)}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              title="变格表管理"
            >
              <TableIcon className="h-5 w-5" />
            </button>
          )}

          {visibility.homeNav && (
            <button
              onClick={() => navigate('/home')}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              title="主页"
            >
              <Home className="h-5 w-5" />
            </button>
          )}

          {visibility.docNav && (
            <button
              onClick={() => navigate(`/docs?project=${projectId}`)}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              title="文档"
            >
              <FileText className="h-5 w-5" />
            </button>
          )}

          {visibility.themeToggle && (
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              title={isDarkMode ? '切换到亮色主题' : '切换到暗色主题'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}

          {visibility.editModeToggle && (
            <button
              onClick={toggleGlobalEditMode}
              className={`rounded-full p-2 transition-colors ${
                isGlobalEditMode
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
              }`}
              title={isGlobalEditMode ? '切换到查看模式 (Ctrl/Cmd+E)' : '切换到编辑模式 (Ctrl/Cmd+E)'}
            >
              {isGlobalEditMode ? <Edit className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}

          {visibility.hierarchyTreeToggle && (
            <button
              onClick={toggleRightPanel}
              className={`rounded-full p-2 transition-colors ${
                isTreeOpen
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="结构导航"
            >
              <Columns className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
