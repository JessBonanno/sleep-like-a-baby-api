const db = require('../data/dbConfig');
const {v4: uuidv4} = require('uuid');
const monthModel = require('./month_log')
const weekModel = require('./week_log')
const qualityModel = require('./quality_log')
const moment = require('moment')

/******************************************************************************
 *                      Check if a day log is already created
 ******************************************************************************/

const checkDuplicateDay = async (userId, date) => {
  return db('day_log').where('users_id', userId).where('date', date ? date : new Date());
}


/******************************************************************************
 *                      Get all day logs by a user Id
 ******************************************************************************/

const getAllByUserId = async (id) => {
  const allLogs = await db('day_log as d')
    .where('d.users_id', id)
    .join('quality_log as q', 'q.day_log_id', 'd.id')
    .select(
      'd.id',
      'd.date',
      'd.bedtime',
      'd.wake_time',
      'd.total_hours_slept',
      'd.average_quality',
      'q.wake_score',
      'q.day_score',
      'q.bedtime_score',
      'd.completed',)
    .orderBy('d.date', 'desc')
  return allLogs
}

/******************************************************************************
 *                      Get a day log by id
 ******************************************************************************/

const getById = async (id) => {
  return db('day_log as d').where('d.id', id)
    .join('quality_log as q', 'q.day_log_id', 'd.id')
    .select(
      'd.id',
      'd.date',
      'd.bedtime',
      'd.wake_time',
      'd.total_hours_slept',
      'd.average_quality',
      'q.wake_score',
      'q.day_score',
      'q.bedtime_score',
      'd.completed')

}

/******************************************************************************
 *                      Get a day log by associated date
 ******************************************************************************/

const getByDate = async (id, date) => {
  const log = await db('day_log as d')
    .where('d.users_id', id)
    .where('d.date', date)
    .join('quality_log as q', 'q.day_log_id', 'd.id')
    .select(
      'd.id',
      'd.date',
      'd.bedtime',
      'd.wake_time',
      'd.total_hours_slept',
      'd.average_quality',
      'q.wake_score',
      'q.day_score',
      'q.bedtime_score',
      'd.completed')
    .orderBy('d.date', 'desc').first()
  return log
}

/******************************************************************************
 *                      Remove a day log
 ******************************************************************************/

const remove = async (id) => {
  await db('quality_log').where('day_log_id', id).delete()
  return db('day_log').where({id}).delete()
}

/******************************************************************************
 *                      Create a new day log
 ******************************************************************************/

const create = async (userId, data) => {
  // check to see if there is an active sleep log
  const duplicate = await checkDuplicateDay(userId, data.date)
  let logId
  let logData
  // if no duplicate create the new log, else return the log for date provided
  if (duplicate.length === 0) {
    // creating a basic sleep log
    logData = {
      id: data.id || uuidv4(),
      users_id: data.users_id || userId,
      date: data.date || new Date(),
      bedtime: null,
      wake_time: null,
      total_hours_slept: null,
      average_quality: null,
    }
    //  check if month and week logs already made and create them if not
    const monthLogId = await monthModel.create(userId);
    const weekLogId = await weekModel.create(userId);
    // create the day log
    [logId] = await db('day_log').insert({
      ...logData,
      week_log_id: weekLogId,
      month_log_id: monthLogId,
    }).returning('id')
    // create the quality log
    const qualityLogId = await qualityModel.create(logId);
  } else {
    logId = duplicate[0].id
  }
  return logId
}
const getSleptHours = (bedtime, wakeTime) => {
  // using an arbitrary date to calculate hours slept
  let tonight = '2020-09-19T'
  let tomorrow = '2020-09-20T'
  let shorten = false;
  let time1 = new Date(`${tonight}${bedtime}`)
  let time2 = new Date(`${tomorrow}${wakeTime}`)
  if (time1.getTime() >= 1600488000000 && time1.getTime() <= 1600531200000) {
    time1 = new Date(`${tomorrow}${bedtime}`)
    shorten = true
  }
  let sleepDifference = Math.abs(time1.getTime() - time2.getTime())
  sleepDifference = sleepDifference / (1000 * 60 * 60);
  if (shorten === true) {
    return ((sleepDifference * 100) / 100)
  } else {
    return ((sleepDifference * 100) / 100)
  }
}

