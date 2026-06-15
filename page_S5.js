/**
 * [S5] 아카이브 DB 적재 엔진
 * UI는 index.html p12가 담당, 여기선 DB 저장 로직만 처리
 */
function createNativeKnitArchiveDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB를 사용할 수 없습니다.'));
      return;
    }

    const request = indexedDB.open('KnitArchiveDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('knitTable')) {
        const store = db.createObjectStore('knitTable', { keyPath: 'id', autoIncrement: true });
        store.createIndex('nickname', 'nickname', { unique: false });
        store.createIndex('privacy', 'privacy', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        knitTable: {
          add(payload) {
            return new Promise((resolveAdd, rejectAdd) => {
              const tx = db.transaction('knitTable', 'readwrite');
              const store = tx.objectStore('knitTable');
              const addRequest = store.add(payload);
              addRequest.onsuccess = () => resolveAdd(addRequest.result);
              addRequest.onerror = () => rejectAdd(addRequest.error);
              tx.onerror = () => rejectAdd(tx.error);
            });
          },
          delete(key) {
            return new Promise((resolveDel, rejectDel) => {
              const tx = db.transaction('knitTable', 'readwrite');
              const store = tx.objectStore('knitTable');
              const delRequest = store.delete(key);
              delRequest.onsuccess = () => resolveDel();
              delRequest.onerror = () => rejectDel(delRequest.error);
              tx.onerror = () => rejectDel(tx.error);
            });
          },
          toArray() {
            return new Promise((resolveAll, rejectAll) => {
              const tx = db.transaction('knitTable', 'readonly');
              const store = tx.objectStore('knitTable');
              if (typeof store.getAll === 'function') {
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => resolveAll(getAllRequest.result);
                getAllRequest.onerror = () => rejectAll(getAllRequest.error);
                return;
              }

              const rows = [];
              const cursorRequest = store.openCursor();
              cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) {
                  resolveAll(rows);
                  return;
                }
                rows.push(cursor.value);
                cursor.continue();
              };
              cursorRequest.onerror = () => rejectAll(cursorRequest.error);
            });
          }
        }
      });
    };
  });
}

const page_S5 = {
  db: null,
  failCount: 0,

  initDB: function() {
    if (typeof Dexie === 'function') {
      this.db = new Dexie("KnitArchiveDB");
      this.db.version(1).stores({
        knitTable: '++id, nickname, privacy, date'
      });
      console.log("💾 [S5] Dexie DB 초기화 완료");
      return Promise.resolve();
    }

    return createNativeKnitArchiveDB().then((db) => {
      this.db = db;
      console.log("💾 [S5] IndexedDB fallback 초기화 완료");
    });
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
