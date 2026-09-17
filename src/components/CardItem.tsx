import React from 'react';
import { Card } from '../../shared/types.js';
import { ModularCard } from './ModularCard.js';

interface CardItemProps {
  card: Card;
  isSelected?: boolean;
  onClick?: () => void;
  small?: boolean;
  disabled?: boolean;
  isFaceDown?: boolean;
  countBadge?: number;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  isSelected = false,
  onClick,
  small = false,
  disabled = false,
  isFaceDown = false,
  countBadge,
}) => {
  return (
    <ModularCard
      card={card}
      isSelected={isSelected}
      onClick={onClick}
      size={small ? 'sm' : 'md'}
      disabled={disabled}
      isFaceDown={isFaceDown}
      countBadge={countBadge}
    />
  );
};
