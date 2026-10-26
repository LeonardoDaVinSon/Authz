# Break the Login --- Authentication Core

## Tài liệu nội dung gốc cho buổi sharing 90 phút

**Đối tượng:** Fullstack developers\
**Stack demo:** NestJS + TypeScript\
**Format:** Presentation + live demo + interaction\
**Ứng dụng xuyên suốt:** DevHub --- nền tảng quản lý dự án nội bộ\
**Phạm vi:** Authentication (Authn). Authorization chỉ được nhắc để phân
biệt khái niệm, nội dung chuyên sâu để dành cho buổi 2.

------------------------------------------------------------------------

## 0. Cách sử dụng tài liệu này

Đây là tài liệu gốc để chuẩn bị slide và demo, không phải nội dung cần
đọc nguyên văn trên sân khấu.

-   **Nội dung trình bày:** ý chính mà khán giả cần hiểu.
-   **Speaker notes:** gợi ý cách giải thích bằng lời tự nhiên.
-   **Demo / interaction:** việc người trình bày hoặc người nghe thực
    hiện.
-   **Transition:** câu nối sang phần tiếp theo.

Một nguyên tắc cho cả buổi: bắt đầu bằng vấn đề, để mọi người dự đoán,
sau đó mới giải thích cơ chế. Đừng chiếu cả trang chữ lên slide; phần
giải thích sâu nằm trong tài liệu này, còn slide chỉ giữ câu hỏi, sơ đồ,
log hoặc vài dòng code cần thiết.

### Kết quả mong đợi

Sau buổi sharing, người tham gia có thể:

1.  Phân biệt Authentication và Authorization, hiểu ý nghĩa thực tế của
    `401` và `403`.
2.  Giải thích password hashing, salt, brute-force và credential
    stuffing.
3.  Hiểu session lifecycle, cookie attributes, session fixation và CSRF.
4.  Đọc cấu trúc JWT, biết vì sao decode không phải verify và nắm
    checklist kiểm tra token.
5.  Giải thích access token, refresh token, rotation và các giới hạn của
    logout/revocation.
6.  Phân biệt OAuth 2.0, OIDC và SAML ở mức đủ để lựa chọn hướng triển
    khai.
7.  So sánh Session và JWT dựa trên kiến trúc, threat model và yêu cầu
    vận hành --- không dựa trên trào lưu.

------------------------------------------------------------------------

# 1. The Hook --- DevHub có sự cố (00--08 phút)

## Slide 01 --- Admin account bị chiếm, nhưng password có thể chưa bị lộ (2 phút)

### On-screen content

> SECURITY INCIDENT #001\
> Một tài khoản admin có hoạt động đăng nhập bất thường.\
> Chưa có bằng chứng password bị lộ.\
> DevHub vẫn chấp nhận một credential đáng ngờ.

### Speaker notes

Mở đầu bằng một tình huống giả lập. Không nói ngay nguyên nhân và cũng
không khẳng định đây là một kiểu tấn công cụ thể. Mục tiêu là khiến mọi
người nhận ra rằng password chỉ là một phần của câu chuyện đăng nhập.

Sau khi user nhập đúng password, ứng dụng thường tạo một session hoặc
phát hành token. Nếu credential đó bị đánh cắp, được xác minh sai, hoặc
không được thu hồi đúng cách, attacker có thể tiếp tục truy cập mà không
cần biết password ban đầu.

### Interaction / demo

Chiếu hai dòng log giả lập:

``` text
20:11:03 login_success user=admin source=browser-A
20:18:42 request_accepted user=admin credential=session-or-token
```

Hỏi khán giả: "Theo mọi người, chuyện gì có thể xảy ra giữa hai request
này?"

### Transition

"Nếu password không phải giả thuyết duy nhất, chúng ta cần xác định hệ
thống đang tin vào thứ gì."

------------------------------------------------------------------------

## Slide 02 --- Choose your suspect (3 phút)

### On-screen content

-   A. Password bị brute-force hoặc bị tái sử dụng từ một vụ lộ dữ liệu.
-   B. Session hoặc token bị đánh cắp.
-   C. Ứng dụng tin vào thông tin danh tính chưa được xác minh đúng
    cách.

### Speaker notes

Cả ba đều có thể xảy ra. Đừng biến phần poll thành câu đố có một đáp án
duy nhất. Điểm cần nhấn mạnh là security investigation bắt đầu bằng giả
thuyết và bằng chứng, không phải bằng việc mặc định công nghệ nào đó
"không an toàn".

### Interaction / demo

Cho mọi người vote nhanh. Mời một hoặc hai người giải thích trong một
câu. Chưa reveal lời giải.

### Transition

"Trước khi điều tra từng giả thuyết, cần thống nhất thế nào là xác
thực."

------------------------------------------------------------------------

## Slide 03 --- What does DevHub actually trust? (3 phút)

### On-screen content

``` text
Browser  ── request ──>  DevHub API  ──>  Profile
```

Câu hỏi: API dựa vào đâu để biết request thuộc về user nào?

### Speaker notes

Một request HTTP không tự mang theo "ký ức" của request trước. Ứng dụng
cần một cơ chế để nhận diện người dùng ở những request tiếp theo. Có thể
là server-side session được tham chiếu bằng cookie, hoặc token được
client gửi lên. Cả hai đều cần được xử lý đúng cách.

### Interaction / demo

Mời khán giả chỉ ra điểm nào trong sơ đồ cần xác minh credential. Ghi
nhận câu trả lời nhưng chưa đi vào JWT hay Session.

### Transition

"Đầu tiên, phân biệt hai câu hỏi mà ứng dụng thường bị nhầm lẫn."

------------------------------------------------------------------------

# 2. Trust & Identity (08--20 phút)

## Slide 04 --- Authentication is not Authorization (3 phút)

### On-screen content

-   **Authentication (Authn):** Bạn là ai?
-   **Authorization (Authz):** Bạn được phép làm gì?

### Speaker notes

Authentication là quá trình xác minh danh tính hoặc credential được đưa
ra. Authorization quyết định danh tính đã xác minh đó có được thực hiện
một hành động cụ thể hay không.

Ví dụ: nhân viên đăng nhập thành công vào DevHub. Điều đó không tự động
có nghĩa người đó là admin. Login thành công chỉ cho biết ứng dụng đã
xác minh danh tính theo cơ chế đang dùng; quyền truy cập là câu chuyện
khác.

Trong buổi này, chúng ta chỉ cần phân biệt hai khái niệm. RBAC,
ownership check và các lỗi như IDOR sẽ để dành cho buổi Authorization.

### Interaction / demo

Hỏi: "User đăng nhập thành công nhưng API trả `403`. Đây có nhất thiết
là bug không?"

Đáp án: Không. Nếu danh tính đã được xác minh nhưng user không được phép
thực hiện hành động đó, `403` có thể là phản hồi đúng.

### Transition

