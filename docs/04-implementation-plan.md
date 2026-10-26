# Implementation plan & status

Hiện trạng triển khai theo đặc tả `break-the-login-slide-to-lab-map.md`: đã làm gì, phần nào chạy thật, phần nào chạy thật chỉ khi có cấu hình, đã kiểm tra thế nào và còn giới hạn gì.

## 1. Audit ban đầu

| Hạng mục | Trước khi triển khai | Xử lý |
|---|---|---|
| Stack | NestJS 10 + TypeScript (npm), React 18 + Vite 6, Jest, Docker Compose (API :3000, web :5173) | Giữ nguyên stack và convention |
| Demo có sẵn | Lab 3 chủ đề (session, JWT inspector, password) dưới dạng tab, không có route; user `alice`; endpoint riêng `/session/me`, `/jwt/me` | Tái sử dụng toàn bộ lab cũ; thêm route `/demo/*`, 4 lab mới, API DevHub `/api/me`, `/api/admin` |
| Tài liệu | `break-the-login-authentication-core.md` (kịch bản theo cấu trúc slide cũ), `demo-scripts/01-session-cookie.md` (nháp) | Giữ nguyên file cũ để tham khảo; viết `docs/01–04` theo cấu trúc 25 slide mới; cập nhật demo script cho user/route mới |
| Slide | Không có deck | Tạo generator `slides/` bằng `pptxgenjs` |

## 2. Milestones

| # | Milestone | Trạng thái |
|---|---|---|
| 1 | Backend: demo users member/admin, `PrincipalService` (Bearer không fallback sang cookie), `/api/me`, `/api/admin`, password verify, token lifecycle, OIDC status, reset, health, giới hạn body 16 kB, CORS origin cố định | Xong |
| 2 | E2E tests (supertest) cho 7 demo | Xong |
| 3 | Frontend: `/demo` + 7 route, nút Reset, nhãn `DEMO ONLY — LOCAL`, VI/EN, credential hiển thị dạng rút gọn | Xong |
| 4 | Deck 27 slide, speaker notes, diagram vẽ bằng shape, 7 hyperlink demo | Xong |
| 5 | Tài liệu `docs/01–04`, README gốc, README lab | Xong |
| 6 | Kiểm tra cuối: tests, lint, build, route, hyperlink, secret scan | Xong (kết quả ở mục 5) |

## 3. Demo thật và walkthrough

| Demo | Route | Slide | Trạng thái |
|---|---|---|---|
| 1 · AuthN/AuthZ | `/demo/authz` | 4 | **Thật**: status code do `ApiController` quyết định (session và Bearer) |
| 2 · Password | `/demo/password` | 6 | **Thật**: bcrypt hash/verify. Bảng leak là dữ liệu giả có chủ đích |
| 3 · Session & cookie | `/demo/session` | 8 | **Thật**: express-session, rotate ID khi login, cookie flags thật |
| 4 · Logout & revoke | `/demo/session/logout-lab` | 9 | **Thật**: cột "logout sai" là chế độ lỗi có chủ đích (`LAB_VULNERABLE_MODES`) |
| 5 · JWT | `/demo/jwt` | 13 | **Thật**: verify bằng `jsonwebtoken`, allowlist HS256, iss/aud/exp/nbf. Token mẫu là fixture do lab ký; verifier "ngây thơ" chỉ giải thích, không cấp quyền |
| 6 · Access/refresh | `/demo/tokens` | 14 | **Thật**: rotation, reuse detection thu hồi cả family, logout; store in-memory |
| 7 · OIDC | `/demo/oidc` | 19 | **Thật khi có key**: điền `OIDC_ISSUER_URL` + `OIDC_CLIENT_ID` (secret tuỳ chọn) → banner `LIVE OIDC — REAL IDENTITY PROVIDER`, Authorization Code + PKCE qua `openid-client`, DevHub tạo session riêng. **Walkthrough khi chưa có key**: banner `FLOW WALKTHROUGH — NO REAL LOGIN`, PKCE/state/nonce tính thật trong trình duyệt, mọi traffic IdP là mẫu |

