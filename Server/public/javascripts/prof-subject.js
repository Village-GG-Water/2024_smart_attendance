let buttonFlag = false;

async function changeButtonOn(btn) {
  btn.innerHTML = 'Attendance check in progress…';
  btn.style.backgroundColor = '#4CAF50';
  buttonFlag = true;
  // 서버 csv 기록 위한 요청
  const requestForm = {
    subjectId: btn.id,
    startTime: Date.now(),
  };
  const request = new Request('/prof/startAttendance/' + btn.id.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestForm),
  });
  const res = await fetch(request);
  // 잘 갔으면, 서버에서 200 응답
  if (res.status != 200) {
    alert('Error!');
  }
  await startAttendanceCheck(btn.id);
}

function changeButtonOff(btn) {
  btn.innerHTML = 'Start';
  btn.style.backgroundColor = '#00FFFF';
  buttonFlag = false;
}

async function resetAttendees(btn) {
  const request = new Request('/attendees/' + btn.id.toString(), {
    method: 'DELETE',
  });
  const res = await fetch(request);
  // 리셋 잘 됐으면 200 응답
  if (res.status != 200) {
    alert('Error!');
    return false;
  }
  return true;
}

async function buttonClickHandler() {
  console.log(buttonFlag);
  if (buttonFlag == false) {
    const ret = await resetAttendees(this);
    if (!ret) return;
    await changeButtonOn(this);
  } else {
    changeButtonOff(this);
  }
}

var btn = document.getElementsByClassName('button_attendance')[0];
btn.addEventListener('click', buttonClickHandler);
// var attendanceCodeDisplay = document.getElementsByClassName(
//   'current_attendance_code'
// )[0];

// 1초 간격 출석 학생 목록 업데이트
const subjectId = btn.id;
document.addEventListener('DOMContentLoaded', function () {
  const updateAttendees = () => {
    fetch(`/attendees/${subjectId}`)
      .then((response) => response.json())
      .then((data) => {
        const attendeeList = document.getElementById('attendee_list');
        const attendeeCount = document.getElementById('attendee_count');
        attendeeList.innerHTML = '';
        let count = 0; // 출석자 수 초기화

        data.forEach((attendee) => {
          count++;
          const subDiv = document.createElement('div');
          subDiv.textContent = `${count}) ${attendee.name} (${attendee.id})`;
          attendeeList.appendChild(subDiv);
        });
        attendeeCount.textContent = `Number of Attendees: ${count}`;
      })
      .catch((error) => console.error('Error:', error));
  };

  setInterval(updateAttendees, 1000);
});

// ---------------------------- 음파 생성 로직 ---------------------------- //
/**
 * 출결 체크를 시작하는 function
 *
 * @param {number} subjectid 과목코드
 */
async function startAttendanceCheck(subjectid) {
  let attendanceDuration = 300; //second

  await playSignal(subjectid, attendanceDuration, 0);
}

/**
 * Oscillator를 이용하여 attendanceCode를 소리로 출력하는 function
 *
 * @param {String} attendanceCode 음파신호로 출력해야 하는 출결 인증 코드
 */
async function playSignal(subjectid, attendanceDuration, count) {
  const sessionTime = 1;

  if (attendanceDuration / sessionTime <= count) {
      // attendance check completed
      btn.innerHTML = 'Completed';
      btn.style.cursor = 'none';
      btn.style.backgroundColor = 'blue';
      return;
  }
  if (buttonFlag == false) {
    changeButtonOff(btn);
    return;
  }

  // Auth code 생성 후 현재 생성중인 코드를 화면에 표시하고, 서버에 이를 전송
  let currentAttendanceCode = generateAttendanceCode();
  //let currentAttendanceCode = '10011010010';
  const currentAttendanceCodeDecimal = parseInt(currentAttendanceCode, 2);
  // attendanceCodeDisplay.innerHTML =
  //   currentAttendanceCodeDecimal < 1000
  //     ? `0${currentAttendanceCodeDecimal}`
  //     : currentAttendanceCodeDecimal < 100
  //     ? `00${currentAttendanceCodeDecimal}`
  //     : currentAttendanceCodeDecimal < 10
  //     ? `000${currentAttendanceCodeDecimal}`
  //     : `${currentAttendanceCodeDecimal}`;
  const requestForm = {
    subjectId: subjectid,
    attendanceCode: currentAttendanceCodeDecimal,
    startTime: Math.floor(Date.now()),
  };
  const request = new Request('/prof/' + subjectid.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestForm),
  });
  const res = await fetch(request);
  // 인증 코드 잘 갔으면, 서버에서 200 응답
  if (res.status != 200) {
    alert('오류 발생, 확인해주세요.');
  }

  const ac = new (window.AudioContext || window.webkitAudioContext)();
  ac.resume();

  const frequencySet = codeToFrequency(currentAttendanceCode);

  const maxFrequency = 20000;
  const unitFrequency = 50;
  const len = Math.floor(maxFrequency / unitFrequency) + 1;

  const real = new Float32Array(len);
  const imag = new Float32Array(len);

  for (let index = 0; index < frequencySet.length; index++) {
    const element = frequencySet[index];

    real[Math.floor(element / unitFrequency)] = 1;
  }

  const wave = ac.createPeriodicWave(real, imag, {
    disableNormalization: false,
  });

  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.frequency.value = unitFrequency;

  osc.setPeriodicWave(wave);

  gain.gain.value = 0.5;

  osc.connect(gain).connect(ac.destination);

  osc.start();
  setTimeout(() => {
    osc.stop();
    playSignal(subjectid, attendanceDuration, count + 1);
  }, sessionTime * 1000);
}

/**
 * 원하는 자리수의 이진 코드 생성하는 function
 *
 * @param {number} NumberofBits 생성할 코드 비트 자리 수 (default value = 11)
 * @returns {string} 이진수 문자열
 */
function generateAttendanceCode(NumberofBits = 11) {
  return Math.floor(Math.random() * (2 ** NumberofBits - 1) + 1)
    .toString(2)
    .padStart(NumberofBits, 0);
}

/**
 * 이진 코드를 출력할 주파수 set으로 변환하는 function
 *
 * @param {string} code 출력할 이진 code
 * @returns {Array} 출력할 주파수를 담은 Array
 */
function codeToFrequency(code) {
  const minFrequency = 18000,
    maxFrequency = 20000;

  if (code.length == 0) {
    return;
  }

  let totalFrequencySet = Array(code.length); // 해당 길이의 code가 출력할 수 있는 가능한 모든 주파수를 담은 Array

  if (code.length == 1) {
    totalFrequencySet[0] = minFrequency;
  } else {
    let interval = Math.floor(
      (maxFrequency - minFrequency) / (code.length - 1)
    ); //bit 길이에 맞도록 간격 설정

    let cur = minFrequency;
    for (let index = 0; index < totalFrequencySet.length; index++) {
      //total_frequency_set 생성
      totalFrequencySet[index] = cur;
      cur += interval;
    }
  }

  //실제 출력할 frequency_set 생성
  let frequencySet = Array();
  for (let index = 0; index < code.length; index++) {
    const element = code[index];

    if (element == 1) {
      frequencySet.push(totalFrequencySet[index]);
    }
  }

  return frequencySet;
}
