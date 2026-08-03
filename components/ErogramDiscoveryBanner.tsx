import Image from 'next/image';

const PAGE_BG = '#04140c';

type Props = {
  embedded?: boolean;
  /** corners = thin edge + corner fade only; edges = wider side fades */
  edgeFade?: 'none' | 'corners' | 'edges';
};

export default function ErogramDiscoveryBanner({
  embedded = false,
  edgeFade = embedded ? 'corners' : 'none',
}: Props) {
  return (
    <div
      className={`relative w-full ${embedded ? 'mb-6 sm:mb-8' : 'pt-[88px] sm:pt-[96px] pb-3 sm:pb-5'}`}
    >
      <div className="relative mx-auto w-full max-w-md sm:max-w-lg px-4 sm:px-6">
        <div className="relative w-full">
          <Image
            src="/assets/erogram-discovery-hub-banner.webp"
            alt="EROGRAM Adult Entertainment Discovery Hub"
            width={1024}
            height={225}
            priority={!embedded}
            sizes="(max-width: 640px) 360px, 480px"
            className={`w-full h-auto block ${embedded ? '' : 'opacity-60'}`}
          />
          {edgeFade !== 'none' && (
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {edgeFade === 'corners' ? (
                <>
                  <div
                    className="absolute top-0 left-0 w-5 h-5 sm:w-7 sm:h-7"
                    style={{ background: `radial-gradient(circle at 0 0, ${PAGE_BG} 0%, transparent 72%)` }}
                  />
                  <div
                    className="absolute top-0 right-0 w-5 h-5 sm:w-7 sm:h-7"
                    style={{ background: `radial-gradient(circle at 100% 0, ${PAGE_BG} 0%, transparent 72%)` }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-5 h-5 sm:w-7 sm:h-7"
                    style={{ background: `radial-gradient(circle at 0 100%, ${PAGE_BG} 0%, transparent 72%)` }}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 sm:w-7 sm:h-7"
                    style={{ background: `radial-gradient(circle at 100% 100%, ${PAGE_BG} 0%, transparent 72%)` }}
                  />
                  <div
                    className="absolute inset-x-0 top-0 h-[4%]"
                    style={{ background: `linear-gradient(to bottom, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[5%]"
                    style={{ background: `linear-gradient(to top, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 w-[4%]"
                    style={{ background: `linear-gradient(to right, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-[4%]"
                    style={{ background: `linear-gradient(to left, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-y-0 left-0 w-[14%] sm:w-[10%]"
                    style={{ background: `linear-gradient(to right, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-[14%] sm:w-[10%]"
                    style={{ background: `linear-gradient(to left, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-x-0 top-0 h-[12%]"
                    style={{ background: `linear-gradient(to bottom, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[14%]"
                    style={{ background: `linear-gradient(to top, ${PAGE_BG} 0%, transparent 100%)` }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
