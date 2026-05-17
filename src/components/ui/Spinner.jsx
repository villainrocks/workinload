/* This code fixed By Tg:@ImxCodex */
const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin ${className}`} />
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0d0f14]">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-slate-500 text-sm">Loading…</p>
    </div>
  </div>
);

export default Spinner;