"Vậy nếu ứng dụng chưa xác minh được credential, nó nên phản hồi thế
nào?"

------------------------------------------------------------------------

## Slide 05 --- 401 vs 403: đọc response cho đúng (3 phút)

### On-screen content

  Tình huống                                      Response thường gặp
  ----------------------------------------------- ---------------------
  Thiếu credential hoặc credential không hợp lệ   `401 Unauthorized`
  Đã xác thực nhưng không được phép truy cập      `403 Forbidden`

### Speaker notes

Tên status code dễ gây nhầm: `401 Unauthorized` trên thực tế thường liên
quan đến authentication, còn `403 Forbidden` thường có nghĩa server hiểu
request nhưng từ chối cho phép thực hiện.

Một token hết hạn hoặc chữ ký không hợp lệ có thể khiến API trả `401`.
Một user đã đăng nhập nhưng không đủ quyền có thể nhận `403`. Tuy vậy,
response cụ thể còn phụ thuộc thiết kế API; một số hệ thống dùng `404`
để tránh tiết lộ tài nguyên có tồn tại hay không.

Không nên dùng `401` và `403` thay thế tùy tiện vì client có thể dựa vào
chúng để quyết định có cần đăng nhập lại hay không.

### Interaction / demo

Đọc ba tình huống, yêu cầu khán giả chọn status code:

1.  Không gửi cookie hoặc Bearer token.
2.  Token hết hạn.
3.  User đã đăng nhập nhưng không được phép vào một chức năng.

### Transition

"Trước session và token, credential đầu tiên thường là password. Nếu
database bị lộ thì sao?"

------------------------------------------------------------------------

## Slide 06 --- Password database leaked: what can an attacker do? (3 phút)

### On-screen content

``` text
Plaintext password     →  Lộ trực tiếp
Fast hash (SHA-256)    →  Dễ thử đoán offline
Password hash (Argon2id / bcrypt) + salt
                       →  Làm mỗi lần đoán tốn kém hơn
```

### Speaker notes

Password không nên được lưu plaintext và cũng không nên chỉ dùng một
hash nhanh như SHA-256. Lý do không phải SHA-256 "yếu" về mặt mật mã;
vấn đề là nó được thiết kế để tính rất nhanh. Khi attacker có bản dump
database, họ có thể thử hàng triệu hoặc hàng tỷ candidate tùy phần cứng
và cách triển khai.

Password hashing chuyên dụng như Argon2id hoặc bcrypt được thiết kế để
mỗi lần kiểm tra password tốn tài nguyên hơn, làm giảm tốc độ đoán hàng
loạt. Mục tiêu là tăng chi phí cho attacker, không phải khiến việc xác
minh password trở thành bất khả thi.

#### Salt là gì và giải quyết vấn đề gì?

Salt là một giá trị ngẫu nhiên riêng cho mỗi password hash. Khi hai
người dùng chọn cùng một password, salt khác nhau khiến kết quả hash
khác nhau. Salt cũng làm cho bảng rainbow table dựng sẵn khó dùng trực
tiếp.

Salt không cần giữ bí mật; nó thường được lưu cùng hash và tham số thuật
toán. Salt không làm một password yếu trở thành mạnh, và cũng không ngăn
attacker thử đoán từng password. Vai trò chính là ngăn việc tái sử dụng
kết quả hash giữa nhiều tài khoản và làm giảm hiệu quả của các bảng tra
cứu dựng sẵn.

#### Bcrypt chống brute-force như thế nào?

Bcrypt **không tự phát hiện hay chặn brute-force**. Nó làm cho mỗi lần
kiểm tra password trở nên tốn thời gian hơn.

Bcrypt có tham số cost (work factor). Khi cost tăng, số vòng công việc
tăng theo hàm mũ --- tăng cost thêm 1 thường làm khối lượng tính toán
tăng xấp xỉ gấp đôi. Điều này làm việc thử nhiều candidate chậm hơn,
nhưng cũng khiến login hợp lệ tốn thêm CPU.

Một bcrypt hash thường chứa version, cost, salt và kết quả hash; vì thế
khi verify, thư viện đọc tham số từ hash đã lưu, tính lại với password
được nhập và so sánh kết quả. Không cần lưu salt ở một cột bí mật riêng.

Bcrypt chủ yếu làm tăng chi phí tấn công offline khi attacker đã lấy
được hash. Nó không thay thế rate limiting, monitoring hay MFA. Nếu
endpoint login không giới hạn request, attacker vẫn có thể gửi rất nhiều
lần thử online; mỗi lần sẽ tiêu tốn tài nguyên server và có thể gây DoS.

Argon2id là lựa chọn hiện đại thường được ưu tiên khi có hỗ trợ phù hợp.
Ngoài thời gian tính toán, Argon2id còn cho phép cấu hình memory cost,
khiến việc chạy hàng loạt phép thử cần thêm bộ nhớ. Bcrypt vẫn là lựa
chọn hợp lệ khi được cấu hình và vận hành phù hợp.

### Interaction / demo

Hỏi: "Nếu đã dùng bcrypt với cost cao, có cần rate limiting không?"

Đáp án: Có. Password hashing và rate limiting xử lý các lớp rủi ro khác
nhau.

### Transition

"Hash chậm giúp bảo vệ khi database bị lộ. Còn nếu attacker đang thử
đăng nhập trực tiếp thì sao?"

------------------------------------------------------------------------

## Slide 07 --- Brute-force, credential stuffing và MFA (3 phút)

### On-screen content

  -----------------------------------------------------------------------
  Rủi ro                  Cách hoạt động          Phòng vệ
  ----------------------- ----------------------- -----------------------
  Brute-force             Thử nhiều password cho  Rate limit, backoff,
                          một account             detection

  Credential stuffing     Dùng username/password  MFA, detection, chống
                          bị lộ từ dịch vụ khác   tái sử dụng

  Password theft          Lấy password qua        MFA, passkeys, cảnh báo
                          phishing hoặc malware   và recovery an toàn
  -----------------------------------------------------------------------

### Speaker notes

Brute-force và credential stuffing không giống nhau. Brute-force thường
thử nhiều candidate password; credential stuffing sử dụng cặp
username/password đã bị lộ ở nơi khác. Một password mạnh vẫn có thể bị
dùng lại và bị khai thác theo kiểu credential stuffing.

Rate limiting có thể đặt theo account, IP, device signal hoặc kết hợp
nhiều tín hiệu. Chỉ giới hạn theo IP có thể không đủ vì attacker có thể
phân tán request; khóa account quá cứng lại tạo cơ hội gây denial of
service cho người dùng hợp lệ. Nên cân nhắc progressive delay,
risk-based challenge, alerting và cách phục hồi tài khoản.

