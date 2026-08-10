'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ofCategoryPublicPath } from '@/lib/bestOnlyfansAccounts/boaUrls';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

const link =
  'text-[#00AFF0] hover:text-[#00D4FF] underline underline-offset-2 transition-colors';
const strong = 'text-white/80 font-semibold';

/** Bottom-of-page editorial block for /onlyfans — keyword coverage + internal links. */
export default function OnlyFansEditorialSeo() {
  const lp = useLocalePath();
  const { locale } = useTranslation();
  const boa = (slug: string) => lp(ofCategoryPublicPath(slug, locale));
  const browse = (slug: string) => lp(`/onlyfanssearch/${slug}`);

  return (
    <article className="mt-12 sm:mt-16 pt-10 sm:pt-12 border-t border-white/[0.06] max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-white/55">
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
        Finding OnlyFans Creators Without Guessing
      </h2>
      <p className="mb-4">
        OnlyFans has no real search. That is not a complaint, it is the design. The platform was built so creators own their audience and nobody else gets to browse it. Great for creators. Useless for the person sitting there at 1am who knows exactly what they want and has no idea where to find it.
      </p>
      <p className="mb-4">
        So people improvise. They dig through Instagram hashtags. They trust a Reddit thread from 2022. They click a link in a bio and land on a page that has been dead for eight months.
      </p>
      <p className="mb-8">
        Erogram exists to end that. We index over 1,800,000 OnlyFans profiles, sort them by category, price, and location, and put them behind one search bar. Free, no OnlyFans account needed, no login to start.
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        Start With What You Actually Want
      </h2>
      <p className="mb-4">
        Nobody searches for &ldquo;content&rdquo; in the abstract. People arrive with a specific idea. So the categories are built the way people search, not the way a database wants them.
      </p>
      <ul className="mb-4 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li>
          <strong className={strong}>Physical type</strong> covers{' '}
          <Link href={boa('asian')} className={link}>Asian</Link>,{' '}
          <Link href={boa('blonde')} className={link}>Blonde</Link>,{' '}
          <Link href={boa('redhead')} className={link}>Redhead</Link>,{' '}
          <Link href={boa('petite')} className={link}>Petite</Link>,{' '}
          <Link href={boa('big-ass')} className={link}>Big Ass</Link>,{' '}
          <Link href={boa('bbw')} className={link}>BBW</Link>
        </li>
        <li>
          <strong className={strong}>Age range</strong> covers{' '}
          <Link href={boa('teen')} className={link}>Teen</Link> and{' '}
          <Link href={boa('milf')} className={link}>MILF</Link>, our two heaviest pages by traffic
        </li>
        <li>
          <strong className={strong}>Style and niche</strong> covers{' '}
          <Link href={boa('amateur')} className={link}>Amateur</Link>,{' '}
          <Link href={boa('goth')} className={link}>Goth</Link>,{' '}
          <Link href={boa('alt')} className={link}>Alt</Link>,{' '}
          <Link href={boa('cosplay')} className={link}>Cosplay</Link>,{' '}
          <Link href={boa('fitness')} className={link}>Fitness</Link>,{' '}
          <Link href={boa('joi')} className={link}>JOI</Link>,{' '}
          <Link href={boa('ahegao')} className={link}>Ahegao</Link>
        </li>
        <li>
          <strong className={strong}>Combinations</strong>, because &ldquo;Latina&rdquo; alone is 40,000 profiles and &ldquo;Big Ass Latina&rdquo; is a Friday night
        </li>
      </ul>
      <p className="mb-8">
        Stack as many filters as you want. Every one narrows live. The lists are ranked on real clicks and saves from real Erogram visitors, so what sits at the top is busy this week, not busy last spring.
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        Best Free OnlyFans Accounts, Separated Properly
      </h2>
      <p className="mb-4">
        Free is the most misunderstood word on OnlyFans. A free page can still cost you forty dollars in pay-per-view messages before you notice. A five dollar page can be everything unlocked.
      </p>
      <p className="mb-3">Our price filter splits that honestly:</p>
      <ul className="mb-4 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li>
          <strong className={strong}>Truly free subscriptions</strong>, sorted by popularity, on the{' '}
          <Link href={lp('/onlyfanssearch/best')} className={link}>best free OnlyFans hub</Link>
        </li>
        <li>
          <strong className={strong}>Free plus category</strong>, so you can pull{' '}
          <Link href={browse('big-boobs')} className={link}>free big boobs</Link> or free ebony without wading through paid tiers
        </li>
        <li>
          <strong className={strong}>Maximum price</strong>, for people with a budget and no patience
        </li>
      </ul>
      <p className="mb-8">
        Amateur and Teen skew heavily free. Findom and Latex skew paid. You can see that at a glance instead of learning it one disappointing subscription at a time.
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        Make a Free Profile. This Is the Part People Skip.
      </h2>
      <p className="mb-4">
        You can browse Erogram forever without registering. Most people do. Then they find eleven creators they like, close the tab, and spend the following week trying to remember the name of the one they actually wanted.
      </p>
      <p className="mb-3">An account fixes that in about forty seconds:</p>
      <ul className="mb-4 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li><strong className={strong}>Save any creator with one tap.</strong> They land in your Saved tab and stay there.</li>
        <li><strong className={strong}>Filter your own collection</strong> by category once it grows past twenty.</li>
        <li><strong className={strong}>Hide what you have already seen</strong>, so repeat visits show new faces instead of the same top ten.</li>
        <li><strong className={strong}>Get a trending feed shaped by your taste</strong> rather than the generic one.</li>
        <li><strong className={strong}>Keep it across devices.</strong> Phone at night, desktop later, same list.</li>
      </ul>
      <p className="mb-4">
        <Link href="/join-erogram?redirect=/onlyfans" className={link}>Create your free Erogram account.</Link>{' '}
        No card, no OnlyFans login, nothing shared.
      </p>
      <p className="mb-8">
        And if you want the curated half of the site,{' '}
        <Link href="/premium" className={link}>Erogram Premium</Link>{' '}
        opens the vault we deliberately keep out of the public feed. Hand-picked, verified, and not indexed anywhere.
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        Trending Is Velocity, Not Legacy
      </h2>
      <p className="mb-4">
        Our{' '}
        <Link href="/trending" className={link}>trending page</Link>{' '}
        ranks on movement, not lifetime totals. Five hundred clicks in a day beats ten thousand clicks spread over two years.
      </p>
      <p className="mb-8">
        This matters for two reasons. If you are browsing, you see who is actually hot right now instead of a frozen hall of fame. If you are a creator, you are not locked out because someone else has a four year head start. Featured Creators is the other half of discovery: editorially chosen, refreshed weekly, judged on profile quality and consistency rather than who paid the most.
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        For Creators and Agencies
      </h2>
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#00AFF0]">
        This section is the reason half of you are reading.
      </p>

      <h3 className="text-lg sm:text-xl font-black text-white mb-3 tracking-tight">
        Erogram Is Traffic, Not Another Directory
      </h3>
      <p className="mb-8">
        We pass <strong className={strong}>180,000+ monthly visitors</strong> and we are growing roughly <strong className={strong}>40% month over month</strong>. That growth is mostly Google, which means it is intent traffic.
      </p>

      <h3 className="text-lg sm:text-xl font-black text-white mb-3 tracking-tight">
        A Free Creator Profile Gets You
      </h3>
      <ul className="mb-4 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li><strong className={strong}>A page that ranks.</strong> Your own indexed profile on a domain Google already trusts.</li>
        <li><strong className={strong}>A photo gallery</strong> for preview images, so people know your style before they click and are far more likely to convert when they do.</li>
      </ul>
      <p className="mb-8">
        Cost: nothing.{' '}
        <Link href="/submit" className={link}>Add your OnlyFans profile to Erogram.</Link>{' '}
        Profiles with real bios, current photos, and accurate tags outperform bare ones by a wide margin. Ten minutes of setup is the whole difference.
      </p>

      <h3 className="text-lg sm:text-xl font-black text-white mb-3 tracking-tight">
        We Work With Agencies
      </h3>
      <p className="mb-3">
        If you manage models, we have a dedicated side for you. Erogram works directly with OFM agencies and with solo creators, and the offer is the same either way: high-intent traffic from people already searching for what your models do.
      </p>
      <ul className="mb-8 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li><strong className={strong}>Multiple models under one roof</strong>, managed together rather than one form at a time</li>
        <li><strong className={strong}>Category and country placement</strong> matched to each model&apos;s niche</li>
        <li><strong className={strong}>Featured and boosted slots</strong> when you want volume fast</li>
        <li><strong className={strong}>Real reporting</strong>, so you see clicks instead of taking our word for it</li>
      </ul>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        Where to Go From Here
      </h2>
      <ul className="mb-6 space-y-2 list-disc pl-5 marker:text-[#00AFF0]">
        <li>Know the name? Use the search bar at the top.</li>
        <li>Know the vibe? Pick a category and let the ranking do the work.</li>
        <li>
          Watching your spend? Start with the{' '}
          <Link href={lp('/onlyfanssearch/best')} className={link}>best free OnlyFans accounts</Link>.
        </li>
        <li>
          Want to keep what you find?{' '}
          <Link href="/join-erogram?redirect=/onlyfans" className={link}>Make the free account.</Link>
        </li>
        <li>
          Creator or agency?{' '}
          <Link href="/submit" className={link}>Get listed.</Link>
        </li>
      </ul>
      <p className="mb-10">
        OnlyFans will probably never build proper search. It is not in their interest. So we built it, we keep it current, and we point it back at the creators. That is the entire arrangement.
      </p>

      <footer className="flex items-center gap-5 pt-6 border-t border-white/[0.08]">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-[#00AFF0]/30 shrink-0">
          <Image
            src="/assets/blog/authors/eros.webp"
            alt="Enzo Delacroix"
            width={128}
            height={128}
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div>
          <p className="text-white font-bold text-base sm:text-lg">Enzo Delacroix</p>
          <p className="text-white/40 text-sm sm:text-base">Chief Editor, Erogram</p>
        </div>
      </footer>
    </article>
  );
}
