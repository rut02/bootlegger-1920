import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../server/engine/gameState.js';
import { settleDebt } from '../server/engine/settlement.js';
import { calculateScores } from '../server/engine/scoring.js';
import { THEMES } from '../shared/themes.js';
import { Player } from '../shared/types.js';

describe('Bootlegger 1920 & Bang Rajan - Game Engine Updates', () => {
  let game: GameEngine;

  beforeEach(() => {
    game = new GameEngine('TEST', 'mafia_1920');
    game.addPlayer('Al Capone', '🎩');
    game.addPlayer('Lucky Luciano', '🕶️');
    game.addPlayer('Bugs Moran', '💼');
  });

  it('initializes sequential market phase clockwise from Inspector', () => {
    game.startGame(1);
    expect(game.phase).toBe('MARKET');
    expect(game.activeMarketPlayerId).not.toBeNull();
    // Active player must not be the Inspector!
    expect(game.activeMarketPlayerId).not.toBe(game.getInspector().id);

    // Active player performs market action
    const currentActiveId = game.activeMarketPlayerId!;
    const player = game.players.find((p) => p.id === currentActiveId)!;
    const discard = [player.hand![0].id];
    game.marketAction(currentActiveId, discard, 'left', 'deck');

    // Should advance to next merchant in turn order
    expect(game.activeMarketPlayerId).not.toBe(currentActiveId);
  });

  it('supports Selective Market Split Discard (placing cards to left and right piles)', () => {
    game.startGame(1);
    const activeId = game.activeMarketPlayerId!;
    const player = game.players.find((p) => p.id === activeId)!;
    expect(player.hand?.length).toBe(6);

    const leftCardId = player.hand![0].id;
    const rightCardId = player.hand![1].id;

    const success = game.marketSplitDiscard(activeId, [leftCardId], [rightCardId]);
    expect(success).toBe(true);

    // Hand should now have 4 cards (discarded 2)
    expect(player.hand?.length).toBe(4);
    // Discard piles should have received the cards
    const piles = game.deck.getDiscardPiles();
    expect(piles.leftCount).toBeGreaterThanOrEqual(1);
    expect(piles.rightCount).toBeGreaterThanOrEqual(1);
  });

  it('supports Universal Bribing: 3rd party player can bribe Inspector to inspect a rival', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];
    const rivalMerchant = merchants[1];

    // Give target merchant contraband
    game.phase = 'LOADING';
    const contrabandCard = { ...THEMES.mafia_1920.contrabandGoods.whiskey, id: 'whiskey_1' };
    targetMerchant.hand = [contrabandCard];
    game.packCrate(targetMerchant.id, [contrabandCard.id]);

    game.phase = 'DECLARATION';
    game.declareGoods(targetMerchant.id, 'apples'); // Lies

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    // Rival offers $10 to Inspector to INSPECT target merchant!
    game.offerUniversalBribe(rivalMerchant.id, targetMerchant.id, 'inspect', 10, 'ตรวจมันเลยสารวัตร มันพกเหล้าเถื่อนแน่!');

    expect(game.bribeOffers.length).toBe(1);
    const bribe = game.bribeOffers[0];
    expect(bribe.fromPlayerId).toBe(rivalMerchant.id);
    expect(bribe.intent).toBe('inspect');

    const initialInspectorCash = inspector.cash;
    const initialRivalCash = rivalMerchant.cash;

    // Inspector accepts rival's bribe and inspects!
    game.resolveInspection('inspected', bribe.id);

    // Rival paid $10 to inspector immediately upon bribe acceptance
    expect(rivalMerchant.cash).toBe(initialRivalCash - 10);
    expect(inspector.cash).toBe(initialInspectorCash + 10);
  });

  it('supports Bang Rajan theme with authentic Thai items and scoring', () => {
    const thaiGame = new GameEngine('THAI', 'bang_rajan');
    thaiGame.addPlayer('นายจันหนวดเขี้ยว', '⚔️');
    thaiGame.addPlayer('นายทองเหม็น', '🗡️');
    thaiGame.startGame(1);

    expect(thaiGame.themeId).toBe('bang_rajan');
    const p1 = thaiGame.players[0];
    expect(p1.hand?.length).toBe(6);

    // Verify deck contains Bang Rajan cards
    const card = p1.hand![0];
    const themeDefs = {
      ...THEMES.bang_rajan.legalGoods,
      ...THEMES.bang_rajan.contrabandGoods,
    };
    expect(themeDefs[card.type]).toBeDefined();
  });

  it('handles insolvency and bankruptcy protection', () => {
    const debtor: Player = {
      id: 'p_debtor',
      name: 'นายทองเหม็นหมดตัว',
      avatar: '🗡️',
      cash: 0,
      handCount: 0,
      warehouse: {
        legal: { flour: [], apples: [], coffee: [], cigars: [] },
        contrabandCount: 0,
        contrabandCards: [],
      },
      crate: null,
      hasDeclared: false,
      hasPackedCrate: false,
      isInspector: false,
      isReady: true,
      isConnected: true,
    };

    const creditor: Player = {
      id: 'p_creditor',
      name: 'ขุนศึก',
      avatar: '👮',
      cash: 50,
      handCount: 0,
      warehouse: { legal: { flour: [], apples: [], coffee: [], cigars: [] }, contrabandCount: 0, contrabandCards: [] },
      crate: null,
      hasDeclared: false,
      hasPackedCrate: false,
      isInspector: true,
      isReady: true,
      isConnected: true,
    };

    const summary = settleDebt(debtor, creditor, 15);
    expect(summary.cashPaid).toBe(0);
    expect(summary.debtForgiven).toBe(15);
    expect(debtor.cash).toBe(0);
  });

  it('seeds 5 cards face-up to left and right discard piles and provides recent history', () => {
    game.startGame(1);
    const piles = game.deck.getDiscardPiles();
    expect(piles.leftCount).toBe(5);
    expect(piles.rightCount).toBe(5);
    expect(piles.leftTop).not.toBeNull();
    expect(piles.rightTop).not.toBeNull();
    expect(piles.leftRecent).toBeDefined();
    expect(piles.rightRecent).toBeDefined();
    expect(piles.leftRecent!.length).toBe(5);
    expect(piles.rightRecent!.length).toBe(5);
    // Most recent is top
    expect(piles.leftRecent![0].id).toBe(piles.leftTop!.id);
    expect(piles.rightRecent![0].id).toBe(piles.rightTop!.id);
  });

  it('supports full 3-step market exchange flow: set aside -> draw -> distribute to left and right', () => {
    game.startGame(1);
    const activeId = game.activeMarketPlayerId!;
    const player = game.players.find((p) => p.id === activeId)!;
    expect(player.hand?.length).toBe(6);

    const discardIds = [player.hand![0].id, player.hand![1].id];

    // Step 1: Set aside 2 cards
    const step1Success = game.marketSetAsideDiscards(activeId, discardIds);
    expect(step1Success).toBe(true);
    expect(player.hand?.length).toBe(4);
    expect(player.pendingDiscards?.length).toBe(2);

    // Step 2: Draw 2 replacement cards (1 from deck, 1 from left discard)
    const card1 = game.marketDrawSingle(activeId, 'deck');
    expect(card1).not.toBeNull();
    expect(player.hand?.length).toBe(5);

    const card2 = game.marketDrawSingle(activeId, 'left');
    expect(card2).not.toBeNull();
    expect(player.hand?.length).toBe(6);
    // Still player's turn because pendingDiscards need to be distributed!
    expect(game.activeMarketPlayerId).toBe(activeId);

    // Step 3: Distribute the 2 set-aside cards (1 to left pile, 1 to right pile)
    const step3Success = game.marketFinalizeDiscards(activeId, [discardIds[0]], [discardIds[1]]);
    expect(step3Success).toBe(true);
    expect(player.pendingDiscards?.length).toBe(0);

    // Market turn should now have advanced to next merchant
    expect(game.activeMarketPlayerId).not.toBe(activeId);
  });

  it('initiates suspense animation with action === "passed" when Inspector passes', () => {
    game.startGame(1);
    const merchants = game.getMerchants();
    const merchant = merchants[0];

    game.phase = 'LOADING';
    const legalCard = { ...THEMES.mafia_1920.legalGoods.apples, id: 'apples_99' };
    const contrabandCard = { ...THEMES.mafia_1920.contrabandGoods.whiskey, id: 'whiskey_99' };
    merchant.hand = [legalCard, contrabandCard];
    game.packCrate(merchant.id, [legalCard.id, contrabandCard.id], 'apples');

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = merchant.id;

    // Inspector chooses PASS
    const passSuccess = game.resolveInspection('passed');
    expect(passSuccess).toBe(true);
    expect(game.phase).toBe('INSPECTING');
    expect(game.inspectionAnimation).not.toBeNull();
    expect(game.inspectionAnimation?.action).toBe('passed');
    expect(game.inspectionAnimation?.cards.length).toBe(2);
  });

  it('maintains logs in chronological order (oldest first, newest last)', () => {
    game.startGame(1);
    game.addLog('Log 1: First event', 'info');
    game.addLog('Log 2: Second event', 'alert');
    game.addLog('Log 3: Latest event', 'bribe');

    const state = game.getSanitizedState(game.players[0].id);
    const last3 = state.logs.slice(-3);
    expect(last3[0].text).toBe('Log 1: First event');
    expect(last3[1].text).toBe('Log 2: Second event');
    expect(last3[2].text).toBe('Log 3: Latest event');
  });

  it('supports AFK status and Bot AI takeover for disconnected / idle players', () => {
    game.startGame(1);
    const humanPlayer = game.players[0];
    expect(humanPlayer.isAfk).toBeFalsy();

    const ok = game.setPlayerAfk(humanPlayer.id, true);
    expect(ok).toBe(true);
    expect(humanPlayer.isAfk).toBe(true);

    const sanitized = game.getSanitizedState(humanPlayer.id);
    const sanitizedPlayer = sanitized.players.find((p) => p.id === humanPlayer.id);
    expect(sanitizedPlayer?.isAfk).toBe(true);

    // Turn off AFK
    game.setPlayerAfk(humanPlayer.id, false);
    expect(humanPlayer.isAfk).toBe(false);
  });
});
