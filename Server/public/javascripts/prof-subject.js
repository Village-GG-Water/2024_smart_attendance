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
