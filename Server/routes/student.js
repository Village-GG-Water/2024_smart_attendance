var express = require('express');
var router = express.Router();
var data = require('../data/data');
const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const fastcsv = require('fast-csv');

router.get('/subject-list', function (req, res, next) {
  res.render('student-subject-list', {
    title: '강의 목록(학생)',
    subjects: data,
  });
});

router.get('/:subjectId', function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  let result = data.filter((x) => x.subjectId == subjectId);
  if (result.length != 1) return res.sendStatus(500);
  res.render('student-subject', {
    title: result[0].subjectName,
    subject_id: result[0].subjectId,
  });
});

router.post('/:subjectId', async function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  const startTime = Number(req.body.startTime);
  const endTime = Number(req.body.endTime);
  const studentName = req.body.studentName;
  const studentId = req.body.studentId;
  const attendanceCode = req.body.attendanceCode;
  const seat = req.body.seat;
  let result1 = data.filter((x) => x.subjectId == subjectId);
  if (result1.length != 1) return res.sendStatus(500);
  // console.log()
  console.log(
    '(학생) 출석 코드 수신: 이름, 학번, startTime, endTime, 출석코드: '
  );
  console.log(studentName, studentId, startTime, endTime, attendanceCode);
  // #1. 유효한 학생인지 검증 => X! 그냥 있으면 데이터 바꿔주고 없으면 추가!
  let result2 = result1[0].students.filter((x) => x.id == studentId);
  if (result2.length != 1) {
    result2 = [{ name: studentName, id: studentId, isAttended: false }];
    result1[0].students.push(result2[0]);
  }

  // #2. 출석코드 검증
  // 애초에 출석 코드 데이터가 없는 경우
  if (!result1[0].attendanceCode[attendanceCode]) return res.sendStatus(400);
  // 인증 기간이 만료된 출석 코드인 경우
  if (Math.abs(result1[0].attendanceCode[attendanceCode] - endTime) > 5000)
    return res.sendStatus(400);

  // 인증에 성공한 경우 -> csv 저장 후, 응답
  result2[0].isAttended = true; // 출석으로 변경
  csvData = [{ studentName, studentId, startTime, endTime, seat }]; // csv에 저장할 데이터
  let csvFilePath;
  let files;
  try {
    files = await fsPromise.readdir('.');
  } catch (e) {
    console.error('디렉토리를 읽는 중 오류가 발생했습니다:', err);
    return res.sendStatus(500);
  }
  const matchingFiles = files.filter((file) => {
    return file.startsWith(`${subjectId}_`) && file.endsWith('.csv');
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
    csvFilePath = `${subjectId}_${maxNumber}.csv`;
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
        res.sendStatus(200);
      })
      .on('error', (err) => {
        console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
        ws.close();
        res.sendStatus(200); // 인증은 성공했으니 200 응답
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
        res.sendStatus(200);
      })
      .on('error', (err) => {
        console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
        ws.close();
        res.sendStatus(200); // 인증은 성공했으니 200 응답
      });
});

module.exports = router;
