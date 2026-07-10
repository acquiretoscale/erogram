import type { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import './telegram-vip-btn.css';

const title = 'Telegram VIP Button Preview';
const description = 'Exact replica of the ENTRAR NO GRUPO DO TELEGRAM VIP button.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/telegram-vip-btn`,
    type: 'website',
  }),
};

export default function TelegramVipBtnPage() {
  return (
    <main className="page">
        <div className="tracking-btn">
          <a className="button" id="tracking-url" href="#" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-star" />
            <span className="tracking-label">ENTRAR NO GRUPO DO TELEGRAM</span>
            <span className="vip-badge">VIP</span>
          </a>
        </div>
    </main>
  );
}
