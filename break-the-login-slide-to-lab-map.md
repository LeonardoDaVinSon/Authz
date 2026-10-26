Dưới đây là bản đặc tả Markdown hoàn chỉnh để đưa trực tiếp cho Cursor triển khai. Bản này kết hợp tài liệu đào tạo, nội dung 25 slide, lời dẫn thuyết trình, demo tương ứng từng phần, kiến trúc ứng dụng NestJS + TypeScript, test bảo mật và checklist nghiệm thu.

Mục tiêu là để Cursor đọc repository hiện tại, lập kế hoạch rồi triển khai thực tế, thay vì chỉ tạo thêm một bản kế hoạch lý thuyết.

# BREAK THE LOGIN — Authentication Core

Implementation Specification · Vietnamese · 90-minute technical sharing

## 1. Tổng quan dự án

### 1.1 Mục tiêu

Xây dựng một bộ tài liệu và demo thực hành cho buổi chia sẻ nội bộ về Authentication, giúp Fullstack Developer từ Fresher đến Senior hiểu được cách thiết kế, triển khai và đánh giá các cơ chế xác thực trong ứng dụng web.

Bộ sản phẩm cần bao gồm:

1. Tài liệu lý thuyết hoàn chỉnh bằng Markdown.
2. Slide thuyết trình bằng tiếng Việt, có speaker notes.
3. Ứng dụng demo bằng NestJS + TypeScript.
4. Các demo tương ứng ngay sau từng phần lý thuyết.
5. Nút trên slide mở trực tiếp demo trong trình duyệt.
6. Unit tests và integration tests cho các hành vi bảo mật quan trọng.
7. README, hướng dẫn chạy demo và kịch bản dự phòng.

### 1.2 Bối cảnh xuyên suốt

Sử dụng một ứng dụng giả lập có tên DevHub:

- Người dùng đăng nhập để xem thông tin cá nhân.
- Người dùng có role `member` hoặc `admin`.
- Một số API yêu cầu đăng nhập.
- Một số API yêu cầu quyền quản trị.
- Hệ thống có session, cookie và JWT để minh họa các cách xác thực khác nhau.
- Hệ thống có thể minh họa OAuth 2.0, OIDC và SAML ở mức kiến trúc.
- Toàn bộ dữ liệu và credential chỉ phục vụ môi trường local.

### 1.3 Đối tượng người nghe

- Fresher: cần hiểu các khái niệm và flow cơ bản.
- Junior/Middle: cần hiểu cách triển khai và debug.
- Senior/Tech Lead: cần đánh giá trade-off, threat model và lựa chọn kiến trúc.

### 1.4 Nguyên tắc thiết kế

- Giải thích nền tảng trước, đi sâu bảo mật sau.
- Mỗi phần lý thuyết phải có demo ngay sau phần đó.
- Không gom toàn bộ demo vào cuối buổi.
- Ưu tiên sơ đồ tự vẽ, flow diagram và request/response thực tế.
- Không dùng Basic Authentication trong nội dung.
- Không dùng tài khoản, token, secret hoặc dữ liệu production.
- Phân biệt rõ demo hoạt động thật với flow minh họa.
- Không giả vờ rằng OIDC đang hoạt động thật nếu chưa cấu hình Identity Provider.
- Không đánh dấu test, build hoặc demo thành công nếu chưa chạy và xác minh.

## 2. Chỉ dẫn triển khai dành cho Cursor

### 2.1 Trước khi viết code

Cursor phải kiểm tra repository hiện tại:

- Cấu trúc thư mục.
- `package.json`, scripts, package manager và phiên bản Node.js.
- Framework và convention đang dùng.
- Tài liệu Markdown hiện có.
- PowerPoint hoặc công cụ tạo slide đang có.
- Các file demo, hình ảnh và diagram đã tồn tại.
- Test, lint và build commands.

Không xóa hoặc thay thế artifact hiện có khi chưa kiểm tra nội dung.

Nếu repository đã có tài liệu hoặc slide, hãy cập nhật và tái sử dụng chúng khi phù hợp thay vì tạo nhiều bản trùng lặp.

### 2.2 Các đầu ra cần tạo

```
docs/
  01-authentication-core.md
  02-slide-content.md
  03-demo-runbook.md
  04-implementation-plan.md

devhub-auth-lab/
  src/
  public/
  test/
  README.md
  .env.example

README.md
```

Đây là cấu trúc mục tiêu tham khảo. Hãy điều chỉnh cho phù hợp với repository thực tế.

Ngoài ra:

- Cập nhật PowerPoint hiện có nếu có thể chỉnh sửa an toàn.
- Nếu chưa có slide deck, tạo deck mới bằng công cụ phù hợp với dự án.
- Không bắt buộc phải tạo file Markdown mới nếu repository đã có file tương đương và có thể cập nhật trực tiếp.

### 2.3 Thứ tự triển khai

1. Audit repository và báo cáo hiện trạng.
2. Hoàn thiện tài liệu lý thuyết.
3. Hoàn thiện nội dung slide và speaker notes.
4. Xây dựng app demo và trang điều hướng.
5. Triển khai demo Authentication/Authorization.
6. Triển khai Password Hashing.
7. Triển khai Session/Cookie/Logout.
8. Triển khai JWT/Claims/Signature.
9. Triển khai Access/Refresh Token nếu đủ phạm vi.
10. Triển khai OIDC thật nếu có cấu hình; nếu không, dùng flow walkthrough.
11. Viết và chạy tests.
12. Thêm link demo vào slide.
13. Kiểm tra links, README, lint, build và tests.
14. Báo cáo kết quả thực tế và phần chưa hoàn thành.

# PHẦN I — TÀI LIỆU ĐÀO TẠO

## 3. Mục tiêu học tập

Sau buổi sharing, người tham gia có thể:

- Phân biệt Authentication và Authorization.
- Hiểu sự khác nhau giữa HTTP `401` và `403`.
- Giải thích vì sao password không nên lưu plaintext.
- Hiểu password hashing, salt, brute-force và credential stuffing.
- Mô tả session-based authentication.
- Giải thích vai trò của cookie và các cookie flags.
- Hiểu session lifecycle, session fixation, CSRF và XSS.
- Đọc cấu trúc JWT và phân biệt decode với verify.
- Giải thích các claims `sub`, `iss`, `aud`, `exp`, `nbf`, `iat`.
- Hiểu tại sao JWT signature và thuật toán xác minh phải được kiểm tra.
- Phân biệt access token và refresh token.
- Hiểu refresh-token rotation và revocation.
- Phân biệt OAuth 2.0 với OpenID Connect.
- Phân biệt ID token với access token.
- Mô tả Authorization Code Flow + PKCE.
- Hiểu vai trò của SAML trong enterprise SSO.
- Biết lựa chọn session hay JWT dựa trên yêu cầu hệ thống thay vì chạy theo xu hướng.

## 4. Lịch trình 90 phút

| Thời gian | Chủ đề                                 | Demo         |
| --------- | -------------------------------------- | ------------ |
| 00–05     | Mở đầu: sự cố login ở DevHub           | Đặt vấn đề   |
| 05–12     | Authentication, Authorization, 401/403 | Demo 1       |
| 12–22     | Password hashing, salt, brute-force    | Demo 2       |
| 22–42     | Session, cookie, lifecycle, CSRF/XSS   | Demo 3, 4, 5 |
| 42–62     | JWT, claims, signature, access/refresh | Demo 6, 7, 8 |
| 62–75     | OAuth 2.0, OIDC, SSO, SAML             | Demo 9       |
| 75–85     | So sánh kiến trúc, case study          | Thảo luận    |
| 85–90     | Checklist và tổng kết                  | Exit Ticket  |

### Nguyên tắc phân bổ thời gian

Không cần demo mọi chi tiết nhỏ. Mỗi demo nên kéo dài khoảng 2–4 phút, chỉ trình diễn một thông điệp chính.

Nếu bị thiếu thời gian, ưu tiên:

1. `401` so với `403`.
2. Hash và verify password.
3. Session và logout.
4. JWT tampering.
5. Access token/refresh token.
6. OIDC có thể chuyển sang sơ đồ nếu môi trường chưa sẵn sàng.

## 5. Authentication và Authorization

### 5.1 Authentication là gì?

Authentication, viết tắt AuthN, là quá trình xác minh danh tính của một người dùng hoặc một hệ thống.

Ví dụ:

Người dùng nhập email và password. Server xác minh password khớp với thông tin đã đăng ký và xác định được user tương ứng.

Câu hỏi Authentication trả lời:

> Bạn là ai?

### 5.2 Authorization là gì?

Authorization, viết tắt AuthZ, là quá trình xác định một principal đã xác thực được phép thực hiện hành động nào.

Ví dụ:

- `member` được xem project.
- `admin` được quản lý user.
- Một user đã login nhưng không có quyền admin thì không thể gọi API admin.

Câu hỏi Authorization trả lời:

> Bạn được phép làm gì?

### 5.3 Luồng tổng quát

\#chatgpt-mermaid-\_r_2f3\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_2f3\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2f3\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2f3\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2f3\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_2f3\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_2f3\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_2f3\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_2f3\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_2f3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2f3\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2f3\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_2f3\_ p{margin:0;}#chatgpt-mermaid-\_r_2f3\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_2f3\_ .label text,#chatgpt-mermaid-\_r_2f3\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .node rect,#chatgpt-mermaid-\_r_2f3\_ .node circle,#chatgpt-mermaid-\_r_2f3\_ .node ellipse,#chatgpt-mermaid-\_r_2f3\_ .node polygon,#chatgpt-mermaid-\_r_2f3\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .rough-node .label text,#chatgpt-mermaid-\_r_2f3\_ .node .label text,#chatgpt-mermaid-\_r_2f3\_ .image-shape .label,#chatgpt-mermaid-\_r_2f3\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_2f3\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .rough-node .label,#chatgpt-mermaid-\_r_2f3\_ .node .label,#chatgpt-mermaid-\_r_2f3\_ .image-shape .label,#chatgpt-mermaid-\_r_2f3\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_2f3\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_2f3\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2f3\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2f3\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_2f3\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_2f3\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2f3\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2f3\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_2f3\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_2f3\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2f3\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_2f3\_ .icon-shape,#chatgpt-mermaid-\_r_2f3\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_2f3\_ .icon-shape p,#chatgpt-mermaid-\_r_2f3\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_2f3\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_2f3\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2f3\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_2f3\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_2f3\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_2f3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_2f3\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_2f3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_2f3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2f3\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_2f3\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2f3\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_2f3\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_2f3\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_2f3\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_2f3\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .node rect,#chatgpt-mermaid-\_r_2f3\_ .node circle,#chatgpt-mermaid-\_r_2f3\_ .node ellipse,#chatgpt-mermaid-\_r_2f3\_ .node polygon,#chatgpt-mermaid-\_r_2f3\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_2f3\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_2f3\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_2f3\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_2f3\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2f3\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}HTTP RequestCredential hợp lệ?401 UnauthorizedĐủ quyền?403 ForbiddenCho phép thực hiệnKhôngCóKhôngCó

