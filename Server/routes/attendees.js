var express = require('express');
var router = express.Router();
var data = require('../data/data');

router.get('/:subjectId', function (req, res, next) {
  const subjectId = Number(req.params.subjectId);
  result_subject = data.filter((x) => x.subjectId == subjectId);
  if (result_subject.length != 1) return res.sendStatus(500);
  result = [];
  for (x of result_subject[0].students) {
    if (x.isAttended) result.push({ name: x.name, id: x.id });
  }
  res.json(result);
});

module.exports = router;
