var express = require('express');
var router = express.Router();
var data = require('../data/data');
const fs = require('fs');
const fastcsv = require('fast-csv');

router.get('/subject-list', function (req, res, next) {
  res.render('prof-subject-list', {
    title: '강의 목록(교수)',
    subjects: data,
  });
});

router.get('/:subjectId', function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  let result = data.filter((x) => x.subjectId == subjectId);
  if (result.length != 1) return res.sendStatus(500);
  res.render('prof-subject', {
    title: result[0].subjectName,
    subject_id: result[0].subjectId,
  });
});

router.post('/:subjectId', function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  const attendanceCode = req.body.attendanceCode;
  const startTime = req.body.startTime;
  result = data.filter((x) => x.subjectId == subjectId);
  if (result.length != 1) return res.sendStatus(500);
  result[0].attendanceCode[attendanceCode] = startTime;
  // console.log()
  console.log('(교수) 출석 코드 수신: 과목ID, startTime, 출석코드');
  console.log(subjectId, startTime, attendanceCode);
  res.sendStatus(200);
});

router.post('/startAttendance/:subjectId', async function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  const startTime = req.body.startTime;
  // csv 파일 생성 및 저장
  csvData = [{ subjectId, startTime }];
  const csvFilePath = 'output.csv';
  const ws = await fs.createWriteStream(csvFilePath, { flags: 'w' });
  fastcsv
    .write(csvData, { headers: false })
    .pipe(ws)
    .on('finish', () => {
      console.log(`${csvFilePath} - CSV 파일 저장 완료`);
      ws.close();
      res.sendStatus(200);
    })
    .on('error', (err) => {
      console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
      ws.close();
      res.sendStatus(500);
    });
});

module.exports = router;
