import React, { useState } from 'react';
import { Blockchain } from './coreBlockchain.js';
import { calculateSHA256 as sha256 } from '../Crypto/SHA-256.js'; 

export default function BlockHeaderViewer() {
  const [blockchain] = useState(() => {
    const chain = new Blockchain({ autoGenesis: true, difficulty: 0 });
    chain.addBlock([
      { sender: "Alice", recipient: "Bob", amount: 10, nonce: 1 }
    ]);
    return chain;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const blocks = blockchain.toArray();
  const selectedBlock = blocks[selectedIndex] || blocks[0];
  const isValid = selectedBlock.hash === selectedBlock.calculateHash();

  // Băm giao dịch thành dạng Hash 64 ký tự hex 
  const txHash = sha256(JSON.stringify(selectedBlock.transactions));

  const handleSelectBlock = (idx) => {
    setSelectedIndex(idx);
    setIsVerified(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto', color: '#1e293b' }}>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => setIsVerified(true)}
          style={{ padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Xác minh chuỗi
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* CỘT TRÁI */}
        <div style={{ width: '250px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Danh sách khối ({blocks.length})</h4>
          {blocks.map((b, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectBlock(idx)}
              style={{
                padding: '10px',
                marginBottom: '8px',
                border: selectedIndex === idx ? '2px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: selectedIndex === idx ? '#e0f2fe' : '#f8fafc',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              <strong>Block #{idx}</strong>
              <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
                {b.hash.substring(0, 24)}...
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Nonce: {b.nonce} | Diff: {b.difficulty} | Txs: {b.transactions.length}
              </div>
            </div>
          ))}
        </div>

        {/* CỘT PHẢI */}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Chi tiết Block</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '8px', fontSize: '14px', alignItems: 'center' }}>
            <strong>Block Height:</strong>
            <div>{selectedIndex}</div>

            <strong>Hash:</strong>
            <code style={{ background: '#f1f5f9', padding: '4px', wordBreak: 'break-all' }}>{selectedBlock.hash}</code>

            <strong>Previous Hash:</strong>
            <code style={{ background: '#f1f5f9', padding: '4px', wordBreak: 'break-all' }}>{selectedBlock.prevHash}</code>

            <strong>Merkle Root:</strong>
            <code style={{ background: '#f1f5f9', padding: '4px', wordBreak: 'break-all' }}>{selectedBlock.merkleRoot}</code>

            <strong>Timestamp:</strong>
            <div>{new Date(selectedBlock.timestamp * 1000).toLocaleString()}</div>

            <strong>Difficulty:</strong>
            <div>{selectedBlock.difficulty}</div>

            <strong>Nonce:</strong>
            <div>{selectedBlock.nonce}</div>

            <strong>Version:</strong>
            <div>{selectedBlock.version}</div>

            <strong>Số giao dịch:</strong>
            <div>{selectedBlock.transactions.length}</div>

            <strong>Giao dịch (Body):</strong>
            {/* Hiển thị chuỗi SHA-256 Hash chuẩn của Body */}
            <code style={{ background: '#f1f5f9', padding: '4px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {txHash}
            </code>
          </div>

          {isVerified && (
            <div style={{
              marginTop: '15px',
              padding: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              border: '1px solid',
              borderColor: isValid ? '#22c55e' : '#ef4444',
              color: isValid ? '#15803d' : '#b91c1c',
              backgroundColor: isValid ? '#f0fdf4' : '#fef2f2'
            }}>
              {isValid ? 'Hash khớp' : 'Hash không khớp'}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
