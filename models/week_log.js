const db = require('../data/dbConfig');
const {v4: uuidv4} = require('uuid');
const moment = require('moment')
const dayModel = require('../models/day_log')

/******************************************************************************
 *                      Get all week logs by user id
 ******************************************************************************/

const getAllByUserId = async (userId) => {
  return db("week_log").where('users_id', userId).orderBy("week_of_year", "desc");
}

/******************************************************************************
 *                      Get a week log by date query
 ******************************************************************************/

const getUsersLogByDate = async (id, date) => {
  return db("week_log")
    .where('users_id', id)
    .where('week_of_year', `${moment(date).week()}/2020`)
    .select('id',
      'week_of_year',
      'average_hours_slept',
      'average_quality');
}

/******************************************************************************
 *                      Check if a week log exists for specified week
 ******************************************************************************/

const checkIfWeekExists = async (userId, week_of_year) => {
  return db('week_log').where('users_id', userId).where('week_of_year', week_of_year);
}

/******************************************************************************
 *                      Get a week log by {key}
 ******************************************************************************/

const getBy = async (filter) => {
  return db("week_log").where(filter).orderBy("id");
}

/******************************************************************************
 *                      Create a new week log
 ******************************************************************************/

const create = async (userId) => {
  const week_of_year = `${moment().week()}/${moment().year()}`
  //create new week data table
  // check to see if week_of_year already exists for userId first
  const duplicate = await checkIfWeekExists(userId, week_of_year);
  let weekLogId
  if (duplicate.length === 0) {
      [weekLogId] = await db('week_log').insert({
        id: uuidv4(),
        users_id: userId,
        week_of_year: `${moment().week()}/${moment().year()}`,
        average_hours_slept: null,
        average_quality: null,
      },).returning('id')
    } else {
    weekLogId = duplicate[0].id
  }
  return weekLogId;
}

/******************************************************************************
 *                      Update a week log
 ******************************************************************************/

const update = async (userId, dayData, date) => {
  const {sleptHours, avgQuality} = dayData
//   // get current week
  const week_of_year = `${moment(date).week()}/${moment().year()}`
  //  update the week log
  await db('week_log')
    .where({week_of_year})
    .where('users_id', userId)
    .update({
      average_hours_slept: sleptHours.toFixed(1),
      average_quality: avgQuality.toFixed(0)
    }).select('id', 'week_of_year', 'average_hours_slept', 'average_quality')
  const [updatedLog] = await db('week_log').where({week_of_year}).where('users_id', userId)
  return updatedLog
}

/******************************************************************************
 *                      Get all days of a week by date
 ******************************************************************************/

const getDaysForWeek = async (id, date) => {
  const [week] = await getUsersLogByDate(id, date)
  const days = await db('day_log as d')
    .where('week_log_id', week.id)
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
 *                      Get all days averages for a week by date
 ******************************************************************************/

const getAveragesForWeek = async (userId, date) => {
  const [week] = await getUsersLogByDate(userId, date)
  const weekAverages = await db('day_log')
    .where('week_log_id', week.id)
    .avg('total_hours_slept as avg_hours_slept')
    .avg('average_quality as avg_quality')
return weekAverages
}

/******************************************************************************
 *                      Export methods
 ******************************************************************************/

module.exports = {
  create,
  checkIfWeekExists,
  getBy,
  update,
  getAllByUserId,
  getUsersLogByDate,
  getDaysForWeek,
  getAveragesForWeek,
}
