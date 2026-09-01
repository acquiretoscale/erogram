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
};

export default function AinsfwHeaderActions({
  shareText,
  emailSubject,
  fallbackUrl,
  part = 'all',
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
          href={lp('/add/ainsfw')}
          className={ainsfwCtaButtonClass('header')}
        >
          {t('ainsfw.submitYourTool', 'SUBMIT YOUR TOOL')}
        </Link>
      )}
    </div>
  );
}
