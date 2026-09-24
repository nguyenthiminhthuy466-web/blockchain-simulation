/**
 * blockchain.js
 * ------------------------------------------------------------------
 * Định nghĩa cấu trúc dữ liệu Block, Blockchain và các quy tắc đồng
 * thuận cơ bản (Proof of Work đơn giản + Longest Chain Rule) dùng
 * cho đồ án mô phỏng mạng Blockchain P2P.
 * ------------------------------------------------------------------
 */

const crypto = require('crypto');

// Độ khó Proof-of-Work: hash của block phải bắt đầu bằng chuỗi này.
// Để mô phỏng chạy nhanh trên máy học tập, chỉ dùng độ khó rất thấp.
const DIFFICULTY_PREFIX = '00';

/**
 * Lớp Block: đơn vị dữ liệu cơ bản của chuỗi khối.
 */
class Block {
  constructor(index, previousHash, timestamp, data, hash, nonce = 0) {
    this.index = index;               // Vị trí của block trong chuỗi (Genesis = 0)
    this.previousHash = previousHash; // Hash của block liền trước -> tạo liên kết chuỗi
    this.timestamp = timestamp;       // Thời điểm tạo block (Unix time, giây)
    this.data = data;                 // Dữ liệu/giao dịch chứa trong block
    this.hash = hash;                 // Hash SHA-256 của chính block này
    this.nonce = nonce;               // Số dùng để "đào" (Proof of Work)
  }
}

/**
 * Tính hash SHA-256 chuẩn (dùng module `crypto` có sẵn của Node.js)
 * dựa trên toàn bộ nội dung của block.
 */
function calculateHash(index, previousHash, timestamp, data, nonce) {
  return crypto
    .createHash('sha256')
    .update(index + previousHash + timestamp + JSON.stringify(data) + nonce)
    .digest('hex');
}

function calculateHashForBlock(block) {
  return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.nonce);
}

/**
 * Genesis Block: block đầu tiên, được "cứng hoá" (hard-code) giống nhau
 * trên mọi node để đảm bảo tất cả các node đều xuất phát từ cùng 1 gốc.
 */
function getGenesisBlock() {
  const index = 0;
  const previousHash = '0';
  const timestamp = 1700000000; // Timestamp cố định -> genesis luôn giống hệt nhau ở mọi node
  const data = [{ info: 'Genesis Block - DLU Blockchain Lab' }];
  const nonce = 0;
  const hash = calculateHash(index, previousHash, timestamp, data, nonce);
  return new Block(index, previousHash, timestamp, data, hash, nonce);
}

/**
 * "Đào" một block mới bằng cách tăng dần nonce cho tới khi hash thu được
 * thoả điều kiện độ khó (bắt đầu bằng DIFFICULTY_PREFIX).
 * Đây là mô phỏng Proof of Work rất đơn giản, chỉ phục vụ mục đích học tập.
 */
function mineBlock(index, previousHash, data) {
  let nonce = 0;
  const timestamp = Math.floor(Date.now() / 1000);
  let hash = calculateHash(index, previousHash, timestamp, data, nonce);
  while (!hash.startsWith(DIFFICULTY_PREFIX)) {
    nonce += 1;
    hash = calculateHash(index, previousHash, timestamp, data, nonce);
  }
  return new Block(index, previousHash, timestamp, data, hash, nonce);
}

/**
 * Kiểm tra một block mới có hợp lệ khi nối tiếp sau block trước đó không:
 * - index phải tăng liên tục
 * - previousHash phải khớp với hash của block trước
 * - hash tự tính lại phải khớp với hash được khai báo (chống giả mạo dữ liệu)
 * - hash phải thoả độ khó Proof of Work
 */
function isValidNewBlock(newBlock, previousBlock) {
  if (previousBlock.index + 1 !== newBlock.index) return false;
  if (previousBlock.hash !== newBlock.previousHash) return false;
  if (calculateHashForBlock(newBlock) !== newBlock.hash) return false;
  if (!newBlock.hash.startsWith(DIFFICULTY_PREFIX)) return false;
  return true;
}

/**
 * Kiểm tra tính hợp lệ của toàn bộ một chuỗi khối:
 * - Block đầu tiên phải đúng là Genesis Block
 * - Mỗi block tiếp theo phải hợp lệ so với block liền trước
 */
function isValidChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  if (JSON.stringify(chain[0]) !== JSON.stringify(getGenesisBlock())) return false;

  for (let i = 1; i < chain.length; i += 1) {
    if (!isValidNewBlock(chain[i], chain[i - 1])) return false;
  }
  return true;
}

/**
 * Lớp Blockchain: đại diện cho "bản sao chuỗi khối" độc lập của MỘT node,
 * lưu hoàn toàn trong bộ nhớ (in-memory), kèm theo Mempool riêng.
 */
class Blockchain {
  constructor() {
    this.chain = [getGenesisBlock()];
    this.mempool = []; // Hàng đợi các giao dịch/dữ liệu chờ được đưa vào block
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /** Thêm một giao dịch thử nghiệm vào Mempool */
  addToMempool(tx) {
    this.mempool.push(tx);
  }

  /**
   * Đào một block mới dựa trên dữ liệu tuỳ chỉnh (customData) hoặc lấy
   * toàn bộ Mempool hiện có làm dữ liệu cho block.
   */
  mineNewBlock(customData) {
    const previousBlock = this.getLatestBlock();
    const nextIndex = previousBlock.index + 1;
    const dataToMine =
      customData && customData.length > 0
        ? customData
        : this.mempool.length > 0
        ? [...this.mempool]
        : [{ info: `Block thử nghiệm #${nextIndex}` }];

    const newBlock = mineBlock(nextIndex, previousBlock.hash, dataToMine);

    if (this.addBlock(newBlock)) {
      this.mempool = []; // Xoá Mempool sau khi dữ liệu đã được "đóng gói" vào block
      return newBlock;
    }
    return null;
  }

  /** Thêm 1 block hợp lệ vào cuối chuỗi hiện tại của node này */
  addBlock(newBlock) {
    if (isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.chain.push(newBlock);
      return true;
    }
    return false;
  }

  /**
   * Luật đồng thuận "Chuỗi dài nhất" (Longest Chain Rule):
   * Chỉ thay thế chuỗi hiện tại nếu chuỗi mới hợp lệ VÀ dài hơn.
   */
  replaceChain(newChain) {
    if (isValidChain(newChain) && newChain.length > this.chain.length) {
      this.chain = newChain;
      return true;
    }
    return false;
  }
}

module.exports = {
  Block,
  Blockchain,
  getGenesisBlock,
  calculateHash,
  calculateHashForBlock,
  isValidChain,
  isValidNewBlock,
  mineBlock,
  DIFFICULTY_PREFIX,
};