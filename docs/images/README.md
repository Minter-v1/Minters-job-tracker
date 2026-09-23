# 서비스 이미지 위치

실제 서비스 화면을 촬영한 뒤 이 폴더에 다음 이름으로 추가합니다.

| 파일 | 권장 화면 | 권장 비율 |
| --- | --- | --- |
| `dashboard.png` | 지원 현황 메인 화면 | 16:9 또는 1440×900 |
| `application-detail.png` | 지원 상세·체크리스트·메모 화면 | 4:3 또는 1200×900 |
| `mobile.png` | 모바일 지원 목록 또는 상세 화면 | 9:19.5 |

이미지를 추가한 뒤 루트 `README.md`의 스크린샷 플레이스홀더를 아래 Markdown으로 교체합니다.

```md
![ApplyLog 대시보드](./docs/images/dashboard.png)
![ApplyLog 지원 상세](./docs/images/application-detail.png)
```

스크린샷에는 실제 이메일, 전화번호, 비밀번호, API 키, 지원서 원문 등 민감한 정보가 보이지 않도록 샘플 데이터를 사용합니다.
