# FPS Game

3D FPS 게임 - Three.js 기반

## 게임 플레이 방법

1. 게임을 시작하려면 화면을 클릭하여 포인터 잠금을 활성화하세요.
2. **WASD** - 이동
3. **Space** - 점프
4. **Shift** - 달리기
5. **Ctrl** - 움직임 감소
6. **마우스 왼쪽 클릭** - 발사/공격
7. **마우스 오른쪽 클릭** - 조준
8. **R** - 재장전
9. **1, 2, 3, 4** - 무기 전환
   - 1번: 소총 (ASSAULT RIFLE)
   - 2번: 권총 (TACTICAL PISTOL)
   - 3번: 저격총 (TAC-50 SNIPER)
   - 4번: 나이프 (KARAMBIT)
10. **Tab** - 다음 무기로 전환
11. **Esc** - 일시정지

## 게임 특징

- 3D 그래픽 (Three.js)
- 다양한 무기 시스템
- 적 AI (좀비)
- 체력 시스템
- 재장전 시스템
- 조준 시스템
- 사운드 효과

## 기술 스택

- HTML5
- CSS3
- JavaScript
- Three.js (3D 라이브러리)
- Web Audio API

## 로컬 실행 방법

1. 이 저장소를 클론하거나 다운로드하세요.
2. Python이 설치되어 있다면:
   ```bash
   python -m http.server 8000
   ```
3. 브라우저에서 `http://localhost:8000/FPS.html` 또는 `http://localhost:8000/index.html`로 접속하세요.

또는 간단히 `FPS.html` 파일을 브라우저로 직접 열어도 됩니다 (일부 기능은 HTTP 서버가 필요할 수 있습니다).

## 파일 구조

```
fps/
├── FPS.html          # 메인 게임 파일
├── reload1.mp3       # 재장전 소리
├── rifle.mp3         # 저격총 발사 소리
├── sword.mp3         # 나이프 휘두르기 소리
├── c-sword.mp3       # 나이프 교체 소리
├── c-sochong.mp3     # 소총 교체 소리
├── c-gun.mp3         # 권총 교체 소리
├── c-rifle.mp3       # 저격총 교체 소리
├── gunshot.mp3       # 권총 발사 소리
├── empty.mp3         # 빈 격발 소리
└── README.md         # 이 파일
```

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

