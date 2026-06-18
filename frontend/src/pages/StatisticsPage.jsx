import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Home,
  Moon,
  StatsIcon,
  Sun,
  TableIcon,
} from '../components/Icons.jsx';
import { projectStore } from '../store/projectStore.js';

const API_BASE_URL = '/api/projects';

const navButtonClass = 'rounded-full p-1.5 transition-colors sm:p-2';
const navIconClass = 'h-4 w-4 sm:h-5 sm:w-5';
const cardClass = 'rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';
const subtleCardClass = 'rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60';

const asArray = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value || '').trim();
const chars = (value) => Array.from(text(value)).filter(char => char.trim());
const percent = (value, total) => total ? Math.round((value / total) * 100) : 0;
const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const bump = (map, key, amount = 1) => {
  const normalized = text(key) || '未标注';
  map.set(normalized, (map.get(normalized) || 0) + amount);
};

const topEntries = (map, limit = 8) => (
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .slice(0, limit)
);

const tokenize = (value) => (
  text(value)
    .toLowerCase()
    .match(/[\p{L}\p{N}\uE000-\uF8FF]+/gu) || []
);

const hasMorphology = (sense) => (
  sense?.morphology && typeof sense.morphology === 'object' && Object.keys(sense.morphology).length > 0
);

const isGlossExample = (value) => /\\gla\s/m.test(String(value || ''));

const affixKey = (word, side, size) => {
  const letters = chars(word);
  if (letters.length < size + 1) return '';
  return side === 'prefix' ? letters.slice(0, size).join('') : letters.slice(-size).join('');
};

const buildStats = (entries, morphologyConfig) => {
  const senses = entries.flatMap(entry => asArray(entry.senses).map(sense => ({ entry, sense })));
  const definitions = senses.flatMap(({ entry, sense }) => (
    asArray(sense.definitions).map(definition => ({ entry, sense, definition }))
  ));
  const examples = definitions.flatMap(({ entry, sense, definition }) => (
    asArray(definition.examples).map(example => ({ entry, sense, definition, example }))
  ));

  const posMap = new Map();
  const tagMap = new Map();
  const tagPairMap = new Map();
  const charMap = new Map();
  const initialMap = new Map();
  const finalMap = new Map();
  const prefixMap = new Map();
  const suffixMap = new Map();
  const morphologyMap = new Map();
  const derivedIncoming = new Map();
  const derivedOutgoing = new Map();
  const wordCounts = new Map();
  const definitionTokens = [];

  entries.forEach((entry) => {
    const word = text(entry.word);
    if (word) bump(wordCounts, word.toLowerCase());
    chars(word).forEach(char => bump(charMap, char));
    const letters = chars(word);
    if (letters.length) {
      bump(initialMap, letters[0]);
      bump(finalMap, letters[letters.length - 1]);
    }
    [2, 3].forEach((size) => {
      const prefix = affixKey(word, 'prefix', size);
      const suffix = affixKey(word, 'suffix', size);
      if (prefix) bump(prefixMap, prefix);
      if (suffix) bump(suffixMap, suffix);
    });
  });

  senses.forEach(({ entry, sense }) => {
    bump(posMap, sense.displayed_tag || '未标注');
    const tags = [sense.displayed_tag, ...asArray(sense.tags)].map(text).filter(Boolean);
    tags.forEach(tag => bump(tagMap, tag));
    tags.forEach((tag, index) => {
      tags.slice(index + 1).forEach(other => bump(tagPairMap, [tag, other].sort().join(' + ')));
    });

    asArray(sense.derived_from).forEach((source) => {
      bump(derivedOutgoing, entry.word || '未命名词条');
      bump(derivedIncoming, source);
    });
    asArray(sense.derived_to).forEach(target => bump(derivedIncoming, entry.word || target));

    if (hasMorphology(sense)) {
      bump(morphologyMap, sense.morphology.generator || '自定义/旧格式');
    }
  });

  definitions.forEach(({ definition }) => {
    definitionTokens.push(...tokenize(definition.text));
  });
  examples.forEach(({ example }) => {
    definitionTokens.push(...tokenize(example));
  });

  const wordLengths = entries.map(entry => chars(entry.word).length).filter(Boolean);
  const lengthBins = [
    ['1-3', wordLengths.filter(value => value >= 1 && value <= 3).length],
    ['4-6', wordLengths.filter(value => value >= 4 && value <= 6).length],
    ['7-9', wordLengths.filter(value => value >= 7 && value <= 9).length],
    ['10-12', wordLengths.filter(value => value >= 10 && value <= 12).length],
    ['13+', wordLengths.filter(value => value >= 13).length],
  ];

  const duplicateWords = [...wordCounts.entries()].filter(([, count]) => count > 1);
  const sensesWithDefinitions = senses.filter(({ sense }) => asArray(sense.definitions).some(def => text(def.text))).length;
  const sensesWithExamples = senses.filter(({ sense }) => asArray(sense.definitions).some(def => asArray(def.examples).some(example => text(example)))).length;
  const sensesWithIpa = senses.filter(({ sense }) => text(sense.ipa)).length;
  const entriesWithTransliteration = entries.filter(entry => text(entry.transliteration)).length;
  const sensesWithMorphology = senses.filter(({ sense }) => hasMorphology(sense)).length;
  const glossExamples = examples.filter(({ example }) => isGlossExample(example)).length;

  const uniqueTokens = new Set(definitionTokens);
  const schemaCount = asArray(morphologyConfig?.categories?.schemas).length;
  const classCount = asArray(morphologyConfig?.classes?.classes).length;

  const qualityItems = [
    { label: '缺少释义的义项', value: senses.length - sensesWithDefinitions },
    { label: '缺少 IPA 的义项', value: senses.length - sensesWithIpa },
    { label: '缺少转写的词条', value: entries.length - entriesWithTransliteration },
    { label: '重复词形', value: duplicateWords.length },
    { label: '没有例句的义项', value: senses.length - sensesWithExamples },
  ].filter(item => item.value > 0);

  return {
    counts: {
      entries: entries.length,
      senses: senses.length,
      definitions: definitions.length,
      examples: examples.length,
      tags: tagMap.size,
      characters: charMap.size,
      schemas: schemaCount,
      classes: classCount,
    },
    coverage: {
      definitions: percent(sensesWithDefinitions, senses.length),
      examples: percent(sensesWithExamples, senses.length),
      ipa: percent(sensesWithIpa, senses.length),
      transliteration: percent(entriesWithTransliteration, entries.length),
      morphology: percent(sensesWithMorphology, senses.length),
      gloss: percent(glossExamples, examples.length),
    },
    averages: {
      sensesPerEntry: avg(entries.map(entry => asArray(entry.senses).length)),
      definitionsPerSense: avg(senses.map(({ sense }) => asArray(sense.definitions).length)),
      examplesPerSense: avg(senses.map(({ sense }) => asArray(sense.definitions).reduce((sum, def) => sum + asArray(def.examples).length, 0))),
      wordLength: avg(wordLengths),
      medianWordLength: median(wordLengths),
      typeTokenRatio: definitionTokens.length ? uniqueTokens.size / definitionTokens.length : 0,
    },
    lists: {
      pos: topEntries(posMap, 12),
      tags: topEntries(tagMap, 12),
      tagPairs: topEntries(tagPairMap, 8),
      characters: topEntries(charMap, 16),
      initials: topEntries(initialMap, 8),
      finals: topEntries(finalMap, 8),
      prefixes: topEntries(prefixMap, 8),
      suffixes: topEntries(suffixMap, 8),
      morphology: topEntries(morphologyMap, 8),
      productiveBases: topEntries(derivedIncoming, 8),
      derivedOutgoing: topEntries(derivedOutgoing, 8),
      duplicates: duplicateWords.slice(0, 8),
      lengthBins,
      qualityItems,
    },
  };
};