MFA bổ sung một yếu tố khác ngoài password. TOTP tạo mã dùng một lần dựa
trên secret đã chia sẻ và thời gian. Mã TOTP có thời gian hiệu lực ngắn
nhưng vẫn có thể bị phishing hoặc relay trong một số kịch bản. Passkeys
dùng public-key cryptography và gắn với origin của website, giúp chống
phishing tốt hơn password truyền thống.

MFA không có nghĩa mọi con đường tấn công đều biến mất. Recovery flow,
session theft, social engineering và các lỗ hổng khác vẫn cần được xem
xét.

### Interaction / demo

Hỏi: "Hệ thống có MFA nhưng cho phép reset password qua email với quy
trình rất yếu. Rủi ro còn lại là gì?"

### Transition

"Sau khi xác thực thành công, DevHub cần một cách nhận ra user ở request
kế tiếp."

------------------------------------------------------------------------

# 3. Session Under Attack (20--35 phút)

## Slide 08 --- HTTP is stateless. Who remembers me? (2 phút)

### On-screen content

``` text
Request 1: POST /auth/login
Request 2: GET  /profile
Request 3: GET  /projects
```

### Speaker notes

HTTP không tự duy trì trạng thái đăng nhập giữa các request. Server có
thể lưu session state, còn browser giữ một session identifier và gửi lại
trong các request phù hợp.

Với server-side session, cookie thường chỉ mang một session ID khó đoán.
Dữ liệu session thật nằm ở server hoặc một session store. Cookie không
nhất thiết chứa toàn bộ thông tin user.

### Interaction / demo

Hỏi: "Nếu browser không gửi cookie hay token, API dựa vào đâu để liên
kết request với lần login trước?"

### Transition

"Với session dựa trên cookie, các thuộc tính cookie ảnh hưởng trực tiếp
đến cách credential được gửi và bảo vệ."

------------------------------------------------------------------------

## Slide 09 --- A cookie is not just a cookie (3 phút)

### On-screen content

``` http
Set-Cookie: __Host-devhub_session=<opaque-id>;
  Path=/; Secure; HttpOnly; SameSite=Lax
```

### Speaker notes

-   `HttpOnly`: JavaScript không thể đọc cookie qua các API như
    `document.cookie`. Điều này giảm khả năng XSS đánh cắp trực tiếp
    session cookie, nhưng không ngăn XSS thực hiện request dưới danh
    nghĩa người dùng nếu script vẫn chạy trong origin đó.
-   `Secure`: browser chỉ gửi cookie qua HTTPS. Trong môi trường
    production, toàn bộ site nên dùng HTTPS; cấu hình proxy/TLS
    termination cũng cần đúng.
-   `SameSite`: kiểm soát việc gửi cookie trong một số ngữ cảnh
    cross-site. `Strict`, `Lax` và `None` có hành vi khác nhau.
    `SameSite=None` yêu cầu `Secure` ở các browser hiện đại. Không nên
    coi `SameSite` là giải pháp CSRF duy nhất cho mọi kiến trúc.
-   `Path` và `Domain`: xác định phạm vi cookie. Không đặt `Domain` rộng
    hơn mức cần thiết.
-   `Expires` / `Max-Age`: kiểm soát thời hạn cookie phía browser, nhưng
    không tự thay thế session expiration và revocation phía server.

Prefix `__Host-` trong browser hỗ trợ prefix này yêu cầu cookie có
`Secure`, `Path=/` và không có `Domain`, giúp hạn chế một số vấn đề
cookie bị set từ subdomain. Cần kiểm tra khả năng tương thích với môi
trường triển khai.

### Interaction / demo

Mở DevTools → Application/Storage → Cookies. Chỉ ra các thuộc tính đang
có trong local demo và hỏi mỗi thuộc tính giảm rủi ro gì.

### Transition

"Cookie được cấu hình tốt là một lớp bảo vệ. Nhưng nó không giải quyết
toàn bộ vòng đời session."

------------------------------------------------------------------------

## Slide 10 --- Live demo: The ghost session (4 phút)

### On-screen content

``` text
Login on Browser A
        ↓
Use the same demo credential on Browser B
        ↓
Logout on Browser A
        ↓
Try the credential again on Browser B
```

### Speaker notes

Dựng một demo local với hai client hoặc hai HTTP session riêng. Chỉ dùng
credential giả lập được tạo riêng cho bài demo.

Ở implementation yếu, logout chỉ xóa cookie trong browser A. Nếu session
phía server vẫn còn hiệu lực, bản sao cookie ở browser B có thể tiếp tục
hoạt động.

Ở implementation tốt, logout gửi request đến server, server thu hồi
session tương ứng, sau đó xóa cookie ở browser A. Khi browser B gửi lại
session ID cũ, server không tìm thấy session hợp lệ hoặc từ chối session
đã bị thu hồi.

Điểm quan trọng: **xóa cookie không đồng nghĩa với thu hồi credential ở
server**. Với session stateful, server có thể kiểm soát việc thu hồi
ngay. Với JWT tự xác minh, logout thường phức tạp hơn vì token vẫn có
thể hợp lệ cho đến khi hết hạn nếu không có cơ chế bổ sung.

### Interaction / demo

Trước mỗi request, yêu cầu mọi người đoán kết quả. Sau đó gửi request và
so sánh.

### Transition

"Vậy session cần có một vòng đời rõ ràng, không chỉ có login và logout."

------------------------------------------------------------------------

## Slide 11 --- Session lifecycle: create, rotate, expire, revoke (3 phút)

### On-screen content

``` text
Create → Rotate → Idle/Absolute timeout → Revoke
```

### Speaker notes

-   **Create:** sau khi credential ban đầu được xác minh thành công,
    server tạo session ID mới và gắn session với trạng thái đăng nhập.
-   **Rotate:** sau login hoặc thay đổi mức tin cậy quan trọng, session
    ID cần được rotate để tránh tiếp tục sử dụng identifier do attacker
    biết trước. Đây là biện pháp quan trọng chống session fixation.
-   **Idle timeout:** hết hạn nếu session không được sử dụng trong
    khoảng thời gian quy định.
-   **Absolute timeout:** giới hạn tổng thời gian sống của session, kể
    cả khi nó vẫn được sử dụng.
-   **Revoke:** server đánh dấu session không còn hợp lệ, chẳng hạn khi
    logout, account bị khóa hoặc phát hiện compromise.

Session ID cần đủ ngẫu nhiên, khó đoán và không chứa dữ liệu nhạy cảm có
thể đọc được. Nếu session store bị chia sẻ giữa nhiều instance, mọi
instance phải nhìn thấy cùng trạng thái thu hồi.

### Interaction / demo

Hỏi: "Nên rotate session ID ở thời điểm nào ngoài lúc login?" Gợi ý: sau
re-authentication hoặc thay đổi trạng thái bảo mật quan trọng, tùy
threat model.

### Transition

"Ngay cả khi session lifecycle được quản lý tốt, còn hai kiểu tấn công
thường bị nhầm lẫn với nhau."

------------------------------------------------------------------------

