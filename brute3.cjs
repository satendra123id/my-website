const https = require('https');

function generateCombinations(str) {
  if (str.length === 0) return [''];
  const first = str[0];
  const rest = generateCombinations(str.slice(1));
  
  const chars = [first];
  if (first === '0' || first === 'o' || first === 'O') {
    chars.push('0', 'o', 'O');
  }
  if (first === '1' || first === 'l' || first === 'I' || first === 'i') {
    chars.push('1', 'l', 'I', 'i');
  }
  if (first === '5' || first === 'S' || first === 's') {
    chars.push('5', 'S', 's');
  }
  if (first === 'C' || first === 'c') {
    chars.push('C', 'c');
  }
  if (first === 'V' || first === 'v') {
    chars.push('V', 'v');
  }
  if (first === 'W' || first === 'w') {
    chars.push('W', 'w');
  }
  
  const uniqueChars = [...new Set(chars)];
  
  const result = [];
  for (const c of uniqueChars) {
    for (const r of rest) {
      result.push(c + r);
    }
  }
  return result;
}

const id_vars = generateCombinations('rzp_live_T9VYFGs0wv50Fc');
// that will be too many... let's limit it to just a few indices.
