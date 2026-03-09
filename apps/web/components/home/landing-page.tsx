"use client";

import Link from "next/link";
import { FaGithub, FaChevronRight } from "react-icons/fa";
import { Search, Bot, Code2, ShieldCheck, GitPullRequest, Globe } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Navigation = () => (
  <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#040d21]/80 backdrop-blur-md border-b border-white/10">
    <div className="flex items-center gap-6">
      <Link href="/" className="text-white hover:text-white/80 transition-colors">
        <FaGithub size={32} />
      </Link>
      <nav className="hidden lg:flex items-center gap-5 text-[15px] font-semibold">
        <button className="hover:text-white/70 transition-colors">Product</button>
        <button className="hover:text-white/70 transition-colors">Solutions</button>
        <button className="hover:text-white/70 transition-colors">Resources</button>
        <button className="hover:text-white/70 transition-colors">Open Source</button>
        <button className="hover:text-white/70 transition-colors">Enterprise</button>
        <button className="hover:text-white/70 transition-colors">Pricing</button>
      </nav>
    </div>
    <div className="flex items-center gap-4">
      <div className="relative hidden md:block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search or jump to..."
          className="w-[240px] bg-[#161b22]/50 border border-white/20 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all backdrop-blur-md"
        />
      </div>
      <Link href="/sign-in" className="text-[15px] font-semibold hover:text-white/70 hidden sm:block transition-colors">
        Sign in
      </Link>
      <Link href="/sign-up" className="border border-white/20 rounded-md px-3 py-1.5 text-[15px] font-semibold hover:border-white transition-all">
        Sign up
      </Link>
    </div>
  </header>
);

