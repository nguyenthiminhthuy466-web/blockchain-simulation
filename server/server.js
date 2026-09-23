/**
 * server.js
 * ------------------------------------------------------------------
 * Điểm khởi động (entry point) của MỘT Full Node.
 * Tương thích linh hoạt:
 *   Cách 1 (Vị trí):     node server.js 3001 6001 Node-1
 *   Cách 2 (Named Flag): node server.js --http=3001 --ws=6001 --name=Node-1
 *   Cách 3 (Env var):    set HTTP_PORT=3001 && set WS_PORT=6001 && node server.js
 * ------------------------------------------------------------------
 */

const express = require('express');
const cors = require('cors');
const { Blockchain } = require('./src/blockchain');
const p2pModule = require('./src/p2p');

const {
  initP2PServer,
  connectToPeers,
  broadcastLatest,
  getSockets,
} = p2pModule;

/** Phân tích cả tham số vị trí và tham số dạng --key=value */
function parseArgs() {
  const args = {};
  const positional = [];

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      args[key] = value;
    } else {
      positional.push(arg);
    }
  });

  return { args, positional };
}

const { args: cli, positional } = parseArgs();

// Thứ tự ưu tiên: CLI flag (--http) > Vị trí (pos 0) > Biến môi trường > Giá trị mặc định
const HTTP_PORT = Number(cli.http || positional[0] || process.env.HTTP_PORT || 3001);
const WS_PORT = Number(cli.ws || positional[1] || process.env.WS_PORT || 6001);
const NODE_ID = cli.name || positional[2] || process.env.NODE_NAME || `Node-${HTTP_PORT}`;

// Peers: lấy từ --peers=... hoặc positional[3] hoặc process.env.PEERS
const rawPeers = cli.peers || positional[3] || process.env.PEERS || '';
const INITIAL_PEERS = rawPeers
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Mỗi node có bản sao Blockchain riêng biệt lưu trên RAM
const blockchain = new Blockchain();

// Nhật ký hoạt động (in-memory ring buffer)
const logs = [];
function log(message) {
  const entry = { time: new Date().toISOString(), message };
  logs.push(entry);
  if (logs.length > 200) logs.shift();
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ID}] ${message}`);
}

// ------------------------------- REST API -------------------------------
const app = express();
app.use(cors());
app.use(express.json());

/** GET /status - Kiểm tra trạng thái node */
app.get('/status', (req, res) => {
  const latest = blockchain.getLatestBlock();
  const peersList = typeof getSockets === 'function' ? getSockets() : [];
  res.json({
    nodeId: NODE_ID,
    httpPort: HTTP_PORT,
    wsPort: WS_PORT,
    status: 'online',
    height: latest ? (latest.index !== undefined ? latest.index : latest.height) : 0,
    latestHash: latest ? latest.hash : '',
    peers: peersList.length,
    mempoolSize: blockchain.mempool ? blockchain.mempool.length : 0,
  });
});

/** GET /blocks - Danh sách block */
app.get('/blocks', (req, res) => {
  res.json(blockchain.chain);
});

/** GET /logs - Lịch sử log */
app.get('/logs', (req, res) => {
  res.json(logs.slice(-50));
});

/** POST /mine - Tạo/đào block mới */
app.post('/mine', (req, res) => {
  let newBlock = null;
  const customData = req.body && req.body.data ? [{ info: req.body.data }] : null;

  if (typeof blockchain.mineNewBlock === 'function') {
    newBlock = blockchain.mineNewBlock(customData);
  } else if (typeof blockchain.addBlock === 'function') {
    const prev = blockchain.getLatestBlock();
    const idx = (prev ? prev.index : 0) + 1;
    newBlock = {
      index: idx,
      previousHash: prev ? prev.hash : '0',
      timestamp: Date.now(),
      data: customData || [{ from: 'SYSTEM', to: NODE_ID, amount: 50 }],
      nonce: 0,
      hash: 'mock-hash-' + Date.now(),
    };
    blockchain.addBlock(newBlock);
  }

  if (!newBlock) {
    return res.status(400).json({ error: 'Không thể đào block mới' });
  }

  log(`⛏️ Đã tạo/đào thành công Block #${newBlock.index}`);
  if (typeof broadcastLatest === 'function') {
    broadcastLatest(blockchain);
  }
  return res.json(newBlock);
});

/** POST /transaction - Thêm giao dịch vào mempool */
app.post('/transaction', (req, res) => {
  if (typeof blockchain.addToMempool === 'function') {
    blockchain.addToMempool({ ...req.body, receivedAt: Date.now() });
  } else if (Array.isArray(blockchain.mempool)) {
    blockchain.mempool.push({ ...req.body, receivedAt: Date.now() });
  }
  const size = blockchain.mempool ? blockchain.mempool.length : 0;
  log(`📝 Giao dịch mới được thêm vào Mempool (size: ${size})`);
  res.json({ mempoolSize: size });
});

// Khởi chạy HTTP REST API
app.listen(HTTP_PORT, () => {
  log(`🚀 REST API của "${NODE_ID}" đang chạy tại http://localhost:${HTTP_PORT}`);
});

// ------------------------------ Lớp P2P ---------------------------------
// Khởi chạy WebSocket Server với WS_PORT chính xác của Node này
if (typeof initP2PServer === 'function') {
  try {
    initP2PServer({ wsPort: WS_PORT, blockchain, nodeId: NODE_ID, httpPort: HTTP_PORT, log });
  } catch (err) {
    // Dự phòng nếu initP2PServer nhận kiểu tham số cũ: initP2PServer(wsPort)
    initP2PServer(WS_PORT, blockchain);
  }
}

if (INITIAL_PEERS.length > 0 && typeof connectToPeers === 'function') {
  log(`🔗 Đang kết nối tới peers: ${INITIAL_PEERS.join(', ')}`);
  connectToPeers(INITIAL_PEERS, blockchain, NODE_ID, HTTP_PORT, WS_PORT, log);
}