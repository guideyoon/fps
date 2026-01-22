# 무기 좌표 디버그 패널 가이드

무기 모델의 위치(Position), 회전(Rotation), 크기(Scale)를 실시간으로 조정하기 위한 디버그 패널 사용법입니다.

## 1. 패널 활성화 방법

### ⌨️ 단축키 이용 (가장 권장)
게임 도중 **`[` (대괄호 열기)** 키를 누르면 모든 무기의 좌표 패널이 한꺼번에 켜지거나 꺼집니다. 콘솔 명령어를 입력할 필요가 없어 가장 편리합니다.

### 💻 브라우저 콘솔 명령어
단축키가 작동하지 않거나 특정 패널만 열고 싶을 때 브라우저에서 `F12`를 눌러 **Console** 탭에 아래 명령어를 입력하세요.

### 🔪 나이프 (Knife)
```javascript
document.getElementById('knife-debug-panel').style.display = 'block';
```

### 🔫 어썰트 라이플 (Assault Rifle)
```javascript
document.getElementById('rifle-debug-panel').style.display = 'block';
```

### 🔫 피스톨 (Pistol)
```javascript
document.getElementById('pistol-debug-panel').style.display = 'block';
```

### 🎯 스나이퍼 (Sniper)
```javascript
document.getElementById('sniper-debug-panel').style.display = 'block';
```

## 2. 사용 방법

1.  **무기 선택**: 디버그하려는 무기를 숫자 키(1~4)로 먼저 선택해야 모델이 화면에 나타납니다.
2.  **값 조정**: 활성화된 패널의 슬라이더를 움직이거나 `+`, `-` 버튼을 눌러 정교하게 위치를 잡습니다.
3.  **반영**: 원하는 좌표를 찾았다면, 해당 수치들을 코드의 `WEAPONS` 상수 배열(주로 `Constants.ts` 또는 `FPS.html` 내)의 `glbHip` 또는 `glbAds` 속성에 업데이트하세요.

## 3. 패널 닫기

패널을 다시 숨기려면 아래 명령어를 입력하세요 (예시: 나이프).
```javascript
document.getElementById('knife-debug-panel').style.display = 'none';
```
