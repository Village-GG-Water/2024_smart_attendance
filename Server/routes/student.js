var express = require('express');
var router = express.Router();
var data = require('../data/data');

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

router.post('/:subjectId', function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  const startTime = Number(req.body.startTime);
  const endTime = Number(req.body.endTime);
  const studentName = req.body.studentName;
  const studentId = req.body.studentId;
  const attendanceCode = req.body.attendanceCode;
  let result1 = data.filter((x) => x.subjectId == subjectId);
  if (result1.length != 1) return res.sendStatus(500);
  // console.log()
  console.log(
    '(학생) 출석 코드 수신: 이름, 학번, startTime, endTime, 출석코드: '
  );
  console.log(studentName, studentId, startTime, endTime, attendanceCode);
  // #1. 유효한 학생인지 검증
  let result2 = result1[0].students.filter((x) => x.id == studentId);
  if (result2.length != 1 || result2[0].name != studentName)
    return res.sendStatus(400);

  // #2. 출석코드 검증
  // 애초에 출석 코드 데이터가 없는 경우
  if (!result1[0].attendanceCode[attendanceCode]) return res.sendStatus(400);
  // 인증 기간이 만료된 출석 코드인 경우
  if (Math.abs(result1[0].attendanceCode[attendanceCode] - startTime) > 5000)
    return res.sendStatus(400);

  // 인증에 성공한 경우 -> csv 저장 후, 응답
  result2[0].isAttended = true; // 출석으로 변경
  csvData = [{ subjectName, studentId, startTime, endTime }]; // csv에 저장할 데이터
  console.log(csvData);
  const csvFilePath = 'output.csv';
  console.log('hi1');
  const csvExists = fs.existsSync(csvFilePath);
  console.log('hi2');
  const ws = fs.createWriteStream(csvFilePath, { flags: 'a' });
  console.log('hi3');
  fastcsv
    .write(csvData, { headers: !csvExists })
    .pipe(ws)
    .on('finish', () => {
      console.log(`${csvFilePath} - CSV 파일 저장 완료`);
      res.sendStatus(200);
    })
    .on('error', (err) => {
      console.error(`${csvFilePath} - CSV 파일 저장 중 오류 발생: `, err);
      res.sendStatus(200); // 인증은 성공했으니 200 응답
    });
});

module.exports = router;
