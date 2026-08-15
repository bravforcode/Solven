"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchPlcFeed, PlcFeed, PlcPost } from "@/lib/teaching";

export default function PlcPage() {
  const [feed, setFeed] = useState<PlcFeed>({ posts: [] });
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetchPlcFeed().then((data) => {
      setFeed(data);
      setLoading(false);
    });
  }, []);

  const toggleLike = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addPost = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const post: PlcPost = {
      id: `local-${Date.now()}`,
      author: "ครูสมหญิง ใจดี (คุณ)",
      title: title.trim(),
      body: body.trim(),
      likes: 0,
      comments: [],
    };
    setFeed((prev) => ({ posts: [post, ...prev.posts] }));
    setTitle("");
    setBody("");
  };

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">PLC ชุมชนแห่งการเรียนรู้ทางวิชาชีพ</h1>
            <p className="page-sub">
              แลกเปลี่ยนเทคนิคการสอนระหว่างครู (ข้อมูลตัวอย่าง PDPA) — กดไลก์และโพสต์ได้
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge">{feed.posts.length} โพสต์</span>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">โพสต์ใหม่</h2>
            <form onSubmit={addPost}>
              <div className="field">
                <label className="field-label">หัวข้อ</label>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  placeholder="เช่น เทคนิคจัดการชั้นเรียน..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">รายละเอียด</label>
                <textarea
                  className="textarea"
                  style={{ width: "100%", minHeight: 90 }}
                  placeholder="แชร์ประสบการณ์หรือคำถามให้เพื่อนครู..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                โพสต์
              </button>
            </form>
          </div>

          {loading ? (
            <div className="panel panel-pad">กำลังโหลด...</div>
          ) : feed.posts.length === 0 ? (
            <div className="panel panel-pad">
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-title">ยังไม่มีโพสต์</div>
                <div className="empty-text">เป็นคนแรกที่แบ่งปันประสบการณ์ใน PLC</div>
              </div>
            </div>
          ) : (
            feed.posts.map((p) => {
              const isLiked = !!liked[p.id];
              const likeCount = p.likes + (isLiked ? 1 : 0);
              return (
                <div className="panel panel-pad" key={p.id} style={{ marginBottom: 12 }}>
                  <h2 className="section-title" style={{ marginBottom: 2 }}>
                    {p.title}
                  </h2>
                  <p className="section-hint" style={{ marginBottom: 8 }}>
                    โดย {p.author}
                  </p>
                  <p>{p.body}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isLiked ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => toggleLike(p.id)}
                    >
                      👍 ชอบ ({likeCount})
                    </button>
                    <span className="section-hint">{p.comments.length} ความคิดเห็น</span>
                  </div>
                  {p.comments.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      {p.comments.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "8px 10px",
                            marginBottom: 6,
                            borderRadius: 8,
                            background: "rgba(0,0,0,0.04)",
                          }}
                        >
                          <span className="section-hint">{c.author}: </span>
                          {c.body}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
