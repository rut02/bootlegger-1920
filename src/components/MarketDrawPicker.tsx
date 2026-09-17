import React, { useState, useEffect } from 'react';
import { Card } from '../../shared/types.js';
import { CardItem } from './CardItem.js';
import { sounds } from '../utils/audio.js';

interface MarketDrawPickerProps {
  cardsNeeded: number;
  drawDeckCount: number;
  leftTop: Card | null;
  rightTop: Card | null;
  leftCount: number;
  rightCount: number;
  onDrawSingle: (source: 'deck' | 'left' | 'right') => void;
  onAutoFill: () => void;
}

export const MarketDrawPicker: React.FC<MarketDrawPickerProps> = ({
  cardsNeeded,
  drawDeckCount,
  leftTop,
  rightTop,
  leftCount,
  rightCount,
  onDrawSingle,
  onAutoFill,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(25);

  useEffect(() => {
    setSecondsLeft(25);
  }, [cardsNeeded]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAutoFill();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onAutoFill]);

  const handlePick = (source: 'deck' | 'left' | 'right') => {
    sounds.playFlip();
    onDrawSingle(source);
  };

  const timerPercent = (secondsLeft / 25) * 100;

  return (
    <div className="vintage-box rounded-2xl p-5 border-2 border-vintage-gold shadow-2xl max-w-xl mx-auto my-3 animate-fadeIn">
      {/* Header with Timer */}
      <div className="flex items-center justify-between border-b border-vintage-gold/20 pb-2.5 mb-4">
        <div>
          <h3 className="font-bold text-vintage-gold text-base flex items-center gap-1.5">
            <span>🃏</span>
            <span>เลือกหยิบการ์ดเข้ามือ (คลิกเลือกทีละใบ)</span>
          </h3>
          <p className="text-xs text-vintage-paper/70">
            ต้องหยิบอีก <strong className="text-amber-300 text-sm">{cardsNeeded}</strong> ใบ ให้ครบ 6 ใบ
          </p>
        </div>

        {/* Turn Timer Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-vintage-paper/60 uppercase tracking-wider block">เวลาที่เหลือ</span>
            <span
              className={`text-sm font-bold font-mono ${
                secondsLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-vintage-gold'
              }`}
            >
              {secondsLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Timer Progress Bar */}
      <div className="w-full bg-black/60 rounded-full h-1.5 mb-5 overflow-hidden border border-white/10">
        <div
          className={`h-full transition-all duration-1000 rounded-full ${
            secondsLeft <= 5
              ? 'bg-rose-500'
              : secondsLeft <= 10
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* 3 Interactive Draw Piles */}
      <div className="grid grid-cols-3 gap-3">
        {/* 1. Facedown Main Deck */}
        <div
          onClick={() => handlePick('deck')}
          className="vintage-box rounded-xl p-3 text-center border border-amber-500/40 hover:border-vintage-gold hover:scale-105 transition-all cursor-pointer shadow-lg group flex flex-col items-center justify-between min-h-[160px]"
        >
          <div className="text-xs font-bold text-vintage-gold mb-1">กองคว่ำหน้า</div>
          <div className="w-20 h-28 rounded-lg bg-gradient-to-b from-[#3a2012] via-[#221209] to-[#120904] border-2 border-dashed border-amber-500/60 flex flex-col items-center justify-center shadow-inner group-hover:border-amber-300 transition-all">
            <span className="text-2xl mb-1 group-hover:scale-125 transition-transform">🎴</span>
            <span className="text-[10px] text-amber-200/80 font-bold">สุ่มจั่ว</span>
          </div>
          <span className="text-[10px] text-vintage-paper/60 mt-2">เหลือ {drawDeckCount} ใบ</span>
        </div>

        {/* 2. Left Face-up Discard */}
        <div
          onClick={() => leftTop && handlePick('left')}
          className={`vintage-box rounded-xl p-3 text-center border transition-all flex flex-col items-center justify-between min-h-[160px] ${
            leftTop
              ? 'border-emerald-600/50 hover:border-emerald-400 hover:scale-105 cursor-pointer shadow-lg'
              : 'border-white/5 opacity-40 cursor-not-allowed'
          }`}
        >
          <div className="text-xs font-bold text-emerald-400 mb-1">กองทิ้งซ้าย (หงาย)</div>
          {leftTop ? (
            <div className="scale-90 transform -my-1 pointer-events-none">
              <CardItem card={leftTop} small />
            </div>
          ) : (
            <div className="w-20 h-28 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-xs text-white/30">
              ว่างเปล่า
            </div>
          )}
          <span className="text-[10px] text-vintage-paper/60 mt-1">({leftCount} ใบ)</span>
        </div>

        {/* 3. Right Face-up Discard */}
        <div
          onClick={() => rightTop && handlePick('right')}
          className={`vintage-box rounded-xl p-3 text-center border transition-all flex flex-col items-center justify-between min-h-[160px] ${
            rightTop
              ? 'border-emerald-600/50 hover:border-emerald-400 hover:scale-105 cursor-pointer shadow-lg'
              : 'border-white/5 opacity-40 cursor-not-allowed'
          }`}
        >
          <div className="text-xs font-bold text-emerald-400 mb-1">กองทิ้งขวา (หงาย)</div>
          {rightTop ? (
            <div className="scale-90 transform -my-1 pointer-events-none">
              <CardItem card={rightTop} small />
            </div>
          ) : (
            <div className="w-20 h-28 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-xs text-white/30">
              ว่างเปล่า
            </div>
          )}
          <span className="text-[10px] text-vintage-paper/60 mt-1">({rightCount} ใบ)</span>
        </div>
      </div>

      <div className="text-center mt-4">
        <button
          onClick={onAutoFill}
          className="text-xs text-vintage-paper/50 hover:text-vintage-gold underline transition-colors"
        >
          หรือกด "จั่วจากกองคว่ำหน้าให้ครบทั้งหมดทันที"
        </button>
      </div>
    </div>
  );
};
