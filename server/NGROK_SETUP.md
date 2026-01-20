# ngrok 멀티플레이어 서버 설정 가이드

## 개요
ngrok을 사용하여 로컬 게임 서버를 외부에서 접속 가능하게 만드는 방법입니다.

---

## 서버 실행 방법

### 1. 게임 서버 시작
```bash
cd server
node server.js
```
서버가 포트 3000에서 실행됩니다.

### 2. ngrok 터널 시작
```bash
ngrok http 3000
```

### 3. ngrok URL 확인
ngrok 실행 후 출력되는 `Forwarding` URL을 확인합니다:
```
Forwarding    https://xxxxx-xxxxx.ngrok-free.dev -> http://localhost:3000
```

---

## 클라이언트 설정 (FPS.html)

### URL 업데이트 위치
`FPS.html` 파일에서 `serverAddr` 변수를 찾아 ngrok URL로 변경합니다:

**라인 4153, 4228 근처:**
```javascript
const serverAddr = 'https://xxxxx-xxxxx.ngrok-free.dev';
```

---

## 문제 해결

### 문제: "server error" 연결 오류
ngrok 무료 버전은 첫 연결 시 인터스티셜(경고) 페이지를 보여주며, 이것이 Socket.IO 연결을 방해할 수 있습니다.

### 해결 방법
`initMultiplayer` 함수에서 Socket.IO 연결 옵션을 수정합니다:

```javascript
socket = io(connectionUrl, {
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ['websocket', 'polling'],  // WebSocket 우선 사용
    extraHeaders: {
        'ngrok-skip-browser-warning': 'true'  // 경고 페이지 우회
    }
});
```

### 적용된 수정 사항
1. **`transports: ['websocket', 'polling']`**: WebSocket 전송을 우선 사용하여 polling에서 발생하는 ngrok 인터스티셜 문제 우회
2. **`ngrok-skip-browser-warning` 헤더**: ngrok의 브라우저 경고 페이지 건너뛰기

---

## 주의사항

> [!WARNING]
> ngrok 무료 버전은 **재시작할 때마다 URL이 변경됩니다**.
> 매번 `FPS.html`의 `serverAddr`를 새 URL로 업데이트해야 합니다.

### 권장: ngrok 고정 도메인 (유료)
ngrok 유료 플랜을 사용하면 고정 도메인을 설정할 수 있어 URL 변경 없이 사용 가능합니다.

---

## 빠른 체크리스트

- [ ] 게임 서버 실행 (`node server.js`)
- [ ] ngrok 터널 시작 (`ngrok http 3000`)
- [ ] ngrok URL 확인 (Forwarding 라인)
- [ ] `FPS.html`에서 `serverAddr` 업데이트
- [ ] 브라우저 캐시 삭제 후 테스트 (Ctrl+F5)

---

## 테스트

1. 브라우저에서 ngrok URL 직접 접속하여 서버 확인
2. `FPS.html` 열기
3. "함께하기" 클릭
4. 방 생성 및 다른 플레이어 접속 테스트
