import React, { useState } from 'react';
import { Blockchain } from './coreBlockchain.js';

export default function BlockHeaderViewer() {
  // Khởi tạo instance Blockchain với dữ liệu mẫu
  const [chainInstance] = useState(() => {
    const bc = new Blockchain({ difficulty: 2 });
    bc.addBlock([{ sender: "Alice", recipient: "Bob", amount: 10 }]);
    bc.addBlock([{ sender: "Bob", recipient: "Charlie", amount: 5 }]);
    return bc;
  });

  const [blocks, setBlocks] = useState(chainInstance.toArray());
  const [selectedBlock, setSelectedBlock] = useState(blocks[0] || null);
  const [validationReport, setValidationReport] = useState(() => chainInstance.validateDetailed());

  // Cập nhật lại giao diện khi có thay đổi dữ liệu
  const refreshUI = () => {
    const updated = chainInstance.toArray();
    setBlocks(updated);
    setValidationReport(chainInstance.validateDetailed());
    if (selectedBlock) {
      const refreshedSel = updated.find(b => b.timestamp === selectedBlock.timestamp) || updated[0];
      setSelectedBlock(refreshedSel);
    }
  };

  // Giả lập sửa đổi dữ liệu khối (Tamper)
  const handleTamper = (index) => {
    chainInstance.tamper(index, [{ sender: "Hacker", recipient: "Self", amount: 999 }]);
    refreshUI();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-gray-950 text-white min-h-screen rounded-2xl">
      <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
        📦 Block & Header Viewer (Chi tiết Cấu trúc Khối)
      </h2>

      {/* DANH SÁCH KHỐI TRONG CHUỖI */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {blocks.map((block, idx) => {
          const report = validationReport[idx];
          const isValid = report ? report.valid : true;

          return (
            <div
              key={idx}
              onClick={() => setSelectedBlock(block)}
              className={`p-4 rounded-xl border-2 cursor-pointer min-w-[240px] transition-all ${
                selectedBlock === block ? 'border-blue-500 bg-gray-800' : 'border-gray-700 bg-gray-900'
              } ${!isValid ? 'border-red-500 bg-red-950/40' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-blue-400">Block #{idx}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">Hash: {block.hash}</p>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleTamper(idx); }}
                className="mt-3 w-full py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
              >
                Giả mạo (Tamper)
              </button>
            </div>
          );
        })}
      </div>

      {/* CHI TIẾT BLOCK HEADER */}
      {selectedBlock && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-gray-200 shadow-xl space-y-4">
          <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2">
            📄 Thông tin Block Header
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80">
              <span className="text-gray-400 block text-xs mb-1">Version (Phiên bản):</span>
              <span className="text-green-400 font-bold">{selectedBlock.version}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80">
              <span className="text-gray-400 block text-xs mb-1">Timestamp (Thời gian tạo):</span>
              <span className="text-yellow-400">{new Date(selectedBlock.timestamp * 1000).toLocaleString()}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80 col-span-2">
              <span className="text-gray-400 block text-xs mb-1">Previous Hash (Mã băm khối trước):</span>
              <span className="text-purple-300 break-all">{selectedBlock.prevHash}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80 col-span-2">
              <span className="text-gray-400 block text-xs mb-1">Merkle Root (Gốc Merkle Tree):</span>
              <span className="text-indigo-300 break-all">{selectedBlock.merkleRoot}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80">
              <span className="text-gray-400 block text-xs mb-1">Difficulty (Độ khó PoW):</span>
              <span className="text-orange-400 font-bold">{selectedBlock.difficulty}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80">
              <span className="text-gray-400 block text-xs mb-1">Nonce (Số ngẫu nhiên):</span>
              <span className="text-cyan-400 font-bold">{selectedBlock.nonce}</span>
            </div>

            <div className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/80 col-span-2">
              <span className="text-gray-400 block text-xs mb-1">Current Block Hash (Mã băm khối hiện tại):</span>
              <span className="text-emerald-400 font-bold break-all">{selectedBlock.hash}</span>
            </div>
          </div>

          {/* DỮ LIỆU GIAO DỊCH TRONG KHỐI */}
          <div className="pt-2">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Transactions Payload (Danh sách giao dịch):</h4>
            <pre className="bg-black/60 p-4 rounded-xl text-xs text-gray-300 overflow-x-auto border border-gray-800 font-mono">
              {JSON.stringify(selectedBlock.transactions, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}