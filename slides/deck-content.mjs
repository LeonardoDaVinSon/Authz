// Single source of truth for the deck and for docs/02-slide-content.md.
// Text wrapped in `backticks` is rendered in a monospace font.

export const DECK = {
  title: 'Break the Login — Authentication Core',
  subtitle: 'Từ login đến credential lifecycle',
  audience: 'DevHub · Fullstack Technical Sharing',
  durationMinutes: 90,
  series: {
    session1: { label: 'Buổi 1 · Authentication', speaker: 'Đào Vĩnh Sơn' },
    session2: { label: 'Buổi 2 · Authorization', speaker: 'Nguyễn Ngọc Nhiên' },
  },
};

/** Demo routes served by the lab frontend (devhub-auth-lab/frontend/src/routes.ts). */
export const DEMO_LINKS = {
  authz: { label: 'Mở API Demo ↗', route: '/demo/authz', demo: 1 },
  password: { label: 'Mở Password Demo ↗', route: '/demo/password', demo: 2 },
  session: { label: 'Mở Session Demo ↗', route: '/demo/session', demo: 3 },
  logout: { label: 'Mở Logout Demo ↗', route: '/demo/session/logout-lab', demo: 4 },
  jwt: { label: 'Mở JWT Demo ↗', route: '/demo/jwt', demo: 5 },
  tokens: { label: 'Mở Token Lifecycle Demo ↗', route: '/demo/tokens', demo: 6 },
  oidc: { label: 'Mở OIDC Demo ↗', route: '/demo/oidc', demo: 7 },
};

/** Main parts of the session. The agenda slide and every part intro slide read from here. */
export const PARTS = [
  { no: '01', title: 'AuthN ≠ AuthZ', detail: '401 / 403 · quyền phía server', color: 'purple' },
  { no: '02', title: 'Password', detail: 'Hash · salt · stuffing', color: 'orange' },
  { no: '03', title: 'Session & cookie', detail: 'Lifecycle · logout · CSRF/XSS', color: 'green' },
  { no: '04', title: 'JWT & tokens', detail: 'Decode ≠ verify · refresh', color: 'blue' },
  { no: '05', title: 'OAuth / OIDC', detail: 'Code Flow + PKCE · SAML', color: 'purple' },
  { no: '06', title: 'Lựa chọn', detail: 'Threat model · checklist', color: 'orange' },
];

export const RECAP = [
  { line: '`401` vs `403`. Quyền ở server.' },
  { line: 'Hash, không encrypt.' },
  { line: 'Cookie ≠ session.' },
  { line: 'Decode ≠ verify.' },
  { line: 'OAuth ≠ login.' },
  { line: 'Chọn theo threat model.' },
];