Không có demo nào cần nhãn `SIMULATED FLOW`: refresh flow chạy thật ở backend.

### OIDC live

| Thành phần | Cách làm |
|---|---|
| Cấu hình | `src/oidc/oidc-settings.ts`: bắt buộc `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`; mặc định `redirect_uri = http://localhost:$PORT/oidc/callback`, scope `openid profile email`, quay về `$FRONTEND_ORIGIN/demo/oidc`. `.env` được đọc khi chạy npm; Docker Compose truyền cùng các biến |
| Thư viện | `openid-client` 6: discovery, `enableNonRepudiationChecks` (verify chữ ký ID token bằng JWKS), `client_secret_post` hoặc public client. HTTP chỉ chấp nhận cho issuer `localhost` |
| `/oidc/login` | Sinh `state`, `nonce`, `code_verifier` (S256), lưu vào session, `302` sang IdP |
| `/oidc/callback` | Transaction dùng một lần, hết hạn sau 10 phút; kiểm tra lỗi IdP, `state`, rồi đổi code và validate ID token (`iss`, `aud`, `exp`, `nonce`, chữ ký). Thành công: `session.regenerate()`, user `oidc:<sub>`, role `admin` nếu email nằm trong `OIDC_ADMIN_EMAILS` |
| Hiển thị | Header + claim đã chọn của ID token, access token chỉ 10 ký tự đầu, danh sách check. Không lưu hay trả token gốc, không log token/secret |
| Lỗi | Redirect về UI với `reason` cụ thể: `idp_error`, `no_transaction`, `transaction_expired`, `state_mismatch`, `nonce_mismatch`, `id_token_invalid`, `token_exchange_failed`, `discovery_failed`, `session_failed` |
| Logout | Huỷ session DevHub; trả `end_session_endpoint` của IdP nếu có để logout cả ở IdP |

## 4. Deck

- Nguồn: `slides/deck-content.mjs` (nội dung, notes, mapping demo) và `slides/build-deck.mjs` (layout, diagram).
- `npm run build` ghi `slides/break-the-login.pptx` và `docs/02-slide-content.md`. Build dừng nếu thiếu slide hoặc nếu route demo không có trong `frontend/src/routes.ts`.
- pptxgenjs 3 ghi nhiều `<a:pPr>` trong một paragraph (OOXML không hợp lệ, làm mất bullet). Build hậu xử lý XML để giữ một `<a:pPr>` mỗi paragraph.
- `npm run verify` đọc lại file `.pptx` và kiểm tra: đủ 27 slide; đúng 7 slide có hyperlink, mỗi slide đúng URL kỳ vọng; mỗi slide có speaker notes; không có "Basic Auth", chuỗi giống JWT hay giá trị secret trong slide/notes. `--live` gọi thử từng URL.
- Diagram vẽ bằng shape gốc của PowerPoint (không ảnh stock, không copy hình tham khảo), bố cục flow chart tham khảo bài Viblo về các phương thức authentication.

