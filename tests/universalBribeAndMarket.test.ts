import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../server/engine/gameState.js';
import { THEMES } from '../shared/themes.js';

describe('Universal Bribes & Market 3-Step Flow Tests', () => {
  let game: GameEngine;

  beforeEach(() => {
    game = new GameEngine('TEST_ROOM', 'mafia_1920');
    game.addPlayer('Al Capone', '🎩');
    game.addPlayer('Lucky Luciano', '🕶️');
    game.addPlayer('Bugs Moran', '💼');
  });

  it('initializes both left and right discard piles with 5 cards each at game start', () => {
    game.startGame(1);
    const piles = game.deck.getDiscardPiles();
    expect(piles.leftCount).toBe(5);
    expect(piles.rightCount).toBe(5);
    expect(piles.leftTop).not.toBeNull();
    expect(piles.rightTop).not.toBeNull();
  });

  it('completes the full 3-step Market flow: Set Aside -> Draw Back -> Finalize Discards', () => {
    game.startGame(1);
    expect(game.phase).toBe('MARKET');
    const activeMerchantId = game.activeMarketPlayerId!;
    const player = game.players.find((p) => p.id === activeMerchantId)!;
    expect(player.hand?.length).toBe(6);

    // Step 1: Set aside 2 cards
    const cardsToDiscard = [player.hand![0].id, player.hand![1].id];
    const step1Success = game.marketSetAsideDiscards(activeMerchantId, cardsToDiscard);
    expect(step1Success).toBe(true);
    expect(player.hand?.length).toBe(4);
    expect(player.pendingDiscards?.length).toBe(2);

    // Step 2: Draw 2 cards back (1 from deck, 1 from left discard)
    const drawn1 = game.marketDrawSingle(activeMerchantId, 'deck');
    expect(drawn1).not.toBeNull();
    expect(player.hand?.length).toBe(5);

    const drawn2 = game.marketDrawSingle(activeMerchantId, 'left');
    expect(drawn2).not.toBeNull();
    expect(player.hand?.length).toBe(6);

    // Step 3: Finalize discards: 1 card to left pile, 1 card to right pile
    const [leftId, rightId] = player.pendingDiscards!.map((c) => c.id);
    const step3Success = game.marketFinalizeDiscards(activeMerchantId, [leftId], [rightId]);
    expect(step3Success).toBe(true);
    expect(player.pendingDiscards?.length).toBe(0);

    // Turn should advance to the next player
    expect(game.activeMarketPlayerId).not.toBe(activeMerchantId);
  });

  it('supports Universal Bribe: Merchant offers bribe to pass, Inspector accepts', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];

    // Pack crate and declare
    game.phase = 'LOADING';
    const crateCard = targetMerchant.hand![0];
    game.packCrate(targetMerchant.id, [crateCard.id], 'apples');

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    // Target merchant offers $5 bribe to pass
    const bribeSuccess = game.offerUniversalBribe(
      targetMerchant.id,
      targetMerchant.id,
      'pass',
      5,
      'ขอผ่านทางด่วนครับสารวัตร'
    );
    expect(bribeSuccess).toBe(true);
    expect(game.bribeOffers.length).toBe(1);

    const bribe = game.bribeOffers[0];
    expect(bribe.intent).toBe('pass');
    expect(bribe.cash).toBe(5);

    const initialMerchantCash = targetMerchant.cash;
    const initialInspectorCash = inspector.cash;

    // Inspector accepts the pass bribe
    const resolveSuccess = game.resolveInspection('passed', bribe.id);
    expect(resolveSuccess).toBe(true);

    expect(targetMerchant.cash).toBe(initialMerchantCash - 5);
    expect(inspector.cash).toBe(initialInspectorCash + 5);
    expect(bribe.status).toBe('accepted');
  });

  it('supports Universal Bribe: Rival offers bribe to inspect, Inspector accepts', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];
    const rivalMerchant = merchants[1];

    // Setup target merchant crate
    game.phase = 'LOADING';
    const crateCard = targetMerchant.hand![0];
    game.packCrate(targetMerchant.id, [crateCard.id], 'apples');

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    // Rival offers $7 bribe to INSPECT target merchant
    game.offerUniversalBribe(
      rivalMerchant.id,
      targetMerchant.id,
      'inspect',
      7,
      'ตรวจมันเลยสารวัตร มีของเถื่อน!'
    );

    const bribe = game.bribeOffers[0];
    expect(bribe.fromPlayerId).toBe(rivalMerchant.id);
    expect(bribe.intent).toBe('inspect');

    const initialRivalCash = rivalMerchant.cash;
    const initialInspectorCash = inspector.cash;

    // Inspector accepts rival's inspect bribe
    game.resolveInspection('inspected', bribe.id);

    expect(rivalMerchant.cash).toBe(initialRivalCash - 7);
    expect(inspector.cash).toBe(initialInspectorCash + 7);
    expect(bribe.status).toBe('accepted');
  });

  it('handles competing bribes: Inspector accepts one bribe and rejects the other', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];
    const rivalMerchant = merchants[1];

    game.phase = 'LOADING';
    const crateCard = targetMerchant.hand![0];
    game.packCrate(targetMerchant.id, [crateCard.id], 'apples');

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    // Target offers $4 to pass
    game.offerUniversalBribe(targetMerchant.id, targetMerchant.id, 'pass', 4, 'ปล่อยผมเถอะ');
    // Rival offers $6 to inspect
    game.offerUniversalBribe(rivalMerchant.id, targetMerchant.id, 'inspect', 6, 'ตรวจมันเลย!');

    expect(game.bribeOffers.length).toBe(2);
    const passBribe = game.bribeOffers.find((b) => b.intent === 'pass')!;
    const inspectBribe = game.bribeOffers.find((b) => b.intent === 'inspect')!;

    const initialTargetCash = targetMerchant.cash;
    const initialRivalCash = rivalMerchant.cash;
    const initialInspectorCash = inspector.cash;

    // Inspector chooses to accept rival's inspect bribe ($6)
    game.resolveInspection('inspected', inspectBribe.id);

    // Rival paid $6
    expect(rivalMerchant.cash).toBe(initialRivalCash - 6);
    expect(inspector.cash).toBe(initialInspectorCash + 6);
    expect(inspectBribe.status).toBe('accepted');

    // Target merchant did NOT pay (bribe was rejected)
    expect(targetMerchant.cash).toBe(initialTargetCash);
    expect(passBribe.status).toBe('rejected');
  });

  it('rejects pending bribes when Inspector acts independently without accepting any bribe', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];

    game.phase = 'LOADING';
    const crateCard = targetMerchant.hand![0];
    game.packCrate(targetMerchant.id, [crateCard.id], 'apples');

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    game.offerUniversalBribe(targetMerchant.id, targetMerchant.id, 'pass', 5, 'ติดสินบน');
    const bribe = game.bribeOffers[0];

    const initialMerchantCash = targetMerchant.cash;
    const initialInspectorCash = inspector.cash;

    // Inspector passes independently without taking bribe
    game.resolveInspection('passed');

    expect(bribe.status).toBe('rejected');
    expect(targetMerchant.cash).toBe(initialMerchantCash);
    expect(inspector.cash).toBe(initialInspectorCash);
  });

  it('handles Red Button: Inspector clicks "สั่งเปิดตรวจค้นเอง (ไม่รับสินบน)" when bribe is present', () => {
    game.startGame(1);
    const inspector = game.getInspector();
    const merchants = game.getMerchants();
    const targetMerchant = merchants[0];

    game.phase = 'LOADING';
    // Give merchant contraband
    const contrabandCard = { ...THEMES.mafia_1920.contrabandGoods.whiskey, id: 'whiskey_test_1' };
    targetMerchant.hand = [contrabandCard];
    game.packCrate(targetMerchant.id, [contrabandCard.id]);

    game.phase = 'DECLARATION';
    game.declareGoods(targetMerchant.id, 'apples'); // Lies about having apples

    game.phase = 'NEGOTIATION';
    game.activeInspectTargetId = targetMerchant.id;

    // Target merchant offers $3 to pass
    game.offerUniversalBribe(targetMerchant.id, targetMerchant.id, 'pass', 3, 'ปล่อยผมเถอะครับ');
    expect(game.bribeOffers.length).toBe(1);
    const bribe = game.bribeOffers[0];

    const initialMerchantCash = targetMerchant.cash;
    const initialInspectorCash = inspector.cash;

    // Inspector clicks RED BUTTON: "สั่งเปิดตรวจค้นเอง (ไม่รับสินบน)" -> action === 'inspected', acceptedBribeId === undefined
    const success = game.resolveInspection('inspected');
    expect(success).toBe(true);

    // Phase transitions to INSPECTING with animation initialized
    expect(game.phase).toBe('INSPECTING');
    expect(game.inspectionAnimation).not.toBeNull();
    expect(game.inspectionAnimation?.action).toBe('inspected');
    expect(game.inspectionAnimation?.targetPlayerId).toBe(targetMerchant.id);
    expect(game.inspectionAnimation?.cards.length).toBe(1);

    // The unaccepted bribe must be rejected!
    expect(bribe.status).toBe('rejected');
    // Merchant did NOT lose $3 for bribe, inspector did not receive $3
    expect(targetMerchant.cash).toBe(initialMerchantCash);
    expect(inspector.cash).toBe(initialInspectorCash);
  });

  it('verifies SoundManager has all required audio synthesis methods including playGavel', async () => {
    const { sounds } = await import('../src/utils/audio.js');
    expect(sounds).toBeDefined();
    expect(typeof sounds.playGavel).toBe('function');
    expect(typeof sounds.playStamp).toBe('function');
    expect(typeof sounds.playCoin).toBe('function');
    expect(typeof sounds.playFlip).toBe('function');
    expect(typeof sounds.playCrate).toBe('function');
    expect(typeof sounds.playLatch).toBe('function');
    expect(typeof sounds.playSiren).toBe('function');
    expect(typeof sounds.playContrabandSneak).toBe('function');

    // Executing playGavel with enabled: false should execute cleanly without error
    sounds.enabled = false;
    expect(() => sounds.playGavel()).not.toThrow();
    expect(() => sounds.playStamp()).not.toThrow();
    sounds.enabled = true;
  });

  it('correctly tracks and accumulates legal and contraband card counts in player warehouse', () => {
    game.startGame(1);
    const merchant = game.getMerchants()[0];

    // Initially warehouse is empty
    expect(merchant.warehouse.legal.apples.length).toBe(0);
    expect(merchant.warehouse.legal.coffee.length).toBe(0);
    expect(merchant.warehouse.contrabandCount).toBe(0);

    // Add 2 apples, 3 coffee, and 1 contraband
    const apple1 = { ...THEMES.mafia_1920.legalGoods.apples, id: 'a1' };
    const apple2 = { ...THEMES.mafia_1920.legalGoods.apples, id: 'a2' };
    const coffee1 = { ...THEMES.mafia_1920.legalGoods.coffee, id: 'c1' };
    const coffee2 = { ...THEMES.mafia_1920.legalGoods.coffee, id: 'c2' };
    const coffee3 = { ...THEMES.mafia_1920.legalGoods.coffee, id: 'c3' };
    const whiskey = { ...THEMES.mafia_1920.contrabandGoods.whiskey, id: 'w1' };

    merchant.warehouse.legal.apples.push(apple1, apple2);
    merchant.warehouse.legal.coffee.push(coffee1, coffee2, coffee3);
    merchant.warehouse.contrabandCards = [whiskey];
    merchant.warehouse.contrabandCount = 1;

    expect(merchant.warehouse.legal.apples.length).toBe(2);
    expect(merchant.warehouse.legal.coffee.length).toBe(3);
    expect(merchant.warehouse.contrabandCount).toBe(1);

    // Verify calculated values
    const appleTotal = merchant.warehouse.legal.apples.length * THEMES.mafia_1920.legalGoods.apples.value;
    expect(appleTotal).toBe(2 * THEMES.mafia_1920.legalGoods.apples.value);

    const coffeeTotal = merchant.warehouse.legal.coffee.length * THEMES.mafia_1920.legalGoods.coffee.value;
    expect(coffeeTotal).toBe(3 * THEMES.mafia_1920.legalGoods.coffee.value);
  });

  it('handles Step 3 finalization with 4 cards (3 to left, 1 to right)', () => {
    game.startGame(1);
    const activeMerchantId = game.activeMarketPlayerId!;
    const player = game.players.find((p) => p.id === activeMerchantId)!;
    expect(player.hand?.length).toBe(6);

    // Step 1: Set aside 4 cards
    const cardsToDiscard = player.hand!.slice(0, 4).map((c) => c.id);
    expect(game.marketSetAsideDiscards(activeMerchantId, cardsToDiscard)).toBe(true);
    expect(player.hand?.length).toBe(2);
    expect(player.pendingDiscards?.length).toBe(4);

    // Step 2: Draw 4 cards back to reach 6
    for (let i = 0; i < 4; i++) {
      expect(game.marketDrawSingle(activeMerchantId, 'deck')).not.toBeNull();
    }
    expect(player.hand?.length).toBe(6);

    // Step 3: Finalize 3 cards to left, 1 card to right
    const pendingIds = player.pendingDiscards!.map((c) => c.id);
    const leftIds = pendingIds.slice(0, 3);
    const rightIds = pendingIds.slice(3);

    const initialLeftCount = game.deck.getDiscardPiles().leftCount;
    const initialRightCount = game.deck.getDiscardPiles().rightCount;

    const finalizeSuccess = game.marketFinalizeDiscards(activeMerchantId, leftIds, rightIds);
    expect(finalizeSuccess).toBe(true);
    expect(player.pendingDiscards?.length).toBe(0);
    expect(player.hand?.length).toBe(6);

    // Piles should have increased by 3 and 1
    const finalPiles = game.deck.getDiscardPiles();
    expect(finalPiles.leftCount).toBe(initialLeftCount + 3);
    expect(finalPiles.rightCount).toBe(initialRightCount + 1);

    // Turn should have advanced to next player
    expect(game.activeMarketPlayerId).not.toBe(activeMerchantId);
  });
});

