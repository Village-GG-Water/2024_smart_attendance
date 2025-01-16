var express = require('express');
var router = express.Router();
const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const fastcsv = require('fast-csv');

router.post('/startAttendance', function (req, res, next) {
  console.log("(교수) Bluetooth 출석 시작 : ", req.body);

  // 초기 csv 파일 생성
  const startTime = Math.floor(Date.now() / 1000);
  const csvFilePath = `bluetooth_${startTime}.csv`;  // 파일 이름 형식 "bluetooth_${startTime}.csv"
  const ws = fs.createWriteStream(csvFilePath, { flags: 'w' });
  csvData = [{ type: "bluetooth", startTime, pLatitude, pLongitude, mRange }];
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

router.post('/auth', async function (req, res, next) {
  console.log("(교수) Bluetooth 정보 수신 : ", JSON.stringify(req.body));

  const studentName = req.body.name;
  const studentId = req.body.studentId;

  // 그냥 요청 날아오면 인증된거라 별도 과정 X
  // csv 파일에 저장 (가장 최근 파일에...)
  csvData = [{ studentName, studentId }]; // csv에 저장할 데이터
  let csvFilePath;
  let files;
  try {
    files = await fsPromise.readdir('.');
  } catch (err) {
    console.error('디렉토리를 읽는 중 오류가 발생했습니다:', err);
    return res.sendStatus(500);
  }
  const matchingFiles = files.filter((file) => {
    return file.startsWith(`bluetooth_`) && file.endsWith('.csv');
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
    csvFilePath = `bluetooth_${maxNumber}.csv`;
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

module.exports = router;
