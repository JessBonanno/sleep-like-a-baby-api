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
        average_hours_slept: null,
        average_quality: null,
      },).returning('id')
    } else {
    monthLogId = duplicate[0].id
  }
  return monthLogId;
}



/******************************************************************************
 *                      Update a month log
 ******************************************************************************/

const update = async (dayData, id) => {
  const {sleptHours, avgQuality} = dayData
    let hours
  if (sleptHours === null ) {
    hours = 0;
  }
  //  update the month log
  await db('month_log')
    .where({id})
    .update({
      average_hours_slept: hours.toFixed(1),
      average_quality: avgQuality
    }).select('id', 'month_of_year', 'average_hours_slept', 'average_quality')
  const [updatedLog] = await db('month_log').where({id})
  return updatedLog
}
/******************************************************************************
 *                      Get all days of a month by date
 ******************************************************************************/

const getDaysForMonth = async (id, month, year) => {
  const [result] = await getUsersLogByDate(id, month, year)
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
 *                      Get all days averages for a month by date
 ******************************************************************************/

const getAveragesForMonth = async (id) => {
   const [month] = await db('month_log').where({id})
  const monthAverages = await db('day_log')
    .where('month_log_id', month.id)
    .avg('total_hours_slept as avg_hours_slept')
    .avg('average_quality as avg_quality')
return monthAverages
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
  getAveragesForMonth,
}
