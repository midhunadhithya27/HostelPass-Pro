# HostelPass Pro 🎓🏢

> **Digital Outing & Leave Approval System for Anna University (CEG)**  
> A multi-role hostel leave and outing management web platform designed for Students, Parents, Wardens, and Security Gate Guards with automated authorization workflows, multi-factor OTP verification, load-balanced warden queues, and dynamic QR gate passes.

---

## 🌟 Key Features

### 1. 🎓 Student Portal
- **Comprehensive Registration**: Captures name, Anna University roll number, college official email, college name, parent details, date of birth, year of study, course, gender, hostel block, room number, and profile picture upload.
- **Parent-Linked Authentication**: Log in via Anna University Roll Number, password, and registered parent's phone number with instant SMS OTP dispatched to the parent.
- **Smart Outing / Leave Form**: Auto-populates student identity and hostel records; captures departure date/time, expected curfew return, destination, and leave category (Local Outing vs. Home Leave).
- **Dynamic QR Gatepass**: Generates an encrypted single-use digital gatepass with security watermarks, countdown clock, and warden approval signature.

### 2. 🏡 Parent Authorization Portal
- **1:1 Strict Student Linking**: Enforces a single parent account (Mother or Father) linked directly to the student's registered details.
- **Dual-OTP Authentication**: Sends verification codes to both parent and student numbers for fraud prevention.
- **Real-Time Approval Queue**: Students' leave requests arrive in real time for immediate parent authorization.
- **🚨 5-Minute Repeating Alert & Emergency Bypass**: Synthesized audio siren that simulates overriding device silent mode, alerting parents every 5 minutes until authorized.
- **Parent-First Gate**: Requests are **only** sent to the warden if and when the parent approves.

### 3. 🛡️ Warden Management Dashboard
- **Sequential Routing**: Receives requests exclusively after verified parent approval.
- **Intelligent Load Balancing (Max 100 Cap)**: Automatically caps active queues at 100 requests per warden. Subsequent requests dynamically overflow to the next available warden with zero request duplication.
- **Official Outpass Grant**: Review student hostel history and parent remarks, then approve to trigger instant QR gatepass generation.

### 4. 🚪 Security Watchman Sentinel (Gate In/Out)
- **Officer Profile & Proof ID**: Captures guard name, phone number, gate post, and institutional working proof ID.
- **Dual-Mode QR Scanner**:
  - **SCAN OUT (Exit)**: Scans student's QR at gate, marks the student officially OUT of campus, logs timestamp, and notifies parents in real time.
  - **SCAN IN (Return)**: Scans returning students, marks the pass COMPLETED/CLOSED, and restores campus headcount.
- **Live Headcount Balancer**: Real-time counter tracks students currently inside the hostel vs. out on active passes.
- **Movement Audit Log**: Full chronological gate ledger filterable by movement direction.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Audio Synthesizer**: Web Audio API (real-time notification pings, gate scanner laser beeps, and emergency siren bypass)
- **Gatepass Security**: `qrcode` generator, anti-tamper watermark canvas
- **Icons & UI**: Lucide React, Motion, Canvas Confetti
- **Build Tool**: Vite

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/midhunadhithya27/HostelPass-Pro.git

# Navigate into the project folder
cd HostelPass-Pro

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open your browser at `http://localhost:3000` to access the application.

---

## 👥 Demo Testing Accounts

- **Student**: Roll `2023105084` | Password `password123` | Parent Phone `+91 98401 23456`
- **Parent**: Email `senthil.parent@gmail.com` | Password `password123`
- **Warden**: Email `balasubramanian.warden@ceg.annauniv.edu` | Password `password123`
- **Watchman**: Phone `+91 98840 55667` | Name `Murugan K.`

---

## 📄 License
This project is licensed under the Apache-2.0 License.