### 5.4 Phân biệt 401 và 403

| Tình huống                                            | Kết quả thường dùng                     |
| ----------------------------------------------------- | --------------------------------------- |
| Request chưa đăng nhập vào API yêu cầu authentication | `401`                                   |
| Access token không hợp lệ hoặc hết hạn                | `401`                                   |
| Session đã bị revoke                                  | `401`                                   |
| Member đã xác thực nhưng gọi API admin                | `403`                                   |
| Admin có quyền phù hợp gọi API admin                  | `200` hoặc status phù hợp với hành động |

`401 Unauthorized` có tên gọi hơi gây nhầm lẫn: trong thực tế, nó thường biểu thị rằng request chưa cung cấp credential hợp lệ.

`403 Forbidden` biểu thị rằng server từ chối thực hiện hành động trong ngữ cảnh hiện tại.

Lưu ý: Đây là cách phân loại phổ biến, không thay thế việc đọc đúng HTTP semantics và contract của từng API.

### 5.5 Những lỗi triển khai thường gặp

- Chỉ ẩn nút admin trên frontend.
- Backend không kiểm tra quyền.
- Đăng nhập thành công đồng nghĩa với việc có thể gọi mọi API.
- Trả `200` nhưng chứa thông báo lỗi trong response body mà không có quy ước rõ ràng.
- Trả thông tin quá chi tiết về việc tài khoản có tồn tại hay không.

### Demo 1 — Authentication và Authorization

Mục tiêu: chứng minh `401` và `403` là hai tình huống khác nhau.

Các bước:

1. Gọi `GET /api/me` khi chưa login.
2. Quan sát response `401`.
3. Login bằng user demo role `member`.
4. Gọi `GET /api/admin`.
5. Quan sát response `403`.
6. Login bằng user demo role `admin`.
7. Gọi lại `GET /api/admin`.
8. Quan sát response thành công.

Kết luận: Authentication xác định danh tính; Authorization kiểm tra quyền. Backend phải thực hiện kiểm tra quyền, không chỉ dựa vào UI.

## 6. Password Hashing và bảo vệ password

### 6.1 Vì sao không lưu password plaintext?

Giả sử database chứa:

| User   | Password        |
| ------ | --------------- |
| user-a | `mypassword123` |
| user-b | `admin123456`   |

Nếu database bị lộ, kẻ tấn công có thể sử dụng trực tiếp các password này hoặc thử chúng trên những dịch vụ khác.

Password thường được người dùng tái sử dụng, vì vậy rủi ro không chỉ giới hạn trong một ứng dụng.

### 6.2 Hashing khác encryption

Encryption là mã hóa có thể giải mã nếu có key phù hợp.

Hashing là biến đổi một chiều. Trong quá trình login, hệ thống không cần giải mã password đã lưu. Thay vào đó, hệ thống dùng hàm verify để kiểm tra password người dùng nhập có khớp với hash được lưu hay không.

Không tự thiết kế thuật toán password hashing.

Các lựa chọn phổ biến gồm:

- Argon2id.
- bcrypt.

Lựa chọn cụ thể phụ thuộc runtime, thư viện được duy trì, chính sách bảo mật và khả năng triển khai của hệ thống.

Không dùng SHA-256 thuần làm lựa chọn mặc định để lưu password, vì các hash tổng quát nhanh khiến việc đoán password offline dễ mở rộng hơn.

### 6.3 Salt là gì?

Salt là giá trị ngẫu nhiên được sử dụng riêng cho mỗi password hash.

Ví dụ:

```
Password: my-password

Hash lần 1 = Hash(password + salt-A)
Hash lần 2 = Hash(password + salt-B)
```

Dù password giống nhau, hai hash có thể khác nhau vì salt khác nhau.

Salt không phải secret. Salt thường được lưu cùng password hash.

### 6.4 Brute-force và credential stuffing

Brute-force: thử nhiều password để tìm ra password đúng.

Credential stuffing: sử dụng cặp username/password bị lộ từ một dịch vụ để thử đăng nhập vào dịch vụ khác.

Các biện pháp bổ sung:

- Rate limiting.
- Backoff phù hợp.
- Theo dõi hành vi đăng nhập bất thường.
- MFA.
- Kiểm tra password bị lộ theo quy trình an toàn.
- Không tạo cơ chế khóa tài khoản vô thời hạn dễ bị lợi dụng để gây DoS.

Password hashing giúp tăng chi phí đoán password offline, nhưng không thay thế các biện pháp bảo vệ login online.

### Demo 2 — Hash, verify và salt

UI gồm:

- Ô nhập password demo.
- Nút `Hash Password`.
- Nút `Verify Correct Password`.
- Nút `Verify Wrong Password`.
- Phần hiển thị kết quả.

Kịch bản:

1. Hash password lần thứ nhất.
2. Hash lại cùng password.
3. So sánh hai hash.
4. Verify password đúng.
5. Verify password sai.

Kết quả mong đợi:

- Hai hash có thể khác nhau do salt.
- Ô password thử (đúng hoặc sai) + một nút Verify; sau verify in hash đã dùng để so sánh.
- Password đúng → verify thành công; password sai → thất bại.
- Không log password ra console.
- Dùng thư viện chuyên dụng thay vì tự viết thuật toán.

## 7. Session-based Authentication

### 7.1 Session hoạt động như thế nào?

Trong mô hình session-based:

1. Người dùng gửi credential.
2. Server xác minh credential.
3. Server tạo session.
4. Browser nhận session identifier qua cookie.
5. Browser gửi cookie ở các request sau.
6. Server dùng identifier để tra cứu session.
7. Khi logout hoặc session hết hạn, server vô hiệu hóa session.

Session StoreDevHub APIBrowserSession StoreDevHub APIBrowser#chatgpt-mermaid-\_r_2fi\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_2fi\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2fi\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2fi\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fi\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fi\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_2fi\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_2fi\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_2fi\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_2fi\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_2fi\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_2fi\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_2fi\_ p{margin:0;}#chatgpt-mermaid-\_r_2fi\_ .actor{stroke:rgb(31, 78, 148);fill:rgb(9, 23, 44);stroke-width:1;}#chatgpt-mermaid-\_r_2fi\_ rect.actor.outer-path[data-look="neo"]{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ rect.note[data-look="neo"]{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ text.actor>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2fi\_ .actor-line{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#chatgpt-mermaid-\_r_2fi\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ [id$="-arrowhead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ .sequenceNumber{fill:#505050;}#chatgpt-mermaid-\_r_2fi\_ [id$="-sequencenumber"]{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ [id$="-crosshead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fi\_ .messageText{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2fi\_ .labelBox{stroke:rgba(255, 255, 255, 0.15);fill:rgb(0, 0, 0);filter:none;}#chatgpt-mermaid-\_r_2fi\_ .labelText,#chatgpt-mermaid-\_r_2fi\_ .labelText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2fi\_ .loopText,#chatgpt-mermaid-\_r_2fi\_ .loopText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2fi\_ .sectionTitle,#chatgpt-mermaid-\_r_2fi\_ .sectionTitle>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2fi\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:rgba(255, 255, 255, 0.15);fill:rgba(255, 255, 255, 0.15);}#chatgpt-mermaid-\_r_2fi\_ .note{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fi\_ .noteText,#chatgpt-mermaid-\_r_2fi\_ .noteText>tspan{fill:rgb(237, 237, 237);stroke:none;font-weight:normal;}#chatgpt-mermaid-\_r_2fi\_ .activation0{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2fi\_ .activation1{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2fi\_ .activation2{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2fi\_ .actorPopupMenu{position:absolute;}#chatgpt-mermaid-\_r_2fi\_ .actorPopupMenuPanel{position:absolute;fill:rgb(9, 23, 44);box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#chatgpt-mermaid-\_r_2fi\_ .actor-man circle,#chatgpt-mermaid-\_r_2fi\_ line{fill:rgb(9, 23, 44);stroke-width:2px;}#chatgpt-mermaid-\_r_2fi\_ g rect.rect{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2fi\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_2fi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_2fi\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_2fi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_2fi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_2fi\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fi\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}POST /auth/loginVerify credentialCreate sessionSession identifierSet-CookieGET /api/me + CookieLookup sessionSession valid200 OK

### 7.2 Cookie flags

| Flag                  | Ý nghĩa                                           | Lưu ý                             |
| --------------------- | ------------------------------------------------- | --------------------------------- |
| `HttpOnly`            | JavaScript không đọc trực tiếp cookie             | Không ngăn mọi tác động của XSS   |
| `Secure`              | Chỉ gửi cookie qua HTTPS                          | Production cần HTTPS              |
| `SameSite`            | Kiểm soát một số trường hợp gửi cookie cross-site | Không thay thế mọi biện pháp CSRF |
| `Path`                | Giới hạn phạm vi path gửi cookie                  | Cấu hình phù hợp                  |
| `Domain`              | Ảnh hưởng phạm vi domain                          | Tránh mở rộng không cần thiết     |
| `Max-Age` / `Expires` | Thời hạn cookie phía browser                      | Cần đồng bộ với session lifecycle |

Không có một cấu hình cookie đúng cho mọi ứng dụng. Cần xem xét HTTPS, domain, cross-site frontend và yêu cầu đăng nhập.

### 7.3 Session lifecycle

