# 02 — Nội dung 27 slide và speaker notes

> File này được sinh tự động từ `slides/deck-content.mjs` bởi `npm run build` trong thư mục `slides/`. Sửa nội dung ở file nguồn rồi build lại, đừng sửa trực tiếp file này.

- Deck: `slides/break-the-login.pptx`
- Thời lượng: 90 phút
- Link demo trỏ tới `http://localhost:5173` (đổi bằng biến môi trường `DEMO_BASE_URL` khi build).

## Bảng slide → demo

| Slide | Nút | URL |
| --- | --- | --- |
| 5 | `Mở API Demo ↗` | http://localhost:5173/demo/authz |
| 7 | `Mở Password Demo ↗` | http://localhost:5173/demo/password |
| 9 | `Mở Session Demo ↗` | http://localhost:5173/demo/session |
| 10 | `Mở Logout Demo ↗` | http://localhost:5173/demo/session/logout-lab |
| 14 | `Mở JWT Demo ↗` | http://localhost:5173/demo/jwt |
| 15 | `Mở Token Lifecycle Demo ↗` | http://localhost:5173/demo/tokens |
| 20 | `Mở OIDC Demo ↗` | http://localhost:5173/demo/oidc |

## Slide 1 — Break the Login

*Mở đầu · 00–01 · 1 phút*

**Nội dung hiển thị**

- Authentication Core
- Từ login đến credential lifecycle
- DevHub · Fullstack Technical Sharing

**Speaker notes**

> Lời dẫn: "Hôm nay chúng ta không chỉ xem cách login thành công. Chúng ta sẽ theo dõi credential từ lúc được tạo, lưu trữ, gửi qua request, xác minh cho đến khi hết hạn hoặc bị thu hồi."
>
> Sơ đồ: Browser nói chuyện với DevHub API. Phía sau API có hai nơi giữ "sự thật" về danh tính: session store (khi dùng session) và Identity Provider (khi dùng SSO/OIDC). Cả buổi sẽ đi qua từng mũi tên trên sơ đồ này.
>
> Demo: chưa mở demo. Trước giờ trình bày đã mở sẵn http://localhost:5173/demo và bấm "Reset demo".

## Slide 2 — Hôm nay chúng ta đi qua những phần nào?

*Mở đầu · 01–03 · 2 phút*

**Nội dung hiển thị**

- AuthN ≠ AuthZ · `401` / `403`
- Password hashing và salt
- Session, cookie, logout
- JWT · access / refresh token
- OAuth 2.0 · OIDC · SAML
- Chọn kiến trúc · checklist

**Speaker notes**

> Lời dẫn: "Buổi này đi theo vòng đời credential, không phải liệt kê mọi giao thức. Sáu phần chính trên slide — mỗi phần có ít nhất một điểm cần nhớ và hầu hết có demo chạy thật trên lab."
>
> Đi nhanh từng ô (khoảng 15–20 giây/ô):
> 1. AuthN / AuthZ — phân biệt "bạn là ai" và "bạn được làm gì", đọc đúng 401 với 403.
> 2. Password — hash chuyên dụng, salt, và vì sao hashing không thay rate limit.
> 3. Session — cookie là credential; logout phải huỷ phía server.
> 4. JWT — decode ≠ verify; access ngắn hạn, refresh phải rotate.
> 5. OAuth / OIDC / SAML — ủy quyền ≠ login; Code Flow + PKCE; SAML cùng SSO khác giao thức.
> 6. Kiến trúc — chọn theo threat model, rồi checklist khi review PR.
>
> Nhắc: có 7 demo gắn nút trên slide. Không cần nhớ hết chi tiết; cần biết lớp nào hỏng khi gặp ticket "bug login".

## Slide 3 — Ba ticket, cùng nhãn "bug login"

*Mở đầu · 03–07 · 4 phút*

**Nội dung hiển thị**

- Không phải ba lỗi cùng một chỗ.
- Cùng triệu chứng "login hỏng" — khác lớp nguyên nhân.
- Câu hỏi cho buổi này: hỏng ở AuthN, AuthZ hay validation?

**Speaker notes**

> Dẫn dắt trước khi chỉ ba thẻ: "Giả sử backlog DevHub tuần này có ba ticket, cả ba đều được gắn nhãn bug login. Product muốn một hotfix. Trước khi sửa, ta phải hỏi: đây có thật là lỗi login không?"
>
> Đọc từng ticket như báo cáo từ user / QA (không đưa đáp án ngay):
> 1. "Tôi đã bấm Logout rồi mà API vẫn nhận request của tôi." — cookie biến mất trên browser, nhưng trạng thái phía server còn sống?
> 2. "Tài khoản member vào được API chỉ dành cho admin." — đã biết người dùng là ai, nhưng quyền sai?
> 3. "Mở JWT ra thấy role: admin, vậy là admin rồi." — đọc được payload có nghĩa token đáng tin?
>
> Câu hỏi tương tác (30 giây): mỗi ticket thuộc lớp nào — AuthN / lifecycle, AuthZ, hay token validation?
>
> Gợi ý đáp án (để dành cho các slide sau, chưa nói chi tiết ngay):
> 1 → lifecycle / revocation (session logout, refresh revoke).
> 2 → authorization phía server (slide AuthN≠AuthZ, Demo 1).
> 3 → token validation: decode ≠ verify (slide JWT).
>
> Câu chốt: "Cả buổi sẽ trang bị cách phân lớp những ticket kiểu này, thay vì vá lung tung ở nút Login."

