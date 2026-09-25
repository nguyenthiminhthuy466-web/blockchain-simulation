import crypto from 'crypto';
import readline from 'readline';

// PHẦN 1: TÍNH NĂNG MÃ HÓA CỐT LÕI (CORE LOGIC)

/**
 * TÍNH NĂNG 1: Tính mã băm SHA-256
 * @param {string} d - Dữ liệu đầu vào cần băm
 * @returns {string} - Chuỗi mã băm Hex 64 ký tự ở dạng chữ thường
 */
export const calculateSHA256 = (d) => 
  crypto.createHash('sha256').update(d).digest('hex').toLowerCase();

/**
 * TÍNH NĂNG PHỤ HỖ TRỢ GIAO DIỆN: Định dạng chuỗi Hash 64 ký tự
 * Chia chuỗi thành khối 4x4 (16 nhóm, mỗi nhóm 4 ký tự, 4 nhóm trên 1 dòng)
 * @param {string} h - Chuỗi mã băm SHA-256 64 ký tự
 * @returns {string} - Chuỗi đã phân dòng và nhóm bằng khoảng trắng
 */
export const formatHashFormatted = (h) => 
  h?.length === 64 ? h.match(/.{1,16}/g).map(l => l.match(/.{1,4}/g).join(' ')).join('\n') : h;

/**
 * TÍNH NĂNG 2: Mô phỏng Hiệu ứng Thác đổ (Avalanche Effect)
 * So sánh từng bit nhị phân (256 bits) giữa mã băm của 2 chuỗi đầu vào khác nhau
 * @param {string} i1 - Chuỗi dữ liệu 1
 * @param {string} i2 - Chuỗi dữ liệu 2
 * @returns {object} - Đối tượng chứa 2 mã hash, số bit khác biệt và tỷ lệ % thay đổi
 */
export function checkAvalancheEffect(i1, i2) {
  // 1. Tính mã băm SHA-256 cho cả 2 chuỗi
  const [h1, h2] = [calculateSHA256(i1), calculateSHA256(i2)];
  
  // 2. Chuyển mã băm Hex sang chuỗi nhị phân 256 bits (gồm các ký tự '0' và '1')
  const [b1, b2] = [h1, h2].map(h => BigInt('0x' + h).toString(2).padStart(256, '0'));
  
  // 3. Đếm số lượng bit vị trí tương ứng bị thay đổi giữa 2 chuỗi nhị phân
  let diff = 0;
  for (let i = 0; i < 256; i++) if (b1[i] !== b2[i]) diff++;
  
  // 4. Trả về kết quả so sánh kèm phần trăm biến đổi
  return { 
    input1: i1, 
    hash1: h1, 
    input2: i2, 
    hash2: h2, 
    differentBits: diff, 
    percentageChange: `${((diff / 256) * 100).toFixed(2)}%` 
  };
}

/**
 * TÍNH NĂNG 3: Khai thác Block bằng Proof of Work (Bruteforce Nonce)
 * Thử thay đổi số Nonce liên tục cho đến khi tìm được Hash chứa tiền tố yêu cầu
 * @param {string} data - Dữ liệu khối (Block Data)
 * @param {string} targetPrefix - Chuỗi tiền tố quy định độ khó (Ví dụ: "0000")
 * @returns {object} - Số Nonce tìm được, Mã băm hợp lệ và thời gian thực thi
 */
export function bruteforceHash(data, targetPrefix = '0000') {
  let [nonce, hash, start, p] = [0, '', Date.now(), targetPrefix.toLowerCase()];
  
  // Vòng lặp tăng dần Nonce và băm lại cho đến khi Hash bắt đầu bằng chuỗi tiền tố độ khó
  do { 
    hash = calculateSHA256(data + ++nonce); 
  } while (!hash.startsWith(p));
  
  // Trả về số Nonce chiến thắng và thời gian tìm kiếm (tính bằng giây)
  return { nonce, hash, timeTakenSeconds: `${(Date.now() - start) / 1000}s` };
}

// PHẦN 2: CHƯƠNG TRÌNH TỰ ĐỘNG KIỂM TRA TRÊN TERMINAL (CLI RUNNER)

// Khởi tạo giao diện nhận dữ liệu nhập từ bàn phím qua Terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (q) => new Promise((res) => rl.question(q, res));

/**
 * Hàm điều phối việc nhập dữ liệu và xuất kết quả kiểm tra 3 tính năng trên Terminal
 */
async function runAutoCheck() {
  console.log("\nHỆ THỐNG TỰ ĐỘNG KIỂM TRA MÃ HÓA CRYPTO (SHA-256)");
  
  // Step 1: Nhận chuỗi nhập từ người dùng
  const main = await prompt("\n1. Nhập Main Input: ");
  const alt = (await prompt(`2. Nhập biến thể Avalanche (Enter = "${main}!"): `)) || `${main}!`;
  const prefix = (await prompt('3. Độ khó Mining (Enter = "0000"): ')) || "0000";

  // Step 2: Thực thi tính toán cho Avalanche Effect và Proof of Work
  const av = checkAvalancheEffect(main, alt);
  const pow = bruteforceHash(main, prefix);

  // Step 3: Hiển thị kết quả ra màn hình Terminal theo từng mục cụ thể
  // - TEST 1: Kết quả tính SHA-256 dạng khối 4x4
  console.log(`\n1. SHA-256:\nInput: "${main}"\nHash:\n${formatHashFormatted(calculateSHA256(main))}`);
  
  // - TEST 2: Kết quả kiểm tra Hiệu ứng Thác đổ (Avalanche Effect)
  console.log(`\n2. AVALANCHE:\nInput 1: "${av.input1}"\nHash 1:\n${formatHashFormatted(av.hash1)}\nInput 2: "${av.input2}"\nHash 2:\n${formatHashFormatted(av.hash2)}\nThay đổi: ${av.differentBits}/256 bits (${av.percentageChange})`);
  
  // - TEST 3: Kết quả mô phỏng khai thác Block (Proof of Work)
  console.log(`\n3. PROOF OF WORK (${prefix}):\nNonce: ${pow.nonce}\nHash:\n${formatHashFormatted(pow.hash)}\nThời gian: ${pow.timeTakenSeconds}`);
  
  console.log("\nHOÀN THÀNH!\n");
  
  // Đóng luồng nhận dữ liệu Terminal khi hoàn thành
  rl.close();
}

// Kích hoạt chương trình chạy kiểm tra tự động
runAutoCheck();