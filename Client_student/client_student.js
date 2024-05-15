/**
 * 출결 체크를 시작하는 function
 *
 * @param {number} subjectid  과목 코드
 * @returns
 */
async function startAttendanceCheck(subjectid) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.resume();

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

  //Strat attendance check
  let attendanceCode = 0;

  while (true) {
    attendanceCode = await recording(mediaRecorder, analyser, audioArray);
    //attendanceCode = findMax(inputAttendanceCodeDict);

    break;
  }

  // * debug
  console.log('end');
  console.log('attendanceCode: ', attendanceCode);
}

/**
 *
 * @param {MediaRecorder} mediaRecorder
 * @param {AnalyserNode} analyser
 * @param {Array} audioArray
 * @returns
 */
function recording(mediaRecorder, analyser, audioArray) {
  const totalFrequencySet = generateFrequencySet();
  const minThreshold = 20;

  let dataArray = new Uint8Array(analyser.frequencyBinCount), //dataArray index = fftsize *frequency / samplerate
    inputAttendanceCodeDict = {},
    recentAttendanceCode = '',
    threshold = minThreshold,
    recentDiffrentCount = 0;

  return new Promise((resolve, reject) => {
    const iterate = (count) => {
      if (count >= 250) {
        resolve(findMax(inputAttendanceCodeDict));
        return;
      }

      audioArray.length = 0;
      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();

        //code check
        audioArray.splice(0);

        analyser.getByteFrequencyData(dataArray);

        //threshold setting
        let noiseLevel = 0;
        for (let index = 0; index < dataArray.length; index++) {
          noiseLevel += dataArray[index];
        }
        noiseLevel = Math.floor(noiseLevel / dataArray.length);

        threshold = noiseLevel + minThreshold;

        let inputAttendanceCode = frequencyToCode(
          dataArray,
          totalFrequencySet,
          threshold,
          analyser.fftSize
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

        // *debug
        console.log('count: ', count);
        console.log('dataArray: ', dataArray);
        console.log('inputAttendanceCode: ', inputAttendanceCode);
        console.log('recentAttendanceCode: ', recentAttendanceCode);
        console.log('recentDiffrentCount: ', recentDiffrentCount);
        console.log('inputAttendanceCodeDict: ', inputAttendanceCodeDict);
        console.log('threshold: ', threshold);

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
  let attendanceCode = '';

  for (let i = 0; i < totalFrequencySet.length; i++) {
    const element = totalFrequencySet[i];

    let index = Math.floor((fftsize * element) / 48000); // 48000: default sample rate

    if (inputFrequencySet[index] >= threshold) {
      attendanceCode += '1';
    } else {
      attendanceCode += '0';
    }
  }

  attendanceCode = parseInt(attendanceCode, 2);

  console.log(inputFrequencySet);
  console.log(attendanceCode);

  return attendanceCode;
}

function sleep(ms) {
  const wakeUpTime = Date.now() + ms;
  while (Date.now() < wakeUpTime) {}
}

function dictAppend(dict, element) {
  if (element in dict) {
    dict[element]++;
  } else {
    dict[element] = 1;
  }
}

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