\#chatgpt-mermaid-\_r_2fr\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_2fr\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2fr\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2fr\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fr\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_2fr\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_2fr\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_2fr\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_2fr\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_2fr\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_2fr\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_2fr\_ p{margin:0;}#chatgpt-mermaid-\_r_2fr\_ defs [id$="-barbEnd"]{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ g.stateGroup text{fill:rgb(31, 78, 148);stroke:none;font-size:10px;}#chatgpt-mermaid-\_r_2fr\_ g.stateGroup text{fill:rgb(237, 237, 237);stroke:none;font-size:10px;}#chatgpt-mermaid-\_r_2fr\_ g.stateGroup .state-title{font-weight:bolder;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ g.stateGroup rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2fr\_ g.stateGroup line{stroke:rgb(175, 175, 175);stroke-width:1;}#chatgpt-mermaid-\_r_2fr\_ .transition{stroke:rgb(175, 175, 175);stroke-width:1;fill:none;}#chatgpt-mermaid-\_r_2fr\_ .stateGroup .composit{fill:transparent;border-bottom:1px;}#chatgpt-mermaid-\_r_2fr\_ .stateGroup .alt-composit{fill:#e0e0e0;border-bottom:1px;}#chatgpt-mermaid-\_r_2fr\_ .state-note{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fr\_ .state-note text{fill:rgb(237, 237, 237);stroke:none;font-size:10px;}#chatgpt-mermaid-\_r_2fr\_ .stateLabel .box{stroke:none;stroke-width:0;fill:rgb(9, 23, 44);opacity:0.5;}#chatgpt-mermaid-\_r_2fr\_ .edgeLabel .label rect{fill:rgb(9, 23, 44);opacity:0.5;}#chatgpt-mermaid-\_r_2fr\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_2fr\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2fr\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2fr\_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .label div .edgeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .stateLabel text{fill:rgb(237, 237, 237);font-size:10px;font-weight:bold;}#chatgpt-mermaid-\_r_2fr\_ .node circle.state-start{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ .node .fork-join{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ .node circle.state-end{fill:rgb(31, 78, 148);stroke:transparent;stroke-width:1.5;}#chatgpt-mermaid-\_r_2fr\_ .end-state-inner{fill:transparent;stroke-width:1.5;}#chatgpt-mermaid-\_r_2fr\_ .node rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_2fr\_ .node polygon{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_2fr\_ [id$="-barbEnd"]{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2fr\_ .statediagram-cluster rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_2fr\_ .cluster-label,#chatgpt-mermaid-\_r_2fr\_ .nodeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .statediagram-cluster rect.outer{rx:5px;ry:5px;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-state .divider{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2fr\_ .statediagram-state .title-state{rx:5px;ry:5px;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-cluster.statediagram-cluster .inner{fill:transparent;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-cluster.statediagram-cluster-alt .inner{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fr\_ .statediagram-cluster .inner{rx:0;ry:0;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-state rect.basic{rx:5px;ry:5px;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-state rect.divider{stroke-dasharray:10,10;fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2fr\_ .note-edge{stroke-dasharray:5;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-note rect{fill:rgb(48, 48, 48);stroke:rgb(58, 132, 63);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-note rect{fill:rgb(48, 48, 48);stroke:rgb(58, 132, 63);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-\_r_2fr\_ .statediagram-note text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .statediagram-note .nodeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ .statediagram .edgeLabel{color:red;}#chatgpt-mermaid-\_r_2fr\_ [id$="-dependencyStart"],#chatgpt-mermaid-\_r_2fr\_ [id$="-dependencyEnd"]{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);stroke-width:1;}#chatgpt-mermaid-\_r_2fr\_ .statediagramTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].statediagram-cluster rect{fill:rgb(9, 23, 44);stroke:url(#chatgpt-mermaid-\_r_2fr\_-gradient);stroke-width:1;}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].statediagram-cluster rect.outer{rx:5px;ry:5px;filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_2fr\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_2fr\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_2fr\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_2fr\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_2fr\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2fr\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}AnonymousAuthenticatedExpiredRevokedLogin thành côngRequest hợp lệHết hạnLogout hoặc revoke

### 7.4 Session fixation

Session fixation là tình huống attacker cố khiến nạn nhân sử dụng một session identifier mà attacker đã biết.

Biện pháp quan trọng:

- Regenerate session ID sau khi login thành công.
- Không tin session identifier do client tự chọn.
- Không giữ nguyên session ID trước và sau authentication nếu cơ chế/framework yêu cầu regenerate.
- Cấu hình session lifecycle phù hợp.

### 7.5 CSRF và XSS

CSRF xảy ra khi browser gửi credential theo request mà người dùng không chủ đích thực hiện.

Biện pháp có thể gồm:

- `SameSite` phù hợp.
- CSRF token.
- Kiểm tra `Origin`/`Referer` trong bối cảnh phù hợp.
- Không dùng GET cho hành động thay đổi dữ liệu.
- Thiết kế endpoint mutation đúng cách.

XSS là khi script độc hại chạy trong origin ứng dụng.

Biện pháp có thể gồm:

- Output encoding.
- Sanitization phù hợp.
- Content Security Policy.
- Tránh đưa dữ liệu không tin cậy vào HTML theo cách nguy hiểm.

`HttpOnly` giảm khả năng JavaScript đọc cookie, nhưng không ngăn script độc hại thực hiện request dưới quyền người dùng.

### 7.6 Logout và revocation

Xóa cookie ở browser không tự động có nghĩa server đã vô hiệu hóa session.

Nếu server vẫn coi session cũ là hợp lệ, bản sao session identifier bị đánh cắp có thể tiếp tục hoạt động.

Logout đúng cần:

1. Invalidate session ở server.
2. Gửi cookie hết hạn về browser.
3. Đảm bảo request tiếp theo không còn được xác thực bằng session cũ.

### Demo 3 — Login và session

1. Mở Session Demo.
2. Xem trạng thái chưa login.
3. Login bằng user demo.
4. Gọi `/api/me`.
5. Xác nhận user profile được trả về.
6. Quan sát cookie trong DevTools.

### Demo 4 — Cookie flags

1. Mở DevTools.
2. Vào Application/Storage → Cookies.
3. Chỉ ra các flags.
4. Giải thích flag nào ảnh hưởng đến JavaScript, HTTPS và cross-site request.
5. Không copy cookie value vào slide hoặc log.

### Demo 5 — Logout và revoke

1. Login.
2. Gọi `/api/me` và nhận `200`.
3. Logout.
4. Gọi lại `/api/me`.
5. Nhận `401`.
6. Giải thích sự khác nhau giữa xoá cookie và invalidate session phía server.

## 8. JWT — Cấu trúc, claims và xác minh

### 8.1 JWT là gì?

JWT là định dạng token có cấu trúc, thường được sử dụng để truyền claims giữa các bên.

JWT dạng signed phổ biến có ba phần:

```
header.payload.signature
```

- Header: metadata, ví dụ thuật toán.
- Payload: claims.
- Signature: dùng để xác minh token không bị sửa và được phát hành theo cơ chế ký tương ứng.

Payload của JWT thông thường chỉ được Base64URL-encode, không tự động được mã hóa bí mật.

### 8.2 Decode không phải verify

Có thể decode JWT để đọc payload.

Tuy nhiên, việc decode thành công không chứng minh:

- Chữ ký hợp lệ.
- Token được phát hành bởi issuer mong đợi.
- Token dành cho API hiện tại.
- Token chưa hết hạn.
- Claims trong token đáng tin cậy.

Backend cần verify token theo đúng thuật toán và policy.

### 8.3 Các claims quan trọng

| Claim | Ý nghĩa         |
| ----- | --------------- |
| `sub` | Subject         |
| `iss` | Issuer          |
| `aud` | Audience        |
| `exp` | Expiration time |
| `nbf` | Not-before time |
| `iat` | Issued-at time  |
| `jti` | JWT identifier  |

Không phải mọi ứng dụng đều bắt buộc sử dụng tất cả claims, nhưng cần xác định rõ những claim nào phải có và phải được kiểm tra.

### 8.4 Signature và thuật toán

Backend cần:

- Chỉ chấp nhận thuật toán đã cấu hình rõ ràng.
- Verify signature.
- Validate issuer và audience.
- Validate thời hạn.
- Kiểm tra các claims bắt buộc.
- Từ chối thuật toán không được allowlist.
- Không chấp nhận `alg: none` cho token yêu cầu xác minh chữ ký.
- Không tự viết thuật toán JWT.

### 8.5 Ví dụ về JWT tampering

Giả sử token hợp lệ có payload:

```
{
  "sub": "user-01",
  "role": "member"
}
```

Attacker sửa payload thành:

```
{
  "sub": "user-01",
  "role": "admin"
}
```

Nếu attacker không thể tạo signature hợp lệ theo key và thuật toán được server chấp nhận, token đã sửa phải bị từ chối.

Điều quan trọng không phải payload trông như thế nào, mà là backend có xác minh token đúng cách hay không.

### Demo 6 — Decode JWT

1. Cấp JWT demo cho member.
2. Hiển thị header và payload.
3. Giải thích `sub`, `role`, `iss`, `aud`, `exp`.
4. Verify token gốc.
5. Nhắc lại: decode chỉ đọc dữ liệu, không xác minh tính hợp lệ.

### Demo 7 — JWT tampering

1. Cấp token member.
2. Dùng helper local tạo token fixture có payload đã bị sửa.
3. Không ký lại bằng key hợp lệ.
4. Gửi token đã sửa đến endpoint bảo vệ.
5. Backend trả `401`.
6. Gửi token member hợp lệ tới endpoint admin.
7. Backend trả `403`.

Demo phải giới hạn hoàn toàn trong ứng dụng local. Không hướng dẫn khai thác hệ thống bên ngoài hoặc lấy signing key.

## 9. Access Token và Refresh Token

### 9.1 Access token

Access token được sử dụng để truy cập API hoặc resource theo phạm vi được cấp.

Thông thường:

- Có thời hạn tương đối ngắn.
- Được gửi cùng request API.
- Phải được kiểm tra audience, expiry và các điều kiện xác minh khác.

### 9.2 Refresh token

Refresh token dùng để xin access token mới mà không yêu cầu người dùng login lại ở mọi lần access token hết hạn.

Refresh token thường có vòng đời dài hơn và cần được bảo vệ chặt chẽ.

### 9.3 Rotation

Trong refresh-token rotation:

1. Client gửi refresh token hiện tại.
2. Server xác minh token.
3. Server cấp access token mới và refresh token mới.
4. Refresh token cũ bị vô hiệu hóa.
5. Nếu token cũ được sử dụng lại, server có thể phát hiện reuse và thu hồi token family tùy thiết kế.

Không phải mọi hệ thống đều triển khai rotation giống nhau. Phải document chính xác behavior đã implement.

### 9.4 Logout

Logout cần xử lý các credential còn hiệu lực theo thiết kế hệ thống.

Với hệ thống có refresh token, chỉ xóa access token khỏi UI có thể chưa đủ. Cần xem xét revoke refresh token, session hoặc token family.

