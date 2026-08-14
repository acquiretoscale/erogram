'use client';

import { useState } from 'react';

const BORDER = 'rgba(43,27,40,0.12)';
const GOLD = '#c9973a';
const GOLD_LIGHT = '#e8ba5a';
const GOLD_DEEP = '#8a6820';
const PLUM = '#2B1B28';

export default function CommunityMemberAvatar({
  photoUrl,
  name,
  premium,
}: {
  photoUrl: string | null;
  name: string;
  premium?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();
  const ring = premium
    ? {
        padding: 2,
        borderRadius: 9999,
        background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD} 45%, ${GOLD_DEEP})`,
        boxShadow: `0 0 0 1px rgba(201,151,58,0.25), 0 6px 16px -8px rgba(0,175,240,0.35)`,
      }
    : undefined;

  const inner = !photoUrl || failed ? (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border"
      style={{
        backgroundColor: premium ? '#1a2a3a' : 'rgba(43,27,40,0.08)',
        borderColor: premium ? 'transparent' : BORDER,
        color: premium ? GOLD_LIGHT : PLUM,
      }}
    >
      {initial}
    </div>
  ) : (
    <img
      src={photoUrl}
      alt={name}
      className="w-14 h-14 rounded-full object-cover border"
      style={{ borderColor: premium ? 'transparent' : BORDER }}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );

  if (!premium) return inner;
  return <div style={ring}>{inner}</div>;
}