## Slide 4 — Authentication ≠ Authorization

*AuthN & AuthZ · 07–10 · 3 phút*

**Nội dung hiển thị**

- AuthN — Who are you?
- AuthZ — What can you do?
- Login thành công không đồng nghĩa có mọi quyền.

**Speaker notes**

> Liên hệ ticket 02 trên slide trước: member gọi được API admin — đó là AuthZ, không phải "login sai".
>
> Lời dẫn: "Authentication xác định danh tính. Authorization quyết định danh tính đó có được thực hiện hành động đang yêu cầu hay không. Hai bước này cần được kiểm soát độc lập."
>
> Đi theo sơ đồ: request đi vào → bước AuthN kiểm tra credential (password, session cookie, bearer token) → nếu ổn ta có một principal (id, role) → bước AuthZ so principal với policy của hành động (ví dụ: chỉ admin được gọi /api/admin).
>
> Nhấn mạnh: AuthZ phải chạy ở mọi request, ở backend, dựa trên dữ liệu server tin được (bản ghi user/role phía server), không phải dữ liệu client gửi lên.

## Slide 5 — 401 hay 403?

*AuthN & AuthZ · 10–14 · 4 phút*

**Nội dung hiển thị**

- `401` — credential thiếu hoặc không hợp lệ.
- `403` — đã xác thực nhưng không đủ quyền trong ngữ cảnh hiện tại.
- Backend phải enforce quyền.

**Demo 1:** nút `Mở API Demo ↗` → http://localhost:5173/demo/authz

**Speaker notes**

> Demo 1 — API Authorization (khoảng 3 phút). Mở nút "Mở API Demo ↗".
>
> Kịch bản (trang có sẵn 6 bước, cho khán giả đoán status code trước khi bấm Gửi):
> 1. Gọi GET /api/me khi chưa login → kỳ vọng 401 (response có header WWW-Authenticate).
> 2. Login member@devhub.local → 201.
> 3. GET /api/me → 200.
> 4. GET /api/admin bằng member → 403.
> 5. Login admin@devhub.local → 201.
> 6. GET /api/admin bằng admin → 200.
> Phía dưới có thêm lưới 4 người gọi bằng Bearer token (không token / hết hạn / member / admin) → 401, 401, 403, 200.
>
> Status code do backend thật trả về (ApiController + PrincipalService), không giả lập ở frontend.
>
> Lời kết: "Ẩn nút ở frontend không phải authorization. API phải tự kiểm tra quyền."
>
> Nếu demo lỗi: dùng sơ đồ quyết định trên slide và nói rõ là đang giải thích bằng sơ đồ.

## Slide 6 — Password không phải dữ liệu để đọc lại

*Password · 14–17 · 3 phút*

**Nội dung hiển thị**

- Không lưu plaintext.
- Hashing khác encryption.
- Verify thay vì giải mã.
- Dùng password hashing chuyên dụng (Argon2id, bcrypt, scrypt).

**Speaker notes**

> Lời dẫn: "Ứng dụng không cần lấy lại password gốc từ database. Nó chỉ cần xác minh password người dùng nhập có khớp với hash được lưu hay không."
>
> Hashing là một chiều; encryption là hai chiều (có key thì giải mã được). Nếu server giải mã được password thì attacker lấy được key cũng giải mã được.
>
> Lưu trữ: chuỗi hash bcrypt tự chứa thuật toán, cost và salt (ví dụ $2a$10$<salt 22 ký tự><hash>). Khi verify, thư viện đọc salt + cost từ chuỗi đã lưu, hash lại password vừa nhập và so sánh constant-time.
>
> Không dùng MD5/SHA-1/SHA-256 "trần" cho password: chúng được thiết kế để nhanh, mà nhanh là điều attacker muốn.

## Slide 7 — Salt, brute-force và credential stuffing

*Password · 17–24 · 4 phút*

**Nội dung hiển thị**

- Salt ngẫu nhiên cho mỗi hash — không phải secret.
- Hash chậm làm tăng chi phí đoán offline.
- Rate limit, monitoring và MFA bổ sung cho hashing.

**Demo 2:** nút `Mở Password Demo ↗` → http://localhost:5173/demo/password

