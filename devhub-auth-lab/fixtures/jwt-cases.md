# JWT demo test cases

| Case | Expected result | Why |
|---|---|---|
| Correct HS256 signature, expected issuer/audience, unexpired | Accept | All required checks pass |
| Payload changed without resigning | Reject | Signature no longer matches |
| `alg: none` unsigned token | Reject | Algorithm allowlist excludes `none` |
| Expired token | Reject | `exp` is in the past |
| Wrong `iss` | Reject | Token was not issued by the expected issuer |
| Wrong `aud` | Reject | Token is not intended for this API |
| HS384 token | Reject | Algorithm is not in the allowlist |
| `nbf` in the future | Reject | Token is not valid yet |
| Missing/malformed Bearer header | Reject with 401 | Credential is absent or malformed |

Every case except the missing header is available as a prepared token in the frontend (`GET /lab/jwt/fixtures`). The strict verifier rejects each one at a different step; the naive verifier accepts all of them.

All test tokens and identities are synthetic. Never paste a production token into this lab.
