export function toNumber(decimalValue) {
  if (decimalValue === null || decimalValue === undefined) {
    return null;
  }
  return Number(decimalValue);
}

export function formatCard(card) {
  return {
    ...card,
    balance: toNumber(card.balance)
  };
}

export function formatCardType(cardType) {
  return {
    ...cardType,
    price: toNumber(cardType.price)
  };
}

export function formatTransaction(transaction) {
  return {
    ...transaction,
    amount: toNumber(transaction.amount)
  };
}
