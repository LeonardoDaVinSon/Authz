# Kịch bản demo — Session & Cookie

> Kịch bản mở rộng (bản nháp) cho phần session. Số beat bên dưới theo bản deck cũ; deck hiện tại gom phần này vào slide 7–10, và runbook chính thức là [`docs/03-demo-runbook.md`](../docs/03-demo-runbook.md) (Demo 3 và Demo 4).

**Phần:** Session · **Slide (deck hiện tại):** 7–10 · **Thời lượng:** 15 phút
**Lab:** `devhub-auth-lab` → `http://localhost:5173/demo/session` và `http://localhost:5173/demo/session/logout-lab`
**Câu hỏi xuyên suốt:** *Sau khi login, ai giữ trạng thái đăng nhập — và ai khác có thể cầm nó?*

---

## 0. Mục tiêu

Khi hết phần này, người nghe phải nói lại được bằng lời của mình:

1. HTTP không nhớ gì. Cookie chỉ mang **ID**; trạng thái nằm ở **server**.
2. Mỗi thuộc tính cookie vá **một** lỗ hổng cụ thể; không thuộc tính nào vá được tất cả. `HttpOnly` **không** chống CSRF và **không** chặn XSS hành động thay user.
3. Session ID là **bearer credential**: ai cầm ID thì là bạn, không cần mật khẩu.
4. Bảo mật nằm ở **vòng đời**: rotate khi login, hết hạn, và thu hồi phía server khi logout.
5. **Fixation** và **CSRF** là hai attack khác nhau, có cách vá khác nhau.

Mỗi beat có một cặp **hành vi sai / hành vi đúng** và một **câu chốt**. Câu chốt in đậm là thứ cần nói nguyên văn.

---

## 1. Chuẩn bị (làm trước giờ diễn 10 phút)

> ⚠️ Bước 1–3 là bắt buộc. Nếu trình duyệt còn session từ lần tập trước, nút "Truy cập ẩn danh trước" sẽ trả về một session **đã đăng nhập** và câu chuyện fixation ở slide 11–12 bị hỏng.

| # | Việc | Lệnh / thao tác |
|---|---|---|
| 1 | Xoá sạch session store (MemoryStore) | Nút **Reset demo** trên topbar, hoặc `docker compose restart api` |
| 2 | Dùng **một profile trình duyệt riêng** cho buổi demo | Tránh để cookie của app khác trên `localhost` hiện ra khi bấm "Đọc bằng document.cookie" |
| 3 | Xoá cookie của `localhost` trong profile đó | DevTools → Application → Cookies → `http://localhost:5173` → Clear all |
| 4 | Mở lab, kiểm tra API đang chạy | `http://localhost:5173/demo/session` → topbar báo API "đang chạy" |
| 5 | Ngôn ngữ **VI**, zoom trình duyệt 125–150% | Nút VI/EN trên topbar |
| 6 | Mở **Inspector**, bấm **Xoá** | Nút `⇄ Inspector` trên topbar |
| 7 | Mở sẵn DevTools ở tab **Application → Cookies** (đóng lại, mở khi cần) | Dùng ở beat 3 |
| 8 | Mở sẵn một terminal, chữ to, ở thư mục bất kỳ | Dùng ở beat 3 nếu chọn phiên bản `curl` |
| 9 | Kiểm tra `LAB_VULNERABLE_MODES=true` | Nút "Replay từ client khác" không bị disable |

**Không** login trước giờ diễn: cookie sống 15 phút, đúng bằng thời lượng phần này.

---

## 2. Tổng quan nhịp

| Phút | Slide | Beat | Thao tác chính trên lab | Câu chốt |
|---:|---|---|---|---|
| 0:00 | 08 | **Gieo hạt + Stateless** | Truy cập ẩn danh → Login → Kiểm tra có/không cookie | Cookie chỉ là ID; server mới giữ trạng thái. |
| 2:00 | 09 | **Cookie không chỉ là cookie** | Quiz cookie trơn → Inspector → Bảng giải phẫu → `document.cookie` | Mỗi thuộc tính vá một lỗ, không cái nào vá tất cả. |
| 5:00 | 10 | **Ghost session** | Replay từ client khác (hoặc `curl`) → đăng nhập thành member | Ai cầm ID thì là bạn. |
| 9:00 | 11 | **Vòng đời** | So ID trước/sau login → Logout → Replay lại → bị thu hồi | Thu hồi phải xảy ra ở server. |
| 12:00 | 12 | **Fixation vs CSRF** | Quiz 2 kịch bản → callout cuối trang | Hai attack, hai cách vá; HttpOnly không vá cái nào. |
| 15:00 | → 13 | Chuyển sang JWT | — | Đổi sang token không tự động an toàn hơn. |

---

## 3. Kịch bản chi tiết

### Beat 1 · Slide 08 — HTTP is stateless *(2 phút)*

**Câu chuyển vào** (từ slide 07):
> "Password chỉ là credential ban đầu. Login xong rồi, request thứ hai, thứ ba, thứ một trăm — server làm sao biết vẫn là bạn?"

**Thao tác 1 — Gieo hạt (10 giây, đừng giải thích nhiều)**
- Bấm **Truy cập ẩn danh trước**.
- Chỉ vào dòng `Session ID trước login: …` ngay dưới nút.

> "Tôi vừa ghé DevHub mà chưa login. Server đã cấp cho tôi một ID. Mọi người nhớ giúp tôi 4 ký tự cuối của nó — lát nữa ta quay lại."

*(Đọc to 4 ký tự cuối. Đây là "khẩu súng của Chekhov" cho slide 11–12.)*

**Thao tác 2 — Login**
- Giữ nguyên `member@devhub.local` / mật khẩu demo → bấm **Login và tạo session**.
- Kết quả: `RESPONSE CỦA LOGIN · 201 · Chấp nhận`.

**Thao tác 3 — Có cookie vs không cookie**
- Bấm **Kiểm tra có cookie** → `GET /api/me` trả `200`, user `member@devhub.local`, `authenticatedVia: "session"`.
- Bấm **Kiểm tra không cookie** → `401`, `{"message":"Authentication required"}`.

> "Cùng trình duyệt, cùng endpoint, cùng một giây. Khác nhau đúng một thứ: có gửi cookie hay không. Server không 'nhớ' tôi — nó nhận ra tôi **nhờ cái ID tôi gửi kèm**."

**Chốt:**
> **"Cookie chỉ mang một ID. Trạng thái đăng nhập nằm ở server. Vậy cái ID đó phải được bảo vệ thế nào?"**

| Sai | Đúng |
|---|---|
| Không cookie → server không biết bạn là ai (`401`) | Có cookie → server tra ID trong store và nhận ra member (`200`) |

---

### Beat 2 · Slide 09 — A cookie is not just a cookie *(3 phút)*

**Tương tác mở đầu (trên slide, 45 giây)** — chiếu một cookie trơn:

```http
Set-Cookie: sid=abc123
```

> "Đây là cookie session của một app thật mà tôi từng review. Nó thiếu gì? Mỗi người nói một thuộc tính."

Ghi lại các đáp án. Kỳ vọng nghe được: `HttpOnly`, `Secure`, `SameSite`, thời hạn. Nếu ai nói `Domain`, hỏi lại: *"Đ