### Demo 8 — Token lifecycle

1. Login bằng user demo.
2. Nhận access token và refresh token demo.
3. Dùng access token gọi API.
4. Dùng refresh token để lấy token mới.
5. Nếu đã implement rotation, thử refresh token cũ và xác nhận bị từ chối.
6. Logout/revoke và thử lại refresh token.
7. Xác nhận token đã revoke bị từ chối.

Nếu chưa triển khai đầy đủ rotation, demo phải hiển thị rõ `SIMULATED FLOW`. Không mô tả mock như cơ chế production-ready.

## 10. OAuth 2.0, OIDC, SSO và SAML

Giải thích thuật ngữ tại chỗ khi trình bày: OAuth (ủy quyền) → OIDC (login / ID token) → SSO·SAML (enterprise).

### 10.1 OAuth 2.0

OAuth 2.0 là framework về ủy quyền truy cập.

Nó cho phép client nhận quyền truy cập resource theo phạm vi được cấp.

OAuth 2.0 tự thân không phải giao thức xác minh danh tính người dùng.

### 10.2 OpenID Connect

OIDC bổ sung lớp identity trên OAuth 2.0.

Hai loại token cần phân biệt:

| Token        | Mục đích                                             |
| ------------ | ---------------------------------------------------- |
| ID token     | Truyền thông tin identity cho client theo OIDC       |
| Access token | Truy cập resource/API theo audience và scope phù hợp |

Không mặc định dùng ID token để gọi API.

### 10.3 Authorization Code Flow + PKCE

Identity ProviderDevHub ClientUser/BrowserIdentity ProviderDevHub ClientUser/Browser#chatgpt-mermaid-\_r_2go\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_2go\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2go\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2go\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2go\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2go\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_2go\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_2go\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_2go\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_2go\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_2go\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_2go\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_2go\_ p{margin:0;}#chatgpt-mermaid-\_r_2go\_ .actor{stroke:rgb(31, 78, 148);fill:rgb(9, 23, 44);stroke-width:1;}#chatgpt-mermaid-\_r_2go\_ rect.actor.outer-path[data-look="neo"]{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ rect.note[data-look="neo"]{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ text.actor>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2go\_ .actor-line{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#chatgpt-mermaid-\_r_2go\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ [id$="-arrowhead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ .sequenceNumber{fill:#505050;}#chatgpt-mermaid-\_r_2go\_ [id$="-sequencenumber"]{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ [id$="-crosshead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2go\_ .messageText{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2go\_ .labelBox{stroke:rgba(255, 255, 255, 0.15);fill:rgb(0, 0, 0);filter:none;}#chatgpt-mermaid-\_r_2go\_ .labelText,#chatgpt-mermaid-\_r_2go\_ .labelText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2go\_ .loopText,#chatgpt-mermaid-\_r_2go\_ .loopText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2go\_ .sectionTitle,#chatgpt-mermaid-\_r_2go\_ .sectionTitle>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-\_r_2go\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:rgba(255, 255, 255, 0.15);fill:rgba(255, 255, 255, 0.15);}#chatgpt-mermaid-\_r_2go\_ .note{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2go\_ .noteText,#chatgpt-mermaid-\_r_2go\_ .noteText>tspan{fill:rgb(237, 237, 237);stroke:none;font-weight:normal;}#chatgpt-mermaid-\_r_2go\_ .activation0{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2go\_ .activation1{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2go\_ .activation2{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-\_r_2go\_ .actorPopupMenu{position:absolute;}#chatgpt-mermaid-\_r_2go\_ .actorPopupMenuPanel{position:absolute;fill:rgb(9, 23, 44);box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#chatgpt-mermaid-\_r_2go\_ .actor-man circle,#chatgpt-mermaid-\_r_2go\_ line{fill:rgb(9, 23, 44);stroke-width:2px;}#chatgpt-mermaid-\_r_2go\_ g rect.rect{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2go\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_2go\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_2go\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_2go\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_2go\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_2go\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2go\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Chọn Sign inTạo code_verifier và code_challengeAuthorization request + state + nonce + challengeHiển thị trang đăng nhậpXác thựcRedirect callback + authorization codeToken request + code_verifierToken responseValidate ID token nếu dùng OIDC

### 10.4 Vai trò các giá trị

- `state`: liên kết request ban đầu với callback, giúp phòng vệ trong authorization flow.
- `nonce`: liên kết ID token với request OIDC.
- `code_verifier` và `code_challenge`: cơ chế PKCE bảo vệ authorization code.
- Redirect URI: cần được đăng ký và kiểm soát chặt chẽ.

### 10.5 SSO

Single Sign-On là trải nghiệm cho phép người dùng đăng nhập một lần rồi truy cập nhiều ứng dụng trong một hệ sinh thái, thường dựa vào Identity Provider chung.

SSO là trải nghiệm/kiến trúc, không phải tên một giao thức duy nhất.

### 10.6 SAML

SAML là chuẩn trao đổi assertion (XML đã ký) về identity giữa Identity Provider và Service Provider, phổ biến trong môi trường enterprise.

- **IdP**: xác thực user, phát hành Assertion (Okta, ADFS, Azure AD…).
- **SP**: ứng dụng tin IdP, tạo session cục bộ (DevHub).
- **Luồng SP-initiated**: SP → AuthnRequest → IdP → SAML Response về ACS → SP verify (chữ ký, Audience, Destination, NotOnOrAfter, InResponseTo) → session.
- Cùng bài toán SSO với OIDC; chọn theo IdP/khách hàng, không theo "protocol nào mới hơn".

Buổi sharing chỉ cần làm rõ:

- Identity Provider (IdP).
- Service Provider (SP).
- Assertion.
- Browser redirect/post ở mức tổng quát.
- Vai trò của signature, metadata và audience validation.

### Demo 9 — OIDC

Nếu có Identity Provider được cấu hình:

- Thực hiện Authorization Code Flow + PKCE.
- Kiểm tra callback, `state`, PKCE, signature và các claims OIDC phù hợp.
- Không log token hoặc client secret đầy đủ.

Nếu chưa có Identity Provider:

- Hiển thị flow diagram.
- Dùng sample response giả lập.
- Gắn nhãn rõ: `FLOW WALKTHROUGH — NO REAL LOGIN`.
- Không tạo nút login giả làm việc thật.

## 11. Session hay JWT?

| Tiêu chí           | Session                                          | JWT access token                                      |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| Quản lý trạng thái | Thường có state phía server                      | Có thể verify mà không tra cứu session mỗi request    |
| Logout/revoke      | Trực tiếp nếu server quản lý session             | Cần thiết kế expiry/revoke/rotation                   |
| Scale              | Cần chia sẻ session store hoặc kiến trúc phù hợp | Thuận tiện phân phối verify nhưng vẫn cần quản lý key |
| Payload            | Client thường chỉ giữ session identifier         | Payload có thể đọc nếu chỉ được ký                    |
| Browser security   | Cookie flags, CSRF và session lifecycle          | Token storage, XSS/CSRF và refresh lifecycle          |
| Use case           | Web app quản lý phiên phía server                | API/distributed systems khi trade-off phù hợp         |

Không có đáp án đúng tuyệt đối.

Cần lựa chọn dựa trên:

- Loại client.
- Threat model.
- Yêu cầu revoke.
- Scale.
- SSO.
- Khả năng vận hành.
- Cơ chế lưu credential.
- Năng lực bảo trì và giám sát.

## 12. Authentication Security Checklist

- Password không được lưu plaintext.
- Dùng Argon2id hoặc bcrypt với cấu hình phù hợp.
- Có rate limiting và giám sát login thất bại.
- Không để response login tiết lộ quá nhiều thông tin tài khoản.
- Session ID được regenerate sau login nếu kiến trúc/framework yêu cầu.
- Logout invalidates session phía server.
- Cookie flags phù hợp với deployment.
- Có đánh giá CSRF với browser gửi cookie tự động.
- Có biện pháp phòng vệ XSS.
- JWT signature được verify bằng thuật toán allowlist.
- Validate issuer, audience và expiration.
- Từ chối token đã bị sửa.
- Không chấp nhận `alg: none` cho token cần xác minh chữ ký.
- Access token và refresh token có mục đích riêng.
- Refresh rotation/revoke được thiết kế nếu có refresh token.
- Không log password, cookie, token hoặc secret.
- Backend enforce authorization.
- OIDC callback, state, nonce, PKCE và claims được validate nếu sử dụng OIDC.
- Có test cho session/token hết hạn, bị sửa và bị revoke.

# PHẦN II — NỘI DUNG 25 SLIDE VÀ KỊCH BẢN THUYẾT TRÌNH

Phần này là nội dung đầu vào để Cursor tạo PowerPoint. Nội dung hiển thị trên slide cần ngắn gọn; lời dẫn, câu hỏi và kịch bản demo nên đặt trong speaker notes.

## 13. Slide 1 — Break the Login

Thời lượng: 1 phút

Nội dung hiển thị

- Break the Login
- Authentication Core
- Từ login đến credential lifecycle
- DevHub · Fullstack Technical Sharing

Visual: Browser → DevHub API → Session Store / Identity Provider.

Lời dẫn

“Hôm nay chúng ta không chỉ xem cách login thành công. Chúng ta sẽ theo dõi credential từ lúc được tạo, lưu trữ, gửi qua request, xác minh cho đến khi hết hạn hoặc bị thu hồi.”

Demo: Chưa mở demo.

## 14. Slide 2 — Một sự cố tại DevHub

Thời lượng: 4 phút

Nội dung hiển thị

DevHub đang gặp ba tình huống:

1. User logout nhưng request vẫn chạy.
2. Member gọi được API admin.
3. JWT có payload `role: admin`.

Lời dẫn

“Cả ba đều trông giống vấn đề login, nhưng có thể nằm ở ba lớp khác nhau: authentication, authorization và token validation.”

Câu hỏi tương tác

- Tình huống nào liên quan tới authentication?
- Tình huống nào liên quan tới authorization?
- Logout có nhất thiết làm token cũ mất hiệu lực ngay không?

Visual: Ba incident cards, không dùng ảnh stock.

## 15. Slide 3 — Authentication ≠ Authorization

Thời lượng: 3 phút

Nội dung hiển thị

- AuthN — Who are you?
- AuthZ — What can you do?
- Login thành công không đồng nghĩa có mọi quyền.

