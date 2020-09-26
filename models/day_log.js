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
  // console.log({month_of_year})
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
  return db('day_log').where({id}).select(
    'id',
    'bedtime',
    'date',
    'wake_time',
    'total_hours_slept',
    'average_quality',
    'completed'
  )
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
  // first check to see if there is an active sleep log
  const duplicate = await checkDuplicateDay(userId, data.date)
  let logId
  let logData
  if (duplicate.length === 0) {
    // creating a basic sleep log when user creates a new bedtime
    logData = {
      id: data.id || uuidv4(),
      users_id: data.users_id ||  userId,
      date: data.date || new Date(),
      bedtime: data.bedtime,
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
    console.log(logId)
    const qualityLogId = await qualityModel.create(logId);
  } else {
    logId = duplicate[0].id
  }
  return logId
}


const getSleptHours = (bedtime, wakeTime) => {
  // using an arbitrary date to calculate hours slept
  const time1 = new Date(`2020-09-18T${bedtime}`)
  const time2 = new Date(`2020-09-19T${wakeTime}`)
  let sleepDifference = Math.abs(time1.getTime() - time2.getTime())
  sleepDifference = sleepDifference / (1000 * 60 * 60);
  return ((sleepDifference * 100) / 100).toFixed(2)
}
const getAverageQualityForOneDay = (wakeScore, dayScore, bedScore) => {
  return (((wakeScore + dayScore + bedScore) / 3)).toFixed(2)
}

/******************************************************************************
 *            Update a day log (bubbles down to week and month logs)
 ******************************************************************************/

const update = async (userId, id, sleepData) => {
  console.log({userId})
  console.log({id})
  console.log({sleepData})
  // first check if log is complete already
  let [isDone] = await db('day_log').where({id}).select('completed')
  console.log({isDone})
  // TODO decide what to do if trying to update a completed log
  // right now only updating if incomplete but returning the same data
  // either way
  let updatedWeek
  let updatedMonth
  if (!isDone.completed) {
    console.log('test')
    let logUpdate = {
      wake_time: sleepData.wake_time,
      bed_time: sleepData.bedtime || undefined,
    }
    // first update the wake_time
    await db('day_log').where({id}).update(logUpdate)
    // next update the quality scores
    // get current quality values
    let [currentQuality] = await qualityModel.getByDayLogId(id)
    // if no value provided use old values
    let qualityUpdate = {
      wake_score: sleepData.wake_score || currentQuality.wake_score,
      day_score: sleepData.day_score || currentQuality.day_score,
      bedtime_score: sleepData.bedtime_score || currentQuality.bedtime_score
    }
    // update the scores
    await qualityModel.update(id, qualityUpdate)
    const [qualityLog] = await qualityModel.getByDayLogId(id)
    // then get the newly formatted bedtime and wake_time
    const [sleepLog] = await getById(id)
    //then calculate hours slept with helper function and properly formatted times
    const sleptHours = getSleptHours(sleepLog.bedtime, sleepLog.wake_time)
    // update with hours slept
    logUpdate = {
      total_hours_slept: sleptHours,
    }
    await db('day_log').where({id}).update(logUpdate)
    // if all scores are inputted calculate the average quality score and
    // update week and month averages if logs exist
    let averageQualityScore
    if (qualityLog.wake_score !== 0 && qualityLog.day_score !== 0 && qualityLog.bedtime_score !== 0) {
      // set day log completed to true
      await db('day_log').update({completed: true})

      averageQualityScore = getAverageQualityForOneDay(qualityLog.wake_score, qualityLog.day_score, qualityLog.bedtime_score)
      // update the average score
      logUpdate = {
        average_quality: averageQualityScore,
      }
      await db('day_log').where({id}).update(logUpdate)
      // update the corresponding week log if there is one if its saturday
      if (moment().day() === 6) {
        const week_of_year = `${moment().week()}/${moment().year()}`
        let weekExists = await weekModel.checkIfWeekExists(userId, week_of_year)
        if (weekExists.length > 0) {
          let dayData = {
            sleptHours: sleptHours,
            avgQuality: averageQualityScore
          }
          updatedWeek = weekModel.update(userId, dayData)
        }
      }
      // update the corresponding month log if there is one if its the last
      // day of the month
      if (moment().format('YYYY-MM-DD') === moment().endOf('month').format('YYYY-MM-DD')) {
        const month_of_year = `${moment().month() + 1}/${moment().year()}`
        let monthExists = await monthModel.checkIfMonthExists(userId, month_of_year)
        if (monthExists.length > 0) {
          let dayData = {
            sleptHours: sleptHours,
            avgQuality: averageQualityScore
          }
          updatedMonth = monthModel.update(userId, dayData)
        }
      }
    }
    // return all the data from sleep log and quality log and week / month logs if
    // applicable
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
  console.log('test')
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
