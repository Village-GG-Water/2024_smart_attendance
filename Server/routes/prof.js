var express = require('express');
var router = express.Router();
var data = require('../data/data');

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
  result[0].attendance_code[attendanceCode] = startTime;
  // console.log()
  console.log(
    '(교수) 출석 코드 수신: 과목ID, startTime, 출석코드',
    subjectId,
    startTime,
    attendanceCode
  );
  res.send();
});

module.exports = router;
