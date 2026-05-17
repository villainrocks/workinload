/* This code fixed By Tg:@ImxCodex */
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-700/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-violet-700/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg w-full text-center relative z-10 animate-fade-in">
        {/* 404 graphic */}
        <div className="relative mb-8">
          <p className="text-[120px] md:text-[160px] font-black text-slate-900 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
              <Compass size={36} className="text-blue-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-3">Page not found</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          The page <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-xs">{pathname}</code> doesn't exist.
        </p>
        <p className="text-slate-600 text-sm mb-8">
          It may have been moved, deleted, or you may have typed the URL incorrectly.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700
              text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-all"
          >
            <ArrowLeft size={15} /> Go back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
              text-white text-sm font-medium transition-all shadow-lg shadow-blue-900/30"
          >
            <Home size={15} /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