## Slide 12 --- Session fixation vs CSRF (3 phút)

### On-screen content

**Session fixation:** attacker khiến victim sử dụng một session
identifier mà attacker đã biết hoặc kiểm soát.

**CSRF:** browser bị dụ gửi request đến ứng dụng và tự đính kèm cookie
hợp lệ.

### Speaker notes

Session fixation thường được giảm thiểu bằng cách tạo/rotate session ID
sau khi xác thực thành công và không cho client tùy ý quyết định session
ID có đặc quyền.

CSRF khai thác cách browser tự gửi credential, đặc biệt với cookie-based
authentication. Ví dụ, user đang đăng nhập vào DevHub; một trang khác
khiến browser gửi request thay đổi dữ liệu. Nếu ứng dụng không có CSRF
defense phù hợp, request có thể được thực hiện dưới session của user.

Các biện pháp phòng CSRF có thể gồm anti-CSRF token, kiểm tra
`Origin`/`Referer` phù hợp và cấu hình `SameSite`. Lựa chọn cụ thể phụ
thuộc kiến trúc. `HttpOnly` không ngăn CSRF vì browser vẫn có thể tự gửi
cookie; `HttpOnly` chủ yếu hạn chế JavaScript đọc cookie.

XSS và CSRF là hai vấn đề khác nhau. XSS có thể cho phép attacker chạy
script trong origin của ứng dụng; CSRF lợi dụng browser gửi credential
tự động. Một số biện pháp có thể giảm tác động nhưng không thay thế
nhau.

### Interaction / demo

Đọc hai tình huống, yêu cầu khán giả phân loại: "session ID do attacker
biết trước" và "browser gửi request kèm cookie ngoài ý muốn".

### Transition

"Session là một cách quản lý đăng nhập. Một cách khác thường gặp ở API
là JWT --- nhưng decode token không có nghĩa là đã xác minh nó."

------------------------------------------------------------------------

# 4. JWT --- Trust the Signature, Not the Payload (35--52 phút)

## Slide 13 --- JWT is a format, not a security guarantee (2 phút)

### On-screen content

``` text
Header.Payload.Signature
```

Ví dụ claims:

``` json
{
  "iss": "https://auth.devhub.local",
  "sub": "user-123",
  "aud": "devhub-api",
  "iat": 1790000000,
  "exp": 1790000900
}
```

### Speaker notes

JWT là một định dạng biểu diễn claims. Trong trường hợp signed JWT
thường gặp, ba phần được encode bằng Base64URL và nối bằng dấu chấm.
Base64URL không phải encryption; người có token thường có thể decode
header và payload để đọc.

-   `iss` (issuer): bên phát hành token.
-   `sub` (subject): chủ thể mà token nói đến.
-   `aud` (audience): bên nhận mà token hướng tới.
-   `iat` (issued at): thời điểm phát hành.
-   `exp` (expiration): thời điểm token hết hạn.
-   `nbf` (not before): token không được chấp nhận trước thời điểm này,
    nếu claim được dùng.

Chữ ký giúp phát hiện việc token bị sửa, nhưng chỉ khi verifier kiểm tra
chữ ký đúng cách và áp dụng chính sách tin cậy phù hợp. Không phải token
nào có ba phần cũng là JWT hợp lệ, và không phải JWT nào cũng được ký
theo cùng một cách.

### Interaction / demo

Cho khán giả nhìn header và payload đã decode. Hỏi: "Có thông tin nào
trong payload mà không nên xem là bí mật không?" Đáp án: tất cả dữ liệu
trong payload của signed JWT nên được xem là có thể đọc được.

### Transition

"Nếu payload đọc được và có thể chỉnh sửa trước khi gửi, điều gì ngăn
user tự đổi role?"

------------------------------------------------------------------------

## Slide 14 --- The JWT tampering challenge (3 phút)

### On-screen content

``` json
{
  "sub": "user-123",
  "role": "user"
}
```

Thử đổi `"role": "user"` thành `"role": "admin"`.

### Speaker notes

Nếu server chỉ decode payload rồi tin claims, attacker có thể sửa dữ
liệu mà server không phát hiện. Với signed JWT được verify đúng, thay
đổi payload sẽ làm chữ ký không còn khớp.

Demo cần có hai implementation rõ ràng:

1.  **Unsafe verifier:** chỉ decode token và đọc payload. Đây là code
    minh họa lỗi, chỉ chạy trong local lab.
2.  **Secure verifier:** dùng thư viện JWT được duy trì, giới hạn thuật
    toán được chấp nhận, kiểm tra chữ ký và các claims cần thiết.

Không đưa code unsafe vào đường dẫn request production. Đặt tên route
hoặc module rõ ràng là demo-only, dùng fixture giả và không expose ra
mạng công cộng.

### Interaction / demo

Gửi token nguyên bản, rồi gửi token đã sửa payload. Quan sát sự khác
biệt giữa hai verifier.

### Transition

"Verify chữ ký là điều kiện cần. Còn những điều kiện nào phải được kiểm
tra trước khi tin token?"

------------------------------------------------------------------------

## Slide 15 --- JWT verification checklist (4 phút)

### On-screen content

-   Algorithm allowlist
-   Signature verification
-   `iss`
-   `aud`
-   `exp` và `nbf` nếu có
-   Token type / expected claims
-   Key phù hợp với issuer và thuật toán

### Speaker notes

#### Vì sao phải kiểm soát `alg`?

Header JWT do bên gửi cung cấp, nên không được coi là nguồn quyết định
thuật toán đáng tin cậy. Server phải cấu hình trước những thuật toán
được chấp nhận và dùng thư viện verify để buộc token tuân theo chính
sách đó.

#### Nếu không kiểm tra `alg: none` thì sao?

Trong một số triển khai JWT cũ hoặc cấu hình sai, verifier có thể chấp
nhận token có header:

``` json
{
  "alg": "none",
  "typ": "JWT"
}
```

`alg: none` biểu thị dạng JWT không có chữ ký/MAC. Nếu ứng dụng chấp
nhận token kiểu này ở nơi đáng lẽ yêu cầu signed token, attacker có thể
tạo token với payload tùy ý --- ví dụ sửa `sub` hoặc `role` --- mà không
cần biết signing key. Đây là trường hợp token forgery và có thể dẫn đến
account impersonation hoặc privilege escalation nếu ứng dụng tin claims
đó.

Không phải mọi thư viện hiện đại đều mặc định chấp nhận `none`; nhiều
thư viện đã chặn hoặc yêu cầu cấu hình rõ ràng. Tuy nhiên, không nên dựa
vào default một cách mù quáng. Cần cấu hình algorithm allowlist và kiểm
tra hành vi của đúng thư viện/version đang sử dụng.

#### Vì sao kiểm tra chữ ký thôi vẫn chưa đủ?

