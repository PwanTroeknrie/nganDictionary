// src/hooks/useShortcuts.jsx
import { useHotkeys } from 'react-hotkeys-hook';

/**
 * 词条编辑相关的快捷键 Hook。
 */
export const useShortcuts = ({
  editingSection,
  saveDefinitions,
  saveTempEdit,
  cancelEdit,
  cancelTempEdit,
  addDefinition,
  scrollToTop,
}) => {

  /** -------------------------------
   * 1. Ctrl + U → 全局 Scroll to Top
   --------------------------------*/
  useHotkeys(
    'ctrl+u, cmd+u',
    (e) => {
      e.preventDefault();
      scrollToTop?.(); // 增加安全调用
      console.log('Ctrl+U Activated');
    },
    { enableOnFormTags: true },
    [scrollToTop]
  );


  /** -------------------------------
   * 2. Ctrl + S → 保存
   --------------------------------*/
  useHotkeys(
    'ctrl+s, cmd+s',
    (e) => {
      e.preventDefault();
      console.log('Ctrl+S Activated');

      if (editingSection === 'definitions') {
        saveDefinitions?.();
      } else if (editingSection) {
        saveTempEdit?.();
      }
    },
    { enableOnFormTags: true },
    [editingSection, saveDefinitions, saveTempEdit]
  );


  /** -------------------------------
   * 3. Ctrl + Q → 取消编辑
   --------------------------------*/
  useHotkeys(
    'ctrl+q, cmd+q',
    (e) => {
      if (!editingSection) return;
      e.preventDefault();

      if (editingSection === 'definitions') {
        cancelEdit?.();
      } else {
        cancelTempEdit?.();
      }
    },
    { enableOnFormTags: true },
    [editingSection, cancelEdit, cancelTempEdit]
  );


  /** -------------------------------
   * 4. Ctrl + N → 添加新释义
   --------------------------------*/
  useHotkeys(
    'ctrl+n, cmd+n',
    (e) => {
      if (editingSection === 'definitions') {
        e.preventDefault();
        addDefinition?.();
      }
    },
    { enableOnFormTags: true },
    [editingSection, addDefinition]
  );
};

export default useShortcuts;