Visual: Sơ đồ hai bước AuthN → AuthZ.

Lời dẫn

“Authentication xác định danh tính. Authorization quyết định danh tính đó có được thực hiện hành động đang yêu cầu hay không. Hai bước này cần được kiểm soát độc lập.”

## 16. Slide 4 — 401 hay 403?

Thời lượng: 4 phút

Nội dung hiển thị

- `401`: Credential thiếu hoặc không hợp lệ.
- `403`: Đã được xác thực nhưng không đủ quyền trong ngữ cảnh hiện tại.
- Backend phải enforce quyền.

Demo ngay sau slide: Demo 1 — API Authorization.

Nút mở demo: `Mở API Demo ↗`

Kịch bản

1. Gọi `/api/me` chưa login → `401`.
2. Login member.
3. Gọi `/api/admin` → `403`.
4. Login admin.
5. Gọi `/api/admin` → `200`.

Lời kết

“Ẩn nút ở frontend không phải authorization. API phải tự kiểm tra quyền.”

## 17. Slide 5 — Password không phải dữ liệu để đọc lại

Thời lượng: 3 phút

Nội dung hiển thị

- Không lưu plaintext.
- Hashing khác encryption.
- Verify thay vì giải mã.
- Dùng password hashing chuyên dụng.

Visual: Password → Argon2id/bcrypt + salt → stored hash.

Lời dẫn

“Ứng dụng không cần lấy lại password gốc từ database. Nó chỉ cần xác minh password người dùng nhập có khớp với hash được lưu hay không.”

## 18. Slide 6 — Salt, brute-force và credential stuffing

Thời lượng: 4 phút

Nội dung hiển thị

- Salt ngẫu nhiên cho mỗi hash.
- Hash chậm làm tăng chi phí đoán offline.
- Rate limit, monitoring và MFA bổ sung cho hashing.

Demo ngay sau slide: Demo 2 — Password Hashing.

Nút mở demo: `Mở Password Demo ↗`

Kịch bản

1. Hash cùng password hai lần.
2. So sánh hash.
3. Verify password đúng.
4. Verify password sai.

Lời kết

“Salt không phải secret. Mục tiêu là tránh việc password giống nhau luôn cho cùng một hash và tăng khả năng chống các phương pháp đoán password offline.”

## 19. Slide 7 — Session-based Authentication

Thời lượng: 3 phút

Nội dung hiển thị

- Server xác minh credential.
- Server tạo session.
- Browser giữ session identifier qua cookie.
- Server tra cứu session ở request tiếp theo.

Visual: Sequence diagram login → `Set-Cookie` → `/api/me`.

Lời dẫn

“Cookie không nhất thiết chứa thông tin người dùng. Với session-based authentication, cookie thường mang một session identifier để server tra cứu trạng thái phiên.”

## 20. Slide 8 — Cookie là credential

Thời lượng: 4 phút

Nội dung hiển thị

- `HttpOnly`
- `Secure`
- `SameSite`
- `Path`, `Domain`, `Max-Age`

Demo ngay sau slide: Demo 3 — Session và Cookie.

Nút mở demo: `Mở Session Demo ↗`

Kịch bản

1. Login.
2. Quan sát `Set-Cookie`.
3. Gọi `/api/me`.
4. Mở DevTools và chỉ ra các flags.

Lời dẫn

“Không có một bộ cookie flags đúng cho mọi môi trường. Cấu hình phải phù hợp với HTTPS, domain, frontend/backend deployment và cách ứng dụng sử dụng cookie.”

## 21. Slide 9 — Session lifecycle và fixation

Thời lượng: 4 phút

Nội dung hiển thị

- Login → create/regenerate → use → expire/revoke.
- Regenerate session ID sau khi xác thực.
- Logout cần invalidate session phía server.
- Xóa cookie không nhất thiết revoke session.

Demo ngay sau slide: Demo 4 — Logout và Revocation.

Nút mở demo: `Mở Logout Demo ↗`

Kịch bản

1. Login và gọi `/api/me`.
2. Logout.
3. Gọi `/api/me` lần nữa.
4. Xác nhận `401`.
5. Giải thích cookie phía browser và session phía server.

## 22. Slide 10 — CSRF và XSS không giống nhau

Thời lượng: 4 phút

Nội dung hiển thị

- CSRF: browser gửi credential ngoài ý muốn.
- XSS: script độc hại chạy trong origin ứng dụng.
- `HttpOnly` không ngăn mọi tác động của XSS.
- `SameSite` không thay thế toàn bộ CSRF protection.

Visual: Hai flow diagram đặt cạnh nhau.

Lời dẫn

“CSRF và XSS có thể cùng ảnh hưởng đến một ứng dụng dùng cookie, nhưng nguyên nhân và cách phòng vệ khác nhau. Không nên coi một cookie flag là giải pháp bảo mật toàn diện.”

Không cần demo khai thác. Dùng diagram để giữ nhịp và tập trung vào cách phòng vệ.

## 23. Slide 11 — JWT: ba phần, ba ý nghĩa

Thời lượng: 3 phút

Nội dung hiển thị

- `header.payload.signature`
- Payload có thể đọc được.
- Decode không đồng nghĩa verify.
- Signature giúp phát hiện token bị sửa khi được kiểm tra đúng.

Visual: Ba khối màu hoặc ba khối trung tính, mỗi khối giải thích một phần JWT.

Lời dẫn

“JWT không tự động bí mật chỉ vì có chữ ký. Nếu chỉ là signed JWT, payload vẫn có thể đọc được.”

## 24. Slide 12 — JWT claims cần validate

Thời lượng: 3 phút

Nội dung hiển thị

- `sub` — Subject
- `iss` — Issuer
- `aud` — Audience
- `exp` — Expiration
- `nbf`, `iat`, `jti` — Claims tùy use case

Lời dẫn

“Chữ ký hợp lệ chưa chắc đã đủ. Token có thể được phát hành hợp lệ nhưng dành cho một API khác, vì vậy audience cũng phải được kiểm tra.”

## 25. Slide 13 — Đừng tin payload chỉ vì đọc được

Thời lượng: 4 phút

Nội dung hiển thị

- Sửa payload không làm token trở nên hợp lệ.
- Verify signature và claims.
- Allowlist thuật toán.
- Không chấp nhận `alg: none` cho token cần chữ ký.

Demo ngay sau slide: Demo 5 — JWT Tampering.

Nút mở demo: `Mở JWT Demo ↗`

Kịch bản

1. Decode token member.
2. Sửa payload thành admin trong fixture local.
3. Gửi token đã sửa → `401`.
4. Gửi token member hợp lệ tới API admin → `403`.

Lời kết

“Backend không được lấy role từ payload chưa được xác minh.”

## 26. Slide 14 — Access token và refresh token

Thời lượng: 4 phút

Nội dung hiển thị

- Access token: gọi API, thường có thời hạn ngắn.
- Refresh token: xin token mới.
- Rotation và revocation.
- Token cũ phải được xử lý theo policy đã thiết kế.

Demo ngay sau slide: Demo 6 — Token Lifecycle.

Nút mở demo: `Mở Token Lifecycle Demo ↗`

Kịch bản

1. Login nhận access token và refresh token.
2. Gọi API bằng access token.
3. Refresh token.
4. Nếu đã triển khai rotation, thử token refresh cũ.
5. Logout/revoke.

Nếu chỉ có mock, slide và UI phải ghi rõ `SIMULATED FLOW`.

## 27. Slide 15 — Session hay JWT?

Thời lượng: 3 phút

Nội dung hiển thị

- Session: server kiểm soát lifecycle.
- JWT: thuận tiện cho một số kiến trúc phân tán.
- Revoke, scale và token storage có trade-off.
- Không có lựa chọn tốt nhất cho mọi hệ thống.

Visual: Bảng so sánh ngắn gồm state, revoke, scale và browser risks.

Câu hỏi tương tác

“Nếu DevHub là web app nội bộ với yêu cầu logout có hiệu lực rõ ràng, bạn sẽ chọn session hay JWT? Vì sao?”

## 28. Slide 16 — OAuth 2.0 không đồng nghĩa Login

Thời lượng: 3 phút

Nội dung hiển thị

- OAuth 2.0: delegated authorization.
- OIDC: identity layer trên OAuth 2.0.
- SSO: trải nghiệm đăng nhập qua nhiều ứng dụng.
- SAML: giao thức phổ biến trong enterprise SSO.

Lời dẫn

“OAuth 2.0 giải quyết câu chuyện ủy quyền truy cập. Khi muốn xác minh danh tính người dùng theo chuẩn, chúng ta thường xem xét OpenID Connect.”

## 29. Slide 17 — ID token ≠ Access token

Thời lượng: 3 phút

Nội dung hiển thị

- ID token: identity information theo OIDC.
- Access token: truy cập resource/API.
- Validate signature, issuer, audience và expiration.
- Không dùng nhầm loại token.

Visual: Client nhận ID token; resource API nhận access token phù hợp.

## 30. Slide 18 — Authorization Code Flow + PKCE

Thời lượng: 3 phút

Nội dung hiển thị

- `state`: liên kết request với callback.
- `nonce`: liên kết ID token với request OIDC.
- `code_verifier` / `code_challenge`: PKCE.
- Validate redirect URI và token.

Visual: Sequence diagram Browser → Client → Identity Provider.

Lời dẫn

“Không nên tự thiết kế lại OIDC nếu có thư viện maintained phù hợp. Việc quan trọng là hiểu flow và xác minh đúng các giá trị bảo vệ callback.”

## 31. Slide 19 — OIDC Demo

Thời lượng: 4 phút

Nút mở demo: `Mở OIDC Demo ↗`

Nếu có IdP cấu hình thật

- Chạy login.
- Quan sát redirect và callback.
- Chỉ ra claims đã được xác minh.
- Không log token hoặc secret đầy đủ.

Nếu chưa có IdP

- Mở flow walkthrough.
- Hiển thị sample response giả lập.
- Gắn nhãn `FLOW WALKTHROUGH — NO REAL LOGIN`.

Không được để người xem hiểu nhầm rằng đăng nhập OIDC đã chạy thật nếu mới chỉ là mô phỏng.

## 32. Slide 21 — SAML — cùng SSO, khác giao thức

Thời lượng: 3 phút

Nội dung hiển thị

