'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const PLACEHOLDER = '/assets/image.jpg';

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
    const [imageSrc, setImageSrc] = useState(src || PLACEHOLDER);

    return (
        <Image
            src={imageSrc}
            alt={alt}
            fill={fill}
            className={className}
            sizes={sizes}
            priority={priority}
            onError={() => setImageSrc(PLACEHOLDER)}
        />
    );
}
