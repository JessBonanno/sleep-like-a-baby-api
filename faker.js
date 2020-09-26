const faker = require('faker');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const {v4: uuidv4} = require('uuid');
const db = require('./data/dbConfig');
const dayModel = require('./models/day_log')


let month = 1
let day = 0

const createAdmin = async () => {
  const admins = [
    {
      admin: true,
      email: 'jess@email.com',
      username: 'Jess',
      password: 'unit4',
    }
  ]
  admins.map(admin => {
    setTimeout(async () => {
      const hash = bcrypt.hashSync(admin.password, 10);
      admin.password = hash;
      admin.id = uuidv4();
      return db('users')
        .insert(admin)
        .catch(err => console.log(err));
    }, 1000);
  })
}
const longMonths = [1, 3, 5, 7, 8, 10, 12]
const shortMonths = [4, 6, 9, 11]
let monthId
let weekId
const floodDays = async (id) => {
let week = 27
  //flood my days
  month = 7
  day = 0
  let dayOfWeek = 0
    monthId = faker.random.uuid()
    weekId = faker.random.uuid()
  for (let i = 0; i < 61; i++) {
    const sleepId = faker.random.uuid()
    if (month === 2) {
      if (day < 28) {
        day++
      } else {
        day = 1
        month++
        monthId = faker.random.uuid()
      }
    } else if (shortMonths.includes(month)) {
      if (day < 30) {
        day++
      } else {
        day = 1
        month++
        monthId = faker.random.uuid()
      }
    } else if (longMonths.includes(month)) {
      if (day < 31) {
        day++
      } else {
        day = 1
        if (month !== 12) {
          month++
          monthId = faker.random.uuid()
        } else {
          month = 1
          monthId = faker.random.uuid()
        }
      }
    }

    const monthData = {
      id: monthId,
      users_id: id,
      month_of_year: `${month}/2020`,
      average_hours_slept: 7,
      average_quality: 3,
    }
    const weekData = {
      id: weekId,
      users_id: id,
      week_of_year: `${week}/2020`,
      average_hours_slept: 7,
      average_quality: 3,
    }
    const sleepData = {
      id: sleepId,
      users_id: id,
      date: `2020-${month}-${day}`,
      bedtime: `23:00:00`,
      wake_time: `06:00:00`,
      total_hours_slept: 7,
      average_quality: 3,
      month_log_id: monthId,
      week_log_id: weekId,
    }
    const qualityData = {
      id: faker.random.uuid(),
      wake_score: 3,
      day_score: 3,
      bedtime_score: 3,
      day_log_id: sleepId
    }
    if (dayOfWeek < 7) {
    dayOfWeek++
  } else {
    dayOfWeek = 0;
    week++
    weekId = faker.random.uuid()
  }
    // console.log({monthId})
    // console.log({month})
    // console.log({weekId})
    // console.log({dayOfWeek})
    setTimeout(async () => {
      // console.log({sleepData})
      // console.log({qualityData})
      await db('month_log')
        .insert(monthData)
        .catch(err => console.log(err));
      await db('week_log')
        .insert(weekData)
        .catch(err => console.log(err));
      await db('day_log')
        .insert(sleepData)
        .catch(err => console.log(err));

      await db('quality_log')
        .insert(qualityData)
        .catch(err => console.log(err));
    }, 1000);
  }
}
const adminId = 'cc785035-9ddc-4823-adbb-e0e6ad7932ca'
const floodAdminsData = () => {
  floodDays(adminId)
}
// floodUsers()
// createAdmin()
// floodAdminsData()

// get week number by date
// console.log(moment('1-25-1995').month() + 1 )
// console.log(moment().format('YYYY-MM-DD') === moment().endOf('month').format('YYYY-MM-DD'))
// console.log(moment().date())
// console.log(moment('8-30-2020').week())

// const bedtime = new Date(`2020-09-18T23:00:00`).getTime()
// const formattedBedTime = moment(time).format('hh:mm:A')
//
// console.log(formattedTime)
// console.log(moment().format('MM-DD-YYYY'))
// console.log(moment('2020-09-25T00:00:00.000Z').day().format('d'))

// 11:59 PM => 1600574399000
// 00:00 => 1600488000000
// 11:59 AM => 1600531199000
// 12:00 => 1600531200000
const getSleptHours = (bedtime, wakeTime) => {
  // using an arbitrary date to calculate hours slept
  let tonight = '2020-09-19T'
  let tomorrow = '2020-09-20T'
  let shorten = false;
  let time1 = new Date(`${tonight}${'03:01:51'}`)
  let time2 = new Date(`${tomorrow}${'09:15:11'}`)
  console.log(time1.getTime())
  if (time1.getTime() >= 1600488000000 && time1.getTime() <= 1600531200000 ) {
    console.log('true*****')
    console.log(time1.getTime())
      time1 = new Date(`${tomorrow}${'03:01:51'}`)
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
console.log(getSleptHours())
