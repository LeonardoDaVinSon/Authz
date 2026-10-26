# Break the Login — Authentication Core

Bộ workshop 90 phút về authentication: tài liệu lý thuyết, deck 27 slide có speaker notes và nút mở demo, và ứng dụng lab NestJS + React chạy local.

## Nội dung

| Đường dẫn | Mô tả |
|---|---|
| [`docs/01-authentication-core.md`](docs/01-authentication-core.md) | Lý thuyết: AuthN/AuthZ, 401/403, password hashing, session & cookie, JWT, access/refresh, OAuth 2.0/OIDC/SAML, session vs JWT, security checklist |
| [`docs/02-slide-content.md`](docs/02-slide-content.md) | Nội dung 27 slide + speaker notes + link demo (sinh tự động từ `slides/`) |
| [`docs/03-demo-runbook.md`](docs/03-demo-runbook.md) | Runbook cho người trình bày: chuẩn bị, thứ tự tab, kịch bản từng demo, dự phòng |
| [`docs/04-implementation-plan.md`](docs/04-implementation-plan.md) | Hiện trạng triển khai, phần thật vs walkthrough/OIDC live, kết quả kiểm tra, giới hạn |
| [`slides/`](slides/) | Generator PowerPoint (`pptxgenjs`) → `slides/break-the-login.pptx` |
| [`devhub-auth-lab/`](devhub-auth-lab/) | Ứng dụng demo: NestJS API + React UI, 7 lab tại `/demo` |
| [`demo-scripts/`](demo-scripts/) | Kịch bản mở rộng (bản nháp) cho phần session |
| `break-the-login-slide-to-lab-map.md` | Đặc tả gốc của workshop |
| `break-the-login-authentication-core.md` | Kịch bản nội dung bản trước (cấu trúc slide cũ), giữ lại để tham khảo |

## Bắt đầu nhanh

```bash
# 1. Chạy lab (Docker)
cd devhub-auth-lab
docker compose up -d --build
# UI: http://localhost:5173/demo   API: http://localhost:3000/health

# 2. Build lại deck (tuỳ chọn; file .pptx đã có sẵn)
cd ../slides
npm install
npm run build            # ghi break-the-login.pptx và docs/02-slide-content.md
npm run verify -- --live # kiểm tra 27 slide, notes, 7 hyperlink và gọi thử từng URL
```

Chạy dev không cần Docker: xem [`devhub-auth-lab/README.md`](devhub-auth-lab/README.md).

### Bật OIDC thật cho Demo 7

Chỉ cần điền key vào `devhub-auth-lab/.env` rồi restart API (`docker compose up -d --build` hoặc `npm run start:dev`):

```bash
OIDC_ISSUER_URL=https://<idp>/...   # issuer của IdP
OIDC_CLIENT_ID=<client id>
OIDC_CLIENT_SECRET=<secret>         # bỏ trống nếu là public client
```

Ở IdP, đăng ký redirect URI `http://localhost:3000/oidc/callback` (và post-logout URI `http://localhost:5173/demo/oidc` nếu muốn logout cả ở IdP). Chi tiết và ví dụ issuer cho Keycloak, Google, Entra ID, Auth0, Okta: mục "Enable live OIDC" trong [`devhub-auth-lab/README.md`](devhub-auth-lab/README.md#enable-live-oidc-demo-7). Thiếu key thì Demo 7 tự quay về walkthrough có nhãn.

## Slide → demo

| Slide | Demo | URL |
|---|---|---|
| 5 | 1 · 401 vs 403 | <http://localhost:5173/demo/authz> |
| 7 | 2 · Password hashing | <http://localhost:5173/demo/password> |
| 9 | 3 · Session & cookie | <http://localhost:5173/demo/session> |
| 10 | 4 · Logout & revoke | <http://localhost:5173/demo/session/logout-lab> |
| 14 | 5 · JWT decode/verify/tampering | <http://localhost:5173/demo/jwt> |
| 15 | 6 · Access + refresh token | <http://localhost:5173/demo/tokens> |
| 20 | 7 · OIDC Code Flow + PKCE | <http://localhost:5173/demo/oidc> — login thật khi đã điền key OIDC, nếu không là **FLOW WALKTHROUGH — NO REAL LOGIN** |

Hyperlink được build từ `slides/deck-content.mjs`; build sẽ dừng nếu một route không tồn tại trong `devhub-auth-lab/frontend/src/routes.ts`. Đổi host/cổng bằng `DEMO_BASE_URL=http://localhost:<port> npm run build`.

## An toàn

- Chỉ chạy local; API và UI bind `127.0.0.1`. Không expose ra Internet.
- Chỉ dùng tài khoản demo `member@devhub.local` / `admin@devhub.local` (password trong runbook). Không dùng credential, token hay dữ liệu production.
- Không commit `.env` (đã có trong `.gitignore`). Tự sinh `SESSION_SECRET`, `JWT_SECRET` ngẫu nhiên.
- UI hiển thị session ID, cookie và token dạng rút gọn; signing secret không bao giờ gửi xuống frontend.
- Demo OIDC chỉ login thật khi bạn cấu hình Identity Provider; khi đó dùng tenant và tài khoản test. Chưa cấu hình thì là walkthrough có nhãn rõ ràng. Token của IdP không được lưu, access token chỉ hiện 10 ký tự đầu.
