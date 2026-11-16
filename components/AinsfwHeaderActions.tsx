'use client';

import Link from 'next/link';
import InlineSocialShare from '@/components/InlineSocialShare';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

type AinsfwHeaderActionsProps = {
  shareText?: string;
  emailSubject?: string;
  fallbackUrl?: string;
  part?: 'all' | 'submit' | 'share';
  submitHref?: string;
  submitLabel?: string;
};

export default function AinsfwHeaderActions({
  shareText,
  emailSubject,
  fallbackUrl,
  part = 'all',
  submitHref,
  submitLabel,
}: AinsfwHeaderActionsProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const showShare = (part === 'all' || part === 'share') && !!shareText && !!emailSubject && !!fallbackUrl;
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
          href={lp(submitHref || '/add/ainsfw')}
          className={ainsfwCtaButtonClass('header', '!bg-[#22c55e] !border-[#86efac] !ring-[#bbf7d0] hover:!bg-[#4ade80] active:!bg-[#16a34a]')}
        >
          {submitLabel || t('ainsfw.submitYourTool', 'SUBMIT YOUR TOOL')}
        </Link>
      )}
    </div>
  );
}
