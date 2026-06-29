import OFMNav from './OFMNav';
import OFMDashboard from './OFMDashboard';

export default function OFMPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <OFMNav active="dashboard" />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <OFMDashboard />
      </div>
    </div>
  );
}
