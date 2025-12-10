import { useMemo } from 'react';
// 修复：将导入从 'fuse.js' 更改为 CDN URL，以解决模块解析错误
import Fuse from 'fuse.js'

// Helper function to safely extract and combine ALL definitions for the preview
// 遍历所有 Sense 和所有 Definition，将文本连接起来，并截断到 20 个字符。
const getPreviewText = (item) => {
  // 设定最大预览长度为 20 个字符，以保持搜索列表整洁。
  const MAX_PREVIEW_LENGTH = 20;
  let allDefinitions = [];

  try {
    if (item.senses && Array.isArray(item.senses)) {
      item.senses.forEach(sense => {
        if (sense.definitions && Array.isArray(sense.definitions)) {
          sense.definitions.forEach(definition => {
            if (definition.text) {
              allDefinitions.push(definition.text);
            }
          });
        }
      });
    }

    // 使用 " ; " 连接所有定义
    const fullText = allDefinitions.join(' ; '); // <-- 更改连接符为 " ; "

    if (fullText.length > MAX_PREVIEW_LENGTH) {
      return fullText.substring(0, MAX_PREVIEW_LENGTH) + '...';
    }
    return fullText || '无定义预览'; // 如果为空，返回默认文本
  } catch (e) {
    // 忽略格式错误的词条，返回默认文本
    return '无定义预览';
  }
};


// Fuse.js 的配置选项
const fuseOptions = {
  // 1. 定义要搜索的键 (keys) 和权重 (weight)
  keys: [
    { name: 'word', weight: 1.0 },
    { name: 'transliteration', weight: 0.7 },
    // 关键修改：递归搜索所有 sense 下的所有 definition 的 text 字段
    { name: 'senses.definitions.text', weight: 0.3 }
  ],

  // 2. 包含得分，用于排序
  includeScore: true,
  minMatchCharLength: 1,
  threshold: 0.4,
  ignoreLocation: true,
};

/**
 * 自定义 Hook，用于模糊搜索词条列表
 * @param {Array} entries - 要搜索的完整词条数组 (例如: [{ word: '...', transliteration: '...', definition: { text: '...' } }])
 * @param {string} query - 用户的搜索查询
 * @param {boolean} isComposing - (新增) 标记当前是否处于 IME 输入法合成中
 * @returns {Array} - 格式化后的搜索结果数组 (例如: [{ lemma: '...', preview: '...', score: 0.123 }])
 */
const useEntrySearch = (entries, query, isComposing) => {
  // 1. *** 优化修改：直接创建 Fuse 实例 (在每次 entries 变化时重建) ***
  //    如果词条数据频繁修改，必须在这里重新初始化 Fuse，以确保搜索结果最新。
  //    如果 entries 列表非常庞大且不常变，可以考虑使用 useMemo 并依赖于 entries。
  //    但为了保证数据最新，我们选择在 Hook 内部处理，依赖 useMemo 确保搜索逻辑性能。

  // Fuse 实例的创建是资源消耗大户，我们使用 useMemo 依赖 entries。
  // 注意：这个 useMemo 确保了在 query 改变时，Fuse 实例不会被不必要地重建，
  // 只有在 entries 列表本身 (例如用户修改或添加词条) 变化时才会重建。
  // 如果 entries 列表在每次渲染时都创建新引用，这个 useMemo 将无效。
  // 假设传入的 entries 只有在内容实际变化时才更新引用，这是 React 的标准实践。
  const fuse = useMemo(() => {
    // console.log("Rebuilding Fuse index..."); // 可以在控制台观察重建频率
    return new Fuse(entries, fuseOptions);
  }, [entries]);


  // 2. 记忆搜索结果
  return useMemo(() => {
    // 1. 如果正在合成中，立即返回空数组，不执行搜索
    if (isComposing) {
        return [];
    }

    // 2. 如果查询太短或为空，不返回结果
    if (!query || query.length < fuseOptions.minMatchCharLength) {
        return [];
    }

    // 执行搜索
    const searchResults = fuse.search(query);

    // 3. 格式化结果以匹配 SearchBar 组件的需求
    return searchResults.map(result => ({
        lemma: result.item.word, // SearchBar 需要 'lemma'
        preview: getPreviewText(result.item),
        score: result.score, // 附带得分，用于显示
        originalItem: result.item // 保留原始项目，以备后用
    }));

  }, [fuse, query, isComposing]); // 依赖项包含 fuse (它又依赖 entries) 和 query, isComposing
};

export default useEntrySearch;