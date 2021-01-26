const express = require('express');
const router = express.Router();
const weekModel = require('../models/week_log');

/******************************************************************************
 *                      Get all current users week logs - "GET
 *                      /week/all/current-user"
 ******************************************************************************/

router.get('/current-user', async (req, res, next) => {
  try {
    const logs = await weekModel.getAllByUserId(req.id)
    res.status(200).json(logs)
  } catch (err) {
    console.log(err.stack);
    next(err);
  }
})

/******************************************************************************
 *                      Get a users week log by date query - "GET
 *                      /week/search/?date={'1-25-2000'}"
 ******************************************************************************/

router.get('/current-user/search', async (req, res, next) => {
  const date = req.query.date
  try {
    const log = await weekModel.getUsersLogByDate(req.id, date)
    res.status(200).json(log)
  } catch (err) {
    console.log(err.stack);
    next(err);
  }
})

/******************************************************************************
 *                      Get all days of a week by date for current user-
 *                      "GET
 *                      /week/days/?date={'1-25-2000'}"
 ******************************************************************************/

router.get('/days', async (req, res, next) => {
    const date = req.query.date
  try {
      const days = await weekModel.getDaysForWeek(req.id, date)
    if (days) {
      res.status(200).json(days)
  } else {
      res.status(404).json({message: 'No data found for that week'})
    }
  } catch (err) {
    console.log(err.stack);
    next(err);
  }
})




/******************************************************************************
 *                                 Export Router
 ******************************************************************************/

module.exports = router;
