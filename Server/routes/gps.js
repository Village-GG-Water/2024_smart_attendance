var express = require('express');
var router = express.Router();
const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const fastcsv = require('fast-csv');

let pLatitude, pLongitude, mRange;

// csv 파일 작업하기
router.post('/prof', function (req, res, next) {
  console.log("(교수) gps 정보 수신 : ", JSON.stringify(req.body));

  // 전역 변수에 저장
  pLatitude = Number(req.body.latitude);
  pLongitude = Number(req.body.longitude);
  mRange = Number(req.body.range);

  // 초기 csv 파일 생성
  const startTime = Math.floor(Date.now() / 1000);
  const csvFilePath = `gps_${startTime}.csv`;  // 파일 이름 형식 "gps_${startTime}.csv"
  const ws = fs.createWriteStream(csvFilePath, { flags: 'w' });
  csvData = [{ type: "gps", startTime, pLatitude, pLongitude, mRange }];
  fastcsv
    .write(csvData, { headers: true, includeEndRowDelimiter: true })
    .pipe(ws)
    .on('finish', () => {
      console.log(`${csvFilePath} - CSV 파일 저장 완료`);
      ws.close();
      return res.sendStatus(200);
    })
    .on('error', (err) => {
      console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
      ws.close();
      return res.sendStatus(500);
    });
});

router.post('/student', async function (req, res, next) {
  console.log("(학생) gps 정보 수신 : ", JSON.stringify(req.body));
  
  // 데이터 추출
  const studentName = req.body.name;
  const studentId = Number(req.body.studentId);
  const sLatitude =Number(req.body.data.latitude);
  const sLongitude = Number(req.body.data.longitude);

  // 인증 처리
  let distance = calculateDistance(pLatitude, pLongitude, sLatitude, sLongitude, mRange);
  if (distance > mRange) {
    return res.sendStatus(400); // 범위 밖, 인증 실패
  }
  // 인증 후 csv 파일에 저장 (가장 최근 파일에...)
  csvData = [{ studentName, studentId, sLatitude, sLongitude, distance }]; // csv에 저장할 데이터
  let csvFilePath;
  let files;
  try {
    files = await fsPromise.readdir('.');
  } catch (err) {
    console.error('디렉토리를 읽는 중 오류가 발생했습니다:', err);
    return res.sendStatus(500);
  }
  const matchingFiles = files.filter((file) => {
    return file.startsWith(`gps_`) && file.endsWith('.csv');
  });
  let maxNumber = -1;
  matchingFiles.forEach((file) => {
    const baseName = path.basename(file, '.csv');
    const numberPart = baseName.split('_')[1];
    const number = Number(numberPart);
    if (!isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  });
  if (maxNumber !== -1) {
    csvFilePath = `gps_${maxNumber}.csv`;
    console.log(csvFilePath);
  } else {
    console.log('학생 출석 정보를 저장해야하지만 일치하는 파일이 없습니다.');
  }
  const ws = fs.createWriteStream(csvFilePath, { flags: 'a' });
  const lines = fs.readFileSync(csvFilePath, 'UTF-8').split('\n');
  if (lines.length === 3)
    fastcsv
      .write(csvData, {
        headers: true,
        includeEndRowDelimiter: true,
      })
      .pipe(ws)
      .on('finish', () => {
        console.log(`${csvFilePath} - CSV 파일 저장 완료`);
        ws.close();
        return res.sendStatus(200);
      })
      .on('error', (err) => {
        console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
        ws.close();
        return res.sendStatus(200); // 인증은 성공했으니 200 응답
      });
  else
    fastcsv
      .write(csvData, {
        headers: false,
        includeEndRowDelimiter: true,
      })
      .pipe(ws)
      .on('finish', () => {
        console.log(`${csvFilePath} - CSV 파일 저장 완료`);
        ws.close();
        return res.sendStatus(200);
      })
      .on('error', (err) => {
        console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
        ws.close();
        return res.sendStatus(200); // 인증은 성공했으니 200 응답
      });
});

function calculateDistance(pLatitude, pLongitude, sLatitude, sLongitude, mRange) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const earthRadius = 6371000; // 지구 반지름 (미터 단위)
  
  // 위도와 경도를 라디안 단위로 변환
  const deltaLat = toRadians(sLatitude - pLatitude);
  const deltaLon = toRadians(sLongitude - pLongitude);

  const pLatRad = toRadians(pLatitude);
  const sLatRad = toRadians(sLatitude);

  // Haversine 공식
  const a = Math.sin(deltaLat / 2) ** 2 +
            Math.cos(pLatRad) * Math.cos(sLatRad) * Math.sin(deltaLon / 2) ** 2;

  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distance;
}


module.exports = router;