const Hero = () => {
  return (
    <section className="relative pt-36 pb-24 px-6 sm:px-12 lg:px-24 flex flex-col items-center justify-center text-center mx-auto min-h-[90vh]">
      {/* Glow Effects */}
      <div className="absolute top-[20%] -z-10 w-[800px] h-[800px] bg-[#79c0ff]/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none animate-pulse" />
      <div className="absolute top-[10%] -z-10 w-[600px] h-[600px] bg-[#d2a8ff]/20 rounded-full blur-[150px] mix-blend-screen right-[-10%] pointer-events-none animate-pulse" />

      <motion.div 
        className="border border-[#d2a8ff]/30 bg-[#d2a8ff]/10 text-[#d2a8ff] px-4 py-1.5 rounded-full text-sm font-semibold mb-8 flex items-center gap-2 cursor-pointer hover:bg-[#d2a8ff]/20 transition-colors"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <span>Introducing GitHub Copilot Workspace</span>
        <FaChevronRight size={10} />
      </motion.div>

      <motion.h1 
        className="text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] leading-[1.0] font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      >
        Let's build from here
      </motion.h1>
      
      <motion.p 
        className="text-xl md:text-[28px] text-[#7d8590] mb-12 max-w-4xl font-medium tracking-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      >
        The world's leading AI-powered developer platform.
      </motion.p>
      
      <motion.div 
        className="flex flex-col sm:flex-row items-center w-full max-w-[850px] bg-[#ffffff10] p-2 rounded-full border border-[#ffffff20] backdrop-blur-md relative z-10 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)] focus-within:ring-2 focus-within:ring-white/40 focus-within:bg-[#ffffff15] transition-all"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
      >
        <div className="flex-1 flex items-center pr-2 pl-4 w-full">
          <input 
            type="email" 
            placeholder="Email address" 
            className="flex-1 bg-transparent border-0 outline-none text-white px-2 py-4 md:py-5 text-lg md:text-xl w-full font-medium placeholder:text-[#7d8590] focus:ring-0"
          />
        </div>
        <button className="bg-[#2ea043] hover:bg-[#2c974b] text-white px-8 py-4 md:py-5 rounded-full font-bold text-[17px] transition-all w-full sm:w-auto shrink-0 shadow-[0_0_20px_rgba(46,160,67,0.4)] hover:shadow-[0_0_30px_rgba(46,160,67,0.6)]">
          Sign up for GitHub
        </button>
        <div className="hidden sm:block w-[1px] h-10 bg-[#ffffff20] mx-4"></div>
        <button className="bg-transparent hover:bg-white/5 border border-white/20 text-white px-8 py-4 md:py-5 rounded-full font-bold text-[17px] transition-all w-full sm:w-auto shrink-0 whitespace-nowrap hidden sm:block">
          Start a free enterprise trial
        </button>
      </motion.div>
    </section>
  );
};

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="min-h-screen bg-[#040d21] text-white font-sans overflow-x-hidden selection:bg-[#79c0ff]/30" ref={containerRef}>
      <Navigation />
      
      <main className="relative">
        <Hero />

        {/* Global Connecting Line Container */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          {/* Connecting Line */}
          <div className="absolute left-6 md:left-12 top-0 bottom-0 w-[3px] bg-[#ffffff10] rounded-full hidden md:block z-0">
            <motion.div 
              className="w-full bg-gradient-to-b from-[#79c0ff] via-[#d2a8ff] to-[#2ea043] rounded-full origin-top shadow-[0_0_15px_rgba(210,168,255,0.6)]"
              style={{ height: lineHeight }}
            />
          </div>

          {/* Productivity Section */}
          <section className="relative pt-12 pb-32 md:pl-24" id="productivity">
            <motion.div 
               className="mb-12 relative"
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.6 }}
            >
              {/* Node on the line */}
              <div className="absolute -left-[54px] top-2 w-[11px] h-[11px] rounded-full border-[3px] border-[#040d21] bg-[#79c0ff] z-10 hidden md:block shadow-[0_0_15px_rgba(121,192,255,0.8)]" />
              
              <h2 className="text-[2rem] md:text-[3rem] font-bold leading-tight mb-6">
                <span className="text-white">Productivity</span> <br className="hidden md:block" />
                <span className="text-[#3fb950]">Accelerate high-quality software development.</span>
              </h2>
              <p className="text-[#7d8590] text-xl md:text-2xl max-w-2xl font-medium">
                Our AI-powered platform drives innovation with tools that boost developer velocity.
              </p>
            </motion.div>

            {/* Interactive Editor Window */}
            <motion.div 
              className="rounded-2xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-[#161b22] px-4 py-3 flex items-center justify-between border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="text-[#8b949e] text-xs font-mono font-semibold flex items-center gap-2">
                  <Bot size={14} className="text-[#d2a8ff]" />
                  github-copilot
                </div>
              </div>
              <div className="p-6 md:p-10 font-mono text-[13px] md:text-[15px] leading-loose overflow-x-auto text-[#e6edf3] bg-gradient-to-b from-[#0d1117] to-[#161b22]/50 relative min-h-[400px]">
                <div className="flex">
                  <div className="text-[#6e7681] pr-6 select-none border-r border-[#30363d] mr-6 text-right">
                    1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10
                  </div>
                  <div>
                      <span className="text-[#ff7b72]">import</span> {'{'} useState, useEffect {'}'} <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'react'</span>;{'\n\n'}
                      <span className="text-[#ff7b72]">export function</span> <span className="text-[#d2a8ff]">useDebounce</span>{'<'}T{'>'}(value: T, delay: <span className="text-[#79c0ff]">number</span>) {'{\n'}
                      {'  '} <span className="text-[#ff7b72]">const</span> [debouncedValue, setDebouncedValue] = <span className="text-[#d2a8ff]">useState</span>(value);{'\n\n'}
                      {'  '} <span className="text-[#d2a8ff]">useEffect</span>(() <span className="text-[#ff7b72]">=&gt;</span> {'{\n'}
                      {'    '} <span className="text-[#8b949e] italic">{`// Update debounced value after delay`}</span>{'\n'}
                      {'    '} <span className="text-[#ff7b72]">const</span> handler = <span className="text-[#d2a8ff]">setTimeout</span>(() <span className="text-[#ff7b72]">=&gt;</span> {'{\n'}
                      {'      '} <span className="text-[#d2a8ff]">setDebouncedValue</span>(value);{'\n'}
                      {'    '}, delay);{'\n\n'}
                      {'    '} <span className="text-[#ff7b72]">return</span> () <span className="text-[#ff7b72]">=&gt;</span> <span className="text-[#d2a8ff]">clearTimeout</span>(handler);{'\n'}
                      {'  }'}, [value, delay]);{'\n\n'}
                  </div>
                </div>

                {/* Copilot Suggestion Box Overlay */}
                <motion.div 
                  className="absolute bottom-10 right-10 bg-[#21262d] border border-[#30363d] rounded-xl p-5 shadow-2xl max-w-sm"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center gap-3 mb-3 text-sm font-semibold text-white">
                    <div className="p-1.5 rounded-lg bg-white/10">
                      <Bot size={16} className="text-[#d2a8ff]" />
                    </div>
                    <span>GitHub Copilot</span>
                  </div>
                  <p className="text-[#8b949e] text-sm leading-relaxed mb-4">
                    Copilot has suggested a complete custom hook implementation with proper TypeScript generics and cleanup.
                  </p>
                  <button className="w-full bg-white/10 hover:bg-white/20 transition-colors text-white py-2 rounded-md font-semibold text-sm">
                    Accept Suggestion
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </section>

          {/* Security Section */}
          <section className="relative pt-12 pb-32 md:pl-24" id="security">
            <motion.div 
               className="mb-12 relative"
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.6 }}
            >
              <div className="absolute -left-[54px] top-2 w-[11px] h-[11px] rounded-full border-[3px] border-[#040d21] bg-[#d2a8ff] z-10 hidden md:block shadow-[0_0_15px_rgba(210,168,255,0.8)]" />
              
              <h2 className="text-[2rem] md:text-[3rem] font-bold leading-tight mb-6">
                <span className="text-white">Security</span> <br className="hidden md:block"/>
                <span className="text-[#d2a8ff]">Secure every step automatically.</span>
              </h2>
              <p className="text-[#7d8590] text-xl md:text-2xl max-w-2xl font-medium">
                Embed security across the developer workflow so teams can secure code in minutes.
              </p>
            </motion.div>

            <motion.div
               className="relative overflow-hidden rounded-2xl border border-[#30363d] bg-[#0d1117] p-8 md:p-12 shadow-2xl"
               initial={{ opacity: 0, y: 50 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               viewport={{ once: true, margin: "-100px" }}
            >
               <div className="absolute inset-0 bg-gradient-to-tr from-[#d2a8ff]/10 to-transparent blur-3xl -z-10" />
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[#d2a8ff]/20 flex items-center justify-center border border-[#d2a8ff]/30">
                    <ShieldCheck className="text-[#d2a8ff]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">GitHub Advanced Security</h3>
                    <p className="text-[#7d8590] text-sm">Vulnerability found in dependency</p>
                  </div>
               </div>
               
               <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-6">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <span className="bg-[#e5534b]/20 text-[#ff7b72] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#e5534b]/30">Critical</span>
                     <span className="text-[#e6edf3] font-semibold text-sm">SQL Injection potential</span>
                   </div>
                   <span className="text-[#7d8590] text-xs">Copilot Autofix</span>
                 </div>
                 <p className="text-[#8b949e] text-sm mb-4 line-clamp-2">This query directly concatenates user input, exposing the database to SQL injection attacks. Use parameterized queries instead.</p>
                 
                 <div className="space-y-2 font-mono text-sm leading-relaxed overflow-x-auto">
                   <div className="flex bg-[#e5534b]/10 border border-[#e5534b]/20 rounded-md p-3">
                     <span className="text-[#ff7b72] mr-4 select-none">-</span>
                     <span className="text-[#e6edf3]">db.query(<span className="text-[#a5d6ff]">`SELECT * FROM users WHERE name = '<span className="text-white bg-[#e5534b]/30">{"${req.query.name}"}</span>'`</span>)</span>
                   </div>
                   <div className="flex bg-[#2ea043]/10 border border-[#2ea043]/20 rounded-md p-3">
                     <span className="text-[#3fb950] mr-4 select-none">+</span>
                     <span className="text-[#e6edf3]">db.query(<span className="text-[#a5d6ff]">'SELECT * FROM users WHERE name = ?'</span>, [req.query.name])</span>
                   </div>
                 </div>
               </div>
               
               <button className="inline-flex items-center gap-2 font-bold text-[#d2a8ff] hover:text-[#e2c5ff] transition-colors group">
                 Explore GitHub Advanced Security 
                 <FaChevronRight className="group-hover:translate-x-1 transition-transform" size={12} />
               </button>
            </motion.div>
          </section>

          {/* Collaboration Section */}
          <section className="relative pt-12 pb-32 md:pl-24" id="collaboration">
            <motion.div 
               className="mb-12 relative"
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.6 }}
            >
              <div className="absolute -left-[54px] top-2 w-[11px] h-[11px] rounded-full border-[3px] border-[#040d21] bg-[#ff7b72] z-10 hidden md:block shadow-[0_0_15px_rgba(255,123,114,0.8)]" />
              
              <h2 className="text-[2rem] md:text-[3rem] font-bold leading-tight mb-6">
                <span className="text-white">Collaboration</span> <br className="hidden md:block"/>
                <span className="text-[#ff7b72]">Supercharge your teamwork.</span>
              </h2>
              <p className="text-[#7d8590] text-xl md:text-2xl max-w-2xl font-medium">
                Build alongside everyone, from your closest teammates to the open source community.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-8 shadow-2xl relative overflow-hidden group hover:border-[#8b949e] transition-colors"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#ff7b72]/20 flex items-center justify-center border border-[#ff7b72]/30 mb-6">
                  <GitPullRequest className="text-[#ff7b72]" size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Pull Requests</h3>
                <p className="text-[#8b949e]">Review code, catch bugs early, and maintain a high standard of code quality alongside your team.</p>
              </motion.div>

              <motion.div
                className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-8 shadow-2xl relative overflow-hidden group hover:border-[#8b949e] transition-colors"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#79c0ff]/20 flex items-center justify-center border border-[#79c0ff]/30 mb-6">
                  <Code2 className="text-[#79c0ff]" size={24} />
                </div>
                <h3 className="text-2xl font-bold mb-3">GitHub Actions</h3>
                <p className="text-[#8b949e]">Automate your build, test, and deployment workflow with simple and secure CI/CD.</p>
              </motion.div>
            </div>
          </section>
        </div>

        {/* Global Footer / Globe Section Placeholder */}
        <section className="relative pt-32 pb-40 overflow-hidden text-center border-t border-white/10 mt-20">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center z-10 relative"
          >
            <Globe size={100} strokeWidth={1} className="text-[#79c0ff] opacity-50 mb-8" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight">
              Over 100 million developers <br/> call GitHub home
            </h2>
            <Link href="/sign-up" className="bg-white hover:bg-gray-200 text-black px-10 py-5 rounded-full font-bold text-lg transition-all shadow-xl">
              Create a free account
            </Link>
          </motion.div>
          {/* Globe glow */}
          <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#79c0ff]/20 rounded-[100%] blur-[100px] -z-10" />
        </section>
      </main>
    </div>
  );
}