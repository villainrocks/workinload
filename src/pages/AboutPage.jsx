/* This code fixed By Tg:@ImxCodex */
import { 
  Info, 
  BookOpen, 
  Send, 
  ScrollText, 
  ToggleLeft, 
  Zap, 
  Smartphone,
  ShieldCheck,
  MousePointer2
} from 'lucide-react';
import Card from '../components/ui/Card';

const AboutPage = () => {
  return (
    <div className="flex flex-col gap-8 pb-16 animate-fade-in max-w-[1000px] mx-auto px-1">
      {/* Hero Section */}
      <div className="text-center py-6 sm:py-10">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/5">
          <Info size={32} className="text-blue-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">About NexusPanel Advance By Codex</h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed px-4">
          A professional-grade automation tool designed for secure, efficient, and randomized multi-account management. 
          Follow this guide to master all features and optimize your workflow.
        </p>
      </div>

      {/* Guide Section */}
      <div className="space-y-12">
        
        {/* 1. Receipt Broadcast */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Send size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Receipt Broadcast Guide</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-0.5">Step-by-step distribution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900/20 border-slate-800/50">
              <Card.Body className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ToggleLeft size={18} />
                  </div>
                  <h3 className="font-bold text-slate-200">Single vs Multi Selection</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  NexusPanel Advance By Codex allows you to work in two modes:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2.5 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span><strong>Single Mode:</strong> Focus on one account at a time for detailed configuration.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span><strong>Multi Mode:</strong> Select multiple accounts for mass broadcasting and bulk actions.</span>
                  </li>
                </ul>
              </Card.Body>
            </Card>

            <Card className="bg-slate-900/20 border-slate-800/50">
              <Card.Body className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Zap size={18} />
                  </div>
                  <h3 className="font-bold text-slate-200">Receipt Sending Process</h3>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">1</span>
                      <p className="text-xs text-slate-300 font-medium">Configure amount, date, and journal prefix.</p>
                   </div>
                   <div className="flex items-center gap-3 p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">2</span>
                      <p className="text-xs text-slate-300 font-medium">Select target groups for each source account.</p>
                   </div>
                   <div className="flex items-center gap-3 p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                      <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">3</span>
                      <p className="text-xs text-slate-300 font-medium">Click <strong>Preview</strong> to verify the receipt image.</p>
                   </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </section>

        {/* 2. Number Drop */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <ScrollText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Number Drop Guide</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-0.5">Automated account distribution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-5">
                <div className="flex items-start gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                   <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-blue-400 shadow-inner">
                      <MousePointer2 size={18} />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-slate-200 mb-1">Configuration</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Go to the <strong>Configuration</strong> tab in Number Drop. Set a permanent bank account number and select the specific groups where this number should be dropped.
                      </p>
                   </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                   <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Smartphone size={18} />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-slate-200 mb-1">Execution</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        In the <strong>Execute</strong> tab, select your accounts and start the sequence. The system will automatically cycle through all targets.
                      </p>
                   </div>
                </div>
             </div>

             <Card className="bg-blue-600/5 border-blue-500/20">
                <Card.Body className="p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={20} className="text-blue-400" />
                      <h3 className="font-bold text-blue-200">How it Works (Safety)</h3>
                   </div>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Randomization</p>
                         <p className="text-xs text-slate-400 leading-relaxed">
                            Tasks are shuffled completely randomly to ensure different accounts send messages at different times.
                         </p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Human Delay</p>
                         <p className="text-xs text-slate-400 leading-relaxed">
                            A variable delay of 2 to 15 seconds is added between messages to prevent Telegram rate-limiting.
                         </p>
                      </div>
                   </div>
                </Card.Body>
             </Card>
          </div>
        </section>

        {/* 3. Summary Steps */}
        <section className="bg-slate-950/50 rounded-3xl border border-slate-800 p-6 sm:p-8">
           <div className="flex items-center gap-3 mb-8">
              <BookOpen size={24} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Summary Steps</h2>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                 <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-slate-100 border border-slate-800">1</div>
                 <p className="text-sm font-bold text-slate-200">Connect Accounts</p>
                 <p className="text-xs text-slate-500 leading-relaxed">Add your Telegram accounts in the Accounts tab to begin.</p>
              </div>
              <div className="space-y-3">
                 <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-slate-100 border border-slate-800">2</div>
                 <p className="text-sm font-bold text-slate-200">Set Configuration</p>
                 <p className="text-xs text-slate-500 leading-relaxed">Fill in receipt details and set your preferred destinations.</p>
              </div>
              <div className="space-y-3">
                 <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-sm font-black text-slate-100 border border-slate-800">3</div>
                 <p className="text-sm font-bold text-slate-200">Run Automation</p>
                 <p className="text-xs text-slate-500 leading-relaxed">Use the Broadcast or Drop tools to start the automated process.</p>
              </div>
           </div>
        </section>
      </div>

      {/* Footer Support */}
      <div className="text-center pt-8 border-t border-slate-800/50 space-y-2">
         <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">NexusPanel Advance By Codex v2.0 • Advanced Automation System</p>
         <p className="text-xs text-slate-500 font-medium">
            Proudly built by <span className="text-blue-400 font-bold">Anovation</span>
         </p>
      </div>
    </div>
  );
};

export default AboutPage;
