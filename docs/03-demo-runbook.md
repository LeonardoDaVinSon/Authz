# Demo runbook — Break the Login

Hướng dẫn cho người trình bày: chuẩn bị, thứ tự tab, kịch bản từng demo với status code kỳ vọng, và phương án dự phòng. Slide mở demo qua nút **Mở … Demo ↗** (hyperlink tới `http://localhost:5173/demo/...`).

> Lab chỉ chạy local (`127.0.0.1`). Chỉ dùng tài khoản demo bên dưới; không dùng credential, token hay dữ liệu thật. Không chiếu cookie value, session ID đầy đủ hay signing secret.

## 1. Tài khoản demo

| Email | Role | Password |
|---|---|---|
| `member@devhub.local` | `member` | `DevHub-demo-pass-123!` |
| `admin@devhub.local` | `admin` | `DevHub-demo-pass-123!` |

Đây là credential công khai, chỉ dùng trong lab.

## 2. Chuẩn bị (trước giờ diễn 15 phút)

### 2.1 Khởi động lab

Cách A — Docker (khuyên dùng khi trình bày):

```bash
cd devhub-auth-lab
docker compose up -d --build     # --build bắt buộc sau mỗi lần cập nhật code
curl -s http://localhost:3000/health
```

Cách B — chạy dev (hai terminal):

```bash
cd devhub-auth-lab && cp -n .env.example .env && npm install && npm run start:dev
cd devhub-auth-lab/frontend && cp -n .env.example .env && npm install && npm run dev
```

Hyperlink trong slide trỏ tới cổng `5173`. Nếu phải dùng cổng khác, build lại deck: `cd slides && DEMO_BASE_URL=http://localhost:<port> npm run build`.

### 2.2 Checklist

| # | Việc | Cách kiểm tra |
|---|---|---|
| 1 | API chạy | `GET http://localhost:3000/health` → `200` |
| 2 | Trang điều hướng | `http://localhost:5173/demo`: topbar có nhãn **DEMO ONLY — LOCAL** và trạng thái API "đang chạy" |
| 3 | Tests xanh | `cd devhub-auth-lab && npm test` |
| 4 | Hyperlink slide đúng | `cd slides && npm run verify -- --live` |
| 5 | Mở thử từng route ở mục 3 | Mỗi trang hiển thị đúng lab, không lỗi |
| 6 | Bấm **Reset demo** trên topbar | Toast "Đã reset demo" |
| 7 | Dùng **một profile trình duyệt riêng**, xoá cookie `localhost` | DevTools → Application → Cookies |
| 8 | Ngôn ngữ **VI**, zoom 125–150% | Nút VI/EN trên topbar |
| 9 | Đóng mọi tab chứa dữ liệu cá nhân hoặc hệ thống production | — |
| 10 | `LAB_VULNERABLE_MODES=true` | Nút replay ở Demo 3 và cột "Logout sai" ở Demo 4 không bị disable |
| 11 | Demo 7 đúng chế độ | `GET http://localhost:3000/oidc/status`: `mode: "live"` và `discovery.ok: true`, hoặc `mode: "walkthrough"`. Nếu live: login thử một lần rồi logout cả ở IdP |

Không login trước giờ diễn: session sống 15 phút.

### 2.3 Thứ tự tab

1. `/demo/authz` — Demo 1
2. `/demo/password` — Demo 2
3. `/demo/session` — Demo 3
4. DevTools → Application → Cookies (mở khi cần)
5. `/demo/session/logout-lab` — Demo 4
6. `/demo/jwt` — Demo 5
7. `/demo/tokens` — Demo 6
8. `/demo/oidc` — Demo 7 (live nếu đã cấu hình IdP, nếu không là walkthrough)

Có thể không mở sẵn tab: nút trên slide mở đúng route. Mọi lab cũng chuyển được qua sidebar.

## 3. Kịch bản từng demo

Mỗi demo 2–4 phút, một thông điệp. Cho khán giả **đoán status code trước khi bấm**. Bảng "Kỳ vọng" là kết quả đã xác minh với backend local.

