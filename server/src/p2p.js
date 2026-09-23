/**
 * p2p.js
 * ------------------------------------------------------------------
 * Lớp mạng ngang hàng (Peer-to-Peer) của mỗi Full Node, sử dụng
 * WebSocket (thư viện `ws`) để các node "nói chuyện" trực tiếp với
 * nhau: bắt tay (handshake), trao đổi danh sách peer, hỏi/đáp block
 * mới nhất và đồng bộ toàn bộ chuỗi theo luật "chuỗi dài nhất".
 * ------------------------------------------------------------------
 */

const WebSocket = require('ws');

// Các loại thông điệp trao đổi giữa các node trong mạng P2P
const MessageType = {
  QUERY_LATEST: 'QUERY_LATEST', // Hỏi: "block mới nhất của bạn là gì?"
  QUERY_ALL: 'QUERY_ALL', // Hỏi: "cho tôi xin toàn bộ chuỗi của bạn"
  RESPONSE_BLOCKCHAIN: 'RESPONSE_BLOCKCHAIN', // Đáp lại bằng 1 block hoặc cả chuỗi
  HANDSHAKE: 'HANDSHAKE', // Giới thiệu danh tính của node (nodeId, cổng...)
  PEER_LIST: 'PEER_LIST', // Chia sẻ danh sách peer đã biết, giúp mạng lưới lan rộng
};

// Danh sách toàn bộ socket đang kết nối tới node này (peer khác + client giám sát/frontend)
let sockets = [];
// Metadata của từng socket: { nodeId, httpPort, wsPort }
const peerMeta = new Map();

/**
 * Khởi tạo WebSocket Server để LẮNG NGHE các kết nối đến (inbound) -
 * đây là vai trò "server" của node trong mạng P2P.
 */
function initP2PServer({ wsPort, blockchain, nodeId, httpPort, log }) {
  const wss = new WebSocket.Server({ port: wsPort });

  wss.on('connection', (ws, req) => {
    const remote = req.socket.remoteAddress;
    log(`🔌 Nhận kết nối P2P mới (inbound) từ ${remote}`);
    initConnection(ws, { blockchain, nodeId, httpPort, wsPort, log });
  });

  log(`🛰️  P2P WebSocket Server đang lắng nghe tại ws://localhost:${wsPort}`);
  return wss;
}

/**
 * Chủ động kết nối (outbound) tới danh sách các peer đã biết trước
 * (ví dụ Node 2, Node 3 kết nối tới Node 1 khi khởi động).
 */
function connectToPeers(peerUrls, blockchain, nodeId, httpPort, wsPort, log) {
  peerUrls.forEach((url) => {
    if (!url) return;
    try {
      const ws = new WebSocket(url);
      ws.on('open', () => {
        log(`✅ Kết nối outbound thành công tới peer ${url}`);
        initConnection(ws, { blockchain, nodeId, httpPort, wsPort, log });
      });
      ws.on('error', () => {
        log(`⚠️  Không thể kết nối tới peer ${url} (có thể peer chưa khởi động)`);
      });
    } catch (err) {
      log(`⚠️  Lỗi khi khởi tạo kết nối tới ${url}: ${err.message}`);
    }
  });
}

/**
 * Thiết lập chung cho MỘT kết nối socket (dù là inbound hay outbound):
 * đăng ký lắng nghe sự kiện, rồi thực hiện chuỗi "bắt tay -> chia sẻ
 * peer -> hỏi block mới nhất" ngay khi vừa kết nối.
 */
function initConnection(ws, ctx) {
  const { blockchain, nodeId, httpPort, wsPort, log } = ctx;

  sockets.push(ws);
  peerMeta.set(ws, { nodeId: null, httpPort: null, wsPort: null });

  ws.on('message', (raw) => handleMessage(ws, raw, ctx));
  ws.on('close', () => closeConnection(ws, log));
  ws.on('error', () => closeConnection(ws, log));

  // 1) Bắt tay (handshake): giới thiệu danh tính của node mình cho phía kia
  send(ws, { type: MessageType.HANDSHAKE, data: { nodeId, httpPort, wsPort } });
  // 2) Chia sẻ danh sách peer đã biết -> giúp mạng lưới tự lan rộng
  send(ws, { type: MessageType.PEER_LIST, data: getKnownPeerUrls() });
  // 3) Hỏi ngay block mới nhất của phía kia để bắt đầu quá trình đồng bộ
  send(ws, { type: MessageType.QUERY_LATEST });
}

function closeConnection(ws, log) {
  const meta = peerMeta.get(ws);
  log(`❌ Peer "${meta?.nodeId || 'không rõ danh tính'}" đã ngắt kết nối`);
  sockets = sockets.filter((s) => s !== ws);
  peerMeta.delete(ws);
}

/**
 * Bộ định tuyến (router) xử lý thông điệp P2P nhận được, phân loại
 * theo MessageType và gọi hàm xử lý tương ứng.
 */
