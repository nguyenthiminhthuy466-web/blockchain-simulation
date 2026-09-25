import elliptic from 'elliptic';
import readline from 'readline';

// Khởi tạo đường cong elip secp256k1 (chuẩn Bitcoin/Ethereum)
const ec = new (elliptic.ec)('secp256k1');

// 1. Sinh ngẫu nhiên cặp khóa (Private Key & Public Key)
export const generateKeyPair = () => {
  const kp = ec.genKeyPair();
  return { privateKey: kp.getPrivate('hex'), publicKey: kp.getPublic('hex') };
};

// 2. Trích xuất Public Key từ Private Key do người dùng nhập
export const getPublicKeyFromPrivate = (privKey) => {
  try { return ec.keyFromPrivate(privKey, 'hex').getPublic('hex'); } catch { return null; }
};

// 3. Kiểm tra tính hợp lệ của Public Key trên đường cong secp256k1
export const isValidPublicKey = (pubKeyHex) => {
  try {
    const key = ec.keyFromPublic(pubKeyHex, 'hex');
    return key.validate().result;
  } catch {
    return false;
  }
};

// 4. Ký thông điệp bằng Private Key
export const signMessage = (privKey, msg) => {
  try { return ec.keyFromPrivate(privKey, 'hex').sign(msg).toDER('hex'); } catch { return null; }
};

// 5. Xác thực chữ ký số bằng Public Key (có hỗ trợ kiểm tra Public Key nhập thủ công)
export const verifySignature = (pubKey, msg, sig) => {
  try { 
    if (!isValidPublicKey(pubKey)) return false;
    return ec.keyFromPublic(pubKey, 'hex').verify(msg, sig); 
  } catch { 
    return false; 
  }
};

//GIAO DIỆN KIỂM THỬ TRÊN TERMINAL (CLI)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('DEMO CHỮ KÝ SỐ ECDSA');

  // BƯỚC 1: Nhập hoặc sinh ngẫu nhiên Private Key
  let privKey = (await ask('1. Nhập Private Key Hex (ấn Enter để tự sinh): ')).trim();
  if (!privKey) privKey = generateKeyPair().privateKey;
  
  const pubKey = getPublicKeyFromPrivate(privKey);
  if (!pubKey) return console.log('Private Key không hợp lệ!'), rl.close();
  console.log(`-> Private Key: ${privKey}\n-> Public Key : ${pubKey}\n`);

  // BƯỚC 2: Nhập thông điệp cần ký
  const msg = (await ask('2. Nhập nội dung thông điệp cần ký: ')).trim();
  if (!msg) return console.log('Thông điệp không được để trống!'), rl.close();

  const sig = signMessage(privKey, msg);
  console.log(`-> Chữ ký số (DER Hex): ${sig}\n`);

  // BƯỚC 3: Kiểm tra chữ ký bằng Private Key hoặc Public Key tùy chỉnh
  const testPrivKey = (await ask('3. Nhập Private Key kiểm tra (Enter để dùng lại khóa ban đầu): ')).trim() || privKey;
  const testPubKey = getPublicKeyFromPrivate(testPrivKey);

  const isValid = testPubKey && verifySignature(testPubKey, msg, sig);
  console.log(`\n=> KẾT QUẢ XÁC THỰC: ${isValid ? 'CHỮ KÝ HỢP LỆ' : 'CHỮ KÝ KHÔNG HỢP LỆ'}`);

  rl.close();
}

// Chạy trực tiếp CLI khi gọi lệnh node client/src/ECDSA.js
main();