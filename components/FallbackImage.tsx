'use client';

import React, { useState } from 'react';
import Image from 'next/image';

import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';

interface FallbackImageProps {
    src: string | null | undefined;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
    priority?: boolean;
}

/**
 * Client-only image that shows a placeholder when the image fails to load.
 * Use this in Server Components where Next Image cannot use onError.
 */
export default function FallbackImage({
    src,
    alt,
    fill = true,
    className,
    sizes,
    priority,
}: FallbackImageProps) {
    const validSrc = (src && typeof src === 'string' && src.startsWith('https://')) ? src : PLACEHOLDER_IMAGE_URL;
    const [imageSrc, setImageSrc] = useState(validSrc);

    return (
        <Image
            src={imageSrc}
            alt={alt}
            fill={fill}
            className={className}
            sizes={sizes}
            priority={priority}
            onError={() => setImageSrc(PLACEHOLDER_IMAGE_URL)}
        />
    );
}
