// Hàm SHA-256 giả lập (chưa có P1)
if (typeof sha256 !== 'function') {
    var sha256 = function(data) {
        // Sử dụng CryptoJS nếu có, hoặc tạo hash mock cơ bản
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
            return CryptoJS.SHA256(data).toString();
        }
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        return 'HASH_P2_' + Math.abs(hash).toString(16);
    };
}

const ZERO_HASH = new Array(65).join('0');

//1. LỚP BLOCK (Cấu trúc khối nền tảng cho P2)
class Block {
    constructor(version, prevHash, transactions, timestamp) {
        this.version = version || 1;
        this.prevHash = prevHash || ZERO_HASH;
        this.transactions = transactions || [];
        this.timestamp = typeof timestamp === 'number' ? timestamp : Date.now() / 1000;
        
        // Con trỏ danh sách liên kết (Linked List)
        this.next = null; 

        // Tính toán Hash ban đầu của khối
        this.hash = this.calculateHash();
    }

    //Hàm tính mã băm Hash của khối dựa trên dữ liệu P2
    calculateHash() {
        const headerString = `${this.version}-${this.prevHash}-${JSON.stringify(this.transactions)}-${this.timestamp}`;
        return sha256(headerString);
    }
}

//LỚP BLOCKCHAIN (Quản lý chuỗi khối & kiểm tra tính toàn vẹn)
 
class Blockchain {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;

        // Tự động khởi tạo Genesis Block
        this.addBlock([{ sender: "System", recipient: "Genesis", amount: 0 }]);
    }

    //Thêm một khối mới vào danh sách liên kết
    addBlock(transactions) {
        const previousHash = this.tail ? this.tail.hash : ZERO_HASH;
        const newBlock = new Block(1, previousHash, transactions);

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

    // Hàm kiểm tra tính hợp lệ toàn vẹn của chuỗi 
    isChainValid() {
        let current = this.head;
        while (current) {
            // 1. Kiểm tra dữ liệu nội tại khối có bị thay đổi/giả mạo không
            if (current.hash !== current.calculateHash()) {
                return false;
            }
            
            // 2. Kiểm tra tính liên kết chuỗi (prevHash của khối sau phải bằng Hash khối trước)
            if (current.next && current.next.prevHash !== current.hash) {
                return false;
            }
            
            current = current.next;
        }
        return true;
    }
}

// Export module nếu dùng trong môi trường Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Block, Blockchain };
}
