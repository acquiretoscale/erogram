import Link from 'next/link';
import Image from 'next/image';
import type { BestFreeCreatorEntry } from '@/lib/onlyfans/bestFreeArticle/types';
import { missingFactHints } from '@/lib/onlyfans/bestFreeArticle/factHints';

const link =
  'text-[#00AFF0] hover:text-[#00D4FF] underline underline-offset-2 transition-colors';
const strong = 'text-white/85 font-semibold';
const h3 = 'text-lg sm:text-xl font-black text-white tracking-tight';

function fallbackIntro(entry: BestFreeCreatorEntry): string {
  const { facts } = entry;
  return facts.bioHandwritten || facts.bioDb || `${facts.name} is a free OnlyFans creator indexed on Erogram.`;
}

type Props = {
  entry: BestFreeCreatorEntry;
};

export default function BestFreeCreatorEntry({ entry }: Props) {
  const { facts, copy } = entry;
  const intro = copy?.intro || fallbackIntro(entry);
  const hints = missingFactHints(facts);

  return (
    <section
      id={`creator-${facts.username}`}
      className="scroll-mt-24 pt-10 sm:pt-12 border-t border-white/[0.06]"
    >
      <div className="flex items-start gap-4 mb-4">
        {facts.avatar ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden ring-2 ring-[#00AFF0]/25 shrink-0">
            <Image
              src={facts.avatar}
              alt={facts.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#00AFF0] mb-1">
            #{facts.rank}
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            <Link href={facts.profileUrl} className="hover:text-[#00AFF0] transition-colors">
              {facts.name}
            </Link>
            {copy?.tagline ? (
              <span className="text-white/50 font-bold text-base sm:text-lg"> — {copy.tagline}</span>
            ) : null}
          </h2>
          <p className="text-sm text-white/40 mt-1">@{facts.username}</p>
        </div>
      </div>

      <p className="mb-5 leading-relaxed">{intro}</p>

      {copy ? (
        <>
          <h3 className={`${h3} mb-2`}>What You Get</h3>
          <ul className="mb-5 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
            {copy.whatYouGet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className={`${h3} mb-2`}>Worth Checking</h3>
          <ul className="mb-5 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
            {copy.worthChecking.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className={`${h3} mb-2`}>Why She&apos;s on This List</h3>
          <p className="mb-2 leading-relaxed">{copy.whyOnList}</p>
          <p className="mb-5">
            <strong className={strong}>Best for:</strong> {copy.bestFor}
          </p>
        </>
      ) : null}

      <h3 className={`${h3} mb-2`}>Key Strengths</h3>
      <ul className="mb-5 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li>
          <strong className={strong}>Free subscription</strong> ($0/month on Erogram index)
        </li>
        {facts.photosCount ? (
          <li>
            <strong className={strong}>{facts.photosCount.toLocaleString()} photos</strong> indexed
          </li>
        ) : null}
        {facts.videosCount ? (
          <li>
            <strong className={strong}>{facts.videosCount.toLocaleString()} videos</strong> indexed
          </li>
        ) : null}
        {facts.joinDate ? (
          <li>
            On OnlyFans since <strong className={strong}>{facts.joinDate}</strong>
          </li>
        ) : null}
        {facts.location ? (
          <li>
            Lists location: <strong className={strong}>{facts.location}</strong>
          </li>
        ) : null}
        {facts.categories.length > 0 ? (
          <li>
            Categories:{' '}
            {facts.categories.slice(0, 5).map((cat, i) => (
              <span key={cat}>
                {i > 0 ? ', ' : ''}
                <Link href={`/onlyfanssearch/${cat}`} className={link}>
                  {cat}
                </Link>
              </span>
            ))}
          </li>
        ) : null}
      </ul>

      <h3 className={`${h3} mb-2`}>Pricing</h3>
      <div className="mb-5 overflow-x-auto">
        <table className="w-full max-w-sm text-sm border border-white/10 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-white/[0.04] text-left">
              <th className="px-4 py-2 font-bold text-white/70">Plan</th>
              <th className="px-4 py-2 font-bold text-white/70">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10">
              <td className="px-4 py-2">Monthly</td>
              <td className="px-4 py-2 font-bold text-[#00AFF0]">Free</td>
            </tr>
          </tbody>
        </table>
      </div>

      {(copy?.headsUp.length || hints.length) ? (
        <>
          <h3 className={`${h3} mb-2`}>Heads Up</h3>
          <ul className="mb-5 space-y-2 list-disc pl-5 marker:text-white/30">
            {(copy?.headsUp ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {!copy?.headsUp.length
              ? hints.map((item) => (
                  <li key={item}>{item}</li>
                ))
              : null}
            <li>Free subscription does not always mean zero PPV or tips on OnlyFans.</li>
          </ul>
        </>
      ) : null}

      <p className="mb-4">
        {copy?.tip ?? (
          <>
            Open{' '}
            <Link href={facts.profileUrl} className={link}>
              {facts.name}&apos;s Erogram profile
            </Link>{' '}
            to preview tags and photos before you subscribe on OnlyFans.
          </>
        )}
      </p>

      <p>
        <Link
          href={facts.profileUrl}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-[#00AFF0] text-white text-sm font-black hover:bg-[#009AD6] transition-colors"
        >
          View {facts.name} on Erogram
        </Link>
        {facts.telegram ? (
          <>
            {' '}
            <a
              href={facts.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-2 ${link}`}
            >
              Telegram
            </a>
          </>
        ) : null}
      </p>
    </section>
  );
}
