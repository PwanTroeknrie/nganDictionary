import React from 'react';
import { PlusIcon, XIcon, ArrowRight } from './Icons.jsx';

const HierarchyTree = ({ entry, isOpen, onAddSense, onDeleteSense, canEdit = false }) => {
  const widthClass = isOpen ? 'w-full sm:w-64' : 'w-0';
  const containerClass = `${widthClass} p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-full overflow-y-auto scrollbar-custom flex-shrink-0 transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`;

  if (!entry) {
    return (
      <div className={containerClass}>
        <h2 className="mb-3 border-b border-gray-200 pb-2 text-lg font-bold text-gray-800 dark:border-gray-600 dark:text-white">
          层级结构
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">选择词条后显示结构导航。</p>
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
    const mainContent = document.querySelector('main.flex-1');
    window.history.replaceState(null, '', `#${id}`);

    if (element && mainContent) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = mainContent.getBoundingClientRect();
      const targetScrollTop = mainContent.scrollTop + elementRect.top - containerRect.top;
      mainContent.scrollTo({ top: targetScrollTop - 20, behavior: 'smooth' });
    }
  };

  return (
    <div className={containerClass}>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-gray-800 dark:border-gray-600 dark:text-white">
        <span className="font-word">{entry.word}</span> 结构导航
      </h2>

      {canEdit && (
        <button
          onClick={onAddSense}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2 text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-lg"
        >
          <PlusIcon className="h-5 w-5" />
          添加新义项
        </button>
      )}

      <ul className="space-y-1">
        {sections.map((section, index) => (
          <li key={index} className="group">
            {section.isSenseHeader ? (
              <div className="mt-3 mb-1 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                  {section.name}
                </span>
                {canEdit && (
                  <button
                    onClick={() => onDeleteSense(section.sense_id)}
                    className="rounded-full p-1 text-red-500 opacity-0 transition-opacity hover:bg-red-200 group-hover:opacity-100 dark:hover:bg-red-800"
                    title={`删除 ${section.name}`}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => scrollToSection(section.id)}
                className="flex w-full items-center rounded-lg p-2 pl-4 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ArrowRight className="mr-2 h-4 w-4 text-blue-500 transition-transform group-hover:translate-x-0.5" />
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
