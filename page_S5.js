/**
 * [S5] 아카이브 DB 적재 엔진
 * UI는 index.html p12가 담당, 여기선 DB 저장 로직만 처리
 */
const page_S5 = {
  db: null,
  failCount: 0,

  initDB: function() {
    this.db = new Dexie("KnitArchiveDB");
    this.db.version(1).stores({
      knitTable: '++id, nickname, privacy, date'
    });
    console.log("💾 [S5] Dexie DB 초기화 완료");
    return Promise.resolve();
  },

  // p12 register.png 클릭 시 호출
  handleUpload: function(nickname, privacy) {
    if (!this.db) {
      alert("데이터베이스가 연결되지 않았습니다.");
      return;
    }

    const storedNickname = privacy === 'partial' ? '' : nickname;
    let myKnitPiece = new KnitPiece(storedNickname, privacy); 
    myKnitPiece.absorbArchiveData(window.archiveData);

    const payload = {
      nickname: myKnitPiece.nickname,
      privacy: myKnitPiece.privacy,
      date: myKnitPiece.date,
      cells: myKnitPiece.cells,
      knitArray: myKnitPiece.knitArray
    };

    // 비공개: DB 저장 안 하고 p16으로
    if (privacy === 'private') {
      if (typeof goTo === 'function') goTo('p16');
      return;
    }

    this.db.knitTable.add(payload)
      .then(generatedId => {
        this.failCount = 0;
        console.log(`✅ 아카이브 등록 성공 (ID: ${generatedId})`);
        if (typeof goTo === 'function') goTo('p18');
      })
      .catch(() => {
        this.processFailure(nickname, privacy);
      });
  },

  processFailure: function(nickname, privacy) {
    this.failCount++;
    if (this.failCount >= 3) {
      alert("🚨 저장에 3회 실패했습니다. 잠시 후 다시 시도해주세요.");
      this.failCount = 0;
    } else {
      const retry = confirm(`저장에 실패했습니다. 다시 시도할까요? (${this.failCount}/3)`);
      if (retry) this.handleUpload(nickname, privacy);
    }
  }
};

window.page_S5 = page_S5;
