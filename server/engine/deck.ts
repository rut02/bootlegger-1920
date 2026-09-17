import { Card, GoodsType } from '../../shared/types.js';
import { THEMES, ThemeId } from '../../shared/themes.js';
import { DECK_COMPOSITION } from '../../shared/cards.js';

export class DeckManager {
  private drawDeck: Card[] = [];
  private discardLeft: Card[] = [];
  private discardRight: Card[] = [];
  private currentThemeId: ThemeId = 'mafia_1920';

  constructor(themeId: ThemeId = 'mafia_1920') {
    this.reset(themeId);
  }

  public reset(themeId: ThemeId = this.currentThemeId): void {
    this.currentThemeId = themeId;
    this.drawDeck = [];
    this.discardLeft = [];
    this.discardRight = [];

    const theme = THEMES[themeId];
    const allDefs: Record<GoodsType, Omit<Card, 'id'>> = {
      ...theme.legalGoods,
      ...theme.contrabandGoods,
    };

    let cardIdCounter = 1;
    for (const [type, count] of Object.entries(DECK_COMPOSITION) as [GoodsType, number][]) {
      const def = allDefs[type];
      for (let i = 0; i < count; i++) {
        this.drawDeck.push({
          ...def,
          id: `card_${cardIdCounter++}_${type}`,
        });
      }
    }

    this.shuffle(this.drawDeck);

    // Initial discard piles: draw 5 cards for each pile face up (Sheriff of Nottingham official rules)
    for (let i = 0; i < 5; i++) {
      if (this.drawDeck.length > 0) this.discardLeft.push(this.drawDeck.pop()!);
    }
    for (let i = 0; i < 5; i++) {
      if (this.drawDeck.length > 0) this.discardRight.push(this.drawDeck.pop()!);
    }
  }

  public ensureSeeded(): void {
    if (this.discardLeft.length === 0 && this.drawDeck.length > 0) {
      this.discardLeft.push(this.drawDeck.pop()!);
    }
    if (this.discardRight.length === 0 && this.drawDeck.length > 0) {
      this.discardRight.push(this.drawDeck.pop()!);
    }
  }

  public shuffle(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  public drawCards(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawDeck.length === 0) {
        this.recycleDiscards();
      }
      if (this.drawDeck.length > 0) {
        drawn.push(this.drawDeck.pop()!);
      }
    }
    return drawn;
  }

  public drawFromDiscard(pile: 'left' | 'right'): Card | null {
    const target = pile === 'left' ? this.discardLeft : this.discardRight;
    if (target.length === 0) return null;
    return target.pop() || null;
  }

  public discardToPile(cards: Card[], pile: 'left' | 'right' = 'left'): void {
    const targetPile = pile === 'left' ? this.discardLeft : this.discardRight;
    for (const card of cards) {
      targetPile.push(card);
    }
  }

  private recycleDiscards(): void {
    const leftTop = this.discardLeft.pop();
    const rightTop = this.discardRight.pop();

    const toRecycle = [...this.discardLeft, ...this.discardRight];
    this.discardLeft = leftTop ? [leftTop] : [];
    this.discardRight = rightTop ? [rightTop] : [];

    this.shuffle(toRecycle);
    this.drawDeck = toRecycle;
  }

  public getDrawDeckCount(): number {
    return this.drawDeck.length;
  }

  public getDiscardPiles() {
    return {
      leftTop: this.discardLeft.length > 0 ? this.discardLeft[this.discardLeft.length - 1] : null,
      rightTop: this.discardRight.length > 0 ? this.discardRight[this.discardRight.length - 1] : null,
      leftCount: this.discardLeft.length,
      rightCount: this.discardRight.length,
      leftRecent: this.discardLeft.slice(-5).reverse(),
      rightRecent: this.discardRight.slice(-5).reverse(),
    };
  }

  public peekDiscardPile(pile: 'left' | 'right'): Card[] {
    return pile === 'left' ? [...this.discardLeft] : [...this.discardRight];
  }
}