**Speaker notes**

> Demo 2 — Password Hashing (khoảng 3 phút). Mở nút "Mở Password Demo ↗".
>
> Kịch bản:
> 1. Bấm "Hash password" rồi "Hash lại lần nữa" với cùng một password → hai chuỗi khác nhau; phần salt được tô màu.
> 2. So sánh hai hash: khác nhau vì salt khác nhau.
> 3. "Verify password đúng" → match: true.
> 4. "Verify password sai" → match: false.
> (Nếu còn thời gian: phần "Cùng năm user, hai cách lưu trữ" cho thấy bảng SHA-256 không salt bị crack ngay bằng wordlist trong khi bcrypt chậm hơn hẳn.)
>
> Lời kết: "Salt không phải secret. Mục tiêu là tránh việc password giống nhau luôn cho cùng một hash và tăng khả năng chống các phương pháp đoán password offline."
>
> Phân biệt: brute-force/dictionary offline (sau khi lộ DB) → hash chậm + salt giúp. Credential stuffing online (dùng password lộ từ site khác) → hash không giúp; cần rate limit, phát hiện bất thường, MFA, kiểm tra password đã lộ.
>
> Lưu ý: lab chưa có rate limiting — nói rõ đây là giới hạn của demo.

## Slide 8 — Session-based Authentication

*Session · 24–27 · 3 phút*

**Nội dung hiển thị**

- Server xác minh credential.
- Server tạo session (trạng thái nằm ở server).
- Browser giữ session ID qua cookie.
- Server tra cứu session ở request tiếp theo.

**Speaker notes**

> Lời dẫn: "Cookie không nhất thiết chứa thông tin người dùng. Với session-based authentication, cookie thường mang một session identifier để server tra cứu trạng thái phiên."
>
> Đi theo sequence:
> 1. POST /session/login với email + password.
> 2. Server verify password, tạo (regenerate) session trong store.
> 3. Response: Set-Cookie: devhub.sid=<id>; HttpOnly; SameSite=Lax; Path=/.
> 4. Request sau: browser tự gắn Cookie: devhub.sid=<id>.
> 5. Server tra cứu id trong store → biết là ai → 200.
>
> Ưu điểm: server kiểm soát hoàn toàn (logout, force logout, đổi quyền có hiệu lực ngay), cookie nhỏ. Trade-off: cần session store dùng chung khi scale ngang; cookie gắn với domain; vì browser tự gửi cookie nên phải tính đến CSRF.

## Slide 9 — Cookie là credential

*Session · 27–33 · 4 phút*

**Nội dung hiển thị**

- `HttpOnly` — JavaScript không đọc được.
- `Secure` — chỉ gửi qua HTTPS.
- `SameSite` — hạn chế gửi kèm request cross-site.
- `Path`, `Domain`, `Max-Age` — phạm vi và thời hạn.

**Demo 3:** nút `Mở Session Demo ↗` → http://localhost:5173/demo/session

**Speaker notes**

> Demo 3 — Session và Cookie (khoảng 3 phút). Mở nút "Mở Session Demo ↗". Chuẩn bị sẵn DevTools → Application → Cookies.
>
> Kịch bản:
> 1. Login (member@devhub.local).
> 2. Quan sát Set-Cookie trong Inspector của lab hoặc tab Network.
> 3. Gọi /api/me → 200.
> 4. Mở DevTools, chỉ ra các flags của devhub.sid. Bấm "Đọc bằng document.cookie" → không thấy giá trị vì HttpOnly.
> (Tuỳ chọn: "Truy cập ẩn danh trước" rồi login để thấy ID được regenerate → chống session fixation.)
>
> Lời dẫn: "Không có một bộ cookie flags đúng cho mọi môi trường. Cấu hình phải phù hợp với HTTPS, domain, frontend/backend deployment và cách ứng dụng sử dụng cookie."
>
> Lưu ý lab: chạy http localhost nên Secure tắt (bật bằng SESSION_COOKIE_SECURE=true hoặc NODE_ENV=production). Lab không hiển thị đầy đủ session ID.

## Slide 10 — Session lifecycle và fixation

*Session · 33–38 · 4 phút*

**Nội dung hiển thị**

- Login → create/regenerate → use → expire/revoke.
- Regenerate session ID sau khi xác thực.
- Logout cần invalidate session phía server.
- Xoá cookie không nhất thiết revoke session.

**Demo 4:** nút `Mở Logout Demo ↗` → http://localhost:5173/demo/session/logout-lab

**Speaker notes**

