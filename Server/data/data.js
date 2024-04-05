// 주의
// subject_id는 겹치지 않도록 지정할 것

let data = [
  {
    subject_id: 0,
    subject_name: 'Algorithm',
    students: [
      { name: '박지환', id: '2019115876' },
      { name: '홍길동', id: '2020754876' },
    ],
    attendance_code: {},
  },
  {
    subject_id: 1,
    subject_name: 'Operating System',
    students: [
      { name: '박지환', id: '2019115876' },
      { name: '홍길동', id: '2020754876' },
    ],
    attendance_code: {},
  },
];

module.exports = data;
