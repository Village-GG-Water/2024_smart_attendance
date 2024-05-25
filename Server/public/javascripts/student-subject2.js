let buttonFlag = false;
let isDoneAttendanceCheck = false;
let startTime = 0;
let endTime = 0;

function changeButtonOn(btn) {
  buttonFlag = true;
  btn.innerHTML = '출석 인증 중';
  btn.style.backgroundColor = '#4CAF50';
}

function changeButtonOff(btn) {
  buttonFlag = false;
  btn.innerHTML = '출석 시작';
  btn.style.backgroundColor = '#00FFFF';
}

function buttonClickHandler() {
  if (isDoneAttendanceCheck) return;
  if (buttonFlag == false) {
    const name = document.getElementById('student_name').value;
    const studentNumber = document.getElementById('student_id').value;
    if (name == '') {
      alert('이름을 입력해주세요.');
      return;
    }
    if (studentNumber == '') {
      alert('학번을 입력해주세요.');
      return;
    }
    changeButtonOn(this);
    startTime = Date.now();
    userStartAudio();
    startAttendanceCheck(btn.id, name, studentNumber);
    // 여기서 서버 검증 결과에 따라 출석 실패/성공 띄우기
  } else {
    changeButtonOff(this);
  }
}

var btn = document.getElementsByClassName('button_attendance')[0];
btn.addEventListener('click', buttonClickHandler);

// ---------------------------- 음파 검증 로직 ---------------------------- //
let fft;
let mic;
function setup() {
  getAudioContext().suspend();
  noCanvas(); // 시각화를 위한 캔버스 생성은 필요 없음
  mic = new p5.AudioIn(); // 마이크 입력 생성
  mic.start(); // 마이크 사용 시작
  fft = new p5.FFT();
  fft.setInput(mic); // FFT가 마이크 입력을 분석하도록 설정
}

/**
 * 출결 체크를 시작하는 function
 *
 * @param {number} subjectid  과목 코드
 * @returns
 */
async function startAttendanceCheck(subjectid, name, studentNumber) {
  // window.setup = setup;
  while (true) {
    let attendanceCode;
    try {
      attendanceCode = await recording();
    } catch (e) {
      return;
    }

    console.log('attendance code : ', attendanceCode);
    const requestForm = {
      studentName: name,
      studentId: studentNumber,
      attendanceCode: attendanceCode,
      startTime: Date.now(),
      endTime: Date.now(),
    };

    const request = new Request('/student/' + subjectid.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestForm),
    });

    const res = await fetch(request);

    // 인증성공이면 서버에서 200 응답
    if (res.status == 200) {
      btn.innerHTML = '출석 완료';
      btn.style.cursor = 'none';
      btn.style.backgroundColor = 'blue';
      alert('출석이 완료되었습니다.');
      isDoneAttendanceCheck = true;
      break;
    }
  }
}

/**
 *
 * @returns
 */
function recording() {
  const minThreshold = 20,
    totalFrequencySet = generateFrequencySet();

  let inputAttendanceCodeDict = {},
    recentAttendanceCode = '',
    recentDiffrentCount = 0;

  return new Promise((resolve, reject) => {
    const iterate = (count) => {
      if (count >= 250) {
        resolve(findMax(inputAttendanceCodeDict));
        return;
      }
      if (buttonFlag == false) {
        // 버튼 누르면 로직 종료
        reject();
        return;
      }

      setTimeout(() => {
        const dataArray = fft.analyze();

        //threshold setting
        let noiseLevel = 0;
        for (let index = 0; index < 1024; index++) {
          const element = dataArray[index];

          noiseLevel += element;
        }
        noiseLevel = Math.floor(noiseLevel / 1024);

        let threshold = noiseLevel + minThreshold;

        let inputAttendanceCode = frequencyToCode(
          dataArray,
          totalFrequencySet,
          threshold,
          2048
        );

        if (inputAttendanceCode == 0) {
          count--;
        } else {
          dictAppend(inputAttendanceCodeDict, inputAttendanceCode);

          //error correction

          //현재 입력받은 code가 바로 이전에 입력받은 code와 같고 dictionary에서 가장 많이 입력받은 code와 다르면 recentDiffrentCount를 증가시키며 error correction을 준비
          if (
            recentAttendanceCode == inputAttendanceCode &&
            findMax(inputAttendanceCodeDict) != inputAttendanceCode
          ) {
            recentDiffrentCount++;
          } else {
            recentDiffrentCount = 0;
          }

          recentAttendanceCode = inputAttendanceCode;

          //가장 최근에 받은 10개의 code가 똑같고 기존의 code와 다르면 기존에 입력받던 code가 만료되었다고 판단
          if (recentDiffrentCount >= 10) {
            inputAttendanceCodeDict = {};
            inputAttendanceCodeDict[inputAttendanceCode] = recentDiffrentCount;
            count = recentDiffrentCount - 1;

            recentDiffrentCount = 0;
          }
        }
        iterate(count + 1);
      }, 10);
    };
    iterate(0);
  });
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
  let attendanceCode = '';

  for (let i = 0; i < totalFrequencySet.length; i++) {
    const element = totalFrequencySet[i];

    let index = Math.floor((fftsize * element) / 48000); //48000: default sample rate

    if (inputFrequencySet[index] >= threshold) {
      attendanceCode += '1';
    } else {
      attendanceCode += '0';
    }
  }

  return parseInt(attendanceCode, 2);
}

/**
 * dictionary에 AttendanceCode를 추가하는 function
 * 중복되는 code가 있을경우 count 증가
 *
 * @param {*} dict
 * @param {number} element dictionary에 추가할 code
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
  let maxElement = '';
  for (var key in dict) {
    if (dict[key] > max) {
      max = dict[key];
      maxElement = key;
    }
  }

  return maxElement;
}