> Liên hệ ticket 01 trên slide sự cố: "đã logout mà request vẫn chạy" — Demo này trả lời trực tiếp.
>
> Demo 4 — Logout và Revocation (khoảng 3 phút). Mở nút "Mở Logout Demo ↗".
>
> Trang có hai cột chạy song song:
> - Cột trái "Chỉ xoá cookie" (/lab/session/forget-cookie): server gửi cookie hết hạn nhưng giữ session trong store.
> - Cột phải "Huỷ session phía server" (/session/logout): req.session.destroy() rồi mới xoá cookie.
>
> Kịch bản (mỗi cột):
> 1. Login và gọi /api/me → 200.
> 2. Logout.
> 3. Gọi /api/me lần nữa từ browser → 401 ở cả hai cột.
> 4. Bấm "Replay ID đã sao chép từ client khác": cột trái vẫn đăng nhập được (session còn sống), cột phải bị từ chối.
> 5. Giải thích: cookie là thứ ở browser; session là thứ ở server. Logout thật phải làm vô hiệu trạng thái ở server.
>
> Session fixation: attacker cài sẵn một session ID đã biết, chờ nạn nhân login. Cách sửa: regenerate ID khi login và khi đổi quyền (lab đã làm ở /session/login).

## Slide 11 — CSRF và XSS không giống nhau

*Session · 38–44 · 4 phút*

**Nội dung hiển thị**

- CSRF: browser gửi credential ngoài ý muốn.
- XSS: script độc hại chạy trong origin ứng dụng.
- `HttpOnly` không ngăn mọi tác động của XSS.
- `SameSite` không thay thế toàn bộ CSRF protection.

**Speaker notes**

> Lời dẫn: "CSRF và XSS có thể cùng ảnh hưởng đến một ứng dụng dùng cookie, nhưng nguyên nhân và cách phòng vệ khác nhau. Không nên coi một cookie flag là giải pháp bảo mật toàn diện."
>
> CSRF (trái): user đang login DevHub, mở trang evil.example. Trang đó gửi form POST tới DevHub; browser tự gắn cookie → request chạy dưới danh nghĩa user. Attacker không đọc được cookie hay response. Phòng vệ: SameSite=Lax/Strict, CSRF token, kiểm tra Origin/Referer, không dùng GET cho thao tác thay đổi dữ liệu.
>
> XSS (phải): script của attacker chạy trong chính origin DevHub. HttpOnly chỉ chặn việc đọc cookie; script vẫn gọi API như user (cookie vẫn được gửi kèm). Phòng vệ: output encoding, không dùng innerHTML với dữ liệu người dùng, Content-Security-Policy, sanitize.
>
> Không demo khai thác — dùng sơ đồ để giữ nhịp.

## Slide 12 — JWT: ba phần, ba ý nghĩa

*JWT · 44–47 · 3 phút*

**Nội dung hiển thị**

- `header.payload.signature`
- Payload chỉ được encode (Base64URL), ai cũng đọc được.
- Decode không đồng nghĩa verify.
- Signature giúp phát hiện token bị sửa — khi được kiểm tra đúng.

**Speaker notes**

> Liên hệ ticket 03: "JWT có role admin" — đọc được payload chưa chứng minh token hợp lệ.
>
> Lời dẫn: "JWT không tự động bí mật chỉ vì có chữ ký. Nếu chỉ là signed JWT, payload vẫn có thể đọc được."
>
> Header: thuật toán (alg) và loại token. Payload: claims (sub, role, exp...). Signature: HMAC hoặc chữ ký số trên "header.payload" bằng key của issuer.
>
> Hệ quả: không đặt dữ liệu nhạy cảm vào payload. Đọc được payload (decode) chỉ là bước parse; tin được payload thì phải verify chữ ký + claims bằng key và cấu hình phía server.
>
> Liên hệ token-based flow: login → server ký token → client tự lưu và gửi qua header Authorization: Bearer <token> → server verify ở mỗi request mà không cần tra cứu session.

## Slide 13 — JWT claims cần validate

*JWT · 47–50 · 3 phút*

**Nội dung hiển thị**

- `sub` — Subject: token nói về ai.
- `iss` — Issuer: ai phát hành.
- `aud` — Audience: token dành cho API nào.
- `exp` — Expiration.
- `nbf`, `iat`, `jti` — tuỳ use case.

**Speaker notes**

> Lời dẫn: "Chữ ký hợp lệ chưa chắc đã đủ. Token có thể được phát hành hợp lệ nhưng dành cho một API khác, vì vậy audience cũng phải được kiểm tra."
>
> Trong lab: iss = devhub-auth-lab, aud = devhub-api, thuật toán chỉ cho phép HS256, exp bắt buộc. Có fixture cho từng lỗi: hết hạn, sai issuer, sai audience, chưa có hiệu lực (nbf), HS384 (ngoài allowlist), alg: none.
>
> jti dùng khi cần nhận diện/thu hồi từng token. iat cho biết thời điểm phát hành (ví dụ để từ chối token phát hành trước lần đổi password).

## Slide 14 — Đừng tin payload chỉ vì đọc được

*JWT · 50–56 · 4 phút*

