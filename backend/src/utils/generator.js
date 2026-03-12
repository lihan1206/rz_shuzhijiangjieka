import dayjs from 'dayjs';

export function createOrderNo() {
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD${dayjs().format('YYMMDDHHmmss')}${random}`;
}

export function createCardNo() {
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `GD${dayjs().format('YYMMDDHHmmss')}${random}`;
}
