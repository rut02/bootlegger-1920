import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../shared/types.js';
import { CardItem } from './CardItem.js';
import { sounds } from '../utils/audio.js';

interface HandDragZoneProps {
  cards: Card[];
  selectedCardIds: string[];
  isLocked: boolean;
  themeCrateTitle: string;
  isStealthMode?: boolean;
  onToggleSelect: (cardId: string) => void;
  onSelectMultiple: (cardIds: string[]) => void;
  onDropIntoCrate?: (cardIds: string[]) => void;
  showDropBox?: boolean;
}

export const HandDragZone: React.FC<HandDragZoneProps> = ({
  cards = [],
  selectedCardIds = [],
  isLocked,
  themeCrateTitle,
  isStealthMode = false,
  showDropBox = false,
  onToggleSelect,
  onSelectMultiple,
  onDropIntoCrate,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDropZone, setActiveDropZone] = useState<'crate' | null>(null);

  // Stealth mode peeking state (card id currently being hovered/held)
  const [peekCardId, setPeekCardId] = useState<string | null>(null);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const crateDropRef = useRef<HTMLDivElement>(null);

  const currentPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedEnough = useRef<boolean>(false);
  const holdTimerRef = useRef<number | null>(null);
  const pendingCardIdRef = useRef<string | null>(null);
  const isDragActiveRef = useRef<boolean>(false);
  const wasDraggedRef = useRef<boolean>(false);

  const startDragging = (cardId: string, clientX: number, clientY: number) => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isDragActiveRef.current = true;
    wasDraggedRef.current = true;
    setPointerPos({ x: clientX, y: clientY });

    const toDrag = selectedCardIds.includes(cardId) ? selectedCardIds : [cardId];
    setDraggedIds(toDrag);
    setIsDragging(true);
    sounds.playCardSwoosh();
  };

  useEffect(() => {
    if (!isInteracting) return;

    const handlePointerMove = (e: PointerEvent) => {
      currentPointerRef.current = { x: e.clientX, y: e.clientY };
      setPointerPos({ x: e.clientX, y: e.clientY });

      const dist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);

      // If moved > 12px before hold timer expired, initiate drag immediately
      if (!isDragActiveRef.current && dist > 12 && pendingCardIdRef.current) {
        hasMovedEnough.current = true;
        startDragging(pendingCardIdRef.current, e.clientX, e.clientY);
        return;
      }

      if (dist > 10) {
        hasMovedEnough.current = true;
      }

      if (!isDragActiveRef.current) return;

      // 🧲 LoR Sweep Mechanic: Check collision with other cards in hand
      if (draggedIds.length < 5) {
        cardRefs.current.forEach((el, cardId) => {
          if (!el || draggedIds.includes(cardId)) return;

          const rect = el.getBoundingClientRect();
          const pad = 15;
          if (
            e.clientX >= rect.left - pad &&
            e.clientX <= rect.right + pad &&
            e.clientY >= rect.top - pad &&
            e.clientY <= rect.bottom + pad
          ) {
            setDraggedIds((prev) => {
              if (prev.includes(cardId) || prev.length >= 5) return prev;
              sounds.playCardAttach();
              return [...prev, cardId];
            });
          }
        });
      }

      // Check Drop Zones
      let zone: 'crate' | null = null;

      if (crateDropRef.current) {
        const r = crateDropRef.current.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          zone = 'crate';
        }
      }

      setActiveDropZone(zone);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (isDragActiveRef.current) {
        setIsDragging(false);

        if (activeDropZone === 'crate' && draggedIds.length >= 1 && draggedIds.length <= 5) {
          sounds.playCrate();
          if (onDropIntoCrate) onDropIntoCrate(draggedIds);
        } else if (hasMovedEnough.current) {
          onSelectMultiple(draggedIds);
        }
      }

      setIsDragging(false);
      setDraggedIds([]);
      setIsInteracting(false);
      isDragActiveRef.current = false;
      pendingCardIdRef.current = null;
      setActiveDropZone(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isInteracting, isDragging, draggedIds, activeDropZone, selectedCardIds, onDropIntoCrate, onSelectMultiple]);

  const handleCardPointerDown = (cardId: string, e: React.PointerEvent) => {
    if (isLocked) return;

    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    pendingCardIdRef.current = cardId;
    isDragActiveRef.current = false;
    wasDraggedRef.current = false;
    hasMovedEnough.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    currentPointerRef.current = { x: e.clientX, y: e.clientY };
    setPointerPos({ x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    holdTimerRef.current = window.setTimeout(() => {
      startDragging(cardId, currentPointerRef.current.x, currentPointerRef.current.y);
    }, 220);
  };

  const handleCardClick = (cardId: string) => {
    if (wasDraggedRef.current || isDragging || isDragActiveRef.current) {
      wasDraggedRef.current = false;
      return;
    }

    if (!isLocked) {
      onToggleSelect(cardId);
    }
  };

  const selectedCards = (cards || []).filter((c) => (selectedCardIds || []).includes(c.id));
  const draggedCards = (cards || []).filter((c) => (draggedIds || []).includes(c.id));
  const activeCardsForCrate = isDragging && draggedCards.length > 0 ? draggedCards : selectedCards;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* 1. DROP TARGETS ROW */}

      {/* Case A: In Loading Phase -> Big Enlarged Crate Drop Box (Shown only when showDropBox is explicitly enabled) */}
      {showDropBox && onDropIntoCrate && !isLocked && (
        <div
          ref={crateDropRef}
          className={`
            w-full max-w-xl mb-3 p-4 sm:p-5 rounded-3xl border-2 transition-all duration-300 select-none
            ${
              activeDropZone === 'crate'
                ? 'bg-gradient-to-b from-amber-900/90 to-[#2e1708] border-vintage-gold shadow-[0_0_50px_rgba(212,175,55,0.7)] scale-[1.02] ring-4 ring-amber-400'
                : isDragging
                ? 'bg-gradient-to-b from-amber-950/60 to-[#190d04] border-dashed border-amber-500/80 animate-pulse'
                : 'bg-gradient-to-b from-[#24150a]/90 to-[#120a05] border-[#5c3e21] shadow-xl'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl transition-transform duration-200">
                {activeDropZone === 'crate' ? '📥' : '📦'}
              </span>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-vintage-gold font-vintage">
                  {themeCrateTitle} (ช่องใส่ของขนาดใหญ่)
                </h4>
                <p className="text-[11px] text-vintage-paper/70">
                  {activeDropZone === 'crate'
                    ? 'ปล่อยนิ้วเพื่อบรรจุการ์ดทั้งหมดลงเกวียนทันที!'
                    : 'กดค้างที่การ์ดแล้วลากกวาดใบอื่นมาปล่อยลงที่นี่ (1–5 ใบ)'}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-amber-300 font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/30">
              {activeCardsForCrate.length > 0 ? `${activeCardsForCrate.length}/5 ใบ` : 'ว่างเปล่า'}
            </div>
          </div>

          {/* 5 Distinct Card Slots representation */}
          <div className="grid grid-cols-5 gap-2 mt-2 pt-2 border-t border-white/10">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const cardInSlot = activeCardsForCrate[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`
                    h-14 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all text-xs
                    ${
                      cardInSlot
                        ? 'bg-amber-950/80 border-vintage-gold shadow-md'
                        : activeDropZone === 'crate'
                        ? 'border-dashed border-amber-400 bg-amber-900/30 animate-pulse'
                        : 'border-dashed border-white/10 bg-black/30'
                    }
                  `}
                >
                  {cardInSlot ? (
                    <>
                      <span className="text-base">{cardInSlot.icon}</span>
                      <span className="text-[9px] text-white font-bold line-clamp-1">{cardInSlot.name}</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-white/30">ช่องที่ {slotIdx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CARDS IN HAND */}
      <div className="flex flex-wrap gap-2 justify-center items-center select-none py-1">
        {cards.map((card) => {
          const isBeingDragged = isDragging && draggedIds.includes(card.id);
          const isSelected = selectedCardIds.includes(card.id);
          const isPeeking = isStealthMode && peekCardId === card.id;

          // Stealth Facedown Card
          if (isStealthMode && !isPeeking && !isBeingDragged) {
            return (
              <div
                key={card.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(card.id, el);
                  else cardRefs.current.delete(card.id);
                }}
                onMouseEnter={() => setPeekCardId(card.id)}
                onMouseLeave={() => setPeekCardId(null)}
                onTouchStart={() => setPeekCardId(card.id)}
                onTouchEnd={() => setPeekCardId(null)}
                onPointerDown={(e) => handleCardPointerDown(card.id, e)}
                onClick={() => handleCardClick(card.id)}
                className={`
                  w-24 h-32 sm:w-28 sm:h-38 md:w-32 md:h-44 rounded-xl border-2 border-amber-500/70 overflow-hidden relative
                  flex flex-col items-center justify-between cursor-pointer select-none shadow-md hover:scale-105 transition-all
                  ${isSelected ? 'ring-4 ring-vintage-gold -translate-y-2' : ''}
                `}
              >
                <img
                  src="/cards/card_back.jpg"
                  alt="Facedown Card"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-amber-300 font-mono">
                  กดค้างเพื่อแง้มดู
                </div>
              </div>
            );
          }

          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
                else cardRefs.current.delete(card.id);
              }}
              onMouseEnter={() => isStealthMode && setPeekCardId(card.id)}
              onMouseLeave={() => isStealthMode && setPeekCardId(null)}
              onPointerDown={(e) => handleCardPointerDown(card.id, e)}
              onClick={() => handleCardClick(card.id)}
              className={`
                touch-none select-none transition-all duration-200
                ${isBeingDragged ? 'opacity-25 scale-95' : 'opacity-100'}
              `}
            >
              <CardItem
                card={card}
                isSelected={isSelected}
                disabled={isLocked}
              />
            </div>
          );
        })}
      </div>

      {/* 3. Floating LoR Multi-card Fanned Stack (Portaled directly to document.body for 1:1 pixel-perfect cursor tracking) */}
      {isDragging && draggedCards.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none select-none z-[99999]"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
            transform: 'translate(-50%, -50%)',
            willChange: 'left, top',
          }}
        >
          <div className="relative w-28 h-40">
            {draggedCards.map((card, i) => {
              const total = draggedCards.length;
              const angle = (i - (total - 1) / 2) * 8;
              const offsetX = (i - (total - 1) / 2) * 16;
              const offsetY = -Math.abs(i - (total - 1) / 2) * 4;

              return (
                <div
                  key={card.id}
                  className="absolute inset-0 shadow-[0_20px_35px_rgba(0,0,0,0.9)] rounded-xl"
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg) scale(1.08)`,
                    zIndex: i,
                  }}
                >
                  <CardItem card={card} small />
                </div>
              );
            })}

            <div className="absolute -top-3 -right-3 bg-amber-500 text-black font-extrabold text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-lg ring-2 ring-white z-[100000] animate-bounce">
              {draggedCards.length}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
