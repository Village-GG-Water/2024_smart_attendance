let buttonFlag = false;

function changeButtonOn(btn) {
  btn.innerHTML = '음파 생성 중';
  btn.style.backgroundColor = '#4CAF50';
  startAttendanceCheck(btn.id);
}

function changeButtonOff(btn) {
  btn.innerHTML = '출석 시작';
  btn.style.backgroundColor = '#00FFFF';
}

function buttonClickHandler() {
  if (buttonFlag == false) {
    changeButtonOn(this);
    buttonFlag = true;
  } else {
    changeButtonOff(this);
    buttonFlag = false;
  }
}

var btn = document.getElementsByClassName('button_attendance')[0];
btn.addEventListener('click', buttonClickHandler);

// 1초 간격 출석 학생 목록 업데이트
const subjectId = btn.id;
document.addEventListener('DOMContentLoaded', function () {
  const updateAttendees = () => {
    fetch(`/attendees/${subjectId}`)
      .then((response) => response.json())
      .then((data) => {
        const attendeeList = document.getElementById('attendee_list');
        attendeeList.innerHTML = '';

        data.forEach((attendee) => {
          const subDiv = document.createElement('div');
          subDiv.textContent = `이름: ${attendee.name}, ID: ${attendee.id}`;
          attendeeList.appendChild(subDiv);
        });
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
function startAttendanceCheck(subjectid) {
  let attendanceDuration = 300; //second
  const startTime = Math.floor(Date.now() / 1000);

  while (Math.floor(Date.now() / 1000) - startTime < attendanceDuration) {
    let currentAttendanceCode = generateAuthCode();

    const requestForm = {
      subjectid: subjectid,
      attendanceCode: currentAttendanceCode,
      startTime: Math.floor(Date.now() / 1000),
    };
    new Request('/prof' + subjectid.toString(), {
      method: 'POST',
      body: JSON.stringify(requestForm),
    });

    playSignal(currentAttendanceCode);
  }
}

/**
 * Oscillator를 이용하여 attendanceCode를 소리로 출력하는 function
 *
 * @param {String} attendanceCode 음파신호로 출력해야 하는 출결 인증 코드
 */
function playSignal(attendanceCode) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  ac.resume();

  const frequencySet = codeToFrequency(attendanceCode);

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
  sleep(5000);
  osc.stop();
}

/**
 * 원하는 자리수의 이진 코드 생성하는 function
 *
 * @param {number} NumberofBits 생성할 코드 비트 자리 수 (default value = 11)
 * @returns {string} 이진수 문자열
 */
function generateAuthCode(NumberofBits = 11) {
  return Math.floor(Math.random() * 2 ** NumberofBits - 1)
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

function sleep(ms) {
  const wakeUpTime = Date.now() + ms;
  while (Date.now() < wakeUpTime) {}
}
