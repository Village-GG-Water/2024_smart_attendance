let buttonFlag = false;

function changeButtonOn(btn) {
  btn.innerHTML = '음파 생성 중';
  btn.style.backgroundColor = '#4CAF50';
}

function changeButtonOff(btn) {
  btn.innerHTML = '출석 시작';
  btn.style.backgroundColor = '#00FFFF';
}

function buttonClickHandler() {
  if (buttonFlag == false) {
    changeButtonOn(this);
    buttonFlag = true;
  } else {
    changeButtonOff(this);
    buttonFlag = false;
  }
}

var btn = document.getElementsByClassName('button_attendance')[0];
btn.addEventListener('click', buttonClickHandler);

// 1초 간격 출석 학생 목록 업데이트
const subjectId = btn.id;
document.addEventListener('DOMContentLoaded', function () {
  const updateAttendees = () => {
    fetch(`/attendees/${subjectId}`)
      .then((response) => response.json())
      .then((data) => {
        const attendeeList = document.getElementById('attendee_list');
        attendeeList.innerHTML = '';

        data.forEach((attendee) => {
          const subDiv = document.createElement('div');
          subDiv.textContent = `이름: ${attendee.name}, ID: ${attendee.id}`;
          attendeeList.appendChild(subDiv);
        });
      })
      .catch((error) => console.error('Error:', error));
  };

  setInterval(updateAttendees, 1000);
});