const MetricCard = ({ label, value, detail }) => (
  <div className={cardClass}>
    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    {detail && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail}</p>}
  </div>
);

const BarList = ({ items, total, empty = '暂无数据' }) => {
  if (!items.length) return <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  const max = Math.max(...items.map(([, value]) => value), 1);
  return (
    <div className="space-y-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-800 dark:text-gray-100">{label}</span>
            <span className="shrink-0 text-gray-500 dark:text-gray-400">{value}{total ? ` / ${percent(value, total)}%` : ''}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const CoverageList = ({ coverage }) => {
  const items = [
    ['释义覆盖', coverage.definitions],
    ['例句覆盖', coverage.examples],
    ['IPA 覆盖', coverage.ipa],
    ['转写覆盖', coverage.transliteration],
    ['形态表覆盖', coverage.morphology],
    ['IGT 例句占比', coverage.gloss],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className={subtleCardClass}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
            <span className="text-gray-500 dark:text-gray-400">{value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default function StatisticsPage({ isDarkMode, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = new URLSearchParams(location.search).get('project') || 'default';
  const [entries, setEntries] = useState([]);
  const [morphologyConfig, setMorphologyConfig] = useState(null);
  const [status, setStatus] = useState('正在读取统计数据...');
  const [error, setError] = useState('');

  useEffect(() => {
    projectStore.setProject(projectId);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus('正在读取统计数据...');
      setError('');
      try {
        const [entriesResponse, morphologyResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/${projectId}/entries`),
          fetch(`${API_BASE_URL}/${projectId}/morphology/config`),
        ]);
        const entriesData = await entriesResponse.json().catch(() => []);
        const morphologyData = await morphologyResponse.json().catch(() => null);
        if (!entriesResponse.ok) throw new Error(entriesData.error || '词条数据读取失败');
        if (!cancelled) {
          setEntries(Array.isArray(entriesData) ? entriesData : []);
          setMorphologyConfig(morphologyResponse.ok ? morphologyData : null);
          setStatus('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '统计数据读取失败');
          setStatus('');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const stats = useMemo(() => buildStats(entries, morphologyConfig), [entries, morphologyConfig]);

  return (
    <div className={`flex min-h-screen flex-col bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 ${isDarkMode ? 'dark' : ''}`}>
      <header className="fixed left-0 top-0 z-20 w-full border-b border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1 px-2 sm:h-16 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <button onClick={() => navigate(`/dictionary?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="返回词典">
              <ArrowLeft className={navIconClass} />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <StatsIcon className={`${navIconClass} text-blue-600 dark:text-blue-300`} />
              <h1 className="hidden truncate text-lg font-bold xl:block">数据统计</h1>
              <span className="hidden rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300 xl:inline">{projectId}</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button onClick={() => navigate('/home')} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="主页">
              <Home className={navIconClass} />
            </button>
            <button onClick={() => navigate(`/docs?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="文档">
              <FileText className={navIconClass} />
            </button>
            <button onClick={() => navigate(`/morphology?project=${projectId}`)} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="变格表管理">
              <TableIcon className={navIconClass} />
            </button>
            <button onClick={toggleTheme} className={`${navButtonClass} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700`} title="主题">
              {isDarkMode ? <Sun className={navIconClass} /> : <Moon className={navIconClass} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 pb-8 pt-20 sm:pt-24">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">Corpus Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold">计算语言学概览</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            这里按当前项目实时汇总词典结构、标注覆盖、形态学配置、构词网络和词形分布。它不是审稿报告，更像一个随时提醒你语料哪里稠密、哪里空着的仪表盘。
          </p>
          {status && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{status}</p>}
          {error && <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="词条" value={stats.counts.entries} detail={`平均 ${stats.averages.sensesPerEntry.toFixed(2)} 个义项/词条`} />
          <MetricCard label="义项" value={stats.counts.senses} detail={`平均 ${stats.averages.definitionsPerSense.toFixed(2)} 条释义/义项`} />
          <MetricCard label="例句" value={stats.counts.examples} detail={`平均 ${stats.averages.examplesPerSense.toFixed(2)} 条例句/义项`} />
          <MetricCard label="字符库存" value={stats.counts.characters} detail={`${stats.counts.schemas} schema / ${stats.counts.classes} class`} />
        </section>

        <section className={cardClass}>
          <h3 className="mb-4 text-lg font-semibold">标注覆盖率</h3>
          <CoverageList coverage={stats.coverage} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">词性分布</h3>
            <BarList items={stats.lists.pos} total={stats.counts.senses} />
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">标签与共现</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <BarList items={stats.lists.tags} total={stats.counts.senses} />
              <BarList items={stats.lists.tagPairs} empty="暂无标签共现" />
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className={cardClass}>
            <h3 className="mb-1 text-lg font-semibold">词形长度</h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              平均 {stats.averages.wordLength.toFixed(1)} 字符，中位数 {stats.averages.medianWordLength.toFixed(1)}。
            </p>
            <BarList items={stats.lists.lengthBins} total={stats.counts.entries} />
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">常见首尾字符</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <BarList items={stats.lists.initials} />
              <BarList items={stats.lists.finals} />
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">疑似词缀线索</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <BarList items={stats.lists.prefixes} />
              <BarList items={stats.lists.suffixes} />
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">形态学覆盖</h3>
            <BarList items={stats.lists.morphology} total={stats.counts.senses} empty="还没有词条配置形态表" />
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">构词网络</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-300">高生产力来源</h4>
                <BarList items={stats.lists.productiveBases} empty="暂无 derived_from 数据" />
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-300">派生关系较多词条</h4>
                <BarList items={stats.lists.derivedOutgoing} empty="暂无派生关系" />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">字符频率</h3>
            <BarList items={stats.lists.characters} />
          </section>

          <section className={cardClass}>
            <h3 className="mb-4 text-lg font-semibold">数据质量提醒</h3>
            {stats.lists.qualityItems.length ? (
              <div className="space-y-3">
                {stats.lists.qualityItems.map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                    <span className="font-medium text-amber-900 dark:text-amber-100">{item.label}</span>
                    <span className="text-amber-700 dark:text-amber-200">{item.value}</span>
                  </div>
                ))}
                {stats.lists.duplicates.length > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    重复词形示例：{stats.lists.duplicates.map(([word, count]) => `${word} x${count}`).join('，')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">目前没有明显的数据空洞。</p>
            )}
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
              释义/例句 token type-token ratio：{stats.averages.typeTokenRatio.toFixed(3)}。这个值越高，说明释义与例句词汇越分散；越低，说明描述语言更集中。
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
