import { Card, LegalGoodsType, Player } from '../../shared/types.js';

export interface SettlementSummary {
  cashPaid: number;
  cardsSeizedToCreditor: Card[];
  debtForgiven: number;
}

/**
 * Handles payment of debt between two players (debtor -> creditor).
 * Implements the agreed rules:
 * 1. Pay with cash first.
 * 2. If cash is exhausted, liquidate goods from debtor's warehouse to creditor at face value.
 * 3. If debtor has 0 cash and 0 warehouse goods, remaining debt is forgiven (Bankruptcy Protection).
 */
export function settleDebt(
  debtor: Player,
  creditor: Player,
  debtAmount: number
): SettlementSummary {
  let remainingDebt = debtAmount;
  let cashPaid = 0;
  const cardsSeizedToCreditor: Card[] = [];
  let debtForgiven = 0;

  // Step 1: Pay with available cash
  if (debtor.cash >= remainingDebt) {
    debtor.cash -= remainingDebt;
    creditor.cash += remainingDebt;
    cashPaid = remainingDebt;
    remainingDebt = 0;
  } else {
    cashPaid = debtor.cash;
    remainingDebt -= debtor.cash;
    creditor.cash += debtor.cash;
    debtor.cash = 0; // Debtor now has $0 cash
  }

  // Step 2: Liquidate warehouse goods if there's still debt
  if (remainingDebt > 0) {
    // Gather all goods from debtor's warehouse
    // Prioritize legal goods first, then contraband
    const legalTypes: LegalGoodsType[] = ['flour', 'apples', 'coffee', 'cigars'];

    for (const type of legalTypes) {
      const cardsOfType = debtor.warehouse.legal[type];
      while (cardsOfType.length > 0 && remainingDebt > 0) {
        const card = cardsOfType.pop()!;
        remainingDebt -= card.value;
        cardsSeizedToCreditor.push(card);
        // Transfer to creditor's warehouse!
        creditor.warehouse.legal[type].push(card);
      }
      if (remainingDebt <= 0) break;
    }

    // If still in debt, liquidate contraband cards
    if (remainingDebt > 0 && debtor.warehouse.contrabandCards) {
      while (debtor.warehouse.contrabandCards.length > 0 && remainingDebt > 0) {
        const card = debtor.warehouse.contrabandCards.pop()!;
        debtor.warehouse.contrabandCount = debtor.warehouse.contrabandCards.length;
        remainingDebt -= card.value;
        cardsSeizedToCreditor.push(card);

        // Contraband seized becomes part of creditor's warehouse
        if (!creditor.warehouse.contrabandCards) creditor.warehouse.contrabandCards = [];
        creditor.warehouse.contrabandCards.push(card);
        creditor.warehouse.contrabandCount = creditor.warehouse.contrabandCards.length;
      }
    }
  }

  // Step 3: Bankruptcy Protection (Pauper rule)
  // If remaining debt > 0 but debtor has no cash and no goods left, forgive the remainder
  if (remainingDebt > 0) {
    debtForgiven = remainingDebt;
    remainingDebt = 0;
  }

  return {
    cashPaid,
    cardsSeizedToCreditor,
    debtForgiven,
  };
}
