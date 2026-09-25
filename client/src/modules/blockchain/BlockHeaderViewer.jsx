import React, { useState } from 'react';
const INITIAL_BLOCKS = [
  {
    index: 0,
    hash: "17d3f1645acc00bea57a67229f768e9b1ceb405997e7ca32d5898e627fcdf2ff",
    prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    merkleRoot: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    timestamp: "9/22/2026, 8:50:00 PM",
    difficulty: 0,
    nonce: 0,
    version: 1,
    txCount: 1,
    metadata: "Node 1",
    body: "1df73458a96f2c69150fedc438be9f5baa8ca5d11ab1b9557f6a99a4...",
    isValid: true
  },
  {
    index: 1,
    hash: "0775119f3d410f4f2297aed36768408c03d59fec900b2e670fa9ff744b96426e",
    prevHash: "17d3f1645acc00bea57a67229f768e9b1ceb405997e7ca32d5898e627fcdf2ff",
    merkleRoot: "f261fad73dee4124485a4484d206638abd321d73aa2390a86b771b56f148824d",
    timestamp: "9/22/2026, 8:53:58 PM",
    difficulty: 1,
    nonce: 433,
    version: 1,
    txCount: 1,
    metadata: "Node 1",
    body: "1df73458a96f2c69150fedc438be9f5baa8ca5d11ab1b9557f6a99a4...",
    isValid: true
  }
];

export function BlockViewer() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
  const [selectedIndex, setSelectedIndex] = useState(1);

  // Giả mạo dữ liệu
  const handleTamper = (index) => {
    if (index === 0) return;
    setBlocks(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isValid: false,
        hash: "bad_hash_" + Math.random().toString(36).substring(2, 10),
        body: "hacker_tampered_transaction_data..."
      };
      for (let i = index + 1; i < updated.length; i++) {
        updated[i].isValid = false;
      }
      return updated;
    });
  };

  // Vá chuỗi / Đào lại
  const handleMineBlock = (targetIndex) => {
    setBlocks(prev => {
      const updated = [...prev];
      for (let i = targetIndex; i < updated.length; i++) {
        const minedNonce = Math.floor(Math.random() * 900) + 100;
        updated[i] = {
          ...updated[i],
          nonce: minedNonce,
          hash: "0" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          isValid: true
        };
      }
      return updated;
    });
  };

  const selectedBlock = blocks[selectedIndex] || blocks[0];

  return (
    <div style={{ padding: '15px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* 1. DANH SÁCH KHỐI */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Danh sách khối ({blocks.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {blocks.map((block, idx) => {
            const isSelected = selectedIndex === idx;
            const isValid = block.isValid !== false;

            return (
              <div
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  borderBottom: isSelected ? '2px solid #2980b9' : '1px solid #eee'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Block #{block.index}</span>
                  <span style={{ color: isValid ? '#27ae60' : '#c0392b' }}>
                    {isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>

                <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: '12px', color: '#555' }}>
                  {block.hash.slice(0, 35)}...
                </p>

                <div style={{ fontSize: '11px', color: '#7f8c8d' }}>
                  Nonce: {block.nonce} | Diff: {block.difficulty} | Txs: {block.txCount}
                </div>

                <div style={{ marginTop: '6px' }}>
                  {idx === 0 ? (
                    <span style={{ fontSize: '11px', color: '#95a5a6' }}>Cố định</span>
                  ) : isValid ? (
                    <button onClick={(e) => { e.stopPropagation(); handleTamper(idx); }} style={btnTamper}>
                      Giả mạo
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleMineBlock(idx); }} style={btnFix}>
                      Vá chuỗi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

      {/* 2. CHI TIẾT BLOCK (ĐẦY ĐỦ NỘI DUNG Y HỆT TRONG HÌNH) */}
      {selectedBlock && (
        <div>
          <h3>Chi tiết Block</h3>

          <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
            <p style={rowStyle}><b>Block Height</b><br />{selectedBlock.index}</p>
            <p style={rowStyle}><b>Hash</b><br /><code style={{ fontFamily: 'monospace', color: selectedBlock.isValid ? '#2980b9' : '#c0392b' }}>{selectedBlock.hash}</code></p>
            <p style={rowStyle}><b>Previous Hash</b><br /><code style={{ fontFamily: 'monospace' }}>{selectedBlock.prevHash}</code></p>
            <p style={rowStyle}><b>Merkle Root</b><br /><code style={{ fontFamily: 'monospace' }}>{selectedBlock.merkleRoot}</code></p>
            <p style={rowStyle}><b>Timestamp</b><br />{selectedBlock.timestamp}</p>
            <p style={rowStyle}><b>Difficulty</b><br />{selectedBlock.difficulty}</p>
            <p style={rowStyle}><b>Nonce</b><br />{selectedBlock.nonce}</p>
            <p style={rowStyle}><b>Version</b><br />{selectedBlock.version}</p>
            <p style={rowStyle}><b>Số giao dịch</b><br />{selectedBlock.txCount}</p>
            <p style={rowStyle}><b>Metadata</b><br />{selectedBlock.metadata}</p>
            <p style={rowStyle}><b>Giao dịch (Body)</b><br /><code style={{ fontFamily: 'monospace', color: '#d35400' }}>{selectedBlock.body}</code></p>

            <p style={{ marginTop: '15px', fontWeight: 'bold', color: selectedBlock.isValid ? '#27ae60' : '#c0392b' }}>
              {selectedBlock.isValid ? '✓ Hash khớp' : '✖ Hash không khớp'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const rowStyle = { margin: '8px 0' };
const btnTamper = { backgroundColor: '#c0392b', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' };
const btnFix = { backgroundColor: '#d35400', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' };

export default BlockViewer;