Một token có chữ ký hợp lệ vẫn có thể không dành cho API đang nhận nó.
Ví dụ, token được phát hành cho service A bị gửi sang service B. Nếu
service B không kiểm tra `aud`, nó có thể chấp nhận token ngoài intended
audience. Đây là một dạng token substitution/confusion trong thiết kế hệ
thống.

`iss` cần khớp issuer được tin cậy; `aud` phải bao gồm đúng audience mà
resource server mong đợi; `exp` phải còn hiệu lực, có thể cho phép clock
skew nhỏ theo policy. Nếu dùng `nbf`, cần kiểm tra thời điểm hiện tại đã
qua `nbf`. Claims phải được validate theo loại token và contract đã định
nghĩa.

Không lấy thuật toán từ token rồi chấp nhận bất kỳ thuật toán nào mà thư
viện hỗ trợ. Với HMAC, mọi bên có shared secret đều có khả năng ký
token; với chữ ký bất đối xứng, resource server thường chỉ cần public
key để verify. Cách chọn key và thuật toán phải nhất quán với issuer tin
cậy.

### Interaction / demo

Dùng bốn fixture token:

1.  Payload bị sửa nên chữ ký sai.
2.  Token đã hết hạn.
3.  `iss` hoặc `aud` không khớp.
4.  Token dùng thuật toán không nằm trong allowlist.

Hỏi: "Token nào phải bị từ chối, và vì sao?"

### Transition

"Ngay cả token hợp lệ cũng không tồn tại mãi. Chúng ta cần nói về access
token, refresh token và thu hồi."

------------------------------------------------------------------------

## Slide 16 --- Access token vs Refresh token (4 phút)

### On-screen content

``` text
Login
  ↓
Access token ──> API
  ↓ expires
Refresh token ──> Token endpoint
  ↓
New access token
```

### Speaker notes

Access token là credential gửi tới resource server để truy cập API.
Refresh token được dùng tại authorization server/token endpoint để xin
access token mới theo chính sách của hệ thống. Không nên gửi refresh
token tới resource server như thể nó là access token.

Access token thường có thời hạn ngắn hơn refresh token để giảm thời gian
sử dụng nếu bị lộ. Tuy nhiên, thời hạn ngắn không tự động giải quyết mọi
vấn đề; attacker có thể sử dụng token trong khoảng thời gian nó còn hợp
lệ.

Refresh token rotation phát hành refresh token mới khi refresh thành
công và vô hiệu hóa token cũ. Nếu token cũ bị dùng lại sau khi đã
rotate, authorization server có thể xem đó là dấu hiệu token bị đánh cắp
và thu hồi cả token family/session liên quan, tùy thiết kế.

#### Logout và revocation

Với server-side session, server có thể đánh dấu session không còn hợp lệ
ngay lập tức. Với JWT access token được verify offline, resource server
thường không tra cứu trạng thái token ở mỗi request; do đó token đã phát
hành có thể vẫn dùng được cho đến `exp`, trừ khi có cơ chế bổ sung như
denylist, introspection hoặc kiểm tra trạng thái tập trung.

Refresh token có thể được thu hồi ở authorization server, nhưng điều đó
không nhất thiết làm access token JWT đang tồn tại biến mất ngay lập
tức. Cần thiết kế rõ thời hạn access token và cách xử lý khi account bị
khóa hoặc credential bị compromise.

#### Lưu token ở đâu?

Không có một vị trí lưu nào miễn nhiễm mọi rủi ro:

-   `localStorage`: JavaScript cùng origin có thể đọc; XSS có thể đánh
    cắp token.
-   `sessionStorage`: thường giới hạn theo tab/session browser hơn
    `localStorage`, nhưng vẫn có thể bị JavaScript cùng origin đọc.
-   Cookie `HttpOnly`: hạn chế JavaScript đọc cookie, nhưng browser tự
    gửi cookie nên cần cân nhắc CSRF.
-   Backend-for-Frontend (BFF): browser giữ cookie phiên tới BFF, còn
    token được giữ phía server; giảm việc token OAuth xuất hiện trực
    tiếp trong browser nhưng tăng trách nhiệm vận hành phía backend.

Chọn theo threat model và kiến trúc, không theo một quy tắc "token luôn
phải lưu ở X".

### Interaction / demo

Hỏi: "Nếu user logout nhưng access token JWT còn 5 phút mới hết hạn,
request tiếp theo có chắc bị từ chối không?" Đáp án: không, trừ khi kiến
trúc có cơ chế thu hồi/kiểm tra trạng thái phù hợp.

### Transition

"Đã hiểu cách dùng token trực tiếp. Bây giờ xem một lựa chọn kiến trúc
khác: để Identity Provider xử lý đăng nhập."

------------------------------------------------------------------------

## Slide 17 --- JWT vs Session: choose by architecture (4 phút)

### On-screen content

  -----------------------------------------------------------------------
  Tiêu chí                Server-side Session     JWT access token
  ----------------------- ----------------------- -----------------------
  Trạng thái đăng nhập    Server lưu session      Token mang claims được
                                                  ký

  Thu hồi tức thời        Tương đối trực tiếp nếu Cần cơ chế bổ sung nếu
                          session store tập trung verify offline

  Scale nhiều instance    Cần shared session      Có thể verify tại nhiều
                          store hoặc cơ chế tương service nếu quản lý key
                          đương                   và claims đúng

  Browser                 Cookie attributes và    Lưu token, XSS và vòng
                          CSRF cần xử lý          đời cần xử lý

  Vận hành                Quản lý session store   Quản lý key, claims,
                                                  expiration và
                                                  revocation strategy
  -----------------------------------------------------------------------

### Speaker notes

JWT không tự động "stateless hoàn toàn": hệ thống vẫn có thể cần
refresh-token store, denylist, key rotation, account status check hoặc
session record. Ngược lại, Session không có nghĩa chỉ chạy được trên một
server; có thể dùng Redis hoặc shared store.

Với website browser và backend cùng domain, server-side session là lựa
chọn đơn giản, dễ thu hồi và thường đáng cân nhắc đầu tiên. Với hệ thống
có nhiều resource server, cần token mang claims và có khả năng verify
độc lập, JWT có thể phù hợp. Nhưng phải tính cả key management,
audience, revocation và độ trễ cập nhật trạng thái.

Đừng chọn JWT chỉ vì nghe nói scale tốt hơn, hoặc chọn Session vì cho
rằng JWT không an toàn. Cần xuất phát từ client type, trust boundary,
yêu cầu logout, khả năng vận hành và threat model.

### Interaction / demo

Đưa ba bối cảnh:

1.  Internal admin website cùng domain.
2.  Mobile app gọi API.
3.  Nhiều backend service nhận access token.

Cho khán giả đề xuất giải pháp và nêu ít nhất một trade-off.

### Transition

"Cho đến giờ DevHub tự quản lý credential. Nếu công ty muốn dùng SSO, ai
sẽ xác minh danh tính?"

------------------------------------------------------------------------

