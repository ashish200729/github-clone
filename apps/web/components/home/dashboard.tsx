import { FaGithub, FaPlus, FaBars } from "react-icons/fa";
import { FiSearch, FiInbox } from "react-icons/fi";
import { BiGitRepoForked, BiStar, BiGitPullRequest } from "react-icons/bi";
import { MdOutlineMoreHoriz } from "react-icons/md";
import { LuCircleDot } from "react-icons/lu";
import { InstantLink as Link } from "@/components/navigation/instant-link";
import type { AuthenticatedAppUser } from "@/lib/auth/protection";
import type { RepoSummary } from "@/lib/repos/types";
import { TopRepositoriesPanel } from "@/components/home/top-repositories-panel";

interface DashboardProps {
  user: AuthenticatedAppUser;
  repositories: RepoSummary[];
  dashboardError?: string | null;
  dashboardPath: string;
}

export function Dashboard({ user, repositories, dashboardError, dashboardPath }: DashboardProps) {
  const feedEvents = [
    {
      actor: "maxcp-dd",
      action: "forked your repository",
      repo: "maxcp-dd/orbiteditor",
      time: "3 weeks ago",
      type: "fork",
    },
    {
      actor: "pushpkant00",
      action: "started following you",
      repo: "Pushpkant Rathore pushpkant00",
      time: "last month",
      type: "follow",
      extra: "4 repositories",
    },
  ];

  const changelog = [
    {
      title: "Figma MCP server can now generate design layers from...",
      date: "3 days ago",
    },
    {
      title: "GitHub Copilot in Visual Studio Code v1.110 -...",
      date: "3 days ago",
    },
    {
      title: "GPT-5.4 is generally available in GitHub Copilot",
      date: "3 days ago",
    },
    {
      title: "Discover and manage agent activity with new session...",
      date: "3 days ago",
    },
  ];

  return (
    <div className="min-h-screen bg-[#010409] text-[#c9d1d9] font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 bg-[#010409] border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          <button className="text-[#8b949e] hover:text-[#c9d1d9] sm:hidden">
            <FaBars size={20} />
          </button>
          <Link href="/" className="text-white hover:text-white/80">
            <FaGithub size={32} />
          </Link>
          <span className="font-semibold px-2">Dashboard</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full max-w-[320px] lg:max-w-[400px] hidden sm:block">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Type to search"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] border border-[#30363d] rounded-[4px] px-1.5 text-[10px]">
              /
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 border-l border-[#30363d] pl-2 sm:pl-4 ml-2">
            <button className="border border-[#30363d] rounded-md px-2 py-1 text-xs font-medium hover:border-[#8b949e] flex items-center gap-1">
              <FaPlus /> <span className="hidden sm:inline">▾</span>
            </button>
            <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] hidden md:block">
              <LuCircleDot size={16} />
            </button>
            <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] hidden md:block">
              <BiGitPullRequest size={16} />
            </button>
            <button className="p-1.5 rounded-md hover:bg-[#30363d] text-[#c9d1d9] relative">
              <FiInbox size={16} />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1f6feb] rounded-full ring-2 ring-[#010409]"></div>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#1f6feb] overflow-hidden ml-1 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 border border-[#30363d]">
              {user.image ? (
                <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">{user.name?.charAt(0).toUpperCase() || "A"}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full flex flex-col md:flex-row">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-[320px] lg:w-[350px] flex-shrink-0 border-b md:border-b-0 md:border-r border-[#30363d] bg-[#0d1117] py-6 px-4 md:px-6 lg:px-8">
          <TopRepositoriesPanel
            user={user}
            repositories={repositories}
            dashboardError={dashboardError}
            ownerPageHref={dashboardPath}
          />
        </aside>

        {/* Center Content */}
        <main className="flex-1 min-w-0 py-6 px-4 md:pl-8 md:pr-6 lg:pl-10 lg:pr-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Home</h1>
          </div>

          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-sm font-semibold">Feed</h2>
            <button className="text-xs text-[#c9d1d9] hover:bg-[#30363d] flex items-center gap-1.5 border border-[#30363d] px-3 py-1.5 rounded-md bg-[#21262d] transition-colors shadow-sm font-medium">
              <FiSearch size={14} /> Filter
            </button>
          </div>

          {/* Feed Items */}
          <div className="space-y-4">
            {feedEvents.map((evt, idx) => (
               <div key={idx} className="border border-[#30363d] rounded-xl bg-[#0d1117] overflow-hidden shadow-sm">
                 <div className="p-4 flex items-start gap-3">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2ea043] to-[#8a2be2] overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                     <span className="text-xs text-white font-bold">{evt.actor.charAt(0).toUpperCase()}</span>
                     <div className="absolute -bottom-1 -right-1 bg-[#1f6feb] text-white text-[10px] p-0.5 rounded-full border border-[#0d1117]">
                       {evt.type === 'fork' ? <BiGitRepoForked /> : <FaPlus />}
                     </div>
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="text-[14px] text-[#8b949e] flex items-center justify-between">
                       <div>
                         <span className="font-semibold text-[#c9d1d9]">{evt.actor}</span> {evt.action}
                       </div>
                       <span className="cursor-pointer hover:text-white p-1 rounded-md hover:bg-[#30363d]"><MdOutlineMoreHoriz size={18} /></span>
                     </div>
                     <div className="text-[12px] text-[#8b949e] mt-0.5">{evt.time}</div>
                     
                     <div className="mt-4 flex items-center justify-between bg-[#0d1117] border border-[#30363d] rounded-xl p-4 shadow-sm">
                       <div className="flex items-center gap-2">
                         <div className="text-[#8b949e]"><BiGitRepoForked size={18} /></div>
                         <a href="#" className="font-semibold text-[15px] text-[#c9d1d9] hover:text-[#58a6ff] hover:underline truncate">
                           {evt.repo}
                         </a>
                       </div>
                       <button className="border border-[#30363d] rounded-md px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] hover:border-[#8b949e] text-xs font-medium flex items-center gap-1 transition-colors shadow-sm">
                         <span className="text-[#8b949e]"><BiStar size={14} /></span> {evt.type === 'follow' ? 'Follow' : 'Star'} <span className="text-[#8b949e] ml-1">▾</span>
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
            ))}
          </div>

          <div className="mt-8 border-t border-[#30363d] pt-6">
             <div className="flex items-center justify-between">
               <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                 <span className="text-[#8b949e]"><BiGitRepoForked /></span> Trending repositories · <a href="#" className="text-[#58a6ff] hover:underline font-normal text-[13px]">See more</a>
               </h3>
               <span className="text-[#8b949e] cursor-pointer p-1 rounded-md hover:text-white hover:bg-[#30363d]"><MdOutlineMoreHoriz size={18} /></span>
             </div>
             
             <div className="mt-4 border border-[#30363d] rounded-xl bg-[#0d1117] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <div className="text-[#8b949e]"><BiGitRepoForked size={18} /></div>
                     <a href="#" className="font-semibold text-[15px] text-[#c9d1d9] hover:text-[#58a6ff] hover:underline">
                       paperclipai/paperclip
                     </a>
                   </div>
                   <button className="border border-[#30363d] rounded-md px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] hover:border-[#8b949e] text-xs font-medium flex items-center gap-1 transition-colors shadow-sm">
                     <span className="text-[#8b949e]"><BiStar size={14} /></span> Star <span className="text-[#8b949e] ml-1">▾</span>
                   </button>
                </div>
                <p className="text-[#8b949e] text-[13px] ml-[26px]">Open-source orchestration for zero-human companies</p>
             </div>
          </div>
        </main>

        {/* Right Sidebar - Changelog */}
        <aside className="hidden lg:block w-[320px] flex-shrink-0 py-6 pr-4 md:pr-6 lg:pr-8">
          <div className="border border-[#30363d] rounded-xl bg-[#0d1117] p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold mb-5">Latest from our changelog</h2>
            <div className="relative border-l-2 border-[#21262d] ml-1.5 space-y-5">
              {changelog.map((item, idx) => (
                <div key={idx} className="relative pl-5">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#30363d] ring-4 ring-[#0d1117]"></div>
                  <div className="text-[12px] text-[#8b949e] mb-1">{item.date}</div>
                  <a href="#" className="text-[14px] font-semibold text-[#c9d1d9] hover:text-[#58a6ff] leading-snug block group-hover:underline">
                    {item.title}
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4">
              <a href="#" className="text-[#8b949e] hover:text-[#58a6ff] text-[12px] flex items-center gap-1 hover:underline">
                View changelog →
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
