import React from 'react';
import { Card, LegalGoodsType } from '../../shared/types.js';
import { KING_BONUSES } from '../../shared/cards.js';

interface ModularCardProps {
  card: Card;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isFaceDown?: boolean;
  disabled?: boolean;
  showBonusBadge?: boolean;
  countBadge?: number;
}

export const ModularCard: React.FC<ModularCardProps> = ({
  card,
  isSelected = false,
  onClick,
  size = 'md',
  isFaceDown = false,
  disabled = false,
  showBonusBadge = true,
  countBadge,
}) => {
  const isLegal = card.category === 'legal';
  const frameSrc = isLegal ? '/cards/frame_legal.png?v=9' : '/cards/frame_contraband.png?v=9';
  const itemSrc = `/cards/${card.type}.jpg?v=9`;

  // King bonus for legal goods
  const bonus = isLegal && KING_BONUSES[card.type as LegalGoodsType]
    ? KING_BONUSES[card.type as LegalGoodsType].king
    : null;

  // Size dimensions (Strict Aspect Ratio 3:4)
  const sizeClasses = {
    sm: 'w-24 aspect-[3/4] text-[8px]',
    md: 'w-36 sm:w-40 aspect-[3/4] text-[10px]',
    lg: 'w-56 sm:w-60 aspect-[3/4] text-xs',
  }[size];

  // If card is face-down (e.g. in secret crate or other player's hand)
  if (isFaceDown) {
    return (
      <div
        onClick={!disabled ? onClick : undefined}
        className={`
          relative select-none rounded-xl overflow-hidden shadow-2xl transition-all duration-200
          ${sizeClasses}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          border-2 border-amber-500/70 bg-[#180a0d]
        `}
      >
        {/* Vintage Secret Card Back */}
        <img
          src="/cards/card_back.jpg"
          alt="Card Back"
          className="w-full h-full object-cover"
        />

        {countBadge !== undefined && countBadge > 1 && (
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 border-2 border-black text-black font-['Press_Start_2P',monospace] text-[9px] font-bold flex items-center justify-center shadow-lg z-30">
            x{countBadge}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        group relative select-none rounded-xl transition-all duration-200
        ${sizeClasses}
        ${
          isSelected
            ? 'ring-4 ring-amber-400 -translate-y-3 shadow-[0_12px_28px_rgba(212,175,55,0.6)] z-20'
            : 'shadow-xl hover:-translate-y-1.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.8)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'cursor-pointer'}
      `}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* LAYER 1: Item Artwork (Placed behind the frame at z-0) */}
      <div
        className="absolute overflow-hidden rounded-lg z-0 bg-black flex items-center justify-center pointer-events-none select-none"
        style={{
          top: '5.5%',
          left: '7.2%',
          width: '85.5%',
          height: '75.0%',
        }}
      >
        <img
          src={itemSrc}
          alt={card.name}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none select-none -z-10">
          {card.icon}
        </div>
      </div>

      {/* LAYER 2: Master Frame (Transparent PNG Window - z-10 overlays item artwork) */}
      <img
        src={frameSrc}
        alt={card.category}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover rounded-xl pointer-events-none z-10 drop-shadow-md select-none"
      />

      {/* LAYER 3: Value Gold Coin (Top Left) - Rendered over built-in gold medallion */}
      <div
        className="absolute aspect-square z-20 flex items-center justify-center pointer-events-none select-none"
        style={{
          top: '10.16%',
          left: '13.33%',
          width: '18%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span className="font-['Press_Start_2P',monospace] font-extrabold text-[8.5px] sm:text-[10px] text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
          ${card.value}
        </span>
      </div>

      {/* LAYER 4: Penalty Badge (Top Right) - Rendered over built-in ruby medallion */}
      <div
        className="absolute aspect-square z-20 flex items-center justify-center pointer-events-none select-none"
        style={{
          top: '10.16%',
          left: '86.67%',
          width: '18%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <span className="font-['Press_Start_2P',monospace] font-extrabold text-[8px] sm:text-[9.5px] text-rose-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
          -${card.penalty}
        </span>
      </div>

      {/* LAYER 5: Name Ribbon (Bottom Central Banner) - Fits perfectly inside built-in Art Deco nameplate */}
      <div
        className="absolute z-20 flex items-center justify-center text-center px-1 pointer-events-none select-none"
        style={{
          top: '84.0%',
          left: '16.0%',
          width: '68.0%',
          height: '10.0%',
        }}
      >
        <div
          className={`font-['Chakra_Petch',sans-serif] font-black text-amber-100 tracking-tight leading-none w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap overflow-hidden text-ellipsis ${
            card.name.length > 12 ? 'text-[9.5px] sm:text-[11px]' : 'text-[11.5px] sm:text-[13.5px]'
          }`}
        >
          {card.name}
        </div>
      </div>

      {/* LAYER 6: King Bonus Tag (For Legal Goods) */}
      {showBonusBadge && isLegal && bonus && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/80 text-amber-300 font-['Press_Start_2P',monospace] text-[6px] sm:text-[7px] shadow-md flex items-center gap-1 whitespace-nowrap">
          <span>👑</span>
          <span>+${bonus}</span>
        </div>
      )}

      {/* Count Badge (e.g. x3 cards in pile) */}
      {countBadge !== undefined && countBadge > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 border-2 border-black text-black font-['Press_Start_2P',monospace] text-[10px] font-bold flex items-center justify-center shadow-lg z-30">
          x{countBadge}
        </div>
      )}
    </div>
  );
};
