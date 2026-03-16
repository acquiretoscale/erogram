export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#b31b1b] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#999] text-sm">Loading...</p>
      </div>
    </div>
  );
}
