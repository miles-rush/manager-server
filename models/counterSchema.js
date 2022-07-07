/**
 * 维护用户ID自增长表
 */
const mongoose = require('mongoose')
const counterSchema = mongoose.Schema({
    _id: String,
    sequence_value: Number
})

// 导出Model    集合Model的名称[counter]   数据库中Collection的名称[counters]
module.exports = mongoose.model("counter", counterSchema, "counters")