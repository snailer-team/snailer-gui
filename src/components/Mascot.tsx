/**
 * Pixel Art Mascot - Snailer 캐릭터
 * A cute snail-like coding assistant with pixel art style
 */
export function Mascot({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Snail Shell - Pastel Blue Spiral */}
        <rect x="50" y="20" width="8" height="8" fill="#A7C7E7" />
        <rect x="58" y="20" width="8" height="8" fill="#A7C7E7" />
        <rect x="66" y="20" width="8" height="8" fill="#A7C7E7" />
        <rect x="74" y="20" width="8" height="8" fill="#A7C7E7" />

        <rect x="42" y="28" width="8" height="8" fill="#A7C7E7" />
        <rect x="50" y="28" width="8" height="8" fill="#B2D8B2" />
        <rect x="58" y="28" width="8" height="8" fill="#B2D8B2" />
        <rect x="66" y="28" width="8" height="8" fill="#B2D8B2" />
        <rect x="74" y="28" width="8" height="8" fill="#B2D8B2" />
        <rect x="82" y="28" width="8" height="8" fill="#A7C7E7" />

        <rect x="34" y="36" width="8" height="8" fill="#A7C7E7" />
        <rect x="42" y="36" width="8" height="8" fill="#B2D8B2" />
        <rect x="50" y="36" width="8" height="8" fill="#FFF3A3" />
        <rect x="58" y="36" width="8" height="8" fill="#FFF3A3" />
        <rect x="66" y="36" width="8" height="8" fill="#FFF3A3" />
        <rect x="74" y="36" width="8" height="8" fill="#B2D8B2" />
        <rect x="82" y="36" width="8" height="8" fill="#B2D8B2" />
        <rect x="90" y="36" width="8" height="8" fill="#A7C7E7" />

        <rect x="34" y="44" width="8" height="8" fill="#A7C7E7" />
        <rect x="42" y="44" width="8" height="8" fill="#B2D8B2" />
        <rect x="50" y="44" width="8" height="8" fill="#FFF3A3" />
        <rect x="58" y="44" width="8" height="8" fill="#A7C7E7" />
        <rect x="66" y="44" width="8" height="8" fill="#FFF3A3" />
        <rect x="74" y="44" width="8" height="8" fill="#B2D8B2" />
        <rect x="82" y="44" width="8" height="8" fill="#B2D8B2" />
        <rect x="90" y="44" width="8" height="8" fill="#A7C7E7" />

        <rect x="34" y="52" width="8" height="8" fill="#A7C7E7" />
        <rect x="42" y="52" width="8" height="8" fill="#B2D8B2" />
        <rect x="50" y="52" width="8" height="8" fill="#FFF3A3" />
        <rect x="58" y="52" width="8" height="8" fill="#FFF3A3" />
        <rect x="66" y="52" width="8" height="8" fill="#FFF3A3" />
        <rect x="74" y="52" width="8" height="8" fill="#B2D8B2" />
        <rect x="82" y="52" width="8" height="8" fill="#B2D8B2" />
        <rect x="90" y="52" width="8" height="8" fill="#A7C7E7" />

        <rect x="42" y="60" width="8" height="8" fill="#A7C7E7" />
        <rect x="50" y="60" width="8" height="8" fill="#B2D8B2" />
        <rect x="58" y="60" width="8" height="8" fill="#B2D8B2" />
        <rect x="66" y="60" width="8" height="8" fill="#B2D8B2" />
        <rect x="74" y="60" width="8" height="8" fill="#B2D8B2" />
        <rect x="82" y="60" width="8" height="8" fill="#A7C7E7" />

        <rect x="50" y="68" width="8" height="8" fill="#A7C7E7" />
        <rect x="58" y="68" width="8" height="8" fill="#A7C7E7" />
        <rect x="66" y="68" width="8" height="8" fill="#A7C7E7" />
        <rect x="74" y="68" width="8" height="8" fill="#A7C7E7" />

        {/* Snail Body - Soft Beige/Pink */}
        <rect x="10" y="60" width="8" height="8" fill="#F8C8DC" />
        <rect x="18" y="60" width="8" height="8" fill="#F8C8DC" />

        <rect x="10" y="68" width="8" height="8" fill="#F8C8DC" />
        <rect x="18" y="68" width="8" height="8" fill="#FDE7EF" />
        <rect x="26" y="68" width="8" height="8" fill="#FDE7EF" />
        <rect x="34" y="68" width="8" height="8" fill="#FDE7EF" />
        <rect x="42" y="68" width="8" height="8" fill="#F8C8DC" />

        <rect x="10" y="76" width="8" height="8" fill="#F8C8DC" />
        <rect x="18" y="76" width="8" height="8" fill="#FDE7EF" />
        <rect x="26" y="76" width="8" height="8" fill="#FDE7EF" />
        <rect x="34" y="76" width="8" height="8" fill="#FDE7EF" />
        <rect x="42" y="76" width="8" height="8" fill="#FDE7EF" />
        <rect x="50" y="76" width="8" height="8" fill="#F8C8DC" />

        <rect x="18" y="84" width="8" height="8" fill="#F8C8DC" />
        <rect x="26" y="84" width="8" height="8" fill="#F8C8DC" />
        <rect x="34" y="84" width="8" height="8" fill="#F8C8DC" />
        <rect x="42" y="84" width="8" height="8" fill="#F8C8DC" />
        <rect x="50" y="84" width="8" height="8" fill="#F8C8DC" />

        {/* Eyes - Cute pixel eyes */}
        <rect x="14" y="64" width="4" height="4" fill="#1F2937" />
        <rect x="22" y="64" width="4" height="4" fill="#1F2937" />

        {/* Eye highlights */}
        <rect x="14" y="64" width="2" height="2" fill="#FFFFFF" />
        <rect x="22" y="64" width="2" height="2" fill="#FFFFFF" />

        {/* Antenna */}
        <rect x="12" y="52" width="4" height="8" fill="#F8C8DC" />
        <rect x="20" y="52" width="4" height="8" fill="#F8C8DC" />
        <rect x="10" y="48" width="8" height="4" fill="#FFF3A3" />
        <rect x="18" y="48" width="8" height="4" fill="#FFF3A3" />

        {/* Cheeks - Blush */}
        <rect x="6" y="72" width="4" height="4" fill="#FDBA74" opacity="0.5" />
        <rect x="26" y="72" width="4" height="4" fill="#FDBA74" opacity="0.5" />

        {/* Smile */}
        <rect x="16" y="74" width="2" height="2" fill="#1F2937" />
        <rect x="18" y="76" width="4" height="2" fill="#1F2937" />
        <rect x="22" y="74" width="2" height="2" fill="#1F2937" />
      </svg>
    </div>
  )
}

/**
 * Animated version with idle animation
 */
export function AnimatedMascot({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`animate-bounce-slow ${className}`}>
      <Mascot size={size} />
    </div>
  )
}
