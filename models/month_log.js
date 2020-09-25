const db = require('../data/dbConfig');
const {v4: uuidv4} = require('uuid');
const moment = require('moment')
const helper = require('../helpers/helper');

/******************************************************************************
 *                      Get all month logs by user id
 ******************************************************************************/

const getAllByUserId = async (userId) => {
  return db("month_log").where('users_id', userId).orderBy("month_of_year", "desc");
}

/******************************************************************************
 *                      Get a month log by date query
 ******************************************************************************/

const getUsersLogByDate = async (id, month, year) => {

  console.log({month})
  console.log({year})
  return db("month_log")
    .where('users_id', id)
    .where('month_of_year', `${month}/${year}` )
    .select('id',
      'month_of_year',
      'average_hours_slept',
      'average_quality');
}

/******************************************************************************
 *                      Check if a month log exists for specified month
 ******************************************************************************/

const checkIfMonthExists = async (userId, month_of_year) => {
  // console.log({month_of_year})
  return db('month_log').where('users_id', userId).where('month_of_year', month_of_year);
}

/******************************************************************************
 *                      Get a month log by {key:}
 ******************************************************************************/

const getBy = async (filter) => {
  return db("month_log").where(filter).orderBy("id");
}

/******************************************************************************
 *                      Create a new month log
 ******************************************************************************/

const create = async (userId) => {
  const month_of_year = `${moment().month() + 1}/${moment().year()}`
  //create new month data table
  // check to see if month_of_year already exists for userId first
  const duplicate = await checkIfMonthExists(userId, month_of_year);
  let monthLogId
  if (duplicate.length === 0) {
      [monthLogId] = await db('month_log').insert({
        id: uuidv4(),
        users_id: userId,
        month_of_year: `${moment().month() + 1}/${moment().year()}`,
        average_hours_slept: 0,
        average_quality: 0,
      },).returning('id')
      console.log(monthLogId)
    }
  return monthLogId;
}

/******************************************************************************
 *                      Update a month log
 ******************************************************************************/

const update = async (userId, dayData) => {
  const {sleptHours, avgQuality} = dayData
  // get current month avg hours slept and quality and avg in the new numbers
  const month_of_year = `${moment().month() + 1}/${moment().year()}`
  const [log] = await db('month_log').where({month_of_year}).where('users_id', userId)
  const oldHours = log.average_hours_slept;
  const oldQuality = log.average_quality;
//  get day count of month days for average
  let dayCount = (moment().date())
//  add todays entries plus old avgs divided by day count for new average
    let newHourAvg
  let newQuality
  // if monthly averages are null update them with todays averages
  if (oldHours === 0) {
    newHourAvg = sleptHours
  } else {
    newHourAvg = ((sleptHours + oldHours) / dayCount).toFixed(2)
  }
  if (oldQuality === 0) {
    newQuality = avgQuality
  } else {
    newQuality = ((avgQuality + oldQuality) / dayCount).toFixed(2)
  }
  // finally update the month log
  await db('month_log')
    .where({month_of_year})
    .where('users_id', userId)
    .update({
      average_hours_slept: newHourAvg,
      average_quality: newQuality
    }).select('id', 'month_of_year', 'average_hours_slept', 'average_quality')
  const [updatedLog] = await db('month_log').where({month_of_year}).where('users_id', userId)
  return updatedLog
}

/******************************************************************************
 *                      Get all days of a month by date
 ******************************************************************************/

const getDaysForMonth = async (id, month, year) => {
  const [result] = await getUsersLogByDate(id, month, year)
  console.log(result)
  const days = await db('day_log as d')
    .where('month_log_id', result.id)
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
    .orderBy('d.date')
return days
}

/******************************************************************************
 *                      Export methods
 ******************************************************************************/

module.exports = {
  create,
  checkIfMonthExists,
  getBy,
  update,
  getAllByUserId,
  getUsersLogByDate,
  getDaysForMonth,
}