const getAverageQualityForOneDay = (wakeScore, dayScore, bedScore) => {
  return (((wakeScore + dayScore + bedScore) / 3)).toFixed(0)
}

/******************************************************************************
 *            Update a day log (bubbles down to week and month logs)
 ******************************************************************************/

const update = async (userId, id, sleepData) => {
  // - update bedtime from night before
  //   complete yesterdays log with bedtime if applicable
  const yesterday = moment().subtract(1, 'days')
  const yesterdayLog = await getByDate(userId, yesterday)
  if (yesterdayLog.bedtime_score === 0) {
    //  update yesterdays bedtime
    await qualityModel.update(userId, yesterdayLog.id, {
      bedtime_score: sleepData.bedtime_score
    })
    //  mark yesterdays log as completed
    await db('day_log').where('id', yesterdayLog.id).update({completed: true})
  }
  // first check if log is complete already (marked completed once all
  // scores are in)
  let [isDone] = await db('day_log').where({id}).select('completed')
  // TODO Notify user if trying to update a completed log
  let updatedWeek
  let updatedMonth
  // if its not completed yet update the log (else just return the already
  // completed log)
  if (!isDone.completed) {
    let logUpdate = {
      wake_time: sleepData.wake_time,
      bedtime: sleepData.bedtime,
    }
    // first update the times
    await db('day_log').where({id}).update(logUpdate)
    // next update the quality scores
    // get current quality values
    let [currentQuality] = await qualityModel.getByDayLogId(id)
    // if no value provided use old values
    let qualityUpdate = {
      wake_score: sleepData.wake_score || currentQuality.wake_score,
      day_score: sleepData.day_score || currentQuality.day_score,
    }
    // update the scores
    await qualityModel.update(userId, id, qualityUpdate)
    const [qualityLog] = await qualityModel.getByDayLogId(id)
    // then get the newly formatted bedtime and wake_time
    const [sleepLog] = await getById(id)
    //then calculate hours slept with helper function and properly formatted times
    const sleptHours = getSleptHours(sleepLog.bedtime, sleepLog.wake_time).toFixed(1)
    // update with hours slept
    logUpdate = {
      total_hours_slept: sleptHours,
    }
    await db('day_log').where({id}).update(logUpdate)
  }
  let completedLog
  [completeLog] = await db('day_log as d')
    .where('d.id', id)
    .join('quality_log as q', 'q.day_log_id', 'd.id')
    .join('week_log as w', 'w.users_id', 'd.users_id')
    .where('w.week_of_year', `${moment().week()}/${moment().year()}`)
    .join('month_log as m', 'm.users_id', 'd.users_id')
    .where('m.month_of_year', `${moment().month() + 1}/${moment().year()}`,)
    .select(
      'd.id',
      'd.date',
      'd.bedtime',
      'd.wake_time',
      'd.total_hours_slept',
      'd.average_quality',
      'q.wake_score',
      'q.day_score',
      'q.bedtime_score',
      'w.average_hours_slept as weekly_average_hours_slept',
      'w.average_quality as weekly_average_quality',
      'm.average_hours_slept as monthly_average_hours_slept',
      'm.average_quality as monthly_average_quality',
      'd.completed')
  return completeLog
}


/******************************************************************************
 *                      Get a day log by week id
 ******************************************************************************/

const getByWeekId = async (id) => {
  return db('day_log as d')
    .where('week_log_id', id)
    .join('quality_log as q', 'q.day_log_id', 'd.id')
    .select(
      'd.id',
      'd.date',
      'd.bedtime',
      'd.wake_time',
      'd.total_hours_slept',
      'd.average_quality',
      'q.wake_score',
      'q.day_score',
      'q.bedtime_score',
      'd.completed')
}


/******************************************************************************
 *                      Export methods
 ******************************************************************************/

module.exports = {
  getByWeekId,
  getById,
  create,
  update,
  getAllByUserId,
  getByDate,
  remove,
  checkDuplicateDay,

}
