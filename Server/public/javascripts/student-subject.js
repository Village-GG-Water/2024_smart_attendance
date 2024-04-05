let buttonFlag = false;

function changeButtonOn(btn) {
  btn.innerHTML = '출석 인증 중';
  btn.style.backgroundColor = '#4CAF50';
}

function changeButtonOff(btn) {
  btn.innerHTML = '출석 시작';
  btn.style.backgroundColor = '#00FFFF';
}

function submitData() {
  var studentName = document.getElementById('student_name').value;
  var studentId = document.getElementById('student_id').value;
  console.log(studentName, studentId);
  // 여기서 음파 정보 수집 후 분석해서 위 formData에 담긴 이름, 학번과 함께 서버로 fetch하기
}

function buttonClickHandler() {
  if (buttonFlag == false) {
    changeButtonOn(this);
    submitData();
    // 여기서 서버 검증 결과에 따라 출석 실패/성공 띄우기
    buttonFlag = true;
  } else {
    changeButtonOff(this);
    buttonFlag = false;
  }
}

var btn = document.getElementsByClassName('button_attendance')[0];
btn.addEventListener('click', buttonClickHandler);
