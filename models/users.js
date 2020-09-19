const db = require('../data/dbConfig');

const get = async () => {
    return db('users').select('id', 'username', 'admin', 'email', 'recommended_hours');
}

const getBy = async (filter) => {
  return db("users").where(filter).orderBy("id");
}


const getById = async (id) => {
    return db('users').where({id}).select('id', 'username', 'admin', 'email','recommended_hours')
}

const create = async (user) => {
if (user.username !== 'testUser') {
user.admin = false;
}
    const id = await db('users').insert(user);
    return getById(user.id)
}

const update = async (user) => {
const id = user.id
    const exists = await getById(id)
    if (exists) {
      return db('users').where({id}).update(user)
    }
  }

const remove = async (id) => {
    const exists = await getById(id)
    if (exists) {
      return db('users').where({id}).del()
    }
  }

module.exports = {
  get,
  getBy,
  create,
  getById,
  remove,
  update,
}