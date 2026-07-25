const CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = CHARSET.length; // 62

function encode(id) {
  if (id === 0) return CHARSET[0];

  let result = "";
  let num = id;

  while (num > 0) {
    const remainder = num % BASE;
    result = CHARSET[remainder] + result;
    num = Math.floor(num / BASE);
  }

  return result;
}

function decode(code) {
  let num = 0;

  for (let i = 0; i < code.length; i++) {
    const value = CHARSET.indexOf(code[i]);
    num = num * BASE + value;
  }

  return num;
}

module.exports = { encode, decode };
