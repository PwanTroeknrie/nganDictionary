import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, ArrowUpToLine, BookOpen, FileSpreadsheet, Languages, Sun, Moon } from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import styles from "./App.module.css";

// ── Inline SVG Icons ────────────────────────────────────────────

const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 w-6 h-6">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

// ── Navbar ──────────────────────────────────────────────────────

const navLinks = [
  { href: "/home", label: "项目管理" },
  { href: "/dictionary", label: "词典" },
  { href: "/docs", label: "文档" },
];

function PageNavbar({ isDarkMode, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md dark:border-b-slate-700">
      <nav className="container mx-auto flex h-14 px-4 items-center justify-between">
        <a href="/hello" className="font-bold text-xl flex items-center text-gray-900 dark:text-gray-100">
          <LogoIcon />
          言典 Ngandic
        </a>

        {/* Mobile nav */}
        <span className="flex md:hidden">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="切换主题"
          >
            <Sun className="h-[1.1rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className="px-2">
              <Menu className="flex md:hidden h-5 w-5" onClick={() => setIsOpen(true)}>
                <span className="sr-only">菜单</span>
              </Menu>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="font-bold text-xl">言典 Ngandic</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                {navLinks.map(({ href, label }) => (
                  <button
                    key={label}
                    onClick={() => { navigate(href); setIsOpen(false); }}
                    className={clsx("w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300")}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { navigate("/home"); setIsOpen(false); }}
                  className="w-[110px] mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  开始使用
                </button>
                <a
                  rel="noreferrer noopener"
                  href="https://github.com/PwanTroeknrie/nganDictionary"
                  target="_blank"
                  className="flex items-center gap-2 mt-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <GitHubLogoIcon className="w-5 h-5" />
                  GitHub
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </span>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1 items-center">
          {navLinks.map(({ href, label }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800")}
            >
              {label}
            </button>
          ))}
          <div className="ml-3 flex gap-2 items-center">
            <a
              rel="noreferrer noopener"
              href="https://github.com/PwanTroeknrie/nganDictionary"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <GitHubLogoIcon className="w-4 h-4" />
              GitHub
            </a>
            <button
              onClick={() => navigate("/home")}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
            >
              开始使用
            </button>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="切换主题"
            >
              <Sun className="h-[1.1rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.1rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
          </div>
        </nav>
      </nav>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-28 gap-10 sm:pl-12">
      {/* Text */}
      <div className="text-center lg:text-start space-y-6 lg:pl-8">
        <main className="text-5xl md:text-7xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          <h1 className="inline">
            <span className={`inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text ${styles.textShimmer}`}>
              言典
            </span>
          </h1>{" "}
          <span className="text-gray-900 dark:text-gray-100">为</span>{" "}
          <h2 className="inline">
            <span className={`inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text ${styles.textShimmer}`}>
              造语
            </span>{" "}
            <span className="text-gray-900 dark:text-gray-100">开发者准备</span>
          </h2>
        </main>

        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 md:w-10/12 mx-auto lg:mx-0 leading-relaxed">
          专为造语（Conlang）爱好者打造的词典编辑与语法文档管理平台。
          支持多项目、词条树形结构、义项标注、行间标注（Interlinear Glossing）、
          Excel 导入导出，以及基于授权码的团队协作。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
          <Button
            size="lg"
            className="text-base font-semibold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all"
            onClick={() => navigate("/home")}
          >
            进入项目管理
          </Button>
          <Button
            size="lg"
            className="text-base font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            onClick={() => navigate("/dictionary?project=default")}
          >
            浏览示例词典
          </Button>
        </div>
      </div>

      {/* Green blob animation — page-level absolute positioning (original behavior) */}
    </section>
  );
}

// ── Features ────────────────────────────────────────────────────

const featureList = [
  {
    title: "词典管理",
    description:
      "创建和管理词条，支持多义项、词源派生关系、发音标注、例句与行间标注（Interlinear Glossing）。词条以树形结构展示，直观呈现词汇派生网络。",
    icon: <Languages className="w-6 h-6" />,
    accent: "from-blue-500 to-cyan-500",
  },
  {
    title: "语法文档",
    description:
      "使用 Markdown 编写构拟语言的语法文档。左侧实时渲染、右侧 CodeMirror 编辑器，支持自动生成目录大纲、标题定位，每个项目独立文档存储。",
    icon: <BookOpen className="w-6 h-6" />,
    accent: "from-purple-500 to-pink-500",
  },
  {
    title: "数据导入导出",
    description:
      "词典数据支持 Excel（.xlsx）格式的导入与导出。可跨项目迁移词汇数据，方便备份、分享与批量编辑。每行对应一个义项，自动展平/聚合。",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    accent: "from-emerald-500 to-teal-500",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div className="text-center mb-12 space-y-3">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
          核心功能
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          一站式管理你的构拟语言项目，从词汇到语法，从编辑到分享。
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {featureList.map(({ title, description, icon, accent }) => (
          <Card key={title} className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="space-y-4">
              <div className={clsx(
                "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white",
                accent
              )}>
                {icon}
              </div>
              <div>
                <CardTitle className="text-lg mb-2">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────

const faqList = [
  {
    question: "言典（Ngandic）是什么？",
    answer: "言典是一个专门为构拟语言（Conlang）爱好者设计的词典管理与语法文档编辑平台。你可以创建多个项目，管理每个项目中的词汇条目和语法文档，支持丰富的数据模型：多义项、词源派生、发音标注、例句与行间标注等。",
    value: "item-1",
  },
  {
    question: "如何创建一个新项目？",
    answer: "在项目管理页面（/home）左侧面板点击「+ 创建新项目」，填写项目名称即可。系统会自动生成两组授权码：管理码（admin_code）和编辑码（editor_code），请务必在创建后立即保存这些码——关闭窗口后无法再次查看。",
    value: "item-2",
  },
  {
    question: "授权码的作用是什么？如何协作？",
    answer: "授权码分为两级：管理码拥有全部权限（查看、编辑、删除项目、导入数据），编辑码可以查看和编辑词典与文档。将对应的授权码分享给团队成员即可协作——访客（无码）只能以只读模式查看。",
    value: "item-3",
  },
  {
    question: "支持哪些数据格式的导入导出？",
    answer: "词典数据支持 Excel（.xlsx / .xls）格式的导入和导出。导出时每个义项对应一行，方便在 Excel 中批量编辑后再导入。语法文档支持 Markdown（.md）格式的上传和下载。",
    value: "item-4",
  },
  {
    question: "什么是行间标注（Interlinear Glossing）？",
    answer: "行间标注是语言学中常用的例句标注格式。言典支持 \\gla / \\glb / \\glc / \\ft 四种标注层级，分别对应原文、逐词标注、逐词翻译和自由翻译。标注会以对齐列的形式渲染，支持 dark mode。参考格式：obsidian-ling-gloss 插件。",
    value: "item-5",
  },
];

function FAQSection() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center text-gray-900 dark:text-gray-100">
          常见问题
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-10">
          关于言典的常见疑问
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqList.map(({ question, answer, value }) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger className="text-left text-gray-800 dark:text-gray-200">
                {question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-500">
        <p>言典 Ngandic — 为造语者而生</p>
        <p className="mt-1">Made with React + Flask + SQLite</p>
      </div>
    </footer>
  );
}

// ── ScrollToTop ─────────────────────────────────────────────────

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      onClick={() => window.scroll({ top: 0, left: 0, behavior: "smooth" })}
      className="fixed bottom-4 right-4 opacity-90 shadow-md z-50"
      size="icon"
    >
      <ArrowUpToLine className="h-4 w-4" />
    </Button>
  );
}

// ── HelloPage ───────────────────────────────────────────────────

export default function HelloPage({ isDarkMode, toggleTheme }) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <PageNavbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      {/* Green blob — z-index elevated above wrapper background */}
      <div className={`${styles.shadow} z-0`} style={{ zIndex: 0 }}></div>
      <HeroSection />
      <FeaturesSection />
      <FAQSection />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