const CONTENT = [
  {
    minutes: 1, section: 'Mở đầu',
    title: 'Break the Login',
    bullets: [
      'Buổi 1 · Authentication — Đào Vĩnh Sơn',
      'Buổi 2 · Authorization — Nguyễn Ngọc Nhiên',
      'Hôm nay: credential lifecycle — tạo · lưu · gửi · verify · thu hồi',
    ],
    notes: `Lời dẫn: "Đây là buổi 1 trong series Auth của DevHub — Authentication, mình là Đào Vĩnh Sơn. Buổi 2 về Authorization sẽ do Nguyễn Ngọc Nhiên trình bày."

Câu chính: "Hôm nay không chỉ xem login thành công — ta theo dõi credential từ lúc tạo, lưu, gửi, xác minh đến khi hết hạn hoặc bị thu hồi."

Demo: chưa mở. Trước giờ đã mở http://localhost:5173/demo và bấm Reset demo.`,
  },
  {
    minutes: 2, section: 'Mở đầu',
    title: 'Nội dung chính',
    bullets: [
      'AuthN ≠ AuthZ · `401` / `403`',
      'Password hashing và salt',
      'Session, cookie, logout',
      'JWT · access / refresh token',
      'OAuth 2.0 · OIDC · SAML',
      'Lựa chọn · checklist',
    ],
    diagram: 'agenda',
    notes: `Lời dẫn: "Buổi này đi theo vòng đời credential, không phải liệt kê mọi giao thức. Sáu phần chính trên slide — mỗi phần có ít nhất một điểm cần nhớ và hầu hết có demo chạy thật trên lab."

Đi nhanh từng ô (khoảng 15–20 giây/ô):
1. AuthN / AuthZ — phân biệt "bạn là ai" và "bạn được làm gì", đọc đúng 401 với 403.
2. Password — hash chuyên dụng, salt, và vì sao hashing không thay rate limit.
3. Session — cookie là credential; logout phải huỷ phía server.
4. JWT — decode ≠ verify; access ngắn hạn, refresh phải rotate.
5. OAuth / OIDC / SAML — ủy quyền ≠ login; Code Flow + PKCE; SAML cùng SSO khác giao thức.
6. Lựa chọn — chọn theo threat model, rồi checklist khi review PR.

Nhắc: có 7 demo gắn nút trên slide. Mỗi phần mở đầu bằng một slide giới thiệu ngắn. Không cần nhớ hết chi tiết; cần biết lớp nào hỏng khi gặp một bug login.`,
  },
  {
    part: 1, minutes: 0.5, section: 'AuthN & AuthZ',
    title: 'AuthN ≠ AuthZ',
    question: 'Server đã biết bạn là ai chưa — và bạn được làm gì?',
    bullets: [],
    notes: `Chuyển phần: "Phần 1 — trước khi nói tới password hay token, cần tách rõ hai câu hỏi server phải trả lời ở mỗi request: bạn là ai, và bạn được làm gì."

Không giải thích chi tiết ở đây; đọc câu hỏi rồi sang slide tiếp theo. Demo 1 ở cuối phần này.`,
  },
  {
    minutes: 3, section: 'AuthN & AuthZ',
    title: 'Authentication ≠ Authorization',
    bullets: [
      'AuthN: xác định ai đang gọi, từ cookie, Bearer token hoặc password.',
      'AuthZ: principal đó có được gọi endpoint này không.',
      'Login thành công ≠ có mọi quyền. AuthZ chạy ở backend, mỗi request.',
    ],
    diagram: 'authnAuthz',
    notes: `Lời dẫn: "Authentication xác định danh tính. Authorization quyết định danh tính đó có được thực hiện hành động đang yêu cầu hay không. Hai bước này cần được kiểm soát độc lập."

Đi theo sơ đồ: AuthN đọc credential (session cookie, Bearer token) và tạo ra principal { id, role } → AuthZ so principal với policy của endpoint → qua cả hai thì handler mới chạy.

Chỉ khối ví dụ: member gọi GET /api/admin — AuthN pass (biết là user 42, role member), AuthZ fail (endpoint cần admin). Đây là lỗi AuthZ, không phải "login sai". Status code cụ thể để slide sau.

Nhấn mạnh: AuthZ phải chạy ở mọi request, ở backend, dựa trên dữ liệu server tin được (bản ghi user/role phía server), không phải dữ liệu client gửi lên.`,
  },
  {
    minutes: 4, section: 'AuthN & AuthZ',
    title: '401 hay 403?',
    bullets: [
      'Không có cookie / token → `401`',
      'Token hết hạn → `401`',
      'Chữ ký token sai → `401`',
      '`member` gọi `GET /api/admin` → `403`',
      '`admin` gọi `GET /api/admin` → `200`',
      '`401`: không biết bạn là ai. `403`: biết, nhưng không cho.',
    ],
    cases: {
      rows: [
        ['Không có cookie / token', '401'],
        ['Token hết hạn', '401'],
        ['Chữ ký token sai', '401'],
        ['`member` gọi `GET /api/admin`', '403'],
        ['`admin` gọi `GET /api/admin`', '200'],
      ],
      takeaway: '`401`: không biết bạn là ai.\n`403`: biết, nhưng không cho.',
    },
    diagram: 'decision401403',
    demo: 'authz',
    notes: `Demo 1 — API Authorization (khoảng 3 phút). Mở nút "Mở API Demo ↗".

Kịch bản (trang có sẵn 6 bước, cho khán giả đoán status code trước khi bấm Gửi):
1. Gọi GET /api/me khi chưa login → kỳ vọng 401 (response có header WWW-Authenticate).
2. Login member@devhub.local → 201.
3. GET /api/me → 200.
4. GET /api/admin bằng member → 403.
5. Login admin@devhub.local → 201.
6. GET /api/admin bằng admin → 200.
Phía dưới có thêm lưới 4 người gọi bằng Bearer token (không token / hết hạn / member / admin) → 401, 401, 403, 200.

Status code do backend thật trả về (ApiController + PrincipalService), không giả lập ở frontend.

Lời kết: "Ẩn nút ở frontend không phải authorization. API phải tự kiểm tra quyền."

Nếu demo lỗi: dùng sơ đồ quyết định trên slide và nói rõ là đang giải thích bằng sơ đồ.`,
  },
  {
    part: 2, minutes: 0.5, section: 'Password',
    title: 'Password',
    question: 'DB bị lộ thì password của user có lộ theo không?',
    bullets: [],
    notes: `Chuyển phần: "Phần 2 — credential đầu tiên ta phải giữ là password. Câu hỏi: nếu DB bị dump, attacker lấy được gì?"

Gợi ý trước: hash tốt chỉ chặn crack offline, không chặn được thử login bằng password lộ từ site khác. Demo 2 ở cuối phần.`,
  },
  {
    minutes: 1.5, section: 'Password',
    title: 'Password không phải dữ liệu để đọc lại',
    bullets: [
      'Hashing: một chiều, không cần key, server không đọc lại được password.',
      'Encryption: hai chiều, có key là giải mã được; lộ DB + key là lộ toàn bộ.',
      'Server chỉ cần biết password đúng hay sai, nên dùng hash.',
    ],
    compare: {
      header: ['', 'Hashing', 'Encryption'],
      rows: [
        ['Chiều', 'Một chiều', 'Hai chiều'],
        ['Cần key', 'Không', 'Có'],
        ['Server đọc lại được password', 'Không', 'Có'],
        ['Khi lộ DB (+ key)', 'Phải crack từng hash', 'Đọc được toàn bộ'],
        ['Dùng cho', 'Password, checksum, integrity', 'PII, API key bên thứ 3, TLS'],
      ],
      takeaway: 'Server chỉ cần biết password đúng hay sai, không cần đọc lại. Vì vậy: hash, không encrypt.',
    },
    diagram: 'hashVsEncrypt',
    notes: `Lời dẫn: "Ứng dụng không cần lấy lại password gốc từ database. Nó chỉ cần xác minh password người dùng nhập có đúng hay không."

Đọc bảng theo từng hàng: hashing một chiều, không có key; encryption hai chiều, server phải giữ key. Nếu server giải mã được password thì attacker lấy được DB + key cũng giải mã được toàn bộ. Với hash, attacker phải crack từng cái một.

Hàng "Dùng cho": hash khi chỉ cần so khớp (password, checksum file, kiểm tra toàn vẹn); encrypt khi phải đọc lại giá trị gốc (PII, API key của dịch vụ bên thứ 3 mà app phải gửi đi, dữ liệu trên đường truyền với TLS).

PII (Personally Identifiable Information) = thông tin định danh cá nhân: số CCCD/hộ chiếu, số điện thoại, địa chỉ, email, ngày sinh, số tài khoản/số thẻ. PII nằm ở cột Encryption vì app thường phải đọc lại giá trị gốc (hiển thị SĐT cho CSKH, gửi email cho user); hash thì không lấy lại được.

Hỏi nhanh khán giả: "Có ai từng thấy hệ thống lưu password bằng AES không?" — đây là lỗi hay gặp khi nhầm hashing với encryption.`,
  },
  {
    minutes: 2, section: 'Password',
    title: 'Lưu và verify password bằng bcrypt',
    bullets: [
      'DB chỉ lưu chuỗi hash: thuật toán, cost, salt, hash.',
      'Login: hash lại password vừa nhập rồi so sánh constant-time.',
      'Dùng Argon2id, hoặc bcrypt cost ≥ 10.',
      'bcrypt chỉ dùng 72 byte đầu của password.',
    ],
    diagram: 'passwordHash',
    notes: `Chỉ chuỗi hash trên sơ đồ: $2a$ là thuật toán bcrypt, 10 là cost, 22 ký tự kế tiếp là salt, phần còn lại là hash. Chuỗi tự chứa đủ thông tin để verify, không cần lưu salt ở cột riêng.

Luồng verify: thư viện đọc salt + cost từ chuỗi đã lưu, hash lại password vừa nhập và so sánh constant-time. Không có bước giải mã nào.

Khuyến nghị: Argon2id là lựa chọn mặc định; bcrypt vẫn ổn với cost ≥ 10. Bẫy của bcrypt: chỉ dùng 72 byte đầu, phần sau bị bỏ qua — cần chặn độ dài hoặc pre-hash có chủ đích.

Không dùng MD5/SHA-1/SHA-256 "trần" cho password: chúng được thiết kế để nhanh, mà nhanh là điều attacker muốn.`,
  },
  {
    minutes: 4, section: 'Password',
    title: 'Salt, brute-force và credential stuffing',
    bullets: [
      'Tốc độ đoán trên 1 GPU: SHA-256 ~22 tỷ lần/giây, bcrypt cost 10 ~5 nghìn lần/giây.',
      'Offline (DB bị lộ): salt + hash chậm có giúp.',
      'Online (credential stuffing): hash không giúp; cần rate limit, MFA, chặn password đã lộ.',
    ],
    speed: {
      caption: 'TỐC ĐỘ ĐOÁN TRÊN 1 GPU (RTX 4090)',
      rows: [
        ['SHA-256', '~22 tỷ lần/giây', 1, 'orange'],
        ['bcrypt cost 10', '~5 nghìn lần/giây', 0, 'green'],
      ],
      ratio: 'bcrypt chậm hơn khoảng 4 triệu lần',
      takeaway: 'Chậm là tính năng, không phải bug.',
      source: 'Ước lượng từ benchmark hashcat công khai; bcrypt quy đổi từ cost 5.',
    },
    diagram: 'attackModes',
    demo: 'password',
    notes: `Demo 2 — Password Hashing (khoảng 3 phút). Mở nút "Mở Password Demo ↗".

Kịch bản:
1. Bước 01: bấm "Hash password" rồi "Hash lại lần nữa" → cùng password, hai chuỗi $2a$10$… khác nhau. Phần salt (tô xanh) khác nên phần hash cũng khác.
2. Ô "Password để thử" mặc định là correct-horse-battery! → Verify → match: false. Xoá dấu "!" → Verify → match: true.
3. Kéo xuống "Cùng năm user, hai cách lưu trữ" → "Mở bản dump bị lộ". Chỉ cột SHA-256: binh và chi có cùng hash vì cùng password, không có salt.
4. "Crack offline với wordlist 25 từ" → SHA-256: 4/5 tài khoản bị crack trong chưa tới 1 ms. bcrypt cost 12: dừng ở giới hạn 3 giây, mới crack được 1/5.
5. Dòng "Phóng to": với wordlist thật 14 triệu từ, SHA-256 mất khoảng nửa phút cho mọi tài khoản; bcrypt mất cỡ vài chục ngày cho mỗi tài khoản.
6. Tài khoản em sống sót ở cả hai cột vì password không có trong wordlist → nối sang thẻ Online: nếu password đó đã lộ ở site khác, hash không cứu được.

Số trên demo khác số trên slide là bình thường: demo chạy trên CPU, một luồng Node, bcrypt cost 12; slide là GPU với cost 10. Điểm cần nhớ là khoảng cách hàng trăm nghìn đến hàng triệu lần, không phải con số chính xác.

Lời kết demo: "Salt không phải secret. Mục tiêu là tránh việc password giống nhau luôn cho cùng một hash, và làm bảng tra sẵn (rainbow table) vô dụng."

Quay lại slide, cột trái: trên một GPU RTX 4090, hashcat thử khoảng 22 tỷ SHA-256 mỗi giây, nhưng chỉ khoảng 5 nghìn bcrypt cost 10 mỗi giây — chậm hơn khoảng 4 triệu lần. Số bcrypt quy đổi từ benchmark cost 5 (mỗi bậc cost chậm gấp đôi), nên nói là "khoảng". Câu chốt: "Chậm là tính năng, không phải bug."

Hai thẻ bên phải:
- Offline: attacker có bản dump DB, đoán thoải mái trên máy riêng → salt + hash chậm có giúp.
- Online / credential stuffing: attacker có danh sách email/password lộ từ site khác, thử login thẳng vào DevHub. Hash không liên quan vì password đúng là password thật → cần rate limit, MFA, chặn password đã lộ (ví dụ kiểm tra qua Have I Been Pwned).

Lưu ý: lab chưa có rate limiting — nói rõ đây là giới hạn của demo.`,
  },
  {
    part: 3, minutes: 0.5, section: 'Session',
    title: 'Session & cookie',
    question: 'Cookie mang gì, và logout thực sự xoá cái gì?',
    bullets: [],
    notes: `Chuyển phần: "Phần 3 — sau khi login bằng password, server cấp cho browser một session ID. Từ đây credential không còn là password nữa mà là cookie."

Phần này có hai demo: session/cookie và logout.`,
  },
  {
    minutes: 3, section: 'Session',
    title: 'Session-based Authentication',
    bullets: [
      'Cookie mang ID, không mang user.',
      'Trạng thái phiên nằm ở session store.',
      'Browser tự gửi cookie; server tra cứu.',
      'Logout / đổi quyền có hiệu lực ngay.',
    ],
    diagram: 'sessionFlow',
    notes: `Lời dẫn: "Cookie không nhất thiết chứa thông tin người dùng. Với session-based authentication, cookie thường mang một session identifier để server tra cứu trạng thái phiên."

Đi theo sequence:
1. POST /session/login với email + password.
2. Server verify password, tạo (regenerate) session trong store.
3. Response: Set-Cookie: devhub.sid=<id>; HttpOnly; SameSite=Lax; Path=/.
4. Request sau: browser tự gắn Cookie: devhub.sid=<id>.
5. Server tra cứu id trong store → biết là ai → 200.

Ưu điểm: server kiểm soát hoàn toàn (logout, force logout, đổi quyền có hiệu lực ngay), cookie nhỏ. Trade-off: cần session store dùng chung khi scale ngang; cookie gắn với domain; vì browser tự gửi cookie nên phải tính đến CSRF.`,
  },
  {
    minutes: 4, section: 'Session',
    title: 'Cookie là credential',
    bullets: [
      'Cookie là credential: cầm ID là user đó.',
      'Mỗi flag vá một lỗ; không flag nào vá hết.',
      '`HttpOnly` không chặn XSS gọi API.',
      '`Max-Age` hết hạn cookie, không revoke.',
    ],
    diagram: 'cookieAnatomy',
    demo: 'session',
    notes: `Demo 3 — Session và Cookie (khoảng 3 phút). Mở nút "Mở Session Demo ↗".

Kịch bản:
1. Login member@devhub.local.
2. Inspector của lab: response login có Set-Cookie: devhub.sid=…; HttpOnly; SameSite=Lax; Path=/; Max-Age=900. Không có Secure.
3. "Kiểm tra có cookie" → GET /api/me → 200.
4. Kéo xuống "Giải phẫu devhub.sid". Chỉ Secure = false (cam): lab chạy HTTP localhost, flag này cố ý tắt. Các flag còn lại xanh.
5. "Đọc bằng document.cookie" → chuỗi rỗng; pill "devhub.sid được HttpOnly che".
(Tuỳ chọn: "Truy cập ẩn danh trước" rồi login → bước 04, ID bị rotate. Replay / ghost để slide 13.)

Lời dẫn: "Không có một bộ cookie flags đúng cho mọi môi trường. Cấu hình phải khớp HTTPS, domain, và cách frontend/backend được deploy."

Lab không hiển thị đầy đủ session ID. Bật Secure bằng SESSION_COOKIE_SECURE=true hoặc NODE_ENV=production.`,
  },
  {
    minutes: 4, section: 'Session',
    title: 'Xoá cookie ≠ thu hồi session',
    bullets: [
      'Cả hai cách logout đều cho browser 401.',
      '401 ở browser ≠ session đã chết.',
      'Replay ID cũ: store còn thì vẫn vào được.',
      '`regenerate()` lúc login chống fixation.',
    ],
    diagram: 'sessionLifecycle',
    demo: 'logout',
    notes: `Bug kinh điển: "đã logout mà request vẫn chạy" — demo trả lời trực tiếp.

Demo 4 — Logout và Revocation (khoảng 3 phút). Mở nút "Mở Logout Demo ↗".

Hai cột dùng chung một cookie trình duyệt. Chạy hết cột A (kể cả replay) rồi mới sang cột B. Nếu login cả hai cột trước khi xong cột A, regenerate() huỷ ID cột A — Reset rồi chạy lại.

Cột A — Chỉ xoá cookie (POST /lab/session/forget-cookie):
1. Login → 201. ID bị copy (rút gọn).
2. GET /api/me → 200.
3. Logout chỉ hết hạn cookie → 200.
4. GET /api/me từ browser này → 401.
5. Replay ID đã copy → vẫn member@devhub.local. Browser quên cookie; store còn session.

Cột B — Huỷ session (POST /session/logout):
Lặp bước 1–4. Logout trả 204. Replay → bị từ chối.

Câu chốt: cookie là thứ ở browser; session là thứ ở server. Logout thật phải destroy store, rồi mới hết hạn cookie.

Fixation (timeline trên slide): attacker cài sẵn một session ID, chờ nạn nhân login. Lab regenerate ID ở /session/login — đã xem ở Demo 3 bước 04.`,
  },
  {
    minutes: 4, section: 'Session',
    title: 'CSRF và XSS không giống nhau',
    bullets: [
      'CSRF: cookie tự gửi, attacker không thấy.',
      'XSS: script trong origin gọi API như user.',
      '`HttpOnly` không chặn XSS gọi API.',
      '`SameSite` ≠ CSRF token / Origin.',
    ],
    diagram: 'csrfXss',
    notes: `Lời dẫn: "CSRF và XSS có thể cùng ảnh hưởng đến một ứng dụng dùng cookie, nhưng nguyên nhân và cách phòng vệ khác nhau. Không nên coi một cookie flag là giải pháp bảo mật toàn diện."

CSRF (trái): user đang login DevHub, mở trang evil.example. Trang đó gửi form POST tới DevHub; browser tự gắn cookie → request chạy dưới danh nghĩa user. Attacker không đọc được cookie hay response. Phòng vệ: SameSite=Lax/Strict, CSRF token, kiểm tra Origin/Referer, không dùng GET cho thao tác thay đổi dữ liệu.

XSS (phải): script của attacker chạy trong chính origin DevHub. HttpOnly chỉ chặn việc đọc cookie; script vẫn gọi API như user (cookie vẫn được gửi kèm). Phòng vệ: output encoding, không dùng innerHTML với dữ liệu người dùng, Content-Security-Policy, sanitize.

Không demo khai thác — dùng sơ đồ để giữ nhịp.`,
  },
  {
    part: 4, minutes: 0.5, section: 'JWT',
    title: 'JWT & tokens',
    question: 'Đọc được payload có nghĩa là tin được payload không?',
    bullets: [],
    notes: `Chuyển phần: "Phần 4 — thay vì giữ state ở server, nhiều hệ thống gửi cho client một token tự chứa claims. Câu hỏi: server dựa vào đâu để tin token đó?"

Hai demo: JWT tampering và vòng đời access/refresh. Phần này kết thúc bằng bảng so sánh session và JWT.`,
  },
  {
    minutes: 3, section: 'JWT',
    title: 'JWT: ba phần, ba ý nghĩa',
    bullets: [
      '`header.payload.signature`',
      'Payload là Base64URL, không mã hoá.',
      'Decode ≠ verify.',
      'Chữ ký chỉ có giá trị khi server verify.',
    ],
    diagram: 'jwtParts',
    notes: `Bug hay gặp: "mở JWT thấy role admin, vậy là admin" — đọc được payload chưa chứng minh token hợp lệ.

Lời dẫn: "JWT không tự động bí mật chỉ vì có chữ ký. Nếu chỉ là signed JWT, payload vẫn có thể đọc được."

Header: thuật toán (alg) và loại token. Payload: claims (sub, role, exp...). Signature: HMAC hoặc chữ ký số trên "header.payload" bằng key của issuer.

Hệ quả: không đặt dữ liệu nhạy cảm vào payload. Đọc được payload (decode) chỉ là bước parse; tin được payload thì phải verify chữ ký + claims bằng key và cấu hình phía server.

Liên hệ token-based flow: login → server ký token → client tự lưu và gửi qua header Authorization: Bearer <token> → server verify ở mỗi request mà không cần tra cứu session.`,
  },
  {
    minutes: 3, section: 'JWT',
    title: 'Chữ ký đúng chưa đủ',
    bullets: [],
    takeaway: '`alg` nằm header, không phải claim. Chỉ nhận thuật toán trong allowlist.',
    diagram: 'claimsTable',
    notes: `Lời dẫn: "Chữ ký hợp lệ chưa chắc đã đủ. Token có thể được phát hành hợp lệ nhưng dành cho một API khác, vì vậy audience cũng phải được kiểm tra."

Trong lab: iss = devhub-auth-lab, aud = devhub-api, thuật toán chỉ cho phép HS256, exp bắt buộc. Có fixture cho từng lỗi: hết hạn, sai issuer, sai audience, chưa có hiệu lực (nbf), HS384 (ngoài allowlist), alg: none.

jti dùng khi cần nhận diện/thu hồi từng token. iat cho biết thời điểm phát hành (ví dụ để từ chối token phát hành trước lần đổi password).`,
  },
  {
    minutes: 4, section: 'JWT',
    title: 'Đừng tin payload chỉ vì đọc được',
    bullets: [
      'Sửa payload, giữ chữ ký cũ → `401`.',
      '`alg: none` ngoài allowlist → `401`.',
      'Member hợp lệ gọi `/api/admin` → `403`.',
      'Decode ≠ verify; `401` ≠ `403`.',
    ],
    diagram: 'jwtTamper',
    demo: 'jwt',
    notes: `Demo 5 — JWT Tampering (khoảng 4 phút). Mở nút "Mở JWT Demo ↗".

Nhắc: alg = algorithm, nằm header, không phải claim.

Dùng chip "Token lab chuẩn bị sẵn" cho nhanh. Đổi chip rồi phải bấm Verify lại. Verifier ngây thơ chỉ có khi lab bật chế độ vulnerable.

Kịch bản:
1. "Cấp token member" (hoặc chip Hợp lệ) → header alg: HS256; payload role: member, iss, aud, exp.
2. Chip "Sửa role" (hoặc "Sửa payload") → decode ra role: admin, chữ ký cũ giữ nguyên.
3. Gửi tới /api/me và /api/admin → 401 cả hai, WWW-Authenticate: invalid_token.
4. Chip Hợp lệ → /api/admin → 403 (AuthN pass, AuthZ fail). Role lấy từ bản ghi user phía server, không lấy từ payload.
5. Chip "alg: none": Verifier chặt → 401. Verifier ngây thơ → 200 và cấp admin. Chuyển lại Chặt để chỉ bước nào bắt được.

Các chip còn lại (Hết hạn, Sai issuer, Sai audience, HS384, Chưa có hiệu lực) map từng dòng slide 17.

Lời kết: "Backend không được lấy role từ payload chưa verify."

Ô editor chỉ chứa token demo do lab ký. Không dán token thật. Signing secret không rời backend.`,
  },
  {
    minutes: 4, section: 'JWT',
    title: 'Access token và refresh token',
    bullets: [
      'Access: JWT ngắn hạn, gửi Bearer tới API.',
      'Refresh: opaque, chỉ `/tokens/refresh`.',
      'Rotate: token mới, cái cũ = rotated.',
      'Reuse RT cũ → `401`, thu hồi family.',
    ],
    diagram: 'refreshRotation',
    demo: 'tokens',
    notes: `Demo 6 — Token Lifecycle (khoảng 4 phút). Mở nút "Mở Token Lifecycle Demo ↗". Trang ghi rõ: LUỒNG THẬT — rotation và phát hiện reuse chạy ở server, store in-memory, không dành cho production.

Kịch bản (các nút ① → ⑥):
1. Login: nhận access token (JWT, mặc định 120 giây) và refresh token (opaque).
2. ① Gọi /api/me bằng access token → 200.
   ② Dùng refresh token như access token → 401 (sai loại token).
3. ③ Refresh → access + refresh mới; refresh cũ bị đánh dấu "rotated".
4. ④ Dùng lại refresh token cũ → 401 và server thu hồi cả family (reuse-detected).
5. ⑤ Logout/thu hồi → 204; ⑥ refresh bằng token hiện tại → 401.

Bật "Access token ngắn hạn (20 giây)" nếu muốn xem access token hết hạn trong lúc nói.

Điểm cần nhấn: access token đã phát hành vẫn hợp lệ đến exp kể cả sau logout — đó là lý do access token phải ngắn hạn. Refresh token lưu dạng hash (SHA-256) phía server, không lưu plaintext.

Opaque = chuỗi ngẫu nhiên, client không decode được. Khác JWT: JWT đọc được header/payload dù chưa verify chữ ký.`,
  },
  {
    minutes: 3, section: 'JWT',
    title: 'Session hay JWT?',
    bullets: [],
    takeaway: 'Cần revoke ngay → session. Nhiều API / mobile → JWT.',
    diagram: 'compareTable',
    notes: `Câu hỏi tương tác: "Nếu DevHub là web app nội bộ với yêu cầu logout có hiệu lực rõ ràng, bạn sẽ chọn session hay JWT? Vì sao?"

Đọc bảng theo hàng:
- State: session giữ trạng thái ở server; JWT tự chứa claims.
- Revoke: session xoá là xong; JWT cần thời hạn ngắn + denylist/rotation.
- Scale: session cần store dùng chung (Redis...); JWT verify được ở bất kỳ đâu có key.

Cột "JWT (stateless)" là access token: verify được mà không lookup session. Refresh opaque + rotation trong Demo 6 vẫn stateful — server lưu hash và phát hiện reuse. Hệ thống JWT thực tế thường lai: access ngắn hạn stateless, refresh có store.

Không đưa đáp án tuyệt đối. Web nội bộ, logout tức thì → session. Nhiều API / mobile / phân tán → access JWT + refresh opaque.`,
  },
  {
    part: 5, minutes: 0.5, section: 'OAuth / OIDC / SAML',
    title: 'OAuth / OIDC / SAML',
    question: '"Login with Google" thực ra là flow gì?',
    bullets: [],
    notes: `Chuyển phần: "Phần 5 — đến giờ DevHub tự giữ password. Khi doanh nghiệp đã có Identity Provider, DevHub giao việc xác thực cho IdP. Câu hỏi: flow đó chạy như thế nào và DevHub phải kiểm tra gì?"

Demo 7 chạy live nếu đã cấu hình IdP, nếu không là walkthrough có nhãn.`,
  },
  {
    minutes: 3, section: 'OAuth / OIDC / SAML',
    title: 'OAuth 2.0 không đồng nghĩa Login',
    bullets: [
      'App A gọi dữ liệu của bạn ở app B.',
      'Đọc Calendar, không lấy password.',
      'Access token gọi API, không nói ai login.',
      'Muốn login chuẩn → OIDC (slide sau).',
    ],
    diagram: 'oauthRoles',
    notes: `Lời dẫn: "OAuth 2.0 là ủy quyền truy cập, không phải màn hình login. Người mới hay lẫn hai việc này."

Định nghĩa ngay khi nói:
- OAuth 2.0: framework cho phép client nhận quyền gọi resource trong phạm vi (scope) được cấp — ví dụ cho app lịch đọc Google Calendar mà không đưa mật khẩu Google cho app đó.
- Authorization Server trên sơ đồ thường cũng là IdP (Identity Provider): nơi xác thực user và phát hành token.

Bốn vai trò trên sơ đồ:
- Resource Owner: người dùng sở hữu dữ liệu.
- Client: ứng dụng muốn truy cập thay mặt người dùng (DevHub).
- Authorization Server / IdP: xác thực user, hỏi consent, phát hành token.
- Resource Server: API giữ dữ liệu, chấp nhận access token.

Luồng rút gọn: Client xin ủy quyền → user đồng ý → Client đổi grant lấy access token → gọi API bằng access token.

Chốt: access token của OAuth không nói cho client biết "ai vừa login" theo chuẩn. Việc đó thuộc OIDC.`,
  },
  {
    minutes: 3, section: 'OAuth / OIDC / SAML',
    title: 'ID token ≠ Access token',
    bullets: [
      'OIDC = danh tính trên OAuth 2.0.',
      'ID token cho client; access token cho API.',
      'Đừng gửi ID token làm Bearer.',
    ],
    diagram: 'idVsAccess',
    notes: `Định nghĩa khi mở slide: OIDC (OpenID Connect) xây trên OAuth 2.0 và thêm ID token để client biết user là ai — đây mới là “login qua IdP” theo chuẩn.

ID token: JWT có aud = client_id, chứa sub, nonce, auth_time... Client dùng để biết ai đã đăng nhập. Không gửi ID token tới API như access token.

Access token: aud là API (resource server), chứa scope. API validate chữ ký, iss, aud, exp và scope trước khi phục vụ.

Lỗi thường gặp: API chấp nhận ID token làm bearer token; client đọc access token để lấy thông tin user (access token có thể là opaque).`,
  },
  {
    minutes: 3, section: 'OAuth / OIDC / SAML',
    title: 'Authorization Code Flow + PKCE',
    bullets: [],
    takeaway: 'Verifier không lên URL. Cắp được code cũng không đổi token.',
    diagram: 'pkceFlow',
    notes: `Lời dẫn: giải thích từng param khi xuất hiện trên sơ đồ — đừng đọc như danh sách thuật ngữ.

state: chuỗi ngẫu nhiên DevHub lưu trước khi redirect. Callback phải mang đúng state → chống kẻ khác “ghim” một login CSRF vào session của bạn.

nonce: chuỗi ngẫu nhiên gửi lên /authorize và phải có trong ID token. Không khớp → ID token không thuộc lần login này (chống replay).

PKCE:
- code_verifier: bí mật ngẫu nhiên, chỉ DevHub giữ, không đưa lên URL.
- code_challenge = BASE64URL(SHA256(verifier)), gửi lên /authorize.
- Khi đổi code lấy token, gửi lại verifier; IdP kiểm tra hash khớp challenge. Ai chỉ cầm code (không có verifier) thì vô dụng.

redirect_uri: phải khớp chính xác URL đã đăng ký ở IdP — tránh code bị đẩy sang domain lạ.

client_id / scope=openid: IdP biết app nào đang xin login; openid báo đây là OIDC (cần ID token).

Các bước (đi sơ đồ):
1. Sinh verifier, challenge, state, nonce — lưu phía server.
2. Redirect /authorize kèm challenge, state, nonce (không gửi verifier).
3. User xác thực tại IdP.
4. Callback: code + state → so state.
5. POST /token: code + verifier → IdP kiểm PKCE → ID token + access token.
6. Validate ID token: chữ ký, iss, aud, exp, nonce → tạo session DevHub.`,
  },
  {
    minutes: 4, section: 'OAuth / OIDC / SAML',
    title: 'OIDC Demo — Login qua Identity Provider',
    bullets: [
      'IdP giữ password. DevHub không.',
      'Callback mang `code` + `state`.',
      'Đủ check mới tin login.',
      'Session DevHub ≠ session IdP.',
    ],
    diagram: 'oidcLogin',
    demo: 'oidc',
    notes: `Demo 7 — OIDC (khoảng 3–4 phút). Nhắc nhanh: đây là login qua IdP — user xác thực ở IdP, DevHub tin kết quả sau khi verify.

Mở nút "Mở OIDC Demo ↗". Nhìn banner trước khi nói: chế độ do .env của API quyết định.

Nếu banner là "LIVE OIDC — REAL IDENTITY PROVIDER" (đã cấu hình IdP test):
1. Chỉ cấu hình: issuer, client_id, redirect_uri. Client secret không bao giờ hiện trên trang.
2. Bấm "Đăng nhập bằng Identity Provider". Chỉ URL: state, nonce, code_challenge, code_challenge_method=S256.
3. Đăng nhập bằng tài khoản test, quay về DevHub.
4. Đọc danh sách "DevHub đã kiểm tra": state, PKCE, chữ ký qua JWKS, iss, aud, exp, nonce.
5. "Gọi /api/me" → 200, user oidc:<sub>. Logout khỏi DevHub → /api/me 401; IdP vẫn còn session, nên có link logout cả ở IdP.

Nếu banner là "FLOW WALKTHROUGH — NO REAL LOGIN" (chưa cấu hình, hoặc IdP không truy cập được): nói rõ không ai thực sự đăng nhập ở đây.
1. Đi qua 9 bước trên sequence diagram (Tiếp →). Bước 1: code_verifier, code_challenge (SHA-256 thật bằng crypto.subtle), state, nonce.
2. Bước 5: bật "Giả lập callback có state không khớp" → callback bị từ chối.
3. Kết thúc ở phần "ID token ≠ Access token": so sánh aud của hai payload mẫu.

Ở walkthrough, không để người xem hiểu nhầm là đã login thật: request/response IdP trên trang là mẫu.`,
  },
  {
    minutes: 3, section: 'OAuth / OIDC / SAML',
    title: 'SAML — Assertion XML vs ID token',
    bullets: [],
    takeaway: 'IdP đã có SAML → dùng SAML. App mới → ưu tiên OIDC.',
    diagram: 'samlFlow',
    notes: `Lời dẫn — bắt đầu bằng Assertion, đừng nhảy thẳng vào acronym:

Assertion là gì?
- Một tài liệu XML do IdP ký số, nội dung cốt lõi: “User X đã xác thực lúc T, dành cho ứng dụng Y, còn hạn đến …”
- Ví dụ gần đời thường: giấy xác nhận từ công ty HR gửi sang hệ thống khác — không phải mật khẩu, mà là chứng từ đã ký.

Assertion ≈ ID token của OIDC (cùng vai trò: chứng minh danh tính sau login):
| | SAML Assertion | OIDC ID token |
|---|---|---|
| Định dạng | XML + XML Signature | JWT (JSON Base64 + chữ ký) |
| Ai đọc | Service Provider (SP / DevHub) | OIDC client (DevHub) |
| Mang gì | Subject, Audience, điều kiện thời hạn | sub, aud, exp, nonce… |
| Đường về app | Browser POST SAML Response tới ACS URL | Redirect?code → client đổi lấy token ở /token |
| Sau khi tin | Tạo session cục bộ của app | Tạo session cục bộ của app |

SSO = mục tiêu (login một lần, nhiều app). SAML và OIDC = hai cách làm. Không phải “XML cũ / JWT mới nên JWT đúng hơn”.

Luồng SAML SP-initiated (đi sơ đồ):
1. User mở SP → SP redirect kèm AuthnRequest tới IdP.
2. User xác thực tại IdP.
3. IdP đưa Assertion (trong SAML Response) về ACS của SP qua browser.
4. SP verify chữ ký / Audience / Destination / NotOnOrAfter / InResponseTo → tạo session riêng.

Rủi ro: verify sai phần tử XML (signature wrapping), sai Audience, hết hạn. Dùng thư viện SAML được maintain.

Câu hỏi (30 giây): khách bắt buộc SAML vì IdP chỉ có SAML — có nên ép OIDC? Thường không: compatibility quan trọng hơn preference.`,
  },
  {
    part: 6, minutes: 0.5, section: 'Lựa chọn',
    title: 'Lựa chọn',
    question: 'DevHub nên dùng session, JWT hay IdP?',
    bullets: [],
    notes: `Chuyển phần: "Phần 6 — đã có đủ các mảnh: password, session, JWT, OIDC. Giờ ghép lại: với yêu cầu cụ thể của DevHub, chọn phương án nào và review code auth theo checklist nào?"

Phần này không có demo. Slide threat model là chỗ chọn phương án cho DevHub, rồi sang checklist review.`
  },
  {
    minutes: 3, section: 'Lựa chọn',
    title: 'Chọn theo threat model',
    bullets: [
      'Client: browser, mobile, hay service-to-service?',
      'Cần revoke tức thời?',
      'Có SSO/IdP?',
      'Ai giữ key, session store, token lifecycle?',
      'XSS/CSRF xử lý ra sao?',
    ],
    diagram: 'threatQuestions',
    notes: `Tương tác: yêu cầu người nghe chọn session hoặc JWT cho DevHub và đưa ra ít nhất hai lý do (1 phút thảo luận theo cặp).

Gợi ý hướng phân tích:
- Browser-only, cùng site → session cookie thường đơn giản và revoke tốt.
- Mobile / nhiều API / service-to-service → access token ngắn hạn + refresh rotation, hoặc OIDC.
- Có IdP doanh nghiệp → OIDC/SAML cho login, sau đó vẫn cần session hoặc token cho app.
- Ai xoay key? Ai giám sát reuse? Log thế nào mà không lộ credential?

Chốt DevHub nếu khán giả hỏi: web nội bộ + logout tức thì → session; có IdP công ty → OIDC rồi session DevHub; JWT + refresh khi nhiều API / mobile.`,
  },
  {
    minutes: 2, section: 'Tổng kết',
    title: 'Checklist review Auth',
    bullets: [],
    diagram: 'checklist',
    notes: `Lời dẫn: "Đây là checklist có thể áp dụng ngay khi review một PR authentication."

Câu hỏi khi review:
- Password: thuật toán chuyên dụng? cost hợp lý? có rate limit/lockout mềm?
- Session: regenerate khi login? destroy khi logout? cookie flags theo môi trường?
- JWT: verify với allowlist thuật toán? kiểm tra iss/aud/exp? không lấy quyền từ payload chưa verify?
- Refresh: rotation? phát hiện reuse? lưu dạng hash? thu hồi khi logout?
- OIDC: state, nonce, PKCE, redirect URI chính xác?
- Authorization ở backend cho mọi endpoint? Có test 401/403?
- Log có che password, cookie, Authorization header, token không?

Bản đầy đủ: docs/01-authentication-core.md, mục Security Checklist.`,
  },
  {
    minutes: 1, section: 'Tổng kết',
    title: 'Login an toàn là vòng đời, không phải nút bấm.',
    bullets: ['Verify đúng.', 'Store an toàn.', 'Send đúng cách.', 'Validate đủ.', 'Revoke khi cần.'],
    diagram: 'lifecycleRing',
    notes: `Lời kết: "Authentication không kết thúc ở thời điểm login thành công. Chúng ta phải kiểm soát toàn bộ vòng đời của credential."

Đi năm box, mỗi cái một câu:
- Verify: password so hash, không đọc lại plaintext; JWT/OIDC phải verify chữ ký, không tin decode.
- Store: bcrypt + salt; session ở store; refresh opaque lưu hash. Không encrypt password, không log credential.
- Send: cookie HttpOnly / SameSite; access gửi Bearer, không nhét URL. Browser tự gửi cookie → CSRF; XSS vẫn gọi API dù HttpOnly.
- Validate: iss, aud, exp, alg allowlist; AuthZ ở server (401 vs 403). ID token không dùng làm Bearer cho API.
- Revoke: destroy session, không chỉ hết hạn cookie; rotate refresh, reuse → huỷ family; access ngắn hạn vì vẫn sống đến exp; logout DevHub ≠ logout IdP.

Một "bug login" có thể nằm ở bất kỳ bước nào trên — phân lớp rồi mới vá.

Tài liệu và lab: docs/ và devhub-auth-lab/. Lab chỉ chạy local, tài khoản giả lập.`,
  },
  {
    minutes: 0.5, section: 'Tổng kết',
    title: 'Tổng kết',
    bullets: [],
    diagram: 'recap',
    notes: `Đi nhanh 6 phần — mỗi ô một câu đã nói trong buổi. Không giảng lại.

Rồi sang cảm ơn, rồi To be continued AuthZ.`,
  },
  {
    minutes: 0.5, section: 'Tổng kết',
    title: 'Cảm ơn',
    bullets: [],
    diagram: 'thanks',
    notes: `Cảm ơn khán giả. Buổi 1 Authentication xong. Lab và docs dùng để ôn.`,
  },
  {
    minutes: 0.5, section: 'Tổng kết',
    title: 'To be continued',
    bullets: [],
    diagram: 'continued',
    notes: `Buổi 2 Authorization — Nguyễn Ngọc Nhiên. AuthN: bạn là ai. AuthZ: bạn được làm gì. 401 vs 403 đã gặp ở đầu buổi; buổi sau đi sâu policy, role, resource.`,
  },
];

const clock = (minutes) => `${String(Math.floor(minutes)).padStart(2, '0')}:${minutes % 1 ? '30' : '00'}`;

let elapsed = 0;
export const SLIDES = CONTENT.map((slide, index) => {
  const start = elapsed;
  elapsed += slide.minutes;
  return { ...slide, n: index + 1, time: `${clock(start)}–${clock(elapsed)}` };
});
