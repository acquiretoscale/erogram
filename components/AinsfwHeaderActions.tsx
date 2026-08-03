import Link from 'next/link';
import InlineSocialShare from '@/components/InlineSocialShare';

type AinsfwHeaderActionsProps = {
  shareText: string;
  emailSubject: string;
  fallbackUrl: string;
};

export default function AinsfwHeaderActions({ shareText, emailSubject, fallbackUrl }: AinsfwHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <InlineSocialShare
        shareText={shareText}
        emailSubject={emailSubject}
        fallbackUrl={fallbackUrl}
      />
      <Link
        href="/add/ainsfw"
        className="flex items-center justify-center h-9 sm:h-10 w-[6.75rem] sm:w-[7.5rem] rounded-md bg-[#22c55e] border-2 border-black text-black text-[9px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap text-center px-1 shadow-[3px_3px_0_#000] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none shrink-0"
      >
        SUBMIT YOUR TOOL
      </Link>
    </div>
  );
}