- IdP: nơi user đăng nhập (Okta, ADFS, Azure AD…).
- SP: ứng dụng tin IdP — ví dụ DevHub.
- Assertion: XML đã ký = "user X đã xác thực".
- Browser mang Assertion từ IdP về ACS của SP.
- SP phải check: chữ ký, Audience, thời hạn, Destination.
- IdP đã có SAML → dùng SAML; app mới → ưu tiên OIDC.

Lời dẫn

“OIDC và SAML giải cùng bài toán SSO. Khác nhau ở định dạng và hệ sinh thái — không phải cái mới hơn thì đúng hơn.”

## 33. Slide 22 — Chọn kiến trúc theo threat model

Thời lượng: 3 phút

Nội dung hiển thị

- Client là browser, mobile hay service-to-service?
- Có cần revoke tức thời không?
- Có dùng SSO/IdP không?
- Ai quản lý key, session store và token lifecycle?
- XSS/CSRF được xử lý ra sao?

Tương tác

Yêu cầu người nghe chọn session hoặc JWT cho DevHub và đưa ra ít nhất hai lý do.

## 34. Slide 22 — Case study DevHub

Thời lượng: 3 phút

Nội dung hiển thị

- Web app nội bộ.
- NestJS API.
- Role `member` và `admin`.
- Logout phải có hiệu lực.
- Cần audit và vận hành rõ ràng.

Câu hỏi

“Bạn sẽ lựa chọn kiến trúc nào? Trade-off nào quan trọng nhất?”

Không đưa ra đáp án tuyệt đối. Hướng người nghe phân tích yêu cầu, threat model và khả năng vận hành.

## 35. Slide 23 — Authentication Review Checklist

Thời lượng: 3 phút

Nội dung hiển thị

- Password hashing và rate limiting.
- Session/cookie lifecycle.
- JWT signature và claims.
- Access/refresh token lifecycle.
- OIDC callback, state, nonce và PKCE.
- Server-side authorization.
- Tests và logging an toàn.

Lời dẫn

“Đây là checklist có thể áp dụng ngay khi review một PR authentication.”

## 36. Slide 24 — Exit Ticket

Thời lượng: 2 phút

Câu hỏi

1. Member đã login nhưng gọi API admin thì thường nhận status code nào?
2. Decode JWT thành công có chứng minh token hợp lệ không?
3. Vì sao xoá cookie chưa chắc đã logout hoàn toàn?

Đáp án mong đợi

1. `403`, nếu credential hợp lệ nhưng không đủ quyền.
2. Không.
3. Vì session hoặc refresh token phía server có thể còn hiệu lực.

## 37. Slide 25 — Closing

Thời lượng: 1 phút

Nội dung hiển thị

> Secure login is a lifecycle, not a button.

- Verify đúng.
- Store an toàn.
- Gửi đúng cách.
- Validate đủ.
- Revoke có chủ đích.

Lời kết

“Authentication không kết thúc ở thời điểm login thành công. Chúng ta phải kiểm soát toàn bộ vòng đời của credential.”

# PHẦN III — ỨNG DỤNG DEMO

## 38. Kiến trúc tổng thể

Cursor cần triển khai một ứng dụng demo local duy nhất, dùng NestJS + TypeScript.

Mục tiêu là giảm thao tác chuyển đổi giữa nhiều project trong buổi sharing.

\#chatgpt-mermaid-\_r_2hk\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_2hk\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2hk\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_2hk\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_2hk\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_2hk\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_2hk\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_2hk\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_2hk\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_2hk\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2hk\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2hk\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_2hk\_ p{margin:0;}#chatgpt-mermaid-\_r_2hk\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_2hk\_ .label text,#chatgpt-mermaid-\_r_2hk\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .node rect,#chatgpt-mermaid-\_r_2hk\_ .node circle,#chatgpt-mermaid-\_r_2hk\_ .node ellipse,#chatgpt-mermaid-\_r_2hk\_ .node polygon,#chatgpt-mermaid-\_r_2hk\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .rough-node .label text,#chatgpt-mermaid-\_r_2hk\_ .node .label text,#chatgpt-mermaid-\_r_2hk\_ .image-shape .label,#chatgpt-mermaid-\_r_2hk\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_2hk\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .rough-node .label,#chatgpt-mermaid-\_r_2hk\_ .node .label,#chatgpt-mermaid-\_r_2hk\_ .image-shape .label,#chatgpt-mermaid-\_r_2hk\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_2hk\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_2hk\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2hk\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2hk\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_2hk\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_2hk\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2hk\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2hk\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_2hk\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_2hk\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_2hk\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_2hk\_ .icon-shape,#chatgpt-mermaid-\_r_2hk\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_2hk\_ .icon-shape p,#chatgpt-mermaid-\_r_2hk\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_2hk\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_2hk\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_2hk\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_2hk\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_2hk\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_2hk\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_2hk\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_2hk\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_2hk\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2hk\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_2hk\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_2hk\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_2hk\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_2hk\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_2hk\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_2hk\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .node rect,#chatgpt-mermaid-\_r_2hk\_ .node circle,#chatgpt-mermaid-\_r_2hk\_ .node ellipse,#chatgpt-mermaid-\_r_2hk\_ .node polygon,#chatgpt-mermaid-\_r_2hk\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_2hk\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_2hk\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_2hk\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_2hk\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_2hk\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}PowerPoint SlideDevHub Demo UINestJS APIDemo User FixturesSession StoreJWT VerificationRefresh Token StoreOIDC Status / WalkthroughOpen URL

Các thành phần:

- Demo UI: điều hướng và hiển thị kết quả.
- NestJS API: xử lý authentication, authorization và validation.
- Demo user fixtures: user giả lập.
- Session store: quản lý session trong môi trường demo.
- JWT module: cấp, verify và kiểm tra token.
- Refresh-token store: dùng nếu triển khai refresh rotation.
- OIDC module: live flow khi được cấu hình hoặc walkthrough khi chưa cấu hình.

### Nguyên tắc

- Backend quyết định status code và quyền truy cập.
- UI hiển thị response thật từ backend.
- Không log credential.
- Không yêu cầu database thật cho demo cơ bản.
- Không cần Internet để chạy các demo cốt lõi sau khi dependencies đã được cài.
- In-memory store chỉ dùng cho workshop, không được mô tả như giải pháp production.
- Demo app chỉ dành cho môi trường local/dev.

## 39. Cấu trúc thư mục đề xuất

```
devhub-auth-lab/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.types.ts
│   ├── password/
│   │   ├── password.controller.ts
│   │   └── password.service.ts
│   ├── session/
│   │   ├── session.controller.ts
│   │   ├── session.service.ts
│   │   └── session.store.ts
│   ├── jwt/
│   │   ├── jwt.controller.ts
│   │   ├── jwt.service.ts
│   │   └── token.store.ts
│   ├── oidc/
│   │   ├── oidc.controller.ts
│   │   ├── oidc.service.ts
│   │   └── oidc.config.ts
│   └── common/
│       ├── demo-users.ts
│       ├── demo-mode.guard.ts
│       └── safe-logger.ts
├── public/
│   ├── index.html
│   ├── styles.css
│   └── demo.js
├── test/
│   ├── auth.e2e-spec.ts
│   ├── password.e2e-spec.ts
│   ├── session.e2e-spec.ts
│   ├── jwt.e2e-spec.ts
│   └── token-lifecycle.e2e-spec.ts
├── .env.example
├── README.md
└── package.json
```

Đây là cấu trúc tham khảo. Cursor cần điều chỉnh theo convention hiện có, không tạo thêm app nếu repository đã có demo app phù hợp.

## 40. Trang điều hướng demo

Route chính:

```
/demo
```

Trang này hiển thị các lab:

- Authentication & Authorization.
- Password Hashing.
- Session & Cookie.
- Logout & Revocation.
- JWT Decode & Verify.
- Access/Refresh Lifecycle.
- OIDC Flow.

Mỗi demo phải có:

- Tên và mục tiêu.
- Các bước thực hiện.
- Nút thao tác.
- Kết quả HTTP hoặc trạng thái tương ứng.
- Phần giải thích expected result.
- Nút `Reset Demo`.
- Nhãn `DEMO ONLY — LOCAL`.

Giao diện phải dễ đọc khi chiếu màn hình, hạn chế hiệu ứng và ưu tiên tốc độ thao tác.

## 41. API đề xuất

| Method | Endpoint                | Mục đích                      |
| ------ | ----------------------- | ----------------------------- |
| `GET`  | `/health`               | Health check                  |
| `GET`  | `/demo`                 | Trang điều hướng              |
| `GET`  | `/api/me`               | Thông tin user hiện tại       |
| `GET`  | `/api/admin`            | API yêu cầu role admin        |
| `POST` | `/demo/auth/login`      | Login user demo               |
| `POST` | `/demo/auth/logout`     | Logout                        |
| `POST` | `/demo/password/hash`   | Hash password                 |
| `POST` | `/demo/password/verify` | Verify password               |
| `GET`  | `/demo/session/status`  | Trạng thái session an toàn    |
| `POST` | `/demo/session/logout`  | Revoke session                |
| `POST` | `/demo/jwt/issue`       | Cấp JWT demo                  |
| `POST` | `/demo/jwt/inspect`     | Decode/inspect claims         |
| `POST` | `/demo/jwt/verify`      | Verify token                  |
| `POST` | `/demo/jwt/tamper`      | Tạo fixture token đã bị sửa   |
| `POST` | `/demo/token/refresh`   | Refresh token demo            |
| `GET`  | `/demo/oidc/status`     | Kiểm tra trạng thái OIDC      |
| `GET`  | `/demo/oidc/login`      | Bắt đầu OIDC nếu đã cấu hình  |
| `GET`  | `/demo/oidc/callback`   | Callback OIDC nếu đã cấu hình |

Cursor có thể thay đổi endpoint cho phù hợp implementation, nhưng phải cập nhật đồng bộ UI, tests, README và hyperlink slide.

## 42. Demo users

Chỉ sử dụng user giả lập:

- `member@devhub.local` — role `member`.
- `admin@devhub.local` — role `admin`.

Password demo chỉ sử dụng local, không tái sử dụng ở bất kỳ môi trường thật nào.

Không hardcode credential production. Không sử dụng tài khoản của người tham dự.

## 43. Yêu cầu về giao diện và logging

- Không hiển thị đầy đủ session ID, cookie, access token, refresh token hoặc signing secret.
- Có thể hiển thị token fixture để phân tích cấu trúc nhưng phải tách biệt với secret thật.
- Không log password.
- Không log header `Cookie` hoặc `Authorization`.
- Không log client secret.
- Không serialize toàn bộ object nhạy cảm vào response.
- Dùng DTO và allowlist trường được phép trả về.
- Có nút reset state.
- Có trạng thái rõ ràng khi OIDC chưa cấu hình.
- Không expose app demo công khai.