# 5. OAuth2, OIDC và SAML (52--68 phút)

## Slide 18 --- DevHub now needs Company SSO (2 phút)

### On-screen content

``` text
Employee → Company Identity Provider → DevHub
```

Yêu cầu: nhân viên dùng tài khoản công ty để đăng nhập, DevHub không tự
quản lý password của họ.

### Speaker notes

Trong môi trường doanh nghiệp, ứng dụng thường ủy thác việc xác thực cho
một Identity Provider (IdP). DevHub cần nhận và kiểm tra kết quả xác
thực theo protocol đã thống nhất, rồi tạo phiên đăng nhập của ứng dụng
hoặc sử dụng token theo thiết kế.

Đừng đồng nhất việc chuyển hướng tới một trang login với việc đã xác
minh danh tính. Callback và token/assertion nhận về vẫn phải được kiểm
tra.

### Interaction / demo

Hỏi: "DevHub cần biết người dùng đã đăng nhập, hay cần được phép gọi API
khác thay mặt người dùng?"

### Transition

"Hai yêu cầu đó liên quan nhưng không giống nhau --- đó là lý do cần
phân biệt OAuth2 và OIDC."

------------------------------------------------------------------------

## Slide 19 --- OAuth2 is not an identity protocol by itself (3 phút)

### On-screen content

-   OAuth 2.0: authorization framework.
-   OpenID Connect (OIDC): identity layer trên OAuth 2.0.
-   SAML: protocol dựa trên XML assertions, thường dùng trong enterprise
    SSO.

### Speaker notes

OAuth2 chủ yếu giải quyết việc client nhận quyền truy cập tài nguyên
thông qua access token. OAuth2 thuần không định nghĩa chuẩn `id_token`
để xác thực danh tính người dùng cho client.

OIDC bổ sung các quy tắc để client xác minh danh tính, bao gồm ID token
và các kiểm tra liên quan. OIDC thường là lựa chọn phù hợp cho ứng dụng
web/mobile mới khi IdP hỗ trợ.

SAML vẫn phổ biến trong enterprise SSO, nhất là hệ thống đã tích hợp với
các Identity Provider và quy trình quản trị doanh nghiệp lâu năm. Không
nên chọn chỉ dựa trên việc protocol nào "mới hơn"; compatibility với
IdP, sản phẩm và yêu cầu khách hàng rất quan trọng.

### Interaction / demo

Đưa ba yêu cầu:

-   Cho ứng dụng truy cập API thay mặt user.
-   Đăng nhập user bằng IdP và nhận thông tin xác thực.
-   Tích hợp SSO với một enterprise IdP đã dùng SAML.

Yêu cầu khán giả chọn protocol/flow cần tìm hiểu.

### Transition

"Với OIDC, hãy theo dõi một lần đăng nhập từ lúc bắt đầu đến lúc client
nhận được response."

------------------------------------------------------------------------

## Slide 20 --- Authorization Code + PKCE, step by step (4 phút)

### On-screen content

``` text
Client → Authorization endpoint
User authenticates at IdP
IdP → Authorization code → Client callback
Client + code_verifier → Token endpoint
Token endpoint → Tokens
```

### Speaker notes

Authorization Code flow tách bước nhận authorization code khỏi bước đổi
code lấy token. Với PKCE, client tạo `code_verifier` ngẫu nhiên và gửi
`code_challenge` tương ứng trong authorization request. Khi đổi code,
client gửi lại `code_verifier`; authorization server kiểm tra nó có khớp
challenge đã lưu hay không.

Nếu attacker chặn được authorization code nhưng không có
`code_verifier`, việc đổi code sẽ khó thực hiện hơn. PKCE không thay thế
TLS, `state`, redirect URI validation hay việc kiểm tra token; nó bảo vệ
một phần cụ thể của flow.

`state` giúp liên kết authorization response với request khởi tạo và
chống một số kiểu login CSRF. OIDC `nonce` liên kết ID token với
authentication request, giúp phát hiện token bị phát lại hoặc đưa nhầm
vào flow khi được kiểm tra đúng cách.

Redirect URI cần được validate chặt chẽ. Tránh wildcard hoặc kiểm tra
chuỗi lỏng lẻo khiến code/token bị chuyển hướng tới nơi không mong muốn.

### Interaction / demo

Cho sơ đồ thiếu hai bước: tạo challenge và gửi verifier. Mời khán giả
sắp xếp đúng thứ tự.

### Transition

"Sau token endpoint, client có thể nhận nhiều loại token. Chúng không
thể dùng thay nhau."

------------------------------------------------------------------------

## Slide 21 --- ID token is not an access token (4 phút)

### On-screen content

  -----------------------------------------------------------------------
  Token                   Dành cho                Mục đích
  ----------------------- ----------------------- -----------------------
  ID token                OIDC client             Chứng minh thông tin
                                                  xác thực về user

  Access token            Resource server/API     Cấp quyền truy cập tài
                                                  nguyên theo
                                                  token/policy
  -----------------------------------------------------------------------

### Speaker notes

ID token thường là JWT trong OIDC. Client cần kiểm tra chữ ký, issuer,
audience, expiration và các điều kiện OIDC phù hợp; nếu request dùng
`nonce`, cần kiểm tra `nonce` trong ID token.

`sub` là định danh subject trong phạm vi issuer. Không nên giả định
`sub` giống nhau giữa mọi IdP. Khi liên kết tài khoản, cặp
issuer/subject và quy tắc của hệ thống cần được cân nhắc.

Access token dành cho resource server. Định dạng access token có thể là
JWT hoặc opaque token; client không nên mặc định access token luôn là
JWT có thể decode và hiểu được. Resource server xác minh access token
theo cơ chế do authorization server định nghĩa.

Một lỗi thiết kế thường gặp là lấy ID token gửi tới API chỉ vì nó là
JWT. API cần loại token dành cho chính nó và kiểm tra audience, issuer,
scope/claims theo hợp đồng. ID token không được phát hành với mục đích
thay thế access token.

### Interaction / demo

Cho một ID token có `aud` không khớp client và hỏi client nên làm gì.
Đáp án: từ chối token, không thiết lập phiên đăng nhập dựa trên token
đó.

### Transition

"OIDC thường phù hợp với ứng dụng mới, còn SAML vẫn xuất hiện ở nhiều hệ
thống doanh nghiệp."

------------------------------------------------------------------------

## Slide 22 --- SAML vs OIDC: same business need, different protocol (3 phút)

### On-screen content

``` text
SP-initiated SAML:
Service Provider → Identity Provider
Identity Provider → Browser → Service Provider
                         SAML Response / Assertion
```

### Speaker notes

Trong SP-initiated flow, người dùng bắt đầu tại Service Provider (SP).
SP tạo authentication request và chuyển browser tới IdP. Sau khi xác
thực, IdP gửi SAML Response về ACS endpoint của SP thông qua browser
theo binding được cấu hình.

