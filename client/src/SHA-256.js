import crypto from 'crypto';
import readline from 'readline';

// ==========================================
// CÁC HÀM XỬ LÝ MÃ HÓA (CORE LOGIC)
// ==========================================

// 1. Hàm tính SHA-256
export function calculateSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 2. Mô phỏng Avalanche Effect (Hiệu ứng thác đổ)
export function checkAvalancheEffect(input1, input2) {
  const hash1 = calculateSHA256(input1);
  const hash2 = calculateSHA256(input2);

  const bin1 = BigInt('0x' + hash1).toString(2).padStart(256, '0');
  const bin2 = BigInt('0x' + hash2).toString(2).padStart(256, '0');

  let differentBits = 0;
  for (let i = 0; i < 256; i++) {
    if (bin1[i] !== bin2[i]) {
      differentBits++;
    }
  }

  const percentage = ((differentBits / 256) * 100).toFixed(2);
  return {
    input1,
    hash1,
    input2,
    hash2,
    differentBits,
    percentageChange: `${percentage}%`
  };
}

// 3. Hàm Bruteforce (Proof of Work)
export function bruteforceHash(data, targetPrefix = '0000') {
  let nonce = 0;
  let hash = '';
  const startTime = Date.now();

  do {
    nonce++;
    hash = calculateSHA256(data + nonce);
  } while (!hash.startsWith(targetPrefix));

  const timeTaken = (Date.now() - startTime) / 1000;
  return {
    nonce,
    hash,
    timeTakenSeconds: `${timeTaken}s`
  };
}

// ==========================================
// TỰ ĐỘNG KIỂM TRA TOÀN BỘ (AUTO TEST RUNNER)
// ==========================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function runAutoCheck() {
  console.log("\n==================================================");
  console.log("   HỆ THỐNG TỰ ĐỘNG KIỂM TRA MÃ HÓA CRYPTO (SHA-256)");
  console.log("==================================================");

  // Nhập dữ liệu đầu vào
  const mainInput = await promptUser("\n1. Nhập chuỗi dữ liệu chính (Main Input): ");
  
  const altInputPrompt = `2. Nhập chuỗi biến thể để test Avalanche (Nhấn Enter để dùng mặc định "${mainInput}!"): `;
  let altInput = await promptUser(altInputPrompt);
  if (!altInput) {
    altInput = mainInput + "!"; // Tự tạo biến thể bằng cách thêm dấu ! nếu để trống
  }

  const targetPrefixPrompt = `3. Nhập độ khó Mining (Nhấn Enter để dùng mặc định "0000"): `;
  let targetPrefix = await promptUser(targetPrefixPrompt);
  if (!targetPrefix) {
    targetPrefix = "0000";
  }

  console.log("\n⏳ Đang tiến hành kiểm tra toàn bộ hệ thống...\n");

  // TEST 1: TÍNH SHA-256 HASH
  console.log("--------------------------------------------------");
  console.log("📌 KẾT QUẢ 1: TÍNH MÃ BĂM SHA-256");
  console.log("--------------------------------------------------");
  console.log(`Input : "${mainInput}"`);
  console.log(`Hash  : ${calculateSHA256(mainInput)}`);

  // TEST 2: AVALANCHE EFFECT
  console.log("\n--------------------------------------------------");
  console.log("📌 KẾT QUẢ 2: KHIỂM TRA HIỆU ỨNG THÁC ĐỔ (AVALANCHE EFFECT)");
  console.log("--------------------------------------------------");
  const avalancheResult = checkAvalancheEffect(mainInput, altInput);
  console.log(`Input 1          : "${avalancheResult.input1}"`);
  console.log(`Hash 1           : ${avalancheResult.hash1}`);
  console.log(`Input 2          : "${avalancheResult.input2}"`);
  console.log(`Hash 2           : ${avalancheResult.hash2}`);
  console.log(`Số bit thay đổi  : ${avalancheResult.differentBits} / 256 bits`);
  console.log(`Tỷ lệ thay đổi   : ${avalancheResult.percentageChange}`);

  // TEST 3: BRUTEFORCE / PROOF OF WORK
  console.log("\n--------------------------------------------------");
  console.log("📌 KẾT QUẢ 3: MÔ PHỎNG KHAI THÁC BLOCK (PROOF OF WORK)");
  console.log("--------------------------------------------------");
  console.log(`Đang tìm Nonce để Hash có tiền tố "${targetPrefix}"...`);
  const powResult = bruteforceHash(mainInput, targetPrefix);
  console.log(`Nonce tìm thấy   : ${powResult.nonce}`);
  console.log(`Hash hợp lệ      : ${powResult.hash}`);
  console.log(`Thời gian thực thi: ${powResult.timeTakenSeconds}`);

  console.log("\n==================================================");
  console.log("   ✅ HOÀN THÀNH TẤT CẢ CÁC BÀI KIỂM TRA!");
  console.log("==================================================\n");

  rl.close();
}

runAutoCheck();