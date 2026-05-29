import React from 'react';
import { PlusIcon, XIcon, ArrowRight } from './Icons.jsx'; // 导入图标

const HierarchyTree = ({ entry, isOpen, onAddSense, onDeleteSense }) => {
  const widthClass = isOpen ? 'w-full sm:w-64' : 'w-0';

  // Bug Fix: Use isOpen to control 'hidden'
  const containerClass = `${widthClass} p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-full overflow-y-auto scrollbar-custom flex-shrink-0 transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`;

  if (!entry) {
    return (
      <div className={containerClass}>
        <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-600">
          层级结构
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">选择词条后显示层级。</p>
      </div>
    );
  }

  const sections = entry.senses.flatMap((sense) => [
    { id: `sense-${sense.sense_id}`, name: `义项 ${sense.sense_id} (${sense.displayed_tag})`, isSenseHeader: true, sense_id: sense.sense_id },
    { id: `entry-section-pronunciation-${sense.sense_id}`, name: '发音 / Pronunciation' },
    { id: `entry-section-etymology-${sense.sense_id}`, name: '词源 / Etymology' },
    { id: `entry-section-definitions-${sense.sense_id}`, name: '释义与用法' },
    { id: `entry-section-morphology-${sense.sense_id}`, name: '形态学 / 图表' },
    { id: `entry-section-derivation-${sense.sense_id}`, name: '派生词 / Derivation' },
  ]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    // 确保在 'main' 元素内滚动
    const mainContent = document.querySelector('main.flex-1');

    // 更新 URL hash
    window.history.replaceState(null, '', `#${id}`);

    if (element && mainContent) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = mainContent.getBoundingClientRect();
        const targetScrollTop = mainContent.scrollTop + elementRect.top - containerRect.top;
        const offset = 20;

        mainContent.scrollTo({
            top: targetScrollTop - offset,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className={containerClass}>
      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-600">
        <span className="font-word">{entry.word}</span> 结构导航
      </h2>

      {/* Add New Sense Button */}
      <button
        onClick={onAddSense}
        className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-xl mb-4 hover:bg-green-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        <PlusIcon className="w-5 h-5" />
        添加新义项
      </button>

      <ul className="space-y-1">
        {sections.map((section, index) => (
          <li key={index} className="group">
            {section.isSenseHeader ? (
                 <div className="flex justify-between items-center mt-3 mb-1 border-t pt-2 border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                        {section.name}
                    </span>
                    {/* Delete Sense Button */}
                    <button
                        onClick={() => onDeleteSense(section.sense_id)}
                        className="p-1 rounded-full text-red-500 hover:bg-red-200 dark:hover:bg-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`删除 ${section.name}`}
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                 </div>
            ) : (
                <button
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center text-left w-full p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium pl-4"
                >
                    <ArrowRight className="w-4 h-4 mr-2 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                    {section.name}
                </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HierarchyTree;