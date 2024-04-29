const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * 출결 체크를 시작하는 function
 *
 * @param {number} subjectid  과목 코드
 * @returns
 */
async function startAttendanceCheck(subjectid) {
  await audioCtx.resume();

  const name = document.getElementById("name").value;
  const studentNumber = document.getElementById("studentNumber").value;

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

  //onstop
  mediaRecorder.onstop = () => {
    const audioEl = document.querySelector("audio");
    const blob = new Blob(audioArray, { type: "audio/ogg codecs=opus" });
    audioArray.splice(0);

    const blobURL = window.URL.createObjectURL(blob);

    audioEl.src = blobURL;

    analyser.getByteFrequencyData(dataArray);
  };

  //Strat attendance check
  let totalFrequencySet = generateFrequencySet();
  const threshold = 20;
  let attendanceCode = 0;

  while (true) {
    let count = 0;
    while (count < 250) {
      mediaRecorder.start();
      sleep(10);
      mediaRecorder.stop();

      let inputAttendanceCode = frequencyToCode(
        dataArray,
        totalFrequencySet,
        threshold,
        analyser.fftSize
      );

      attendanceCode = inputAttendanceCode; //TODO: input 오류 처리 과정 추가

      audioArray = [];
    }

    const requestForm = {
      studentname: name,
      studentId: studentNumber,
      attendanceCode: attendanceCode,
    };

    const request = new Request("/student/" + subjectid.toString(), {
      method: "POST",
      body: JSON.stringify(requestForm),
    });

    if (attendanceSuccess) {
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
 *
 * @param {Array} inputFrequencySet
 * @param {Array} totalFrequencySet
 * @param {number} threshold
 * @param {number} fftsize
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

    let index = Math.floor((fftsize * element) / 24000); //24000: default sample rate

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
