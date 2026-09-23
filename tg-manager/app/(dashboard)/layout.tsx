import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
