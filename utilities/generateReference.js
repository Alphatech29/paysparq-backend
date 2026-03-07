const generateTransactionReference = () => {
  return Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
};

module.exports = generateTransactionReference;