### Demo 1 · Slide 5 · `/demo/authz` — 401 vs 403 *(3 phút)*

Bấm **Reset demo** trước. Chạy sáu bước trong khối "Kịch bản · Session cookie":

| Bước | Request | Kỳ vọng |
|---|---|---|
| 1 | `GET /api/me` khi chưa login | `401` + `WWW-Authenticate` |
| 2 | Login member (`POST /session/login`) | `201` |
| 3 | `GET /api/me` | `200`, role `member` |
| 4 | `GET /api/admin` bằng member | `403` |
| 5 | Login admin | `201` |
| 6 | `GET /api/admin` bằng admin | `200` |

Nếu bước 1 trả `200`: browser còn session cũ → **Reset demo** rồi chạy lại.

**Câu chốt:** "401 là *tôi không biết bạn là ai*; 403 là *tôi biết, và câu trả lời là không*. Quyết định nằm ở backend, không phải ở nút bị ẩn trên UI."

Tuỳ chọn: phần "Cùng quy tắc · Bearer token" lặp lại với bốn người gọi (không token, token hết hạn, member, admin).

### Demo 2 · Slide 7 · `/demo/password` — hash, salt, verify *(3 phút)*

1. **Hash password** → hash #1. Chỉ ra `$2b$`, cost `10`, 22 ký tự salt.
2. **Hash lại lần nữa** → hash #2 khác hash #1 ("✓ Hai chuỗi khác nhau…").
3. **Verify** với password đúng → khớp + in hash. Đổi ô thử sang password sai → không khớp + vẫn in hash.
4. (Nếu còn thời gian) ở bảng leak bên dưới, bấm **Crack offline với wordlist** — SHA-256 không salt rơi trong mili giây và lộ password dùng lại; bcrypt bị chặn bởi ngân sách thời gian.

**Câu chốt:** "Salt làm cùng password ra hash khác. Hash chậm làm đoán offline đắt. Nhưng không cái nào chặn được brute-force online; cần rate limiting và MFA."

### Demo 3 · Slide 9 · `/demo/session` — session & cookie *(4 phút)*

1. **Truy cập ẩn danh trước** → đọc to 4 ký tự cuối của ID trước login.
2. Login `member@devhub.local` → `201`.
3. So sánh ID trước/sau login → "đã rotate" (chống fixation).
4. **Kiểm tra có cookie** → `200`; **Kiểm tra không cookie** → `401`.
5. **Đọc bằng document.cookie** → không thấy `devhub.sid` (`HttpOnly`). Mở DevTools → Cookies để chỉ flags: `HttpOnly ✓`, `SameSite=Lax`, `Secure` tắt vì HTTP local. **Không** zoom vào cột Value.
6. **Replay từ client khác** → vẫn đăng nhập được: session ID là bearer credential.

UI chỉ hiển thị session ID dạng rút gọn.

**Câu chốt:** "Cookie chỉ mang ID. Ai cầm ID thì là bạn."

### Demo 4 · Slide 10 · `/demo/session/logout-lab` — logout & revoke *(3 phút)*

Chạy cột **A · Logout sai** rồi cột **B · Logout đúng**, mỗi cột bốn bước:

| Bước | A · Chỉ xoá cookie | B · Huỷ session phía server |
|---|---|---|
| 1 Login member (ID bị sao chép) | `201` | `201` |
| 2 `GET /api/me` | `200` | `200` |
| 3 Logout | `200` (cookie hết hạn) | `204` (`session.destroy()`) |
| 4 `GET /api/me` từ browser | `401` | `401` |
| **Replay ID đã sao chép** | **✕ vẫn đăng nhập** | **✓ bị từ chối** |

**Câu chốt:** "Cả hai đều trông như đã logout. Chỉ một bên thực sự logout. Thu hồi phải xảy ra ở server."

### Demo 5 · Slide 14 · `/demo/jwt` — decode ≠ verify *(4 phút)*