function handleMessage(ws, raw, ctx) {
  const { blockchain, log } = ctx;
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch (err) {
    return; // Bỏ qua thông điệp không đúng định dạng JSON
  }

  switch (message.type) {
    case MessageType.QUERY_LATEST:
      // Chỉ trả lời bằng đúng 1 block mới nhất (nhẹ, nhanh)
      send(ws, {
        type: MessageType.RESPONSE_BLOCKCHAIN,
        data: [blockchain.getLatestBlock()],
      });
      break;

    case MessageType.QUERY_ALL:
      // Trả lời bằng toàn bộ chuỗi (dùng khi cần đồng bộ đầy đủ)
      send(ws, { type: MessageType.RESPONSE_BLOCKCHAIN, data: blockchain.chain });
      break;

    case MessageType.RESPONSE_BLOCKCHAIN:
      handleBlockchainResponse(ws, message.data, blockchain, log);
      break;

    case MessageType.HANDSHAKE: {
      const meta = peerMeta.get(ws) || {};
      meta.nodeId = message.data.nodeId;
      meta.httpPort = message.data.httpPort;
      meta.wsPort = message.data.wsPort;
      peerMeta.set(ws, meta);
      log(`🤝 Bắt tay (handshake) hoàn tất với "${message.data.nodeId}" (HTTP :${message.data.httpPort})`);
      break;
    }

    case MessageType.PEER_LIST:
      // Điểm mở rộng: có thể duyệt qua data để tự động kết nối tới
      // các peer mới mà node này chưa biết, giúp mạng lưới tự lan rộng.
      break;

    default:
      break;
  }
}

/**
 * Xử lý khi nhận được phản hồi chuỗi khối từ một peer:
 * - Nếu chuỗi của họ không dài hơn -> bỏ qua
 * - Nếu chỉ nhận 1 block và nối được trực tiếp -> thêm luôn
 * - Nếu 1 block nhưng không nối được -> thiếu dữ liệu, hỏi lại toàn bộ chuỗi
 * - Nếu nhận cả chuỗi -> áp dụng luật đồng thuận "chuỗi dài nhất"
 */
function handleBlockchainResponse(ws, receivedChainRaw, blockchain, log) {
  if (!Array.isArray(receivedChainRaw) || receivedChainRaw.length === 0) return;

  const latestReceived = receivedChainRaw[receivedChainRaw.length - 1];
  const latestHeld = blockchain.getLatestBlock();

  if (latestReceived.index <= latestHeld.index) {
    return; // Chuỗi của mình đã bằng hoặc dài hơn -> không cần xử lý gì thêm
  }

  if (receivedChainRaw.length === 1) {
    if (latestReceived.previousHash === latestHeld.hash) {
      // Nối thẳng được vào chuỗi hiện tại
      if (blockchain.addBlock(latestReceived)) {
        log(`⛓️  Nhận & nối trực tiếp Block #${latestReceived.index} từ peer`);
        broadcastLatest(blockchain);
      }
    } else {
      // Thiếu (các) block ở giữa -> chủ động hỏi lại toàn bộ chuỗi của peer
      log('📡 Phát hiện thiếu block trung gian -> yêu cầu đồng bộ toàn bộ chuỗi');
      send(ws, { type: MessageType.QUERY_ALL });
    }
  } else {
    // Nhận được cả một chuỗi -> so sánh & áp dụng Longest Chain Rule
    if (blockchain.replaceChain(receivedChainRaw)) {
      log(`🔄 Đồng bộ thành công! Thay thế bằng chuỗi dài hơn (height = ${receivedChainRaw.length - 1})`);
      broadcastLatest(blockchain);
    } else {
      log('⚠️  Chuỗi nhận được không hợp lệ hoặc không dài hơn chuỗi hiện tại -> bỏ qua');
    }
  }
}

/** Gửi 1 thông điệp JSON tới một socket cụ thể (nếu đang mở) */
function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/** Phát (broadcast) 1 thông điệp tới TẤT CẢ các socket đang kết nối */
function broadcast(message) {
  sockets.forEach((ws) => send(ws, message));
}

/** Phát nhanh block mới nhất cho toàn mạng - gọi mỗi khi có block mới được đào/nhận */
function broadcastLatest(blockchain) {
  broadcast({ type: MessageType.RESPONSE_BLOCKCHAIN, data: [blockchain.getLatestBlock()] });
}

/** Lấy danh sách URL ws://... của các peer đã bắt tay thành công (dùng để chia sẻ tiếp) */
function getKnownPeerUrls() {
  const urls = [];
  peerMeta.forEach((meta) => {
    if (meta.wsPort) urls.push(`ws://localhost:${meta.wsPort}`);
  });
  return urls;
}

function getSockets() {
  return sockets;
}

module.exports = {
  MessageType,
  initP2PServer,
  connectToPeers,
  broadcast,
  broadcastLatest,
  getSockets,
};