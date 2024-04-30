let buttonFlag = false;

function changeButtonOn(btn) {
  btn.innerHTML = "출석 인증 중";
  btn.style.backgroundColor = "#4CAF50";
}

function changeButtonOff(btn) {
  btn.innerHTML = "출석 시작";
  btn.style.backgroundColor = "#00FFFF";
}

function submitData(subjectId) {
  // 아래 함수에서 음파 정보 수집 후 분석해서 위 formData에 담긴 이름, 학번과 함께 서버로 fetch됨
  startAttendanceCheck(subjectId);
}

function buttonClickHandler() {
  if (buttonFlag == false) {
    changeButtonOn(this);
    submitData(btn.id);
    // 여기서 서버 검증 결과에 따라 출석 실패/성공 띄우기
    buttonFlag = true;
  } else {
    changeButtonOff(this);
    buttonFlag = false;
  }
}

var btn = document.getElementsByClassName("button_attendance")[0];
btn.addEventListener("click", buttonClickHandler);

// ---------------------------- 음파 검증 로직 ---------------------------- //
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * 출결 체크를 시작하는 function
 *
 * @param {number} subjectid  과목 코드
 * @returns
 */
async function startAttendanceCheck(subjectid) {
  await audioCtx.resume();

  const name = document.getElementById("student_name").value;
  const studentNumber = document.getElementById("student_id").value;

  if (name == "") {
    alert("이름을 입력해주세요.");
    return;
  }

  if (studentNumber == "") {
    alert("학번을 입력해주세요.");
    return;
  }

  //MediaRecorder Setting
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  const mediaRecorder = new MediaRecorder(mediaStream);

  let audioArray = [];

  mediaRecorder.ondataavailable = (e) => {
    audioArray.push(e.data);
  };

  //Analyser Setting
  const analyser = audioCtx.createAnalyser();

  const audioSource = audioCtx.createMediaStreamSource(mediaStream);

  audioSource.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount); //dataArray index = fftsize *frequency / samplerate

  //Strat attendance check
  let totalFrequencySet = generateFrequencySet();
  const threshold = 20;
  let attendanceCode = 0;
  let count = 0;
  let inputAttendanceCodeDict = {}; // <inputAttendanceCode, Count>
  let recentAttendanceCodeStack = [];

  //onstop
  mediaRecorder.onstop = () => {
    audioArray.splice(0);

    analyser.getByteFrequencyData(dataArray);

    let inputAttendanceCode = frequencyToCode(
      dataArray,
      totalFrequencySet,
      threshold,
      analyser.fftSize
    );

    dictAppend(inputAttendanceCodeDict, inputAttendanceCode);

    if (
      (recentAttendanceCodeStack.length > 0 &&
        recentAttendanceCodeStack[0] != inputAttendanceCode) ||
      findMax(inputAttendanceCodeDict) == inputAttendanceCode
    ) {
      recentAttendanceCodeStack = [];
    }

    recentAttendanceCodeStack.push(inputAttendanceCode);

    if (recentAttendanceCodeStack.length >= 10) {
      inputAttendanceCodeDict = {};
      inputAttendanceCodeDict[inputAttendanceCode] =
        recentAttendanceCodeStack.length;

      count = recentAttendanceCodeStack.length - 1;
      recentAttendanceCodeStack = [];
    }
  };

  while (true) {
    count = 0;
    inputAttendanceCodeDict = {};
    recentAttendanceCodeStack = [];
    while (count < 250) {
      mediaRecorder.start();
      sleep(10);
      mediaRecorder.stop();

      audioArray = [];
      count++;
    }

    attendanceCode = parseInt(findMax(inputAttendanceCodeDict), 2);

    const requestForm = {
      studentName: name,
      studentId: studentNumber,
      attendanceCode: attendanceCode,
      startTime: Math.floor(Date.now() / 1000),
    };

    const request = new Request("/student/" + subjectid.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestForm),
    });

    const res = await fetch(request);

    // 인증성공이면 서버에서 200 응답
    if (res.status == 200) {
      break;
    }
  }

  alert("출석이 완료되었습니다.");
}
/**
 *
 * @param {number} codeLength
 * @returns {Array} 출력 가능한 모든 주파수 set
 */
function generateFrequencySet(codeLength = 11) {
  const minFrequency = 18000,
    maxFrequency = 20000;

  if (codeLength == 0) {
    return;
  }

  let totalFrequencySet = Array(codeLength); // 해당 길이의 code가 출력할 수 있는 가능한 모든 주파수를 담은 Array

  if (codeLength == 1) {
    totalFrequencySet[0] = minFrequency;
  } else {
    let interval = Math.floor((maxFrequency - minFrequency) / (codeLength - 1)); //bit 길이에 맞도록 간격 설정

    let cur = minFrequency;
    for (let index = 0; index < totalFrequencySet.length; index++) {
      //total_frequency_set 생성
      totalFrequencySet[index] = cur;
      cur += interval;
    }
  }

  return totalFrequencySet;
}

/**
 * 입력받은 frequencySet을 totalFrequencySet을 기준으로 code로 변환하는 function
 *
 * @param {Array} inputFrequencySet 입력받은 frequencySet
 * @param {Array} totalFrequencySet code의 자리수와 1:1 mapping되는 frequencySet
 * @param {number} threshold 1로 인식되기 위한 최소 입력값
 * @param {number} fftsize analyser에 있는 fftsize
 * @returns authCode
 */
function frequencyToCode(
  inputFrequencySet,
  totalFrequencySet,
  threshold,
  fftsize
) {
  let attendanceCode = "";

  for (let i = 0; i < totalFrequencySet.length; i++) {
    const element = totalFrequencySet[i];

    let index = Math.floor(((fftsize >> 1) * element) / 24000); //24000: default sample rate

    if (inputFrequencySet[index] >= threshold) {
      attendanceCode += "1";
    } else {
      attendanceCode += "0";
    }
  }

  return attendanceCode;
}

function sleep(ms) {
  const wakeUpTime = Date.now() + ms;
  while (Date.now() < wakeUpTime) {}
}

/**
 * dictionary에 AttendanceCode를 추가하는 function
 * 중복되는 code가 있을경우 count 증가
 *
 * @param {*} dict
 * @param {String} element dictionary에 추가할 code
 */
function dictAppend(dict, element) {
  if (element in dict) {
    dict[element]++;
  } else {
    dict[element] = 1;
  }
}

/**
 * dictionary에서 가장 많은 count가 있는 code를 찾는 function
 *
 * @param {*} dict
 * @returns 가장 많은 count가 있는 code
 */
function findMax(dict) {
  let max = 0;
  let maxElement = "";
  for (var key in dict) {
    if (dict[key] > max) {
      max = dict[key];
      maxElement = key;
    }
  }

  return maxElement;
}
