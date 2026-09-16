'use client';

import { useState } from 'react';

type FaqObfuscatedEmailProps = {
  local: string;
  domain: string;
  label?: string;
};

export default function FaqObfuscatedEmail({ local, domain, label = 'email' }: FaqObfuscatedEmailProps) {
  const [revealed, setRevealed] = useState(false);
  const address = `${local}@${domain}`;

  function openMail() {
    setRevealed(true);
    window.location.href = `mailto:${address}`;
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={openMail}
        className="text-[#c0392f] underline underline-offset-2 decoration-[#c0392f]/40 hover:text-[#a93226]"
      >
        click for {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openMail}
      className="text-[#c0392f] underline underline-offset-2"
    >
      {address}
    </button>
  );
}
