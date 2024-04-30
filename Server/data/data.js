// 주의
// subject_id는 겹치지 않도록 지정할 것

let data = [
  {
    subjectId: 0,
    subjectName: 'Algorithm',
    students: [
      { name: '박지환', id: '2019115876', isAttended: false },
      { name: '홍길동', id: '2020754826', isAttended: false },
      { name: '시연우', id: '2022111363', isAttended: false },
      { name: '이철수', id: '2021302020', isAttended: false },
      { name: '김길동', id: '2020729877', isAttended: false },
    ],
    attendanceCode: {},
  },
  {
    subjectId: 1,
    subjectName: 'Operating System',
    students: [
      { name: '박지환', id: '2019115876', isAttended: false },
      { name: '홍길동', id: '2020754876', isAttended: false },
    ],
    attendanceCode: {},
  },
];

module.exports = data;
