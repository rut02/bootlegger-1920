import { LegalGoodsType, Player, GameScoreResult } from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';

export function calculateScores(players: Player[], themeId: ThemeId = 'mafia_1920'): GameScoreResult[] {
  const legalTypes: LegalGoodsType[] = ['flour', 'apples', 'coffee', 'cigars'];
  const theme = THEMES[themeId];

  // 1. Calculate base values: cash and goods
  const intermediateScores = players.map((player) => {
    let goodsValue = 0;

    // Legal goods values
    for (const type of legalTypes) {
      const cards = player.warehouse.legal[type] || [];
      for (const card of cards) {
        goodsValue += card.value;
      }
    }

    // Contraband goods values
    if (player.warehouse.contrabandCards) {
      for (const card of player.warehouse.contrabandCards) {
        goodsValue += card.value;
      }
    }

    return {
      playerId: player.id,
      playerName: player.name,
      cash: player.cash,
      goodsValue,
      bonuses: [] as { goodType: LegalGoodsType; rank: 1 | 2; bonusAmount: number }[],
      totalScore: player.cash + goodsValue,
      isWinner: false,
    };
  });

  // 2. Calculate King and Queen bonuses for each legal good
  for (const type of legalTypes) {
    const counts = players.map((p) => ({
      playerId: p.id,
      count: (p.warehouse.legal[type] || []).length,
    }));

    counts.sort((a, b) => b.count - a.count);

    const bonusInfo = theme.kingBonuses[type];
    const topCount = counts[0].count;

    if (topCount > 0) {
      const firstPlaceTied = counts.filter((c) => c.count === topCount);

      if (firstPlaceTied.length > 1) {
        const sharedBonus = Math.floor((bonusInfo.king + bonusInfo.queen) / firstPlaceTied.length);
        for (const tied of firstPlaceTied) {
          const entry = intermediateScores.find((s) => s.playerId === tied.playerId);
          if (entry) {
            entry.bonuses.push({ goodType: type, rank: 1, bonusAmount: sharedBonus });
            entry.totalScore += sharedBonus;
          }
        }
      } else {
        const winner = intermediateScores.find((s) => s.playerId === firstPlaceTied[0].playerId);
        if (winner) {
          winner.bonuses.push({ goodType: type, rank: 1, bonusAmount: bonusInfo.king });
          winner.totalScore += bonusInfo.king;
        }

        const remaining = counts.filter((c) => c.count < topCount && c.count > 0);
        if (remaining.length > 0) {
          const secondCount = remaining[0].count;
          const secondPlaceTied = remaining.filter((c) => c.count === secondCount);
          const sharedQueenBonus = Math.floor(bonusInfo.queen / secondPlaceTied.length);

          for (const tied of secondPlaceTied) {
            const entry = intermediateScores.find((s) => s.playerId === tied.playerId);
            if (entry) {
              entry.bonuses.push({ goodType: type, rank: 2, bonusAmount: sharedQueenBonus });
              entry.totalScore += sharedQueenBonus;
            }
          }
        }
      }
    }
  }

  intermediateScores.sort((a, b) => b.totalScore - a.totalScore);

  if (intermediateScores.length > 0) {
    intermediateScores[0].isWinner = true;
  }

  return intermediateScores;
}