**Nội dung hiển thị**

- Sửa payload không làm token trở nên hợp lệ.
- Verify signature và claims.
- Allowlist thuật toán.
- Không chấp nhận `alg: none` cho token cần chữ ký.

**Demo 5:** nút `Mở JWT Demo ↗` → http://localhost:5173/demo/jwt

**Speaker notes**

> Demo 5 — JWT Tampering (khoảng 4 phút). Mở nút "Mở JWT Demo ↗".
>
> Kịch bản:
> 1. "Cấp token member" → decode: thấy email, role: member, iss, aud, exp.
> 2. "Sửa payload" thành role: admin (token lab local, không phải token thật).
> 3. Gửi token đã sửa tới /api/me và /api/admin → 401 cả hai (chữ ký không khớp).
> 4. Cấp lại token member hợp lệ → /api/admin → 403 (đã xác thực, không đủ quyền).
> 5. (Tuỳ chọn) So sánh "Verifier chặt" (jwt.verify + allowlist + claims) với "Verifier ngây thơ" (jwt.decode rồi tin luôn) trên fixture alg: none.
>
> Lời kết: "Backend không được lấy role từ payload chưa được xác minh."
>
> Lưu ý: ô editor hiển thị token demo ngắn hạn do lab ký bằng secret local — không bao giờ dán token thật vào đây. Signing secret không bao giờ rời backend.

## Slide 15 — Access token và refresh token

*JWT · 56–61 · 4 phút*

**Nội dung hiển thị**

- Access token: gọi API, thời hạn ngắn.
- Refresh token: chỉ dùng để xin token mới.
- Rotation và revocation.
- Token cũ quay lại → xử lý theo policy (thu hồi cả family).

**Demo 6:** nút `Mở Token Lifecycle Demo ↗` → http://localhost:5173/demo/tokens

**Speaker notes**

> Demo 6 — Token Lifecycle (khoảng 4 phút). Mở nút "Mở Token Lifecycle Demo ↗". Trang ghi rõ: LUỒNG THẬT — rotation và phát hiện reuse chạy ở server, store in-memory, không dành cho production.
>
> Kịch bản (các nút ① → ⑥):
> 1. Login: nhận access token (JWT, mặc định 120 giây) và refresh token (opaque).
> 2. ① Gọi /api/me bằng access token → 200.
>    ② Dùng refresh token như access token → 401 (sai loại token).
> 3. ③ Refresh → access + refresh mới; refresh cũ bị đánh dấu "rotated".
> 4. ④ Dùng lại refresh token cũ → 401 và server thu hồi cả family (reuse-detected).
> 5. ⑤ Logout/thu hồi → 204; ⑥ refresh bằng token hiện tại → 401.
>
> Bật "Access token ngắn hạn (20 giây)" nếu muốn xem access token hết hạn trong lúc nói.
>
> Điểm cần nhấn: access token đã phát hành vẫn hợp lệ đến exp kể cả sau logout — đó là lý do access token phải ngắn hạn. Refresh token lưu dạng hash (SHA-256) phía server, không lưu plaintext.

## Slide 16 — Session hay JWT?

*Kiến trúc · 61–64 · 3 phút*

**Nội dung hiển thị**

- Session: server kiểm soát lifecycle.
- JWT: thuận tiện cho một số kiến trúc phân tán.
- Revoke, scale và token storage có trade-off.
- Không có lựa chọn tốt nhất cho mọi hệ thống.

**Speaker notes**

> Câu hỏi tương tác: "Nếu DevHub là web app nội bộ với yêu cầu logout có hiệu lực rõ ràng, bạn sẽ chọn session hay JWT? Vì sao?"
>
> Đọc bảng theo hàng:
> - State: session giữ trạng thái ở server; JWT tự chứa claims.
> - Revoke: session xoá là xong; JWT cần thời hạn ngắn + denylist/rotation.
> - Scale: session cần store dùng chung (Redis...); JWT verify được ở bất kỳ đâu có key.
> - Rủi ro browser: cookie → CSRF; token trong JS storage → lộ khi XSS.
>
> Không đưa đáp án tuyệt đối; hướng người nghe về yêu cầu và khả năng vận hành.

## Slide 17 — OAuth 2.0 không đồng nghĩa Login

*OAuth / OIDC / SAML · 64–67 · 3 phút*

**Nội dung hiển thị**

- OAuth 2.0 = ủy quyền: cho app A gọi dữ liệu của bạn ở app B.
- Ví dụ: DevHub đọc Google Calendar — không đưa mật khẩu Google.
- Kết quả: access token để gọi API — không trả lời “ai vừa login”.
- Muốn login chuẩn → OIDC (xây trên OAuth, slide sau).

**Speaker notes**