1. Chọn token mẫu **Valid**. Chỉ header, payload đọc được ngay: decode không cần key.
2. Chọn **Tampered role** → **Verifier chặt** dừng ở bước `signature`; client chỉ nhận `401` chung.
3. Chuyển sang **Verifier ngây thơ** → chấp nhận cả token đã sửa: đó là lý do không được "chỉ decode".
4. Thử **alg: none**, **HS384** (ngoài allowlist), **Expired**, **Wrong issuer**, **Wrong audience**.
5. Khối **Gửi token tới API thật**: token member hợp lệ → `/api/me` `200`, `/api/admin` `403`; token đã sửa → `401` cả hai.

Token mẫu là fixture do lab ký bằng secret local, thời hạn ngắn; nói rõ đây là fixture. Editor hiển thị nguyên token để có thể sửa; đó là token demo, không phải credential thật. Signing secret không bao giờ được gửi xuống frontend.

**Câu chốt:** "Đọc được payload không có nghĩa là tin được payload. Verify chữ ký, thuật toán, iss, aud, exp — rồi mới đọc role."

### Demo 6 · Slide 15 · `/demo/tokens` — access + refresh *(4 phút)*

Banner: **LUỒNG THẬT** (rotation và reuse detection chạy ở server, store in-memory). Làm theo ① → ⑥:

| Bước | Request | Kỳ vọng |
|---|---|---|
| ① Login | `POST /tokens/login` | `200`, family mới ở cột Server |
| ② Gọi API bằng access token | `GET /api/me` | `200` |
| ③ Gọi API bằng refresh token | `GET /api/me` | `401` |
| ④ Refresh (rotate) | `POST /tokens/refresh` | `200`, RT cũ → `rotated` |
| ⑤ Dùng lại refresh token cũ | `POST /tokens/refresh` | `401`, family → `đã thu hồi` (reuse-detected) |
| ⑥ Logout / thu hồi | `POST /tokens/logout` | `204` |

Tuỳ chọn: tick "Access token ngắn hạn (20 giây)" để xem đồng hồ đếm về 0 và `/api/me` chuyển sang `401`.

**Câu chốt:** "Access token ngắn hạn để gọi API. Refresh token phải rotate, lưu hash và thu hồi được. Token cũ quay lại nghĩa là có bản sao."

### Demo 7 · Slide 20 · `/demo/oidc` — Code Flow + PKCE *(3 phút)*

Trang có hai chế độ, quyết định bởi `.env` của API (xem mục "Enable live OIDC" trong `devhub-auth-lab/README.md`). Nhìn banner trước khi nói.

**A. Live — banner `LIVE OIDC — REAL IDENTITY PROVIDER`** (đã điền `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`; IdP đã đăng ký redirect URI `http://localhost:3000/oidc/callback`):

Chuẩn bị: chỉ dùng tài khoản test của IdP test. Thêm email đó vào `OIDC_ADMIN_EMAILS` nếu muốn thấy `role=admin`. Đăng xuất IdP trước giờ diễn để khán giả thấy màn hình login của IdP.

| Bước | Thao tác | Kỳ vọng |
|---|---|---|
| 1 | Chỉ cấu hình: issuer, `client_id`, `redirect_uri`, scope | Không có client secret trên màn hình |
| 2 | Bấm **Đăng nhập bằng Identity Provider** | `302` sang IdP; URL có `state`, `nonce`, `code_challenge`, `code_challenge_method=S256` |
| 3 | Đăng nhập bằng tài khoản test | Quay về `/demo/oidc`, thông báo login thành công |
| 4 | Đọc danh sách **DevHub đã kiểm tra** | ✓ `state`, `pkce`, `signature` (JWKS), `iss`, `aud`, `exp`, `nonce` |
| 5 | Bấm **Gọi /api/me** | `200`, `id = oidc:<sub>`, `authenticatedVia: session`; DevHub dùng session riêng chứ không dùng token của IdP |
| 6 | Bấm **Logout khỏi DevHub** | `/api/me` → `401`. IdP vẫn còn session, nên có link **Logout cả khỏi IdP** |

Access token chỉ hiện 10 ký tự đầu; ID token chỉ hiện header và claim. Không mở DevTools → Network khi đang login thật.

