import React from "react";
import { staticFile } from "remotion";

export const SceneOverlays: React.FC<{ time: number }> = ({ time }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 40,
        fontFamily: "'Segoe UI', 'Plus Jakarta Sans', Montserrat, sans-serif",
      }}
    >
      {/* ================= WATERMARK "zakkiye" ================= */}
      <div
        style={{
          position: "absolute",
          top: "44px",
          right: "40px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(6px)",
          padding: "8px 20px",
          borderRadius: "999px",
          border: "2.5px solid #1e293b",
          boxShadow: "0 4px 0 #1e293b",
          color: "#0f172a",
          fontSize: "20px",
          fontWeight: 800,
          letterSpacing: "0.5px",
        }}
      >
        <span style={{ color: "#0284c7", fontSize: "16px" }}>✦</span>
        <span>zakkiye</span>
      </div>

      {/* ================= SCENE 2 (5.56s - 8.88s): ACTUAL FILM CLIP FOOTAGE SCREENSHOT ================= */}
      {/* Shown when narrator says: "Kedengarannya kayak film, tapi ini beneran nyata..." */}
      {time >= 5.56 && time < 8.88 && (
        <div
          style={{
            position: "absolute",
            top: "130px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "3px solid #1e293b",
              borderRadius: "24px",
              boxShadow: "0 10px 0 #1e293b, 0 20px 30px rgba(0,0,0,0.15)",
              width: "88%",
              maxWidth: "860px",
              overflow: "hidden",
              color: "#0f172a",
            }}
          >
            {/* Movie Player Bar */}
            <div
              style={{
                background: "#f8fafc",
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🎬</span>
                <span style={{ fontWeight: 800, fontSize: "13px", letterSpacing: "0.5px", color: "#0f172a" }}>
                  CUPLIKAN FILM FIKSI ILMIAH (HOLLYWOOD SCI-FI)
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700, fontFamily: "monospace" }}>
                [ 00:14:28 / 02:04:12 ] 4K
              </div>
            </div>

            {/* Actual Movie Screenshot */}
            <div style={{ padding: "12px", background: "#0b0f19" }}>
              <img
                src={staticFile("movie_clip.jpg")}
                alt="Cuplikan Film Sci-Fi"
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  objectFit: "cover",
                  borderRadius: "12px",
                  display: "block",
                }}
              />
            </div>

            {/* Caption */}
            <div style={{ padding: "12px 20px", background: "#ffffff", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>📽️</span>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#334155", lineHeight: "1.3" }}>
                Dulu AI belanja otonom cuma khayalan di film bioskop, sekarang beneran nyata!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCENE 3 (8.88s - 14.50s): TECHCRUNCH BREAKING NEWS ================= */}
      {time >= 8.88 && time < 14.50 && (
        <div
          style={{
            position: "absolute",
            top: "130px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "24px",
              border: "3px solid #1e293b",
              boxShadow: "0 10px 0 #1e293b, 0 20px 30px rgba(0,0,0,0.15)",
              overflow: "hidden",
              maxWidth: "860px",
              width: "88%",
            }}
          >
            {/* Browser Header Bar */}
            <div
              style={{
                background: "#f1f5f9",
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", border: "1px solid #dc2626" }}></span>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b", border: "1px solid #d97706" }}></span>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", border: "1px solid #059669" }}></span>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  padding: "4px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  color: "#475569",
                  fontFamily: "monospace",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🔒</span> techcrunch.com/2026/11/13/openai-chatgpt-wallet
              </div>
              <div style={{ width: "40px" }}></div>
            </div>

            {/* News Header & Content */}
            <div style={{ padding: "20px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span
                  style={{
                    background: "#03ac0e",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 900,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    letterSpacing: "0.5px",
                  }}
                >
                  TechCrunch
                </span>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                  RESMI DIRILIS • 13 NOVEMBER 2026
                </span>
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: "1.25",
                  marginBottom: "10px",
                  letterSpacing: "-0.5px",
                }}
              >
                OpenAI Luncurkan ChatGPT Wallet &amp; Asisten Belanja Otonom &lsquo;Dots&rsquo;
              </div>

              <div
                style={{
                  fontSize: "16px",
                  color: "#475569",
                  lineHeight: "1.4",
                  fontWeight: 600,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "10px",
                }}
              >
                Pengguna cukup memberi instruksi suara, AI mencari barang termurah, membandingkan spek, dan menyelesaikan transaksi secara aman.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCENE 6 (37.0s - 47.0s): CARA KERJA SISTEM NOMOR PENGGANTI ================= */}
      {/* Faithful to the narration: "kartu aslimu nggak dikasih ke toko, yang dipake itu nomor pengganti" */}
      {time >= 37.0 && time < 47.0 && (
        <div
          style={{
            position: "absolute",
            top: "120px",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "3px solid #1e293b",
              borderRadius: "26px",
              boxShadow: "0 10px 0 #1e293b, 0 20px 30px rgba(0,0,0,0.12)",
              width: "90%",
              maxWidth: "880px",
              padding: "20px 24px",
              color: "#0f172a",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🛡️</span>
                <span style={{ fontSize: "15px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.5px" }}>
                  SISTEM PEMBAYARAN: NOMOR PENGGANTI
                </span>
              </div>
              <span style={{ background: "#dcfce7", color: "#15803d", border: "1.5px solid #16a34a", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 800 }}>
                KARTU ASLI 100% AMAN
              </span>
            </div>

            {/* 3 Step Comic Flow */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: "8px", alignItems: "center" }}>
              {/* Step 1: User & Real Card */}
              <div style={{ background: "#eff6ff", border: "2px solid #2563eb", borderRadius: "14px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "26px", marginBottom: "2px" }}>💳👤</div>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#1e40af" }}>Kartu Aslimu</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Aman di Tanganmu</div>
                <div style={{ marginTop: "6px", background: "#ffffff", border: "1px solid #93c5fd", padding: "3px", borderRadius: "6px", fontSize: "11px", color: "#1e3a8a", fontWeight: 700, fontFamily: "monospace" }}>
                  •••• 4242
                </div>
              </div>

              {/* Arrow 1 */}
              <div style={{ fontSize: "20px", color: "#03ac0e", fontWeight: 900 }}>➔</div>

              {/* Step 2: Virtual Replacement Number */}
              <div style={{ background: "#f0fdf4", border: "2.5px solid #16a34a", borderRadius: "14px", padding: "12px", textAlign: "center", boxShadow: "0 4px 0 #16a34a" }}>
                <div style={{ fontSize: "26px", marginBottom: "2px" }}>⚡🤖</div>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#15803d" }}>Nomor Pengganti</div>
                <div style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>Dibuatkan Otomatis</div>
                <div style={{ marginTop: "6px", background: "#dcfce7", border: "1px solid #16a34a", padding: "3px", borderRadius: "6px", fontSize: "11px", color: "#15803d", fontWeight: 800, fontFamily: "monospace" }}>
                  No. Virtual Sekali Pakai
                </div>
              </div>

              {/* Arrow 2 */}
              <div style={{ fontSize: "20px", color: "#03ac0e", fontWeight: 900 }}>➔</div>

              {/* Step 3: Merchant Store */}
              <div style={{ background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "14px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "26px", marginBottom: "2px" }}>🏪📦</div>
                <div style={{ fontSize: "14px", fontWeight: 900, color: "#991b1b" }}>Toko Online</div>
                <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "2px" }}>Terima Bayaran Saja</div>
                <div style={{ marginTop: "6px", background: "#fee2e2", border: "1px solid #ef4444", padding: "3px", borderRadius: "6px", fontSize: "10px", color: "#dc2626", fontWeight: 800 }}>
                  🚫 Tak Pernah Tahu Kartu Asli
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div style={{ marginTop: "14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>🔒</span>
              <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600, lineHeight: "1.3" }}>
                Sesuai penjelasan: kartu aslimu tidak pernah dibagikan ke toko maupun ke AI. Yang dikirim hanya nomor pengganti!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RPG Decision Box is removed */}
    </div>
  );
};