# PHẦN IV — KỊCH BẢN CHI TIẾT CHO TỪNG DEMO

## 44. Demo 1 — Authentication và Authorization

Mục tiêu: Phân biệt `401`, `403` và response thành công.

| Bước | Thao tác                     | Kết quả mong đợi |
| ---- | ---------------------------- | ---------------- |
| 1    | Gọi `/api/me` chưa login     | `401`            |
| 2    | Login bằng member            | Login thành công |
| 3    | Gọi `/api/admin` bằng member | `403`            |
| 4    | Login bằng admin             | Login thành công |
| 5    | Gọi `/api/admin` bằng admin  | `200`            |

Điều kiện nghiệm thu

- Backend thực sự thực hiện authentication và authorization.
- UI không tự giả lập status code.
- Có integration tests cho cả ba trường hợp.
- Response không chứa thông tin nhạy cảm không cần thiết.

## 45. Demo 2 — Password Hashing

Mục tiêu: Hiểu hash, salt và verify.

| Bước | Thao tác                     | Kết quả mong đợi  |
| ---- | ---------------------------- | ----------------- |
| 1    | Nhập password demo           | Không ghi vào log |
| 2    | Hash lần 1                   | Trả về hash       |
| 3    | Hash lần 2 với cùng password | Hash có thể khác  |
| 4    | Verify password đúng         | `true`            |
| 5    | Verify password sai          | `false`           |

Điều kiện nghiệm thu

- Dùng thư viện password hashing chuyên dụng.
- Không tự viết thuật toán.
- Có test verify đúng/sai.
- UI giải thích tại sao hash có thể khác nhau.
- Không hiển thị hoặc log password gốc ngoài ô nhập.

## 46. Demo 3 — Session và Cookie

Mục tiêu: Quan sát quá trình tạo session và xác thực request.

| Bước | Thao tác          | Kết quả mong đợi        |
| ---- | ----------------- | ----------------------- |
| 1    | Mở Session Demo   | Chưa đăng nhập          |
| 2    | Login user demo   | Server tạo session      |
| 3    | Quan sát response | Có `Set-Cookie` phù hợp |
| 4    | Gọi `/api/me`     | `200`                   |
| 5    | Mở DevTools       | Quan sát cookie flags   |

Điều kiện nghiệm thu

- Cookie không chứa password.
- Session identifier không được ghi vào log.
- Có tài liệu giải thích cấu hình local và production.
- `Secure` được cấu hình theo môi trường thực tế; không tắt ở production để tiện demo.

## 47. Demo 4 — Logout và Revocation

Mục tiêu: Phân biệt xóa cookie với vô hiệu hóa session.

| Bước | Thao tác          | Kết quả mong đợi          |
| ---- | ----------------- | ------------------------- |
| 1    | Login             | Session hợp lệ            |
| 2    | Gọi `/api/me`     | `200`                     |
| 3    | Logout            | Server invalidate session |
| 4    | Gọi lại `/api/me` | `401`                     |
| 5    | Reset demo        | Trạng thái ban đầu        |

Điều kiện nghiệm thu

- Server invalidates session.
- Cookie được expire.
- Session đã revoke không thể tiếp tục dùng để xác thực.
- Có test chứng minh hành vi sau logout.

## 48. Demo 5 — JWT Tampering

Mục tiêu: Chứng minh payload bị sửa không thể tự cấp quyền admin.

| Bước | Thao tác                            | Kết quả mong đợi  |
| ---- | ----------------------------------- | ----------------- |
| 1    | Cấp token member                    | Token demo hợp lệ |
| 2    | Decode token                        | Hiển thị claims   |
| 3    | Tạo fixture sửa role thành admin    | Payload đã bị sửa |
| 4    | Verify fixture                      | Bị từ chối        |
| 5    | Gọi API bằng fixture                | `401`             |
| 6    | Gọi API admin bằng token member gốc | `403`             |

Điều kiện nghiệm thu

- Không hiển thị signing secret.
- Không tạo token giả mạo cho hệ thống bên ngoài.
- Backend verify signature thật.
- Token không hợp lệ không thể được chấp nhận do role trong payload.

## 49. Demo 6 — Access Token và Refresh Token

Mục tiêu: Hiểu vòng đời token.

| Bước | Thao tác                  | Kết quả mong đợi                      |
| ---- | ------------------------- | ------------------------------------- |
| 1    | Login                     | Nhận token demo                       |
| 2    | Gọi API bằng access token | Thành công                            |
| 3    | Refresh token             | Cấp token mới                         |
| 4    | Dùng refresh token cũ     | Bị từ chối nếu rotation đã triển khai |
| 5    | Logout/revoke             | Refresh token bị từ chối              |

Điều kiện nghiệm thu

- Refresh token không được dùng thay access token.
- Nếu rotation được tuyên bố là hoạt động thật, phải có state phía server và tests.
- Nếu chỉ có flow minh họa, UI phải ghi rõ `SIMULATED FLOW`.
- Không để token xuất hiện đầy đủ trong log.

## 50. Demo 7 — OIDC Flow

Mục tiêu: Phân biệt OAuth 2.0 và OIDC, hiểu vai trò của PKCE và token validation.

### Trường hợp A — OIDC hoạt động thật

Yêu cầu:

- Có Identity Provider phù hợp cho môi trường demo.
- Cấu hình issuer, client ID, redirect URI và secret nếu cần.
- Dùng thư viện OIDC maintained.
- Kiểm tra `state`, PKCE và các điều kiện validation cần thiết.
- Không log token đầy đủ hoặc client secret.

### Trường hợp B — Chưa có IdP

Hiển thị:

- Sơ đồ Authorization Code Flow.
- Sample authorization request.
- Sample callback.
- Sample token response giả lập.
- Phân biệt ID token và access token.

Banner bắt buộc:

`FLOW WALKTHROUGH — NO REAL LOGIN`

Không được trình bày flow giả lập như một login OIDC đang hoạt động.

# PHẦN V — AN TOÀN, TEST VÀ VẬN HÀNH

## 51. Environment variables

Cursor tạo `.env.example` phù hợp với kiến trúc thực tế. Ví dụ tham khảo:

```
NODE_ENV=development
PORT=3000
DEMO_MODE=true

SESSION_SECRET=replace-with-local-random-secret

JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=devhub-demo-api
JWT_SECRET=replace-with-local-random-secret

OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=http://localhost:3000/demo/oidc/callback
```

Các lưu ý:

- Đây là placeholder, không phải secret dùng được cho production.
- Không commit file `.env`.
- Dùng secret ngẫu nhiên riêng cho môi trường local.
- OIDC secret chỉ tồn tại phía server.
- Nếu dùng asymmetric signing, cập nhật cấu hình và README tương ứng.
- Không bật OIDC thật chỉ vì các biến môi trường có giá trị; phải kiểm tra cấu hình đầy đủ.
- Không hardcode secret vào frontend bundle.

## 52. Security guardrails

Bắt buộc:

- Chỉ dùng demo fixtures.
- Không có endpoint gửi credential ra ngoài.
- Không có chức năng dump toàn bộ cookie hoặc token.
- Không log password, session ID, cookie, authorization header hoặc secret.
- Có giới hạn kích thước input.
- CORS chỉ mở origin cần thiết.
- Không dùng wildcard CORS cùng credentials.
- Có demo-mode guard cho endpoint thay đổi state.
- Không expose demo app công khai.
- Không đưa stack trace nhạy cảm vào response.
- Document rõ in-memory store không dành cho production.
- Không dùng demo signing key hoặc password cho hệ thống thật.

## 53. Unit tests và integration tests

### 53.1 Authentication và Authorization

- Request không có credential → `401`.
- Credential không hợp lệ → `401`.
- Credential hết hạn → `401`.
- Member gọi admin endpoint → `403`.
- Admin gọi admin endpoint → thành công.

### 53.2 Password

- Password không được lưu plaintext.
- Verify password đúng thành công.
- Verify password sai thất bại.
- Cùng password hash nhiều lần có thể cho kết quả hash khác nhau.
- Password không xuất hiện trong log.

### 53.3 Session

- Login tạo session.
- Session hợp lệ có thể gọi `/api/me`.
- Session ID được regenerate sau login nếu framework/cơ chế sử dụng yêu cầu.
- Logout invalidate session.
- Session bị revoke trả về `401`.
- Cookie flags phù hợp với môi trường được cấu hình.

### 53.4 JWT

- Token hợp lệ được chấp nhận.
- Signature bị sửa bị từ chối.
- Token hết hạn bị từ chối.
- Sai issuer bị từ chối.
- Sai audience bị từ chối.
- Thuật toán không được allowlist bị từ chối.
- `alg: none` bị từ chối trong luồng yêu cầu chữ ký.
- Token member không thể truy cập admin API.
- Payload chưa được verify không được sử dụng để quyết định quyền.

### 53.5 Refresh token

- Refresh token hợp lệ cấp token mới.
- Refresh token không dùng thay access token.
- Refresh token cũ bị từ chối sau rotation nếu rotation được triển khai.
- Refresh token bị revoke không thể sử dụng.
- Các trường hợp này phải có test nếu được mô tả là behavior hoạt động thật.

### 53.6 OIDC nếu bật live mode

- `state` sai → callback bị từ chối.
- PKCE verifier sai → token exchange thất bại.
- `nonce` không khớp → ID token bị từ chối.
- Sai issuer/audience/expiry/signature → token bị từ chối.
- Redirect URI được kiểm soát.
- Token và client secret không xuất hiện trong log.

# PHẦN VI — POWERPOINT VÀ HYPERLINK DEMO

## 54. Nguyên tắc thiết kế slide

- Dùng tiếng Việt tự nhiên, giữ thuật ngữ kỹ thuật tiếng Anh khi phù hợp.
- Mỗi slide tập trung vào một thông điệp chính.
- Khoảng 3–5 bullet ngắn cho phần hiển thị.
- Đưa lời dẫn, chi tiết và kết quả mong đợi vào speaker notes.
- Ưu tiên diagram tự vẽ hoặc Mermaid đã render.
- Không sử dụng ảnh stock chỉ để trang trí.
- Không sao chép hình ảnh tham khảo nếu chưa kiểm tra quyền sử dụng.
- Không đưa token, password, secret hoặc dữ liệu production vào slide.
- Không có nội dung Basic Authentication.