SP phải kiểm tra response/assertion theo protocol: chữ ký và trust
configuration, issuer, audience, thời hạn, recipient/destination và
`InResponseTo` khi áp dụng. Cũng cần xử lý replay và các yêu cầu bảo mật
của thư viện/protocol. Không được tin assertion chỉ vì nó được gửi về
đúng endpoint.

OIDC thường dễ tích hợp hơn với ứng dụng web/mobile hiện đại và
API-oriented systems. SAML thường gặp trong enterprise SSO, đặc biệt khi
đối tác đã có sẵn cấu hình SAML. Quyết định nên dựa vào khả năng IdP hỗ
trợ, yêu cầu khách hàng, thư viện và quy trình vận hành.

### Interaction / demo

Hỏi: "Một khách hàng doanh nghiệp yêu cầu SAML vì IdP của họ đã cấu hình
như vậy. Chúng ta có nên bắt họ chuyển sang OIDC không?" Thảo luận ngắn
về compatibility và chi phí tích hợp.

### Transition

"Đã biết các lựa chọn. Bây giờ hãy áp dụng vào ba kiến trúc thật."

------------------------------------------------------------------------

# 6. Architecture Showdown (68--83 phút)

## Slide 23 --- Three systems, three constraints (3 phút)

### On-screen content

-   **A:** Internal admin website, browser và backend cùng domain.
-   **B:** Mobile app gọi API, nhiều backend service.
-   **C:** SaaS B2B cần SSO với khách hàng doanh nghiệp.

### Speaker notes

Chia khán giả thành ba nhóm hoặc giao ba case cho ba bàn. Mỗi nhóm cần
đưa ra lựa chọn ban đầu về authentication mechanism, chưa cần tranh luận
chi tiết.

### Interaction / demo

Mỗi nhóm chọn Session, JWT, OIDC hoặc SAML tùy bài toán. Cho phép kết
hợp nhiều cơ chế nếu có lý do rõ ràng.

### Transition

"Chọn công nghệ mới chỉ là bước đầu. Cần nói rõ credential được lưu và
thu hồi ra sao."

------------------------------------------------------------------------

## Slide 24 --- Design your login architecture (4 phút)

### On-screen content

Mỗi nhóm trả lời bốn câu:

1.  Ai xác minh danh tính?
2.  Credential được gửi và lưu thế nào?
3.  Hết hạn, logout và revoke hoạt động ra sao?
4.  Nếu credential bị đánh cắp, hệ thống phản ứng thế nào?

### Speaker notes

Yêu cầu nhóm ghi ra một sơ đồ nhỏ và nêu các giả định. Không cần thiết
kế RBAC hay permission matrix; mục tiêu là authentication lifecycle.

Gợi ý các điểm cần cân nhắc: browser hay mobile client, cookie hay
Authorization header, session store hay token validation, access token
lifetime, refresh token rotation, IdP integration và khả năng revoke.

### Interaction / demo

Cho nhóm bốn phút thảo luận. Người trình bày đi quanh để hỏi "Tại sao?"
thay vì gợi ý đáp án.

### Transition

"Một phương án tốt phải chịu được câu hỏi về rủi ro và vận hành."

------------------------------------------------------------------------

## Slide 25 --- Defend your decision (4 phút)

### On-screen content

Đánh giá dựa trên:

-   Credential security
-   Session/token lifecycle
-   Revocation strategy
-   Browser/mobile compatibility
-   Operational complexity

### Speaker notes

Không chấm điểm dựa trên việc nhóm chọn JWT hay Session. Hãy xem họ có
hiểu trade-off và có nêu được cơ chế giảm thiểu rủi ro hay không.

### Interaction / demo

Mỗi nhóm trình bày trong 45 giây. Nhóm khác hỏi một câu phản biện. Nếu
nhóm nói "JWT stateless nên scale tốt", hỏi tiếp: "Khi user bị khóa, làm
sao các API biết token vẫn cần bị từ chối?"

### Transition

"Giờ giả sử sự cố ban đầu đã xảy ra thật --- credential bị đánh cắp."

------------------------------------------------------------------------

## Slide 26 --- Incident replay: credential compromised (4 phút)

### On-screen content

> Một nhân viên báo credential đăng nhập đã bị đánh cắp.\
> Hệ thống có thể ngăn request tiếp theo bằng cách nào?

### Speaker notes

Các lựa chọn phụ thuộc cơ chế đã dùng:

-   Server-side session: revoke session trong session store.
-   Refresh token: revoke refresh token/session family và xử lý reuse
    theo policy.
-   JWT access token verify offline: token có thể còn hiệu lực đến
    `exp`, trừ khi API có thêm denylist, introspection hoặc kiểm tra
    trạng thái.
-   Enterprise SSO: có thể vô hiệu hóa phiên tại IdP, nhưng phiên hoặc
    token đã phát hành ở ứng dụng vẫn cần được xử lý theo thiết kế.

Đừng hứa "logout ngay lập tức ở mọi nơi" nếu kiến trúc không có cơ chế
đảm bảo điều đó.

### Interaction / demo

Yêu cầu từng nhóm nêu một thao tác ứng phó ngay lập tức và một thay đổi
kiến trúc để giảm thiệt hại lần sau.

### Transition

"Trước khi kết thúc, hãy kiểm tra ba hiểu lầm dễ xuất hiện nhất."

------------------------------------------------------------------------

# 7. Exit Ticket (83--90 phút)

## Slide 27 --- Three myths to retire (2 phút)

### On-screen content

-   "JWT luôn an toàn và tốt hơn Session."
-   "Có MFA thì không cần quan tâm password."
-   "Login thành công nghĩa là request được phép."

### Speaker notes

Mời người nghe chọn nhận định nguy hiểm nhất và giải thích ngắn. Chốt
rằng mỗi công nghệ chỉ giải quyết một phần bài toán; cách triển khai và
các trust boundary mới quyết định hệ thống có an toàn hay không.

### Interaction / demo

Giơ tay vote hoặc trả lời bằng một câu.

### Transition

"Kiểm tra lần cuối bằng ba câu hỏi."

------------------------------------------------------------------------

## Slide 28 --- Exit ticket: can you spot the mistake? (3 phút)

### On-screen content

1.  JWT có chữ ký hợp lệ thì mọi request đều hợp lệ?
2.  Xóa cookie ở browser có đảm bảo logout hoàn toàn?
3.  OAuth2 và OIDC khác nhau ở điểm cốt lõi nào?

### Speaker notes và đáp án

1.  Không. Cần kiểm tra chữ ký, issuer, audience, expiration và các điều
    kiện liên quan; authentication token cũng không tự quyết định mọi
    quyền truy cập.
2.  Không nhất thiết. Với server-side session, cần revoke session phía
    server. Với JWT access token, token có thể vẫn dùng được cho tới khi
    hết hạn nếu không có cơ chế thu hồi/kiểm tra trạng thái.
