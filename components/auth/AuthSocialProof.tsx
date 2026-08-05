'use client';

export default function AuthSocialProof({
  totalUsers,
  avatars,
  isAinsfwTheme = false,
}: {
  totalUsers: number;
  avatars: string[];
  isAinsfwTheme?: boolean;
}) {
  if (!totalUsers) return null;

  const bg = isAinsfwTheme ? '#22c55e' : '#00AFF0';

  return (
    <div
      className="-mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-4 px-4 py-3 sm:px-5 sm:py-3.5 rounded-t-2xl flex items-center justify-center gap-2.5 sm:gap-3"
      style={{ background: bg }}
    >
      <div className="flex -space-x-2 shrink-0">
        {avatars.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white/90 shadow-sm"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
      <span className="text-[11px] sm:text-sm font-semibold text-white leading-tight text-center">
        Join{' '}
        <span className="font-black">{totalUsers.toLocaleString('en-US')}</span>{' '}
        happy Erogram users
      </span>
    </div>
  );
}
