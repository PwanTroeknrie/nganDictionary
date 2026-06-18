import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Edit, Eye, ListIcon, Columns, Home, FileText, TypeIcon, TableIcon, StatsIcon
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
    statsNav: true,
    wordlistToggle: true,
    fontInputToggle: true,
    editModeToggle: true,
    hierarchyTreeToggle: true,
    themeToggle: true,
  };
  const visibility = { ...defaultVisibility, ...buttonVisibility };
  const navButtonClass = 'rounded-full p-1.5 transition-colors sm:p-2';
  const navIconClass = 'h-4 w-4 sm:h-5 sm:w-5';

  return (
    <header className="fixed left-0 top-0 z-20 w-full border-b border-gray-200 bg-white shadow-lg transition-colors dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1 px-2 sm:h-16 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          {visibility.wordlistToggle && (
            <button
              onClick={toggleLeftPanel}
              className={`${navButtonClass} ${
                isWordListOpen
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="词条列表"
            >
              <ListIcon className={navIconClass} />
            </button>
          )}

          <h1 className="hidden items-center gap-2 text-xl font-extrabold text-gray-800 dark:text-blue-400 xl:flex">
            <span className="text-2xl">📖</span>
            <span>词典构建器</span>
          </h1>

          <SearchBar
            entries={entries}
            onEntrySearch={useEntrySearch}
            onSelectEntry={onSearchSelect}
            customFont={customFont}
          />
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {visibility.fontInputToggle && (
            <button
              onClick={() => setIsFontInputVisible(prev => !prev)}
              className={`${navButtonClass} ${
                isFontInputVisible
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="自定义字体"
            >
              <TypeIcon className={navIconClass} />
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
              className="hidden w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:block lg:w-32"
              style={{ fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif' }}
            />
          )}

          {visibility.morphologyNav && (
            <button
              onClick={() => navigate(`/morphology?project=${projectId}`)}
              className={`${navButtonClass} text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700`}
              title="变格表管理"
            >
              <TableIcon className={navIconClass} />
            </button>
          )}

          {visibility.statsNav && (
            <button
              onClick={() => navigate(`/stats?project=${projectId}`)}
              className={`${navButtonClass} text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700`}
              title="数据统计"
            >
              <StatsIcon className={navIconClass} />
            </button>
          )}

          {visibility.homeNav && (
            <button
              onClick={() => navigate('/home')}
              className={`${navButtonClass} text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700`}
              title="主页"
            >
              <Home className={navIconClass} />
            </button>
          )}

          {visibility.docNav && (
            <button
              onClick={() => navigate(`/docs?project=${projectId}`)}
              className={`${navButtonClass} text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700`}
              title="文档"
            >
              <FileText className={navIconClass} />
            </button>
          )}

          {visibility.themeToggle && (
            <button
              onClick={toggleTheme}
              className={`${navButtonClass} text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700`}
              title={isDarkMode ? '切换到亮色主题' : '切换到暗色主题'}
            >
              {isDarkMode ? <Sun className={navIconClass} /> : <Moon className={navIconClass} />}
            </button>
          )}

          {visibility.editModeToggle && (
            <button
              onClick={toggleGlobalEditMode}
              className={`${navButtonClass} ${
                isGlobalEditMode
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
              }`}
              title={isGlobalEditMode ? '切换到查看模式 (Ctrl/Cmd+E)' : '切换到编辑模式 (Ctrl/Cmd+E)'}
            >
              {isGlobalEditMode ? <Edit className={navIconClass} /> : <Eye className={navIconClass} />}
            </button>
          )}

          {visibility.hierarchyTreeToggle && (
            <button
              onClick={toggleRightPanel}
              className={`${navButtonClass} ${
                isTreeOpen
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="结构导航"
            >
              <Columns className={navIconClass} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
