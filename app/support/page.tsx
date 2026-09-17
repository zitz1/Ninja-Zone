"use client";

import { useState } from "react";
import { CustomerShell } from "@/components/customer-shell";

const quick = [
  ["الحجز", "شلون أحجز جهاز؟"],
  ["الأوقات", "شنو أوقات العمل؟"],
  ["الدعم", "أريد أتواصل مع الكاشير"],
];

export default function SupportPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([{ from: "team", text: "هلا بيك 👋 شلون نساعدك اليوم؟" }]);

  function send(text = message) {
    const value = text.trim();
    if (!value) return;
    setMessages((current) => [...current, { from: "me", text: value }]);
    setMessage("");
    window.setTimeout(() => setMessages((current) => [...current, { from: "team", text: "وصلت رسالتك. الكاشير يقدر يتابع طلبك من الدعم." }]), 500);
  }

  return (
    <CustomerShell>
      <main className="nz-container nz-page-shell nz-support-modern">
        <header className="nz-page-titlebar">
          <div>
            <span className="nz-label">NINJA ZONE • LIVE SUPPORT</span>
            <h1>الدعم والمساعدة</h1>
            <p>مساعدة سريعة للحجز، الأوقات، الأجهزة وأي استفسار داخل Ninja Zone.</p>
          </div>
          <div className="nz-support-online"><i /> متاح الآن</div>
        </header>

        <section className="nz-support-layout">
          <aside className="nz-support-info">
            <div className="nz-support-brand"><span>NZ</span><div><strong>Ninja Zone</strong><small>Gaming Center • Ramadi</small></div></div>
            <div className="nz-support-status"><i /><div><strong>الدعم متاح</strong><small>10:00 صباحًا — 3:00 فجرًا</small></div></div>
            <h3>أسئلة سريعة</h3>
            <div className="nz-quick-list">
              {quick.map(([label, text]) => <button key={label} onClick={() => setMessage(text)}><span>{label}</span><b>{text}</b><em>←</em></button>)}
            </div>
            <div className="nz-support-contact"><span>☎</span><div><small>تواصل مباشر</small><strong>الكاشير • الدعم</strong></div></div>
          </aside>

          <section className="nz-chat-panel">
            <div className="nz-chat-head"><div className="nz-chat-avatar">NZ</div><div><strong>دردشة الدعم</strong><small><i /> فريق Ninja Zone متصل الآن</small></div><span>●</span></div>
            <div className="nz-chat-body">
              {messages.map((item, index) => <div key={index} className={`nz-message ${item.from === "me" ? "mine" : ""}`}><span>{item.text}</span><small>{item.from === "me" ? "أنت" : "الدعم"}</small></div>)}
            </div>
            <div className="nz-chat-quick">{quick.map(([, text]) => <button key={text} onClick={() => send(text)}>{text}</button>)}</div>
            <form className="nz-chat-input" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالتك هنا..." />
              <button aria-label="إرسال">↑</button>
            </form>
          </section>
        </section>
      </main>
    </CustomerShell>
  );
}