> Lời dẫn: "OAuth 2.0 là ủy quyền truy cập, không phải màn hình login. Người mới hay lẫn hai việc này."
>
> Định nghĩa ngay khi nói:
> - OAuth 2.0: framework cho phép client nhận quyền gọi resource trong phạm vi (scope) được cấp — ví dụ cho app lịch đọc Google Calendar mà không đưa mật khẩu Google cho app đó.
> - Authorization Server trên sơ đồ thường cũng là IdP (Identity Provider): nơi xác thực user và phát hành token.
>
> Bốn vai trò trên sơ đồ:
> - Resource Owner: người dùng sở hữu dữ liệu.
> - Client: ứng dụng muốn truy cập thay mặt người dùng (DevHub).
> - Authorization Server / IdP: xác thực user, hỏi consent, phát hành token.
> - Resource Server: API giữ dữ liệu, chấp nhận access token.
>
> Luồng rút gọn: Client xin ủy quyền → user đồng ý → Client đổi grant lấy access token → gọi API bằng access token.
>
> Chốt: access token của OAuth không nói cho client biết "ai vừa login" theo chuẩn. Việc đó thuộc OIDC.

## Slide 18 — ID token ≠ Access token

*OAuth / OIDC / SAML · 67–70 · 3 phút*

**Nội dung hiển thị**

- OIDC = OpenID Connect: lớp danh tính trên OAuth 2.0.
- ID token: chứng minh AI đã login — dành cho client.
- Access token: chứng minh được GỌI API nào — dành cho API.
- Đừng gửi ID token tới API như Bearer token.

**Speaker notes**

> Định nghĩa khi mở slide: OIDC (OpenID Connect) xây trên OAuth 2.0 và thêm ID token để client biết user là ai — đây mới là “login qua IdP” theo chuẩn.
>
> ID token: JWT có aud = client_id, chứa sub, nonce, auth_time... Client dùng để biết ai đã đăng nhập. Không gửi ID token tới API như access token.
>
> Access token: aud là API (resource server), chứa scope. API validate chữ ký, iss, aud, exp và scope trước khi phục vụ.
>
> Lỗi thường gặp: API chấp nhận ID token làm bearer token; client đọc access token để lấy thông tin user (access token có thể là opaque).

## Slide 19 — Authorization Code Flow + PKCE

*OAuth / OIDC / SAML · 70–73 · 3 phút*

**Nội dung hiển thị**

- `state`: gắn callback với đúng lần bấm login này.
- `nonce`: gắn ID token với đúng lần login OIDC.
- PKCE (`code_verifier` / `challenge`): code bị đánh cắp cũng vô dụng.
- Redirect URI và token phải khớp cấu hình đã đăng ký.

**Speaker notes**

> Lời dẫn: "Đây là flow OIDC phổ biến cho web/mobile. Không nên tự thiết kế lại nếu có thư viện maintained — hiểu flow và verify đúng là đủ."
>
> IdP ở đây = Identity Provider: nơi user thực sự gõ mật khẩu / MFA. DevHub chỉ nhận kết quả sau callback.
>
> Các bước:
> 1. Client sinh code_verifier ngẫu nhiên, code_challenge = BASE64URL(SHA256(verifier)), state, nonce; lưu phía server.
> 2. Redirect browser tới /authorize với client_id, redirect_uri, scope=openid..., state, nonce, code_challenge, method=S256.
> 3. Người dùng xác thực tại IdP.
> 4. IdP redirect về redirect_uri với code + state. Client so state với giá trị đã lưu.
> 5. Client đổi code + code_verifier lấy token ở /token. IdP kiểm tra SHA256(verifier) == challenge.
> 6. Validate ID token: chữ ký (JWKS), iss, aud = client_id, exp, nonce.
>
> PKCE chặn việc dùng code bị đánh cắp; state chặn CSRF trên callback; nonce chặn replay ID token.

## Slide 20 — OIDC Demo — Login qua Identity Provider

*OAuth / OIDC / SAML · 73–77 · 4 phút*

**Nội dung hiển thị**

- IdP = nơi user đăng nhập (Google, Okta…). DevHub không giữ mật khẩu đó.
- Callback mang code + state về DevHub.
- DevHub kiểm tra đủ rồi mới tin lần login.
- DevHub tạo session riêng — không dùng token IdP để gọi API nội bộ.

**Demo 7:** nút `Mở OIDC Demo ↗` → http://localhost:5173/demo/oidc

**Speaker notes**

