export function createUsername(full_name) {
  let name = full_name.toLowerCase().replace(/[^a-z]/g, "");

  let base = name.slice(0, 8);

  const letters = "abcdefghijklmnopqrstuvwxyz";
  while (base.length < 8) {
    base += letters[Math.floor(Math.random() * letters.length)];
  }
  const numbers = Math.floor(10 + Math.random() * 90);

  return base + numbers;
}