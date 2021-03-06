const faker = require('faker');

exports.seed = async function (knex, promise) {
  await knex('day_log').del()
  await knex('day_log')
    .insert([
      {
        id: '2c56584b-aad7-48c6-a85d-4b57d093bc0f',
        users_id: '4f95d22e-21a9-4ee4-9e9a-b14479b36555',
        date: new Date(),
        bedtime: '2020-09-24 22:00:00',
        wake_time: '2020-09-25 06:00:00',
        total_hours_slept: 8,
        average_quality: 4,
        week_log_id: '4f95d22e-21a9-4ee4-9e8a-b14479b36555',
        month_log_id: '5f95d22e-21a5-4ee4-9e8a-b14479b36555',

      },
      {
        id: '2c56584b-aad7-48c6-a84d-4b57d093bc0f',
        users_id: '4f95d22e-21a9-4ee4-9e9a-b14479b36556',
        date: new Date(),
        bedtime: '2020-09-23 22:00:00',
        wake_time: '2020-09-24 06:00:00',
        total_hours_slept: 8,
        average_quality: 1,
        week_log_id: '4f92d22e-20a9-4ee4-9e8a-b14479b36555',
        month_log_id: '1f92d22e-20a5-4ee4-9e8a-b14479b36555',

      },
    ])
}
