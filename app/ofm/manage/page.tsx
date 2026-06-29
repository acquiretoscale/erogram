import OFMNav from '../OFMNav';
import OFMManage from '../OFMManage';

export default function OFMManagePage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <OFMNav active="manage" />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <OFMManage />
      </div>
    </div>
  );
}