## 5. Kết quả kiểm tra (17/10/2026)

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Unit + e2e | `devhub-auth-lab: npm test` | **12 suites, 80 tests pass** (gồm 16 test OIDC với fake IdP trong process: login thành công, rotate session, map admin, sai `state`, replay callback, sai `nonce`, khoá ký lạ, sai `aud`, lỗi IdP, logout, không lộ token/secret trong log) |
| OIDC với IdP thật | Keycloak 26 trong Docker (realm, client và user test tạm, đã xoá sau khi kiểm tra), API `:3100`, UI `:5180` | Login qua form Keycloak → 7 check ✓ (RS256 qua JWKS) → `/api/me` 200 `oidc:<sub>` role admin → logout DevHub → `/api/me` 401 → logout Keycloak quay về `/demo/oidc` → login lại bị hỏi mật khẩu. Log API không chứa token, secret hay mật khẩu |
| Lint | `npm run lint` (`tsc --noEmit`) | **Pass**, exit 0 |
| Build API | `npm run build` | **Pass** |
| Build UI | `frontend: npm run build` (`tsc -b && vite build`) | **Pass** |
| Deck | `slides: npm run build && npm run verify` | **Pass**: 27 slide, 7 hyperlink đúng, notes đủ, không vi phạm nội dung |
| Hyperlink live | `npm run verify -- --live` | 7/7 URL trả `200` trên `:5173` (xem lưu ý bên dưới) |
| Route API | curl trên bản đang chạy | `/health` 200 · `/api/me` ẩn danh 401 · login 201 · `/api/me` 200 · `/api/admin` (member) 403 · logout 204 · cookie cũ 401 · `/lab/reset` 200 |
| Route UI | curl 8 route `/demo*` | 200 |
| CORS | Origin lạ | Chỉ trả `Access-Control-Allow-Origin` = origin cấu hình, không wildcard |
| Kiểm tra trên browser | Từng lab | Đúng status code kỳ vọng ở runbook; token/session ID hiển thị rút gọn; banner OIDC có mặt |
| Render deck | LibreOffice → PDF → PNG | 25 slide hiển thị đúng bullet, căn lề, diagram không tràn chữ |
| Secret scan | rg pattern JWT/private key/API key | Không có trong source; `.env` chỉ tồn tại local và bị `.gitignore`/`.dockerignore` loại trừ |

Lưu ý về kiểm tra:

- Hai cổng 3000/5173 trên máy kiểm tra đang bị Docker stack **bản cũ** chiếm, nên kiểm tra browser và route chạy bản mới trên `:3100`/`:5180`. Kiểm tra `--live` trên `:5173` chỉ chứng minh server phản hồi: SPA trả `200` cho mọi path. Việc route tồn tại được đảm bảo bởi kiểm tra `routes.ts` khi build deck và kiểm tra browser trên `:5180`.
- Trước khi trình bày cần `docker compose up -d --build` để container trên `:5173` chạy bản mới.
- Workspace chưa là git repository, nên "không commit `.env`" được đảm bảo bằng `.gitignore` ở gốc và trong lab.
- Font Segoe UI không có trong container render, nên ảnh render chỉ xấp xỉ; PowerPoint trên Windows dùng font gốc.

## 6. Giới hạn đã biết

- Session store (`MemoryStore`) và refresh-token store nằm trong memory: mất khi restart, chỉ một process.
- Không có rate limiting, lockout hay MFA; slide giải thích lý do cần chúng thay vì đưa limiter chưa hoàn chỉnh.
- HS256 với shared secret; không có key rotation/JWKS. Access JWT không thu hồi được trước `exp` (không denylist), bù lại thời hạn ngắn.
- Không có CSRF token: cookie dựa vào `SameSite=Lax` và endpoint chỉ nhận JSON. Đủ cho lab, cần đánh giá riêng cho app thật.
- OIDC live: transaction và login nằm trong session in-memory; không refresh token, không back-channel logout, không gọi userinfo. ID token ký HS256 không được chấp nhận (cần khoá bất đối xứng trong JWKS). Trong Docker, `localhost` là chính container: IdP chạy trên máy host thì chạy API bằng npm.
- Đã kiểm tra với Keycloak; Google, Entra ID, Auth0, Okta chưa thử trực tiếp (chỉ dựa trên chuẩn OIDC discovery).
- JWT editor ở Demo 5 hiển thị nguyên token để sửa. Đó là token demo do lab ký, ngắn hạn; mọi chỗ khác (response JSON, inspector, token lifecycle) chỉ hiển thị dạng rút gọn.
- `/jwt/issue-demo-token` và `/lab/*` là công cụ dạy học, cố ý lộ chi tiết nội bộ; có thể tắt bằng `DEMO_MODE=false`, `LAB_VULNERABLE_MODES=false`.

## 7. Việc có thể làm tiếp

- Kèm sẵn realm Keycloak mẫu trong `docker-compose` (profile tuỳ chọn) để bật Demo 7 live không cần IdP bên ngoài.
- Rate limiter thật cho `/session/login` và `/tokens/login` kèm demo `429`.
- Session store Redis để minh hoạ scale ngang.