## 55. Hyperlink mở demo

Các nút phải mở URL demo thực tế trong browser, không phải chuyển tới slide khác.

| Slide | Nhãn nút                    | Route đề xuất              |
| ----- | --------------------------- | -------------------------- |
| 4     | `Mở API Demo ↗`             | `/demo/authz`              |
| 6     | `Mở Password Demo ↗`        | `/demo/password`           |
| 8     | `Mở Session Demo ↗`         | `/demo/session`            |
| 9     | `Mở Logout Demo ↗`          | `/demo/session/logout-lab` |
| 13    | `Mở JWT Demo ↗`             | `/demo/jwt`                |
| 14    | `Mở Token Lifecycle Demo ↗` | `/demo/tokens`             |
| 19    | `Mở OIDC Demo ↗`            | `/demo/oidc`               |

Đây là route đề xuất, không phải cam kết rằng route đã tồn tại.

Cursor phải:

1. Implement route thực tế.
2. Xác minh route truy cập được.
3. Cập nhật hyperlink của slide.
4. Kiểm tra hyperlink sau khi lưu deck.
5. Kiểm tra lại nếu deck được export sang PDF.
6. Ghi rõ URL local mặc định và cách đổi port.

Nếu ứng dụng chạy ở `http://localhost:3000`, hyperlink phải trỏ đến URL đầy đủ tương ứng. Không tạo link tới endpoint chưa tồn tại.

Lưu ý: Hyperlink localhost chỉ mở được demo trên máy đang chạy server. Không sử dụng localhost như một URL chia sẻ cho toàn bộ người tham dự ở máy khác.

# PHẦN VII — RUNBOOK DÀNH CHO NGƯỜI TRÌNH BÀY

## 56. Chuẩn bị trước buổi sharing

1. Cài dependencies.
2. Tạo file `.env` từ `.env.example`.
3. Khởi động ứng dụng demo.
4. Mở `/health`.
5. Mở `/demo`.
6. Chạy tests.
7. Mở thử từng route demo.
8. Mở PowerPoint và kiểm tra hyperlink.
9. Chuẩn bị DevTools cho phần cookie.
10. Đóng các tab chứa dữ liệu cá nhân hoặc hệ thống production.
11. Không sử dụng credential thật trong demo.

## 57. Thứ tự tab browser nên chuẩn bị

1. API/AuthZ Demo.
2. Password Demo.
3. Session Demo.
4. DevTools → Application/Storage → Cookies.
5. JWT Demo.
6. Token Lifecycle Demo.
7. OIDC Demo hoặc Flow Walkthrough.

Không mở quá nhiều tab để tránh mất thời gian tìm kiếm khi trình bày.

## 58. Phương án dự phòng

| Sự cố                 | Phương án                                                       |
| --------------------- | --------------------------------------------------------------- |
| Server không chạy     | Dùng sơ đồ và screenshot đã chuẩn bị từ demo local              |
| Cookie không hiển thị | Kiểm tra domain, port, HTTPS và `Secure`                        |
| JWT demo lỗi          | Dùng fixture đã được test, nói rõ đang dùng fixture             |
| OIDC không có IdP     | Chuyển sang flow walkthrough có nhãn rõ ràng                    |
| Mất Internet          | Các demo cốt lõi vẫn chạy local                                 |
| Hết thời gian         | Ưu tiên 401/403, password hash, session/logout và JWT tampering |

Không được trình bày screenshot hoặc fixture như kết quả live.

# PHẦN VIII — DEFINITION OF DONE

## 59. Tài liệu và slide

- Có tài liệu lý thuyết đầy đủ bằng tiếng Việt.
- Có 25 slide theo cấu trúc đã xác định.
- Mỗi slide có speaker notes hoặc tài liệu hướng dẫn tương ứng.
- Có diagram cho AuthN/AuthZ, session, JWT và OIDC.
- Không có Basic Authentication.
- Có checklist bảo mật.
- Demo xuất hiện ngay sau phần lý thuyết liên quan.
- Hyperlink mở đúng URL.
- Không có secret hoặc token thật trong slide.
- Các phần live và mô phỏng được phân biệt rõ.

## 60. Ứng dụng demo

- NestJS + TypeScript chạy được.
- Trang `/demo` hoạt động.
- `401`/`403` được xác định ở backend.
- Password hashing/verify hoạt động.
- Session/login/logout/revoke hoạt động.
- Cookie flags được cấu hình và giải thích.
- JWT signature và claims được validate.
- Token bị sửa, hết hạn, sai issuer/audience và thuật toán không hợp lệ bị từ chối.
- Refresh flow hoạt động thật hoặc được gắn nhãn mô phỏng.
- OIDC hoạt động thật khi được cấu hình hoặc hiển thị walkthrough rõ ràng.
- Không log credential/token/secret.
- Có nút reset demo.
- README có hướng dẫn chạy.

## 61. Chất lượng kỹ thuật

- Unit tests pass.
- Integration tests pass.
- Lint pass.
- Build pass.
- Không có secret thật trong repository.
- Không có endpoint demo chưa được kiểm soát.
- Các giới hạn của in-memory store được document.
- Các phần chưa implement được ghi rõ.
- Không đánh dấu hoàn thành nếu chưa thực sự xác minh.

# PHẦN IX — PROMPT TRIỂN KHAI CUỐI CÙNG CHO CURSOR

Copy toàn bộ phần bên dưới và giao cho Cursor cùng với đặc tả này.

# Cursor Task: Implement Break the Login — Authentication Core

Hãy triển khai hoàn chỉnh bộ tài liệu đào tạo, PowerPoint và ứng dụng demo theo đặc tả `Break the Login — Authentication Core` được cung cấp.

## 1. Audit trước khi triển khai

Đầu tiên, kiểm tra repository hiện tại và báo cáo ngắn:

- Stack, package manager và cấu trúc dự án.
- Tài liệu, slide deck và demo hiện có.
- Những phần có thể tái sử dụng.
- Những phần cần tạo hoặc chỉnh sửa.
- Rủi ro kỹ thuật và thứ tự triển khai.

Không chỉ đưa ra plan rồi dừng lại. Sau khi audit, hãy bắt đầu triển khai theo từng milestone.

## 2. Triển khai nội dung đào tạo

Hoàn thiện tài liệu và slide bằng tiếng Việt, bao gồm:

- Authentication và Authorization.
- HTTP 401 và 403.
- Password hashing, salt, brute-force và credential stuffing.
- Session, cookie flags, session lifecycle, session fixation, CSRF và XSS.
- JWT structure, signature, claims, decode và verify.
- Access token, refresh token, rotation và revocation.
- OAuth 2.0, OIDC, ID token, access token, PKCE, SSO và SAML.
- So sánh session và JWT.
- Security checklist và case study DevHub.

Tạo 25 slide theo đặc tả, kèm speaker notes, lời dẫn, câu hỏi tương tác và mapping demo.

Không đưa Basic Authentication vào nội dung.

## 3. Xây dựng ứng dụng demo

Sử dụng NestJS + TypeScript, tuân theo convention của repository hiện tại.

Các demo cần có:

1. Authentication/Authorization: 401, 403 và thành công.
2. Password hashing, salt và verify.
3. Session login và cookie flags.
4. Logout và server-side session revocation.
5. JWT decode, verify và tampering.
6. Access/refresh token lifecycle.
7. OIDC live flow khi có cấu hình; nếu không, cung cấp walkthrough được gắn nhãn rõ ràng.

Tạo một trang `/demo` để điều hướng tới từng lab. Mỗi demo cần có thao tác, kết quả mong đợi và nút reset.

Backend phải quyết định kết quả authentication và authorization. Không giả lập status code ở frontend.

## 4. Bảo mật và chất lượng

- Chỉ sử dụng user và credential giả lập.
- Không log password, cookie, token hoặc secret.
- Không commit `.env`.
- Dùng thư viện maintained cho password hashing và JWT.
- Validate JWT signature, issuer, audience và expiration.
- Từ chối thuật toán không được allowlist.
- Không chấp nhận `alg: none` cho token cần xác minh chữ ký.
- Không chấp nhận token đã bị sửa.
- Có tests cho 401/403, password verify, session revoke, JWT validation và refresh rotation nếu được triển khai.
- Không expose demo app công khai.
- Không tuyên bố mock là tính năng hoạt động thật.

## 5. PowerPoint và demo links

Thêm nút mở browser tới demo tương ứng trên các slide:

- Slide 4: API/AuthZ.
- Slide 6: Password.
- Slide 8: Session.
- Slide 9: Logout.
- Slide 13: JWT.
- Slide 14: Token Lifecycle.
- Slide 19: OIDC.

Chỉ sử dụng URL đã được xác minh. Cập nhật hyperlink sau khi các route thực tế đã tồn tại.

Nếu có PowerPoint hiện tại, hãy kiểm tra và cập nhật artifact đó trước khi tạo deck mới. Giữ nguyên nội dung hữu ích đã có.

## 6. Tài liệu bàn giao

Hoàn thiện:

- Tài liệu Authentication Core.
- Nội dung slide và speaker notes.
- Demo runbook.
- Implementation plan.
- README.
- `.env.example`.
- Unit/integration tests.

## 7. Xác minh và báo cáo

Sau khi triển khai:

1. Chạy tests.
2. Chạy lint.
3. Chạy build.
4. Khởi động app và kiểm tra các route.
5. Kiểm tra hyperlink trong PowerPoint.
6. Kiểm tra không có secret thật trong repository.
7. Báo cáo các file đã tạo/cập nhật.
8. Liệt kê demo nào hoạt động thật và demo nào chỉ là walkthrough.
9. Ghi rõ kết quả test/lint/build thực tế.
10. Liệt kê phần chưa hoàn thành và lý do.

Không đánh dấu một hạng mục là hoàn tất nếu chưa kiểm tra được.

**Ưu tiên cuối cùng:** tạo ra một bộ workshop có thể chạy và trình bày ngay, không chỉ là tài liệu mô tả cách làm.

Khuyến nghị khi dùng Cursor: chạy theo từng milestone và review diff sau mỗi giai đoạn. Đặc biệt, nên hoàn thành các demo `401/403`, password hashing, session/logout và JWT trước; OIDC để sau vì phụ thuộc cấu hình Identity Provider. Cách này giúp bạn có một workshop chạy được ngay cả khi chưa thiết lập môi trường SSO.