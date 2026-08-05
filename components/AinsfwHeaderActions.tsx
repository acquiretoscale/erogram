import Link from 'next/link';
import InlineSocialShare from '@/components/InlineSocialShare';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';

type AinsfwHeaderActionsProps = {
  shareText: string;
  emailSubject: string;
  fallbackUrl: string;
  part?: 'all' | 'submit' | 'share';
};

export default function AinsfwHeaderActions({
  shareText,
  emailSubject,
  fallbackUrl,
  part = 'all',
}: AinsfwHeaderActionsProps) {
  const showShare = part === 'all' || part === 'share';
  const showSubmit = part === 'all' || part === 'submit';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {showShare && (
        <InlineSocialShare
          shareText={shareText}
          emailSubject={emailSubject}
          fallbackUrl={fallbackUrl}
        />
      )}
      {showSubmit && (
        <Link
          href="/add/ainsfw"
          className={ainsfwCtaButtonClass('header')}
        >
          SUBMIT YOUR TOOL
        </Link>
      )}
    </div>
  );
}
