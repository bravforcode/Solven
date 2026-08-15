"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { fetchLibrary, LibraryData, Book, Loan } from "@/lib/staff";

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    fetchLibrary().then((d) => {
      setData(d);
      setBooks(d.books);
      setLoans(d.loans);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="shell">
        <Sidebar />
        <div className="main-col">
          <header className="topbar">
            <div>
              <h1 className="page-title">ห้องสมุด</h1>
              <p className="page-sub">กำลังโหลด...</p>
            </div>
          </header>
          <main className="content view-in">
            <div className="panel panel-pad">กำลังโหลด...</div>
          </main>
          <footer className="footer">
            Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
          </footer>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = books.filter(
    (b) =>
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
  );

  const borrow = (book: Book) => {
    setBooks((rows) =>
      rows.map((b) => (b.id === book.id ? { ...b, available: false } : b))
    );
    setLoans((rows) => [
      ...rows,
      {
        bookId: book.id,
        studentId: `s-demo-${nextId}`,
        borrowDate: "2026-08-16",
        dueDate: "2026-09-16",
        returned: false,
      },
    ]);
    setNextId((n) => n + 1);
  };

  const returnBook = (bookId: string) => {
    setBooks((rows) =>
      rows.map((b) => (b.id === bookId ? { ...b, available: true } : b))
    );
    setLoans((rows) =>
      rows.map((l) => (l.bookId === bookId ? { ...l, returned: true } : l))
    );
  };

  const titleOf = (bookId: string) =>
    books.find((b) => b.id === bookId)?.title ?? bookId;
  const activeLoans = loans.filter((l) => !l.returned);

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ห้องสมุด</h1>
            <p className="page-sub">
              ค้นหาหนังสือและจัดการการยืม-คืน (ข้อมูลตัวอย่าง PDPA)
            </p>
          </div>
        </header>
        <main className="content view-in">
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="ค้นหาชื่อหนังสือ / ผู้แต่ง / หมวด..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          <div className="panel panel-pad" style={{ marginBottom: 14 }}>
            <h2 className="section-title">รายการหนังสือ</h2>
            <table className="table" style={{ width: "100%", marginTop: 10 }}>
              <thead>
                <tr>
                  <th>ชื่อหนังสือ</th>
                  <th>ผู้แต่ง</th>
                  <th>หมวด</th>
                  <th>สถานะ</th>
                  <th>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>{b.title}</td>
                    <td>{b.author}</td>
                    <td>{b.category}</td>
                    <td>
                      <span className={b.available ? "badge badge-approved" : "badge badge-pending"}>
                        {b.available ? "พร้อมยืม" : "ถูกยืม"}
                      </span>
                    </td>
                    <td>
                      {b.available ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => borrow(b)}
                        >
                          ยืมหนังสือ
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => returnBook(b.id)}
                        >
                          คืนหนังสือ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-icon">📚</div>
                <div className="empty-title">ไม่พบหนังสือ</div>
                <div className="empty-text">ลองเปลี่ยนคำค้นหา</div>
              </div>
            )}
          </div>
          <div className="panel panel-pad">
            <h2 className="section-title">รายการยืมที่ยังไม่คืน ({activeLoans.length})</h2>
            {activeLoans.length === 0 ? (
              <p className="section-hint">ไม่มีรายการยืมค้าง</p>
            ) : (
              <table className="table" style={{ width: "100%", marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>หนังสือ</th>
                    <th>รหัสนักเรียน</th>
                    <th>วันที่ยืม</th>
                    <th>กำหนดคืน</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((l) => (
                    <tr key={`${l.bookId}-${l.studentId}`}>
                      <td>{titleOf(l.bookId)}</td>
                      <td>{l.studentId}</td>
                      <td>{l.borrowDate}</td>
                      <td>{l.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
        <footer className="footer">
          Solven prototype — ข้อมูลทั้งหมดเป็นตัวอย่าง/อยู่ในเครื่องเท่านั้น ไม่มีข้อมูลนักเรียนจริง (PDPA)
        </footer>
      </div>
    </div>
  );
}