Nếu banner là `OIDC CONFIGURED — IDENTITY PROVIDER UNREACHABLE` (mất mạng, sai issuer): chuyển sang chế độ B và nói rõ.

**B. Walkthrough — banner `FLOW WALKTHROUGH — NO REAL LOGIN`** (chưa cấu hình IdP). Nói rõ ngay câu đầu: "Không có ai thực sự đăng nhập ở đây; lab không kết nối IdP."

1. Bấm **Tiếp** qua 9 bước của sequence; ở bước 1 chỉ `code_verifier` → `code_challenge` (SHA-256 thật trong trình duyệt), `state`, `nonce`.
2. Bước 5: tick **Giả lập callback có state không khớp** → bị từ chối.
3. Phần "Hai token, hai audience": ID token `aud = devhub-web`, access token `aud = devhub-api`. Mọi giá trị IdP là mẫu.

Ở chế độ A, sequence và hai token mẫu bên dưới vẫn còn, có nhãn là giá trị mẫu; dùng chúng để giải thích từng bước vừa xảy ra.

**Câu chốt:** "OAuth uỷ quyền truy cập; OIDC thêm danh tính. Dùng thư viện, nhưng phải biết nó check state, PKCE, nonce, chữ ký, iss, aud, exp."

## 4. Reset giữa các lần chạy

- Nút **Reset demo** (topbar) gọi `POST /lab/reset`: xoá mọi session, refresh token family và log inspector. Chỉ hoạt động khi `DEMO_MODE=true`.
- Restart API cũng xoá sạch (store in-memory).
- Nếu cookie lạ vẫn còn: xoá cookie `localhost` trong DevTools.

## 5. Phương án dự phòng

| Sự cố | Phương án |
|---|---|
| API không chạy | `docker compose up -d --build` hoặc `npm run start:dev`; kiểm tra `/health`. Nếu không kịp: dùng sơ đồ trên slide, **nói rõ là sơ đồ, không phải kết quả live** |
| Slide mở trang tổng quan cũ / không có `/demo/...` | Container `web` đang chạy bản cũ → `docker compose up -d --build` |
| Cổng 3000/5173 bị chiếm | Chạy cổng khác (`PORT=3100`, `FRONTEND_ORIGIN=http://localhost:5180`, `VITE_API_BASE_URL=http://localhost:3100`), rồi build lại deck với `DEMO_BASE_URL` |
| Cookie không hiện / login không giữ | Kiểm tra cùng host (`localhost` cả hai phía), `SESSION_COOKIE_SECURE=false` khi chạy HTTP, `FRONTEND_ORIGIN` khớp origin frontend |
| Bước 1 Demo 1 trả `200` | Còn session cũ → **Reset demo** |
| Nút replay bị disable | `LAB_VULNERABLE_MODES=false` → bật lại và restart API |
| Demo JWT lỗi | Dùng fixture đã test trong `devhub-auth-lab/fixtures/jwt-cases.md` hoặc `npm run lab:jwt`, nói rõ là fixture |
| Mất Internet | Demo 1–6 chạy local, không phụ thuộc mạng. Demo 7 live cần tới IdP: nếu IdP ở cloud, xoá `OIDC_ISSUER_URL` khỏi `.env`, restart API và trình bày walkthrough |
| Demo 7 báo `reason = …` sau callback | Đọc lý do trên màn hình: `redirect_uri` chưa đăng ký đúng, sai client secret (`token_exchange_failed`), IdP ký ID token bằng HS256 (`id_token_invalid`), quá 10 phút giữa login và callback (`transaction_expired`) |
| Hết thời gian | Ưu tiên Demo 1 → 2 → 3/4 → 5; Demo 6, 7 chuyển thành sơ đồ |

Không trình bày screenshot hay fixture như kết quả live.

## 6. Sau buổi diễn

```bash
cd devhub-auth-lab && docker compose down
```

Không commit `.env`. Không chia sẻ bản ghi màn hình có DevTools mở cột cookie Value.
