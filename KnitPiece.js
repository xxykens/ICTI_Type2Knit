/**
 * [KnitPiece] 1초 단위 순수 아카이브 로그를 기반으로
 * 음절 분해 및 2차원 격자 재배치를 수행하는 마스터 데이터 가공 클래스
 */
class KnitPiece {
  /**
   * 니트 테이블의 메타 데이터를 함께 저장함
   */
  constructor(nickname = "무명작가", privacy = "public") {
    this.nickname = nickname;                 // 1. 닉네임
    this.privacy = privacy;                   // 2. 공개설정
    this.date = new Date().toISOString();     // 3. 생성일자
    
    this.cells = [];                          // 1차적 수집: 순수 원본 1초 로그 배열
    this.knitArray = [];                      // 2차적 변환: 음절별로 재배치된 2차원 격자 배열
  }

  /**
   * 💡 니트 변형 함수용 유틸리티: 각 클래스 단위의 text가 몇 음절인지 계산
   * (p5.js 문자열 처리 기반 - 공백을 제외한 실제 글자 수 체크)
   */
  countSyllables(text) {
    if (!text) return 0;
    // 모든 공백을 제거한 순수 글자(음절) 수 반환
    return text.replace(/ /g, "").length; 
  }

  /**
   * 🌟 [1차적 처리] page_S4에서 제공하는 archiveData 배열값을 그대로 불러와 수집함
   * @param {Array} rawArchiveData - 전역 archiveData 배열 (최신 데이터가 맨 앞인 상태)
   */
  absorbArchiveData(rawArchiveData) {
    // 원본 데이터 오염 방지를 위해 깊은 복사 후 타임라인 순서(과거 -> 최신)로 정렬
    let timelineArray = JSON.parse(JSON.stringify(rawArchiveData));
    timelineArray.reverse();

    this.cells = []; // 기존 적재 로그 초기화

    timelineArray.forEach((cell, index) => {
      // 해당 1초 데이터의 순수 음절 수 계산
      let syllableCount = this.countSyllables(cell.text);

      // 기획서 및 팀원분 엔진 명세에 100% 맞춰 일차적으로 cells 배열에 주입
      this.cells.push({
        knitStamp: index + 1,               // 시간 변수: 몇 초에 생성된 값인지 (1초, 2초...)
        text: cell.text || "",              // 텍스트: 모직물 위에 겹쳐서 호버링/렌더링될 원본 문자열
        syllables: syllableCount,           // 변형 연산용 음절 수
        isBackspace: cell.isBackspace,      // 패턴엔진용 지우기 여부
        typingSpeed: cell.speed,            // 패턴엔진용 타이핑 속도
        emotionTag: cell.emotionTag,        // 감정 수치 1: 조원분들의 한글 표정 태그 ("중립", "찌푸림" 등)
        emotionIntensity: cell.emotionIntensity // 감정 수치 2: 조원분들의 표정 변화 강도 (0 ~ 1)
      });
    });

    // 1차 수집이 끝나면 즉시 2차원 격자 재배치 로직 가동
    this.transformAndAlignGrid();
  }

  /**
   * 🛠️ [2차적 변환] 니트 변형 함수!!
   * 1초마다 한 음절이 아닐 경우, 별도로 음절을 따로 맞춰서 10열 격자 좌표를 생성해 줍니다.
   */
  transformAndAlignGrid() {
    this.knitArray = [];
    let currentColumn = 0;
    let currentRow = 0;

    this.cells.forEach((cell) => {
      // 💡 핵심: 글자가 없더라도(예: 백스페이스만 누른 1초) 
      // 패턴엔진 측의 모직물 형태(흔적)는 유지되어야 하므로 최소 1칸을 차지하게 만듭니다.
      let loopCount = Math.max(cell.syllables, 1);

      // 음절 수만큼 루프를 돌며 2차원 바둑판 칸마다 쪼개서 속성 전달
      for (let i = 0; i < loopCount; i++) {
        this.knitArray.push({
          _row: currentRow,                 // 격차 재배치 행 (Y축)
          _col: currentColumn,              // 격차 재배치 열 (X축 - 10코 고정)
          knitStamp: cell.knitStamp,        // 원본 시간 변수 연동
          
          // 마우스 호버링 및 첫 글자 출력을 위해 텍스트 정보 매핑
          text: cell.text, 
          
          // 패턴엔진 측의 모직물 표현을 위한 데이터 원본 그대로 활용
          speed: cell.typingSpeed,
          isBackspace: cell.isBackspace,
          
          // 기획안 명세 일치화된 감정 데이터
          emotionTag: cell.emotionTag,
          emotionIntensity: cell.emotionIntensity
        });

        // 🧵 한 단에 고정 10코씩 배치하는 줄바꿈 시스템
        currentColumn++;
        if (currentColumn >= 10) {
          currentColumn = 0;
          currentRow++;
        }
      }
    });

    console.log(`🧶 [KnitPiece 변환 완료] 총 ${this.cells.length}초 로그 기반 -> 2차원 격자 ${this.knitArray.length}코 생성!`);
  }
}

// 다른 파일에서 언제든 인스턴스를 만들 수 있게 전역 바인딩
window.KnitPiece = KnitPiece;