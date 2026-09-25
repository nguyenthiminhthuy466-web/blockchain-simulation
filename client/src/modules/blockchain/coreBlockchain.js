// Import các hàm từ phân hệ crypto (SHA-256 và Cây Merkle)
import { calculateSHA256 as sha256 } from "../Crypto/SHA-256.js";
import { getMerkleRoot } from "../Crypto/merkle.js";
import { mineBlock } from "./pow.js";

// Chuỗi 64 số 0 dùng làm giá trị khởi tạo cho khối Genesis (khối đầu tiên)
const ZERO_HASH = new Array(65).join('0');


 //1. LỚP BLOCK 

export class Block {    
    constructor(version, prevHash, transactions, timestamp, difficulty) {
        this.version = version || 1;                    // Phiên bản của khối
        this.prevHash = prevHash || ZERO_HASH;          // Mã băm của khối đứng trước
        this.transactions = transactions || [];         // Danh sách các giao dịch trong khối
        
        // Tự động băm danh sách giao dịch bằng cây Merkle để tạo ra Merkle Root 
        let txHashes = this.transactions.map(tx => 
            typeof tx === 'string' ? tx : sha256(JSON.stringify(tx))
        );
        this.merkleRoot = typeof getMerkleRoot === 'function' ? getMerkleRoot(txHashes) : ZERO_HASH;

        this.timestamp = typeof timestamp === 'number' ? timestamp : Date.now() / 1000; // Thời gian tạo khối
        this.difficulty = difficulty || 0;              // Độ khó của thuật toán PoW
        this.nonce = 0;                                 // Số ngẫu nhiên dùng để thử khi đào khối
        
        this.next = null;                               // Con trỏ liên kết sang khối tiếp theo (Linked List)

        this.hash = this.calculateHash();               // Mã băm chính thức của khối
    }

    // Hàm tính mã băm (Hash) cho Block Header
    calculateHash() {
        const headerString = `${this.version}-${this.prevHash}-${this.merkleRoot}-${this.timestamp}-${this.difficulty}-${this.nonce}`;
        return sha256(headerString);
    }

    // Hàm kiểm tra xem mã băm của khối đã thỏa mãn độ khó 
    meetsDifficulty(targetDifficulty) {
        const k = targetDifficulty !== undefined ? targetDifficulty : this.difficulty;
        if (!k) return true;
        return this.hash.slice(0, k) === "0".repeat(k);
    }
}


// 2. LỚP BLOCKCHAIN 
 
export class Blockchain {
    constructor(opts = {}) {
        this.head = null;                               // Khối đầu tiên (Genesis Block)
        this.tail = null;                               // Khối cuối cùng trong chuỗi
        this.length = 0;                                // Tổng số khối hiện tại
        this.difficulty = opts.difficulty || 0;         // Độ khó chung của chuỗi

        // Tự động khởi tạo Genesis Block nếu không bị tắt tùy chọn
        if (opts.autoGenesis !== false) {
            this.addBlock(opts.genesisTx || [{ sender: "System", recipient: "Genesis", amount: 0 }]);
        }
    }

    // Thêm một khối mới vào cuối danh sách liên kết
    addBlock(transactions) {
        const previousHash = this.tail ? this.tail.hash : ZERO_HASH;
        const newBlock = new Block(1, previousHash, transactions, undefined, this.difficulty);

        // Nếu có thiết lập độ khó và hàm mineBlock tồn tại, tiến hành đào khối (P7)
        if (this.difficulty > 0 && typeof mineBlock === 'function') {
            mineBlock(newBlock, this.difficulty);
        }

        // Cập nhật con trỏ danh sách liên kết đơn
        if (this.head) {
            this.tail.next = newBlock;
            this.tail = newBlock;
        } else {
            this.head = newBlock;
            this.tail = newBlock;
        }
        this.length++;
        return newBlock;
    }

    // Lấy ra một khối tại vị trí chỉ định (index)
    at(index) {
        let current = this.head;
        let i = 0;
        while (current) {
            if (i === index) return current;
            current = current.next;
            i++;
        }
        return null;
    }

    // Chuyển toàn bộ danh sách liên kết thành một mảng (Array) để dễ thao tác hiển thị
    toArray() {
        const out = [];
        let current = this.head;
        while (current) {
            out.push(current);
            current = current.next;
        }
        return out;
    }

    // Kiểm tra tính toàn vẹn cơ bản của toàn bộ chuỗi khối 
    isChainValid() {
        let current = this.head;
        while (current) {
            if (current.hash !== current.calculateHash()) return false;
            if (current.next && current.next.prevHash !== current.hash) return false;
            current = current.next;
        }
        return true;
    }

    // Kiểm tra chi tiết trạng thái từng khối (
    validateDetailed() {
        const report = [];
        let current = this.head;
        let index = 0;
        let prev = null;

        while (current) {
            const dataOk = current.hash === current.calculateHash();
            const linkOk = prev ? current.prevHash === prev.calculateHash() : current.prevHash === ZERO_HASH;
            const powOk = current.meetsDifficulty();

            report.push({
                block: current,
                index: index,
                dataOk: dataOk,
                linkOk: linkOk,
                powOk: powOk,
                valid: dataOk && linkOk && powOk
            });

            prev = current;
            current = current.next;
            index++;
        }
        return report;
    }

    // Mô phỏng hành vi giả mạo/thay đổi dữ liệu bên trong một khối bất kỳ
    tamper(index, newTransactions) {
        const block = this.at(index);
        if (!block) return null;
        
        block.transactions = newTransactions;
        let txHashes = block.transactions.map(tx => 
            typeof tx === 'string' ? tx : sha256(JSON.stringify(tx))
        );
        block.merkleRoot = typeof getMerkleRoot === 'function' ? getMerkleRoot(txHashes) : ZERO_HASH;
        return block;
    }

    // Tính toán lại chuỗi từ một vị trí bị thay đổi trở về sau
    recomputeFrom(index) {
        const blocks = this.toArray();
        let totalAttempts = 0;

        for (let i = Math.max(0, index); i < blocks.length; i++) {
            blocks[i].prevHash = i === 0 ? ZERO_HASH : blocks[i - 1].hash;

            if (this.difficulty > 0 {
                const res = mineBlock(blocks[i], this.difficulty);
                totalAttempts += res.attempts;
            } else {
                blocks[i].hash = blocks[i].calculateHash();
            }
        }
        return totalAttempts;
    }

    // Tạo bản sao (clone) của toàn bộ chuỗi khối hiện tại
    clone() {
        const copy = new Blockchain({ autoGenesis: false, difficulty: this.difficulty });
        this.toArray().forEach(b => {
            const nb = new Block(b.version, b.prevHash, [...b.transactions], b.timestamp, b.difficulty);
            nb.merkleRoot = b.merkleRoot;
            nb.nonce = b.nonce;
            nb.hash = b.hash;

            if (copy.tail) {
                copy.tail.next = nb;
                copy.tail = nb;
            } else {
                copy.head = nb;
                copy.tail = nb;
            }
            copy.length++;
        });
        return copy;
    }
}
