// Firebase SDK 및 Firestore 모듈 임포트
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: 본인의 Firebase 프로젝트 설정 정보로 교체하세요
const firebaseConfig = {
    apiKey: "AIzaSyDScVAWfysR5Qzzswggc0t6eXLnIBLYyZM",
    authDomain: "fir-app-eda58.firebaseapp.com",
    projectId: "fir-app-eda58",
    storageBucket: "fir-app-eda58.firebasestorage.app",
    messagingSenderId: "61954133596",
    appId: "1:61954133596:web:a8fa405b58fffb8eede099"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 공공데이터포털 인증키 및 기본 설정 (Decoding Key 입력)
const TOUR_API_KEY = "b45e02c4dfb2b0d18fee5d4bbbca349b9b6f6f70ab819215d9cfe6184588e94a";
const FIRESTORE_DOC_REF = doc(db, "userActivity", "lastSearch");

// DOM 요소 참조
const areaSelect = document.getElementById("areaSelect");
const searchBtn = document.getElementById("searchBtn");
const resultContainer = document.getElementById("resultContainer");
const statusBox = document.getElementById("statusBox");

// 지역 코드별 이름 매핑 (화면 표시용)
const areaNames = {
    "1": "서울", "6": "부산", "4": "대구", "2": "인천", 
    "5": "광주", "3": "대전", "7": "울산", "31": "경기도", 
    "32": "강원특별자치도", "39": "제주도"
};

/**
 * 1. 앱 최초 로딩 시 Firebase에서 이전 저장 정보 확인 및 복원
 */
window.addEventListener("DOMContentLoaded", async () => {
    try {
        statusBox.textContent = "저장된 활동 내역을 불러오는 중...";
        const docSnap = await getDoc(FIRESTORE_DOC_REF);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const savedAreaCode = data.areaCode;
            
            if (savedAreaCode && areaNames[savedAreaCode]) {
                areaSelect.value = savedAreaCode;
                statusBox.textContent = `이전에 조회한 '${areaNames[savedAreaCode]}' 지역 정보를 불러옵니다.`;
                await fetchAndDisplayTourData(savedAreaCode);
            } else {
                hideResults("저장된 지역 정보가 없습니다. 지역을 선택 후 조회해주세요.");
            }
        } else {
            hideResults("저장된 지역 정보가 없습니다. 지역을 선택 후 조회해주세요.");
        }
    } catch (error) {
        console.error("Firebase 데이터 로드 실패:", error);
        hideResults("데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

/**
 * 2. '조회하기' 버튼 클릭 이벤트 리스너
 */
searchBtn.addEventListener("click", async () => {
    const selectedAreaCode = areaSelect.value;
    if (!selectedAreaCode) {
        alert("조회할 지역을 선택해주세요.");
        return;
    }

    try {
        statusBox.textContent = "관광 정보를 불러오는 중입니다...";
        searchBtn.disabled = true;

        // 선택한 지역 정보를 Firebase에 저장 (업데이트)
        await setDoc(FIRESTORE_DOC_REF, {
            areaCode: selectedAreaCode,
            areaName: areaNames[selectedAreaCode],
            updatedAt: new Date().toISOString()
        });

        // 공공데이터 API 호출 및 화면 표출
        await fetchAndDisplayTourData(selectedAreaCode);
        statusBox.textContent = `'${areaNames[selectedAreaCode]}' 지역 관광 정보 조회 완료 (Firebase 업데이트됨)`;
    } catch (error) {
        console.error("작업 처리 실패:", error);
        statusBox.textContent = "정보를 처리하는 도중 오류가 발생했습니다.";
    } finally {
        searchBtn.disabled = false;
    }
});

/**
 * 3. 한국관광공사 API 호출 및 목록 뷰 시각화 함수
 */
async function fetchAndDisplayTourData(areaCode) {
    // 한국관광공사 국문 관광정보 서비스 - 지역별조회 API 엔드포인트 (기본 개정 버전)
    const url = `https://apis.data.go.kr/B551011/KorService2?serviceKey=${TOUR_API_KEY}&numOfRows=12&pageNo=1&MobileOS=ETC&MobileApp=WebProject&areaCode=${areaCode}&_type=json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("API 네트워크 응답이 올바르지 않습니다.");

    const json = await response.json();
    const items = json?.response?.body?.items?.item;

    if (!items || items.length === 0) {
        hideResults("해당 지역에 등록된 관광 정보가 없습니다.");
        return;
    }

    renderCards(items);
}

/**
 * 4. 카드 형태의 시각화 목록 뷰 렌더링
 */
function renderCards(items) {
    resultContainer.innerHTML = "";
    
    items.forEach(item => {
        const title = item.title || "제목 없음";
        const addr = item.addr1 || "주소 정보 없음";
        // 이미지가 없는 경우 대체 이미지 처리
        const imageUrl = item.firstimage || "https://via.placeholder.com/300x180?text=No+Image";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
            <div class="card-content">
                <h3 class="card-title">${title}</h3>
                <p class="card-addr">${addr}</p>
            </div>
        `;
        resultContainer.appendChild(card);
    });

    resultContainer.classList.remove("hidden");
}

/**
 * 결과 영역 숨김 및 상태 메시지 출력 함수
 */
function hideResults(message) {
    resultContainer.innerHTML = "";
    resultContainer.classList.add("hidden");
    statusBox.textContent = message;
}
