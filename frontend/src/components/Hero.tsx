import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
// import { useTheme } from "@/components/theme-provider.tsx";

export const Hero = () => {
  // 保持 useTheme 导入，即使它在这个组件中不直接修改样式
  // const { theme, setTheme } = useTheme();

  return (
    //    这些类会根据父级 HTML 上的 class="dark" 自动切换主题色
    <section
      className="container grid lg:grid-cols-2 place-items-center py-28 gap-10 bg-background text-foreground sm:pl-12"
    >

      {/* 文字容器：增加 padding 和右移 */}
      <div className="text-center lg:text-start space-y-6 lg:pl-8 lg:translate-x-4">

        {/* 主标题：增大字号 */}
        <main className="text-6xl md:text-7xl font-bold">
          <h1 className="inline">
            {/* 渐变色保持不变，不受主题影响 */}
            <span className="inline bg-gradient-to-r from-[#F596D3]  to-[#D247BF] text-transparent bg-clip-text">
              言典
            </span>{" "}
            欢迎页面
          </h1>{" "}
          为{" "}
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              造语
            </span>{" "}
            开发者准备
          </h2>
        </main>

        {/* 描述文字：使用 text-muted-foreground，它也会自动响应主题 */}
        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Build your React landing page effortlessly with the required sections
          to your project.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">

           <Button className="w-full md:w-1/3 md:-translate-x-4">
               <a
              rel="noreferrer noopener"
              href="/home"
              target="_blank"
              className={`border ${buttonVariants({ variant: "secondary" })}`}
            >
                   Get Started
           </a>
           </Button>
          <a
            rel="noreferrer noopener"
            href="https://github.com/leoMirandaa/shadcn-landing-page.git"
            target="_blank"
            className={`w-full md:w-1/3 ${buttonVariants({variant: "outline"})}`}
          >
            Github Repository
            <GitHubLogoIcon className="ml-2 w-5 h-5" />
          </a>
        </div>
      </div>
      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};