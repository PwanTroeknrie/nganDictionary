import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

/**
 * 搜索框组件 (依赖注入版本)
 * @param {Object} props
 * @param {Array} props.entries - 完整的词条数据数组
 * @param {Function} props.onSelectEntry - (必须) 选中结果时调用的函数 (接收 lemma)
 * @param {Function} props.onEntrySearch - (必须) 执行搜索的 Hook 函数
 * @param {string} props.customFont - (新增) 当前应用的自定义字体名称
 */
const SearchBar = ({
    entries,
    onSelectEntry,
    onEntrySearch,
    customFont // <-- 接收 customFont
}) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  // *** 关键状态 ***
  const [isComposing, setIsComposing] = useState(false);
  const searchContainerRef = useRef(null);
  const resultsListRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  if (typeof onEntrySearch !== 'function' || typeof onSelectEntry !== 'function') {
    console.error("SearchBar requires 'onEntrySearch' and 'onSelectEntry' props.");
    return null;
  }

  // 使用传入的 Hook 执行搜索，并将 isComposing 传递进去
  // Hook 会利用 isComposing 来决定是否执行实际的 Fuse.js 搜索
  const results = onEntrySearch(entries, query, isComposing);

  // 1. 自动清除高亮索引
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  // 2. 点击外部区域时隐藏结果
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
        const focusedInput = searchContainerRef.current.querySelector('input:focus');
        if (focusedInput) {
            focusedInput.blur();
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleResultClick = useCallback((lemma) => {
    if (onSelectEntry) {
        onSelectEntry(lemma);
    }

    setQuery(lemma);
    setShowResults(false);

    const focusedInput = searchContainerRef.current?.querySelector('input:focus');
    if (focusedInput) {
      focusedInput.blur();
    }

  }, [onSelectEntry]);

  const handleKeyDown = useCallback((e) => {
    if (!results || results.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = (prev + 1) % results.length;
          resultsListRef.current?.children[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = (prev - 1 + results.length) % results.length;
          resultsListRef.current?.children[newIndex]?.scrollIntoView({ block: 'nearest' });
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleResultClick(results[highlightedIndex].lemma);
        }
        break;
      case 'Escape':
        setShowResults(false);
        const focusedInput = searchContainerRef.current?.querySelector('input:focus');
        if (focusedInput) focusedInput.blur();
        break;
      default:
        break;
    }
  }, [results, highlightedIndex, handleResultClick]);


  const SearchResultsList = useMemo(() => {
    // 只有在非合成状态且有结果时才显示列表
    if (!showResults || results.length === 0 || isComposing) return null;

    // 应用自定义字体样式，并设置一个回退字体
    const listStyle = {
        fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif'
    };

    return (
        <ul
          ref={resultsListRef}
          id="search-results-list"
          className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50 text-sm"
          style={{ minWidth: '100%', ...listStyle }} // <-- 应用字体样式到列表容器
        >
          {results.map((result, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={result.lemma}
                data-lemma={result.lemma}
                onClick={() => handleResultClick(result.lemma)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  isHighlighted 
                    ? 'bg-blue-100 dark:bg-gray-700' 
                    : 'hover:bg-blue-50 dark:hover:bg-gray-600'
                }`}
              >
                <strong className="text-gray-900 dark:text-white">{result.lemma}</strong>
                <span className="ml-2 text-xs text-red-400">({result.score.toFixed(3)})</span>
                <br/>
                <span className="text-gray-600 dark:text-gray-400 truncate block text-xs">{result.preview}</span>
              </li>
            );
          })}
        </ul>
    );
  }, [showResults, results, handleResultClick, highlightedIndex, isComposing, customFont]); // 添加 customFont 到依赖数组


  const handleChange = (e) => {
    const newQuery = e.target.value;
    // 任何情况下都更新 query (即使是拼音，也需要显示在输入框中)
    setQuery(newQuery);

    // 如果不在合成中，根据新的 query 长度决定是否显示列表
    if (!isComposing) {
        if (newQuery.length > 0) {
            setShowResults(true);
        } else {
            setShowResults(false);
        }
    }
  };

  const handleFocus = () => {
    // 当输入框获得焦点时，如果 query 已经有内容并且结果非空，就显示结果列表
    if (query.length > 0 && results.length > 0) {
        setShowResults(true);
    }
  };

  const handleCompositionStart = () => {
    // 输入法合成开始
    setIsComposing(true);
    setShowResults(false); // 合成期间不显示搜索结果
  };

  const handleCompositionEnd = (e) => {
    // 输入法合成结束
    setIsComposing(false);

    // 手动更新 query 为最终汉字值（虽然 onChange 也更新了，但这是确保）
    setQuery(e.target.value);

    // 合成结束后，如果输入框有内容，显示结果（搜索将在 Hook 中自动触发）
    if (e.target.value.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };


  return (
    <div ref={searchContainerRef}>
        {/* Large Screen Search Bar */}
        <div className="relative hidden sm:block">
            <input
                type="text"
                placeholder="搜索词条..."
                value={query}
                onChange={handleChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                style={{ fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif' }} // <-- 应用字体到输入框
            />
            {/* 使用 Search 组件，并确保 z-10 和垂直居中 */}
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 z-10" />

            {SearchResultsList}
        </div>

        {/* Floating Search Bar (Mobile) */}
        <div className="sm:hidden fixed top-20 left-0 right-0 px-4 pb-4 z-10">
            <div className="relative">
                <input
                    type="text"
                    placeholder="搜索词条..."
                    value={query}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 dark:text-gray-300 dark:bg-gray-700/20 backdrop-blur-sm shadow-xl border border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 transition-all"
                    style={{ fontFamily: customFont ? `${customFont}, sans-serif` : 'sans-serif' }} // <-- 应用字体到移动端输入框
                />
                {/* 使用 Search 组件，并确保 z-10 和垂直居中 */}
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 z-10" />

                {SearchResultsList}
            </div>
        </div>
    </div>
  );
};

export default SearchBar;