> Demo 7 — OIDC (khoảng 3–4 phút). Nhắc nhanh: đây là login qua IdP — user xác thực ở IdP, DevHub tin kết quả sau khi verify.
>
> Mở nút "Mở OIDC Demo ↗". Nhìn banner trước khi nói: chế độ do .env của API quyết định.
>
> Nếu banner là "LIVE OIDC — REAL IDENTITY PROVIDER" (đã cấu hình IdP test):
> 1. Chỉ cấu hình: issuer, client_id, redirect_uri. Client secret không bao giờ hiện trên trang.
> 2. Bấm "Đăng nhập bằng Identity Provider". Chỉ URL: state, nonce, code_challenge, code_challenge_method=S256.
> 3. Đăng nhập bằng tài khoản test, quay về DevHub.
> 4. Đọc danh sách "DevHub đã kiểm tra": state, PKCE, chữ ký qua JWKS, iss, aud, exp, nonce.
> 5. "Gọi /api/me" → 200, user oidc:<sub>. Logout khỏi DevHub → /api/me 401; IdP vẫn còn session, nên có link logout cả ở IdP.
>
> Nếu banner là "FLOW WALKTHROUGH — NO REAL LOGIN" (chưa cấu hình, hoặc IdP không truy cập được): nói rõ không ai thực sự đăng nhập ở đây.
> 1. Đi qua 9 bước trên sequence diagram (Tiếp →). Bước 1: code_verifier, code_challenge (SHA-256 thật bằng crypto.subtle), state, nonce.
> 2. Bước 5: bật "Giả lập callback có state không khớp" → callback bị từ chối.
> 3. Kết thúc ở phần "ID token ≠ Access token": so sánh aud của hai payload mẫu.
>
> Ở walkthrough, không để người xem hiểu nhầm là đã login thật: request/response IdP trên trang là mẫu.

## Slide 21 — SAML — Assertion XML vs ID token

*OAuth / OIDC / SAML · 77–80 · 3 phút*

**Nội dung hiển thị**

- Assertion = “giấy IdP xác nhận: user X đã login, dành cho app Y”.
- Cùng việc với ID token của OIDC — khác “bao bì”: XML đã ký vs JWT.
- SAML: browser POST XML về ACS. OIDC: đổi code lấy JWT.
- Sau khi tin chứng từ → app tạo session riêng (giống nhau).
- IdP đã cấu hình SAML → dùng SAML; app mới → ưu tiên OIDC.

**Speaker notes**

> Lời dẫn — bắt đầu bằng Assertion, đừng nhảy thẳng vào acronym:
>
> Assertion là gì?
> - Một tài liệu XML do IdP ký số, nội dung cốt lõi: “User X đã xác thực lúc T, dành cho ứng dụng Y, còn hạn đến …”
> - Ví dụ gần đời thường: giấy xác nhận từ công ty HR gửi sang hệ thống khác — không phải mật khẩu, mà là chứng từ đã ký.
>
> Assertion ≈ ID token của OIDC (cùng vai trò: chứng minh danh tính sau login):
> | | SAML Assertion | OIDC ID token |
> |---|---|---|
> | Định dạng | XML + XML Signature | JWT (JSON Base64 + chữ ký) |
> | Ai đọc | Service Provider (SP / DevHub) | OIDC client (DevHub) |
> | Mang gì | Subject, Audience, điều kiện thời hạn | sub, aud, exp, nonce… |
> | Đường về app | Browser POST SAML Response tới ACS URL | Redirect?code → client đổi lấy token ở /token |
> | Sau khi tin | Tạo session cục bộ của app | Tạo session cục bộ của app |
>
> SSO = mục tiêu (login một lần, nhiều app). SAML và OIDC = hai cách làm. Không phải “XML cũ / JWT mới nên JWT đúng hơn”.
>
> Luồng SAML SP-initiated (đi sơ đồ):
> 1. User mở SP → SP redirect kèm AuthnRequest tới IdP.
> 2. User xác thực tại IdP.
> 3. IdP đưa Assertion (trong SAML Response) về ACS của SP qua browser.
> 4. SP verify chữ ký / Audience / Destination / NotOnOrAfter / InResponseTo → tạo session riêng.
>
> Rủi ro: verify sai phần tử XML (signature wrapping), sai Audience, hết hạn. Dùng thư viện SAML được maintain.
>
> Câu hỏi (30 giây): khách bắt buộc SAML vì IdP chỉ có SAML — có nên ép OIDC? Thường không: compatibility quan trọng hơn preference.

## Slide 22 — Chọn kiến trúc theo threat model

*Kiến trúc · 80–83 · 3 phút*

**Nội dung hiển thị**

- Client là browser, mobile hay service-to-service?
- Có cần revoke tức thời không?
- Có dùng SSO/IdP không?
- Ai quản lý key, session store và token lifecycle?
- XSS/CSRF được xử lý ra sao?

**Speaker notes**

> Tương tác: yêu cầu người nghe chọn session hoặc JWT cho DevHub và đưa ra ít nhất hai lý do (1 phút thảo luận theo cặp).
>
> Gợi ý hướng phân tích:
> - Browser-only, cùng site → session cookie thường đơn giản và revoke tốt.
> - Mobile / nhiều API / service-to-service → access token ngắn hạn + refresh rotation, hoặc OIDC.
> - Có IdP doanh nghiệp → OIDC/SAML cho login, sau đó vẫn cần session hoặc token cho app.
> - Ai xoay key? Ai giám sát reuse? Log thế nào mà không lộ credential?

