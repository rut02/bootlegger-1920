import React, { useState } from 'react';
import { BribeOffer, Player } from '../../shared/types.js';
import { sounds } from '../utils/audio.js';

interface BribeModalProps {
  bribeOffers: BribeOffer[];
  targetPlayer: Player;
  inspector: Player;
  players: Player[];
  myPlayerId: string;
  onOfferBribe: (targetPlayerId: string, intent: 'inspect' | 'pass', cash: number, message: string) => void;
  onResolveInspection: (action: 'passed' | 'inspected', acceptedBribeId?: string) => void;
}

export const BribeModal: React.FC<BribeModalProps> = ({
  bribeOffers,
  targetPlayer,
  inspector,
  players,
  myPlayerId,
  onOfferBribe,
  onResolveInspection,
}) => {
  const isInspector = myPlayerId === inspector.id;
  const myPlayer = players.find((p) => p.id === myPlayerId);

  const [bribeAmount, setBribeAmount] = useState<number>(5);
  const [bribeIntent, setBribeIntent] = useState<'inspect' | 'pass'>('pass');
  const [bribeMessage, setBribeMessage] = useState<string>('ปล่อยคันนี้ไปเถอะครับ');

  const targetBribes = bribeOffers.filter((b) => b.targetPlayerId === targetPlayer.id);

  const handleSendBribe = () => {
    sounds.playCoin();
    onOfferBribe(targetPlayer.id, bribeIntent, bribeAmount, bribeMessage);
  };

  const QUICK_MESSAGES = [
    'ปล่อยคันนี้ไปเถอะครับ มีแค่อาหารจริงๆ',
    'ตรวจมันเลยสารวัตร มันพกของเถื่อนเต็มเกวียน!',
    'อย่าไปเชื่อมัน ตรวจดูสิได้ค่าปรับแน่นอน',
    'รอบหน้าจะตอบแทนให้อย่างงาม!',
  ];

  return (
    <div className="vintage-box rounded-xl p-5 border-2 border-vintage-gold/40">
      <div className="flex items-center justify-between border-b border-vintage-gold/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          <h3 className="font-bold text-vintage-gold text-lg">
            เจรจาต่อรอง & สินบนรอบวง (Universal Bribing)
          </h3>
        </div>
        <div className="text-xs text-vintage-paper/70">
          เป้าหมายตรวจ: <strong className="text-vintage-gold">{targetPlayer.name}</strong>
        </div>
      </div>

      {/* Active Bribes on the table */}
      <div className="mb-4">
        <span className="text-xs font-bold text-vintage-paper/70 block mb-2">
          ข้อเสนอสินบนทั้งหมดบนโต๊ะ ({targetBribes.length} รายการ):
        </span>

        {targetBribes.length === 0 ? (
          <div className="text-xs text-white/40 italic p-2.5 rounded bg-black/30 text-center border border-white/5">
            ยังไม่มีใครยื่นสินบนเกี่ยวกับรถของ {targetPlayer.name} (ทุกคนบนโต๊ะสามารถยื่นได้!)
          </div>
        ) : (
          <div className="space-y-2">
            {targetBribes.map((b) => {
              const briber = players.find((p) => p.id === b.fromPlayerId);
              return (
                <div
                  key={b.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    b.intent === 'inspect'
                      ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{briber?.avatar}</span>
                      <span>{briber?.name}</span>
                      <span className="text-vintage-gold">ยื่น \${b.cash}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/40">
                        {b.intent === 'inspect' ? '🚨 สั่งตรวจ!' : '👋 สั่งปล่อย!'}
                      </span>
                    </div>
                    {b.message && <p className="text-[11px] opacity-80 italic mt-0.5">"{b.message}"</p>}
                  </div>

                  {isInspector && (
                    <button
                      onClick={() => {
                        sounds.playCoin();
                        onResolveInspection(b.intent === 'inspect' ? 'inspected' : 'passed', b.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-vintage-gold text-vintage-dark font-bold text-xs hover:bg-amber-400 transition-all shadow"
                    >
                      รับสินบน \${b.cash} & {b.intent === 'inspect' ? 'ตรวจ' : 'ปล่อย'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspector Decision Controls */}
      {isInspector ? (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <p className="text-xs text-center text-vintage-paper/80 mb-2">
            หรือตัดสินใจทันทีโดยไม่รับสินบน:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                sounds.playCoin();
                onResolveInspection('passed');
              }}
              className="py-3 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/60 font-bold text-emerald-200 text-xs text-center shadow"
            >
              👋 สั่งปล่อยผ่าน (Pass)
            </button>
            <button
              onClick={() => {
                sounds.playStamp();
                onResolveInspection('inspected');
              }}
              className="py-3 px-4 rounded-xl bg-rose-900/80 hover:bg-rose-800 border border-rose-500/60 font-bold text-rose-200 text-xs text-center shadow"
            >
              🚨 สั่งเปิดตรวจ! (Inspect)
            </button>
          </div>
        </div>
      ) : (
        /* Non-Inspector: Offer Bribe Form */
        <div className="space-y-3 pt-3 border-t border-white/10">
          <span className="text-xs font-bold text-vintage-gold block">
            ยื่นสินบนให้นายอำเภอเกี่ยวกับรถของ {targetPlayer.name}:
          </span>

          {/* Intent Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setBribeIntent('pass');
                setBribeMessage('ปล่อยคันนี้ไปเถอะครับ');
              }}
              className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                bribeIntent === 'pass'
                  ? 'bg-emerald-900 border-emerald-500 text-emerald-200 shadow'
                  : 'bg-black/30 border-white/10 text-white/50'
              }`}
            >
              👋 ขอให้ปล่อยผ่าน
            </button>
            <button
              type="button"
              onClick={() => {
                setBribeIntent('inspect');
                setBribeMessage('ตรวจมันเลยสารวัตร!');
              }}
              className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                bribeIntent === 'inspect'
                  ? 'bg-rose-900 border-rose-500 text-rose-200 shadow'
                  : 'bg-black/30 border-white/10 text-white/50'
              }`}
            >
              🚨 ขอให้สั่งเปิดตรวจ (แกล้งคู่แข่ง)
            </button>
          </div>

          {/* Amount slider */}
          {myPlayer && (
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span>จำนวนเงินสินบน (คุณมี \${myPlayer.cash}):</span>
                <span className="font-bold text-vintage-gold text-sm">\${bribeAmount}</span>
              </div>
              <input
                type="range"
                min={0}
                max={myPlayer.cash}
                value={bribeAmount}
                onChange={(e) => setBribeAmount(Number(e.target.value))}
                className="w-full accent-vintage-gold cursor-pointer"
              />
            </div>
          )}

          {/* Message presets */}
          <div className="flex flex-wrap gap-1">
            {QUICK_MESSAGES.map((msg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBribeMessage(msg)}
                className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white/70 hover:border-vintage-gold"
              >
                {msg}
              </button>
            ))}
          </div>

          <button
            onClick={handleSendBribe}
            disabled={!myPlayer || bribeAmount > myPlayer.cash}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow transition-all active:scale-98"
          >
            ส่งข้อเสนอสินบน (\${bribeAmount})
          </button>
        </div>
      )}
    </div>
  );
};
