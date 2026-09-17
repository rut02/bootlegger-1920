import React, { useState } from 'react';
import { Player } from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';
import { sounds } from '../utils/audio.js';
import { RulesModal } from './RulesModal.js';

interface LobbyViewProps {
  roomCode: string | null;
  themeId: ThemeId;
  players: Player[];
  myPlayerId: string | null;
  onCreateRoom: (name: string, avatar: string, themeId: ThemeId) => void;
  onJoinRoom: (code: string, name: string, avatar: string) => void;
  onSetTheme: (themeId: ThemeId) => void;
  onAddBot: () => void;
  onStartGame: (rounds: number) => void;
}

const AVATARS = ['🎩', '🕶️', '🚬', '💼', '⚔️', '🗡️', '🛡️', '🌾', '🥃', '👑'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomCode,
  themeId,
  players,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onSetTheme,
  onAddBot,
  onStartGame,
}) => {
  const [playerName, setPlayerName] = useState<string>('Al Capone');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🎩');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(themeId || 'mafia_1920');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [roundsPerPlayer, setRoundsPerPlayer] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentThemeInfo = THEMES[selectedTheme] || THEMES.mafia_1920;

  // In Room view:
  if (roomCode) {
    const isHost = players.length > 0 && players[0].id === myPlayerId;
    const canStart = players.length >= 2;
    const activeTheme = THEMES[themeId] || THEMES.mafia_1920;

    return (
      <div className="max-w-md mx-auto vintage-box rounded-2xl p-6 sm:p-8 border-2 border-vintage-gold/50 shadow-2xl">
        <div className="text-center mb-5">
          <span className="text-4xl mb-1 block">{themeId === 'bang_rajan' ? '⚔️' : '🥃'}</span>
          <h1 className="text-2xl font-bold font-vintage gold-gradient-text">
            ห้องเตรียมความพร้อม
          </h1>
          <p className="text-xs text-vintage-paper/70 mt-1">
            ธีมปัจจุบัน: <strong className="text-amber-300">{activeTheme.name}</strong> ({activeTheme.era})
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="bg-black/60 border border-vintage-gold/40 rounded-xl p-4 text-center mb-5">
          <span className="text-[11px] text-vintage-paper/60 uppercase tracking-wider block">
            รหัสห้องสำหรับชวนเพื่อน (ROOM CODE)
          </span>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-3xl font-bold font-mono tracking-widest text-vintage-gold">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-xs px-2.5 py-1 rounded bg-vintage-card border border-vintage-gold/40 hover:bg-vintage-gold/20 text-vintage-paper transition-all"
            >
              {copied ? 'คัดลอกแล้ว! ✓' : 'คัดลอก'}
            </button>
          </div>
        </div>

        {/* Theme Switcher for Host */}
        {isHost && (
          <div className="mb-5 bg-black/40 border border-white/10 rounded-xl p-3">
            <label className="text-xs font-bold text-vintage-paper/80 block mb-2">
              เลือกธีมการเล่น (Theme Selection):
            </label>
            <div className="grid grid-cols-1 gap-2">
              <div
                className="p-2.5 rounded-lg border border-vintage-gold bg-amber-950/70 shadow text-left text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300">🥃 มาเฟียและสุราเถื่อน 1920s (Prohibition Era)</div>
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                    ธีมหลัก ✓
                  </span>
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">ชิคาโก ค.ศ. 1920 — สุราเถื่อน, ปืนกลทอมมี่, ซิการ์, ดอลลาร์ปลอม</div>
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-vintage-paper/70">
              รายชื่อผู้เล่น ({players.length}/6 คน):
            </span>
            {players.length < 6 && (
              <button
                onClick={() => {
                  sounds.playCoin();
                  onAddBot();
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-600/50 text-amber-300 hover:bg-amber-900/60 transition-all flex items-center gap-1"
              >
                <span>+ เพิ่มบอท AI</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  p.id === myPlayerId
                    ? 'bg-vintage-gold/10 border-vintage-gold/60'
                    : 'bg-black/40 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{p.avatar}</span>
                  <div>
                    <span className="text-sm font-bold text-vintage-paper">
                      {p.name}
                    </span>
                    {p.id === myPlayerId && (
                      <span className="text-[10px] text-vintage-gold ml-1.5 font-bold">
                        (คุณ)
                      </span>
                    )}
                    {p.isBot && (
                      <span className="text-[10px] bg-white/10 px-1 py-0.5 rounded text-vintage-paper/50 ml-1.5">
                        BOT AI
                      </span>
                    )}
                  </div>
                </div>

                {idx === 0 && (
                  <span className="text-[10px] bg-vintage-gold/20 text-vintage-gold px-2 py-0.5 rounded-full border border-vintage-gold/40 font-bold">
                    หัวหน้าห้อง
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game Settings */}
        {isHost && (
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 mb-5">
            <label className="text-xs font-bold text-vintage-paper/80 block mb-2">
              จำนวนรอบที่เป็นสารวัตร/ผู้คุมด่านต่อคน:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoundsPerPlayer(1)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  roundsPerPlayer === 1
                    ? 'bg-vintage-gold text-vintage-dark border-vintage-gold shadow-md'
                    : 'bg-black/40 border-white/10 text-vintage-paper/70'
                }`}
              >
                คนละ 1 รอบ (เกมเร็ว)
              </button>
              <button
                type="button"
                onClick={() => setRoundsPerPlayer(2)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  roundsPerPlayer === 2
                    ? 'bg-vintage-gold text-vintage-dark border-vintage-gold shadow-md'
                    : 'bg-black/40 border-white/10 text-vintage-paper/70'
                }`}
              >
                คนละ 2 รอบ (มาตรฐาน)
              </button>
            </div>
          </div>
        )}

        {/* Start Game Button */}
        {isHost ? (
          <button
            disabled={!canStart}
            onClick={() => {
              sounds.playStamp();
              onStartGame(roundsPerPlayer);
            }}
            className={`w-full py-3.5 rounded-xl font-bold text-base shadow-xl transition-all ${
              canStart
                ? 'bg-gradient-to-r from-vintage-gold to-amber-600 hover:from-amber-400 hover:to-amber-500 text-vintage-dark cursor-pointer active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {canStart ? 'เริ่มเกมเดี๋ยวนี้! (START GAME)' : 'ต้องการผู้เล่นอย่างน้อย 2 คน'}
          </button>
        ) : (
          <div className="text-center py-3 text-xs text-vintage-paper/60 animate-pulse">
            กำลังรอหัวหน้าห้องกดเริ่มเกม...
          </div>
        )}

        {/* Rules & Scoring Guide Button */}
        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className="w-full mt-3 py-2.5 rounded-xl border border-vintage-gold/50 bg-vintage-gold/10 hover:bg-vintage-gold/20 text-vintage-gold font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <span>📜</span>
          <span>คู่มือกฎกติกา & วิธีคิดคะแนน (Rules & Scoring)</span>
        </button>

        <RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          currentThemeId={themeId}
        />
      </div>
    );
  }

  // Outside room (Landing view)
  return (
    <div className="max-w-md mx-auto vintage-box rounded-2xl p-6 sm:p-8 border-2 border-vintage-gold/50 shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-5xl mb-2 block">{selectedTheme === 'bang_rajan' ? '⚔️' : '🥃'}</span>
        <h1 className="text-3xl font-bold font-vintage gold-gradient-text tracking-wide">
          {currentThemeInfo.name}
        </h1>
        <p className="text-xs text-vintage-paper/70 mt-1 font-serif italic">
          "{currentThemeInfo.description}"
        </p>
      </div>

      {/* Choose Theme */}
      <div className="mb-5">
        <label className="text-xs font-bold text-vintage-paper/80 block mb-1.5">
          เลือกธีมยุคของเกม (Theme Selection):
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTheme('mafia_1920');
              setPlayerName('Al Capone');
              setSelectedAvatar('🎩');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTheme === 'mafia_1920'
                ? 'bg-amber-950/80 border-vintage-gold shadow-md'
                : 'bg-black/40 border-white/10 opacity-60 hover:opacity-100'
            }`}
          >
            <span className="text-xl block mb-1">🥃</span>
            <div className="font-bold text-xs text-vintage-gold">มาเฟีย 1920s</div>
            <div className="text-[10px] text-vintage-paper/60 mt-0.5">ชิคาโก สุราเถื่อน ปืนกล</div>
          </button>

          <button
            type="button"
            disabled
            className="p-3 rounded-xl border text-left transition-all bg-black/20 border-white/5 opacity-40 cursor-not-allowed relative overflow-hidden"
            title="โหมดบางระจันยังอยู่ในระหว่างการพัฒนา"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl block mb-1">⚔️</span>
              <span className="text-[9px] bg-amber-950/80 text-amber-400/80 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                เร็วๆ นี้
              </span>
            </div>
            <div className="font-bold text-xs text-vintage-gold/60">บางระจัน 2309</div>
            <div className="text-[10px] text-vintage-paper/40 mt-0.5">กำลังพัฒนา ยังไม่เปิดให้เลือก</div>
          </button>
        </div>
      </div>

      {/* Profile Setup */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-bold text-vintage-paper/80 block mb-1">
            ฉายาในวงการ (Player Name):
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={15}
            className="w-full bg-black/50 border border-vintage-gold/40 rounded-xl px-3.5 py-2.5 text-sm text-vintage-paper focus:outline-none focus:border-vintage-gold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-vintage-paper/80 block mb-1.5">
            เลือกรูปประจำตัว (Avatar):
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`py-2 rounded-xl text-2xl transition-all ${
                  selectedAvatar === av
                    ? 'bg-vintage-gold/20 border-2 border-vintage-gold shadow-md scale-105'
                    : 'bg-black/30 border border-white/5 hover:bg-white/5'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => {
            sounds.playCoin();
            onCreateRoom(playerName, selectedAvatar, selectedTheme);
          }}
          className="w-full py-3.5 bg-gradient-to-r from-vintage-gold to-amber-600 hover:from-amber-400 hover:to-amber-500 text-vintage-dark font-bold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98]"
        >
          👑 สร้างห้องใหม่ (Host New Game)
        </button>

        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="px-3 text-[11px] text-vintage-paper/40">หรือเข้าร่วมห้อง</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="รหัสห้อง 4 หลัก"
            value={inputRoomCode}
            onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="flex-1 bg-black/50 border border-vintage-gold/30 rounded-xl px-3 py-2 text-center font-mono font-bold tracking-widest text-vintage-gold uppercase text-sm focus:outline-none focus:border-vintage-gold"
          />
          <button
            onClick={() => {
              if (inputRoomCode.trim()) {
                sounds.playCoin();
                onJoinRoom(inputRoomCode.trim(), playerName, selectedAvatar);
              }
            }}
            className="px-5 py-2 rounded-xl bg-vintage-card border border-vintage-gold/60 text-vintage-gold hover:bg-vintage-gold/20 font-bold text-xs transition-all"
          >
            เข้าร่วม
          </button>
        </div>

        {/* Rules & Scoring Guide Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="w-full py-2.5 rounded-xl border border-vintage-gold/50 bg-vintage-gold/10 hover:bg-vintage-gold/20 text-vintage-gold font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span>📜</span>
            <span>คู่มือกฎกติกา & วิธีคิดคะแนน (Rules & Scoring)</span>
          </button>
        </div>

        <RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          currentThemeId={selectedTheme}
        />
      </div>
    </div>
  );
};