## Slide 23 — Case study DevHub

*Kiến trúc · 83–85 · 2 phút*

**Nội dung hiển thị**

- Web app nội bộ.
- NestJS API.
- Role `member` và `admin`.
- Logout phải có hiệu lực.
- Cần audit và vận hành rõ ràng.

**Speaker notes**

> Câu hỏi: "Bạn sẽ lựa chọn kiến trúc nào? Trade-off nào quan trọng nhất?"
>
> Để bảng dấu ? trên slide. Cho khán giả thảo luận 1–2 phút (theo cặp hoặc cả phòng). Không đưa đáp án ngay.
>
> Khi thảo luận xong: click sang slide tiếp theo để hiện gợi ý đáp án.

## Slide 24 — Case study — gợi ý đáp án

*Kiến trúc · 85–86 · 1 phút*

**Nội dung hiển thị**

- Logout ngay → Session hoặc OIDC + session.
- JWT + refresh: revoke phức tạp hơn.
- Web app nội bộ NestJS → Session thường đủ.
- Có IdP công ty → OIDC login, rồi session DevHub.
- Không có đáp án tuyệt đối — phụ thuộc threat model.

**Speaker notes**

> Đây là gợi ý sau thảo luận, không phải đáp án duy nhất.
>
> Hướng hợp lý cho DevHub: SSO qua OIDC với IdP công ty → DevHub tạo session server-side (cookie HttpOnly, Secure, SameSite) → authorization theo role ở mọi endpoint → logout huỷ session + (tuỳ chọn) RP-initiated logout ở IdP → audit log không chứa credential.
>
> Nhấn: bảng so sánh giúp chọn theo yêu cầu (logout, vận hành), không theo "cái nào hiện đại hơn".

## Slide 25 — Authentication Review Checklist

*Tổng kết · 86–88 · 2 phút*

**Nội dung hiển thị**

- Password hashing và rate limiting.
- Session/cookie lifecycle.
- JWT signature và claims.
- Access/refresh token lifecycle.
- OIDC callback, state, nonce và PKCE.
- Server-side authorization · Tests và logging an toàn.

**Speaker notes**

> Lời dẫn: "Đây là checklist có thể áp dụng ngay khi review một PR authentication."
>
> Câu hỏi khi review:
> - Password: thuật toán chuyên dụng? cost hợp lý? có rate limit/lockout mềm?
> - Session: regenerate khi login? destroy khi logout? cookie flags theo môi trường?
> - JWT: verify với allowlist thuật toán? kiểm tra iss/aud/exp? không lấy quyền từ payload chưa verify?
> - Refresh: rotation? phát hiện reuse? lưu dạng hash? thu hồi khi logout?
> - OIDC: state, nonce, PKCE, redirect URI chính xác?
> - Authorization ở backend cho mọi endpoint? Có test 401/403?
> - Log có che password, cookie, Authorization header, token không?
>
> Bản đầy đủ: docs/01-authentication-core.md, mục Security Checklist.

## Slide 26 — Exit Ticket

*Tổng kết · 88–89 · 1 phút*

**Nội dung hiển thị**

- Member đã login nhưng gọi API admin thì thường nhận status code nào?
- Decode JWT thành công có chứng minh token hợp lệ không?
- Vì sao xoá cookie chưa chắc đã logout hoàn toàn?

**Speaker notes**

> Cho khán giả khoảng 1 phút trả lời (giơ tay hoặc chat). Ba câu này quay lại đúng ba ticket mở đầu.
>
> Đáp án mong đợi:
> 1. 403, nếu credential hợp lệ nhưng không đủ quyền.
> 2. Không. Decode chỉ là đọc Base64URL; hợp lệ cần verify chữ ký và claims.
> 3. Vì session hoặc refresh token phía server có thể còn hiệu lực (như cột "Chỉ xoá cookie" trong Demo 4).

## Slide 27 — Secure login is a lifecycle, not a button.

*Tổng kết · 89–90 · 1 phút*

**Nội dung hiển thị**

- Verify đúng.
- Store an toàn.
- Gửi đúng cách.
- Validate đủ.
- Revoke có chủ đích.

**Speaker notes**

> Lời kết: "Authentication không kết thúc ở thời điểm login thành công. Chúng ta phải kiểm soát toàn bộ vòng đời của credential."
>
> Quay lại câu mở đầu: ba ticket "bug login" thực ra nằm ở ba lớp khác nhau — giờ khán giả đã có khung để phân lớp trước khi vá.
>
> Tài liệu và lab: thư mục docs/ và devhub-auth-lab/ trong repository. Lab chỉ chạy local, dùng tài khoản giả lập.
