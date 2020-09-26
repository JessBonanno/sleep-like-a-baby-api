const db = require('../data/dbConfig');
const {v4: uuidv4} = require('uuid');
const moment = require('moment');
const weekModel = require('./week_log')
const monthModel = require('./month_log')

/******************************************************************************
 *                      Create a new quality log
 ******************************************************************************/

const create = async (dayLogId) => {
  //create new month data table
  const [qualityLogId] = await db('quality_log').insert({
    id: uuidv4(),
    day_log_id: dayLogId,
    wake_score: 0,
    day_score: 0,
    bedtime_score: 0,
  },).returning('id')
  return qualityLogId;
}

/******************************************************************************
 *                      Update a quality log
 ******************************************************************************/

const getAverageQualityForOneDay = (wakeScore, dayScore, bedScore) => {
  return (((wakeScore + dayScore + bedScore) / 3)).toFixed(0)
}

const update = async (userId, dayLogId, qualityData) => {
  const updated = await db('quality_log').where('day_log_id', dayLogId).update(qualityData)
  const [log] = await db('quality_log').where('day_log_id', dayLogId)

  // if all scores are inputted calculate the average quality score and
  // update week and month averages if logs exist
  let averageQualityScore
  if (log.wake_score !== 0 && log.day_score !== 0 && log.bedtime_score !== 0) {
    averageQualityScore = getAverageQualityForOneDay(log.wake_score, log.day_score, log.bedtime_score)
    // update the average score
    const logUpdate = {
      average_quality: averageQualityScore,
    }
    await db('day_log').where('id', dayLogId).update(logUpdate)
    // update the corresponding week log if there is one if its saturday
    const week_of_year = `${moment(log.date).week()}/${moment().year()}`
    let weekExists = await weekModel.checkIfWeekExists(userId, week_of_year)
    // get hours and averages for all days in that week
    if (weekExists.length > 0) {
      const [weekAverages] = await weekModel.getAveragesForWeek(userId, log.date)
      let dayData = {
        sleptHours: weekAverages.avg_hours_slept,
        avgQuality: weekAverages.avg_quality
      }
      const updatedWeek = weekModel.update(userId, dayData, log.date)
    }
    // update the corresponding month log if there is one if its the last
    // day of the month
    const month_of_year = `${moment(log.date).month() + 1}/${moment().year()}`
    let monthExists = await monthModel.checkIfMonthExists(userId, month_of_year)
    if (monthExists.length > 0) {
      const month = (moment(log.date).month() + 1)
      const formattedDate = moment(log.date).format('MM-DD-YYYY')
      const year = formattedDate.substring(formattedDate.length - 4)
            const [monthAverages] = await monthModel.getAveragesForMonth(userId, month, year)
        let dayData = {
        sleptHours: monthAverages.avg_hours_slept,
        avgQuality: monthAverages.avg_quality
        }
        updatedMonth = monthModel.update(userId, dayData, log.date)
    }
  }

  return log

}

/******************************************************************************
 *                      Get a quality log by day log id
 ******************************************************************************/

const getByDayLogId = async (id) => {
  return db('quality_log').where('day_log_id', id).select(
    'id',
    'wake_score',
    'day_score',
    'bedtime_score',
    'day_log_id',
  )
}

/******************************************************************************
 *                      Export methods
 ******************************************************************************/

module.exports = {
  create,
  getByDayLogId,
  update
}