3.  OAuth2 là authorization framework; OIDC bổ sung identity layer và ID
    token trên OAuth2.

### Interaction / demo

Poll nhanh hoặc yêu cầu mọi người ghi lại một điều sẽ thay đổi trong
codebase.

### Transition

"Xác minh đúng người dùng vẫn chưa đủ để đảm bảo dữ liệu được bảo vệ."

------------------------------------------------------------------------

## Slide 29 --- The next incident: authenticated, but unauthorized (2 phút)

### On-screen content

> User có danh tính hợp lệ gửi request lấy dữ liệu của một nhân viên
> khác.\
> JWT hay Session có tự giải quyết được vấn đề này không?

### Speaker notes

Câu trả lời là không. JWT hoặc Session giúp ứng dụng nhận diện
credential/session; chúng không tự đảm bảo người dùng chỉ truy cập đúng
tài nguyên. Hệ thống cần authorization checks phù hợp ở phía server.

Không đi sâu giải pháp trong slide này. Dùng nó để tạo nhu cầu cho buổi
2.

### Transition / closing

"Buổi sau chúng ta sẽ chuyển từ 'Bạn là ai?' sang 'Bạn được làm gì?' ---
và xem vì sao một hệ thống xác thực tốt vẫn có thể để lộ dữ liệu nếu
authorization được thiết kế sai."

------------------------------------------------------------------------

# 8. Ghi chú kỹ thuật cho demo NestJS

Các demo cần thể hiện hành vi, không cần biến thành một framework
authentication hoàn chỉnh.

## Lab A --- Session lifecycle

### Endpoint gợi ý

``` text
POST /auth/login
GET  /profile
POST /auth/logout
```

### Những gì cần quan sát

-   Cookie có `HttpOnly`, `Secure`, `SameSite` phù hợp.
-   Session ID được rotate sau login.
-   Logout revoke session phía server rồi mới xóa cookie.
-   Session ID cũ không còn hoạt động sau logout.
-   Có idle/absolute timeout nếu demo đủ thời gian.

### Cảnh báo

Không dùng in-memory session store như một giải pháp production cho hệ
thống nhiều instance. Có thể dùng nó cho demo local, nhưng cần nói rõ
giới hạn.

## Lab B --- JWT verification

### Test cases

  Test                                                  Kết quả mong đợi
  ----------------------------------------------------- ------------------
  Token có chữ ký hợp lệ, claims đúng                   Chấp nhận
  Payload bị sửa                                        Từ chối
  Token hết hạn                                         Từ chối
  `iss` sai                                             Từ chối
  `aud` sai                                             Từ chối
  Algorithm không nằm trong allowlist                   Từ chối
  Token dùng `alg: none` trong API yêu cầu signed JWT   Từ chối

### Nguyên tắc triển khai

-   Dùng thư viện JWT được duy trì và cấu hình thuật toán rõ ràng.
-   Không tự viết hàm verify chữ ký.
-   Không lấy `alg` từ header rồi chấp nhận vô điều kiện.
-   Không log token đầy đủ.
-   Không dùng secret hoặc token production trong demo.
-   Tách rõ code cố ý không an toàn khỏi code được dùng để minh họa cách
    phòng vệ.

## Lab C --- OAuth2/OIDC

Có thể dùng sequence diagram hoặc token fixture thay vì tự dựng Identity
Provider. Nếu có tích hợp IdP, dùng tenant/test app riêng, redirect URI
local và account giả lập. Demo cần tập trung vào `state`, PKCE, `nonce`,
ID token validation và phân biệt ID token với access token.

------------------------------------------------------------------------

# 9. Các điểm kỹ thuật cần nhấn mạnh khi trình bày

1.  **Bcrypt không tự chặn brute-force online.** Nó làm mỗi lần đoán
    password tốn kém hơn; rate limiting và monitoring xử lý một phần
    khác của vấn đề.
2.  **Salt không cần bí mật.** Salt giúp mỗi password hash có giá trị
    riêng và chống tái sử dụng bảng tra cứu dựng sẵn.
3.  **JWT decode không phải JWT verify.** Payload signed JWT thường đọc
    được; chữ ký chỉ có ý nghĩa khi verifier thực sự kiểm tra nó.
4.  **Không chấp nhận `alg: none` cho endpoint yêu cầu signed JWT.** Cấu
    hình algorithm allowlist và kiểm tra đúng hành vi của thư viện.
5.  **Chữ ký hợp lệ chưa đủ.** `iss`, `aud`, `exp`, token type và các
    điều kiện liên quan cần khớp với kỳ vọng của resource server/client.
6.  **Logout phụ thuộc cơ chế credential.** Server-side session dễ
    revoke tập trung hơn; JWT verify offline cần chiến lược riêng nếu
    muốn thu hồi trước expiration.
7.  **`HttpOnly` không ngăn mọi tác động của XSS.** Nó hạn chế đọc
    cookie, nhưng script độc hại cùng origin vẫn có thể thực hiện
    request.
8.  **OAuth2 không đồng nghĩa với OIDC.** OAuth2 tập trung vào
    authorization; OIDC bổ sung chuẩn identity.
9.  **ID token không phải access token.** Hai token có audience và mục
    đích khác nhau.
10. **Không có lựa chọn JWT vs Session đúng cho mọi ứng dụng.** Quyết
    định cần dựa vào client type, threat model, lifecycle và khả năng
    vận hành.

------------------------------------------------------------------------

# 10. Tài liệu tham khảo

Nên dùng tài liệu gốc và security cheat sheets để kiểm tra chi tiết
trước buổi sharing:

-   OWASP Authentication Cheat Sheet:
    https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
-   OWASP Password Storage Cheat Sheet:
    https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
-   OWASP Session Management Cheat Sheet:
    https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
-   OWASP Cross-Site Request Forgery Prevention Cheat Sheet:
    https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
-   OWASP JSON Web Token Cheat Sheet:
    https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
-   RFC 7519 --- JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519
-   RFC 8725 --- JSON Web Token Best Current Practices:
    https://www.rfc-editor.org/rfc/rfc8725
-   OAuth 2.0 Security Best Current Practice, RFC 9700:
    https://www.rfc-editor.org/rfc/rfc9700
-   OpenID Connect specifications: https://openid.net/developers/specs/
-   SAML specifications and technical overview:
    https://www.oasis-open.org/standard/

------------------------------------------------------------------------

## Kết luận

Thông điệp nên đọng lại sau buổi sharing không phải là "JWT tốt hơn
Session" hay "hãy dùng OIDC", mà là:

> Authentication là quá trình thiết lập và duy trì niềm tin vào danh
> tính. Password, session, token và SSO chỉ là những cơ chế khác nhau để
> làm việc đó. Mỗi cơ chế đều có giới hạn, và người thiết kế hệ thống
> phải hiểu credential được tạo ra, gửi đi, xác minh, hết hạn và thu hồi
> như thế nào.
