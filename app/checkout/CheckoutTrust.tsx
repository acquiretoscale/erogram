import TrustedByLeaders from '@/app/advertise/TrustedByLeaders';

export default function CheckoutTrust() {
  return (
    <div className="mt-4 overflow-hidden" style={{ border: '3px solid #000000', boxShadow: '4px 4px 0px #000000' }}>
      <TrustedByLeaders variant="onlyfans" embedded compact />
    </div>
  );
}